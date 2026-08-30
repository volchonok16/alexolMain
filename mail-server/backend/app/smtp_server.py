"""
Собственный SMTP-сервер: приём почты (порт 25) и Submission с аутентификацией (порт 587).
Без зависимостей от внешних сервисов - всё в одном процессе, БД и логика в приложении.
"""
import asyncio
import ssl
import tempfile
import os
from email import policy
from email.parser import BytesParser
from email.utils import parseaddr
from aiosmtpd.smtp import SMTP, AuthResult, LoginPassword, MISSING, TLSSetupException
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.models import User, Email
from app.config import settings
from app.auth import verify_password
from app.database import async_connect_args, sync_connect_args
from app.mail_body import extract_text_and_html, sanitize_pg_text
from app.mail_sync import allocate_imap_uid, is_outlook_probe, raw_has_message_id
from app.from_display import inject_from_display_name
from app.outbound import deliver_raw_outbound
from app.org import ingest_calendar_message
from app.recipients import partition_local_external
from app.logging_setup import configure_quiet_logging
import logging

logging.basicConfig(level=logging.INFO)
configure_quiet_logging()
logger = logging.getLogger(__name__)


def _smtp_text(value) -> str:
    """aiosmtpd AUTH LOGIN/PLAIN hands login and password as bytes."""
    if value is None:
        return ""
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).decode("utf-8", errors="replace")
    return str(value)


def _get_sync_database_url() -> str:
    """URL для синхронного движка (SMTP auth вызывается из sync-контекста)."""
    if settings.DATABASE_URL_SYNC:
        return settings.DATABASE_URL_SYNC
    return settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")


def _make_tls_context():
    """TLS-контекст для порта 587/465. TLS 1.2+; без клиентских сертификатов."""
    def _server_ctx() -> ssl.SSLContext:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    if settings.SMTP_TLS_CERT_FILE and settings.SMTP_TLS_KEY_FILE:
        if os.path.isfile(settings.SMTP_TLS_CERT_FILE) and os.path.isfile(settings.SMTP_TLS_KEY_FILE):
            ctx = _server_ctx()
            ctx.load_cert_chain(settings.SMTP_TLS_CERT_FILE, settings.SMTP_TLS_KEY_FILE)
            logger.info("SMTP TLS: using configured cert %s", settings.SMTP_TLS_CERT_FILE)
            return ctx
    # Self-signed для разработки (клиенты могут ругаться, но подключение работает)
    try:
        import subprocess
        with tempfile.TemporaryDirectory() as d:
            cert = os.path.join(d, "cert.pem")
            key = os.path.join(d, "key.pem")
            subprocess.run(
                [
                    "openssl", "req", "-x509", "-newkey", "rsa:2048",
                    "-keyout", key, "-out", cert, "-days", "1",
                    "-nodes", "-subj", "/CN=localhost"
                ],
                capture_output=True,
                check=True,
                timeout=10,
            )
            ctx = _server_ctx()
            ctx.load_cert_chain(cert, key)
            return ctx
    except Exception as e:
        logger.warning("Could not create self-signed TLS cert for 587: %s. Submission port will start without TLS.", e)
        return None


class CustomSMTPHandler:
    """Обработчик приёма писем (общий для портов 25 и 587)."""

    def __init__(self):
        self._async_engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            connect_args=async_connect_args(settings.DATABASE_URL),
        )
        self._async_session_factory = async_sessionmaker(
            self._async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        sync_url = _get_sync_database_url()
        self._sync_engine = create_engine(
            sync_url,
            pool_pre_ping=True,
            connect_args=sync_connect_args(sync_url),
        )
        self._SyncSession = sessionmaker(self._sync_engine, class_=Session, expire_on_commit=False)

    def _authenticator(self, server, session, envelope, mechanism: str, auth_data):
        """Проверка логина/пароля для портов 587/465 (sync, т.к. вызывается из aiosmtpd)."""
        if not isinstance(auth_data, LoginPassword):
            logger.warning("SMTP auth: unexpected auth_data type %s", type(auth_data))
            return AuthResult(success=False)
        login = _smtp_text(auth_data.login).strip().lower()
        password = _smtp_text(auth_data.password)
        logger.info("SMTP AUTH %s login=%s peer=%s", mechanism, login or "-", getattr(session, "peer", None))
        if not login or not password:
            logger.warning("SMTP auth: empty login or password for %r", login)
            return AuthResult(success=False)
        try:
            with self._SyncSession() as db:
                local = login.split("@", 1)[0]
                row = db.execute(
                    select(User).where(
                        (func.lower(User.email) == login) | (func.lower(User.username) == local)
                    )
                ).scalar_one_or_none()
                if not row:
                    logger.warning("SMTP auth: user not found: %r", login)
                    return AuthResult(success=False)
                if not row.is_active:
                    logger.warning("SMTP auth: user inactive: %r", login)
                    return AuthResult(success=False)
                if verify_password(password, row.hashed_password):
                    logger.debug("SMTP auth: success for %r", login)
                    return AuthResult(success=True, auth_data=auth_data)
                logger.warning("SMTP auth: wrong password for %r", login)
                return AuthResult(success=False)
        except Exception as e:
            logger.exception("SMTP auth error for %s: %s", login, e)
            return AuthResult(success=False)

    async def handle_RCPT(self, server, session, envelope, address, rcpt_options):
        addr = (address or "").strip().strip("<>").strip()
        if not addr:
            return "501 5.1.3 Bad recipient"
        _local, external = partition_local_external([addr.lower()], settings.MAIL_DOMAIN)
        if external and not getattr(session, "authenticated", False):
            logger.warning("SMTP relay denied for unauthenticated RCPT %s", addr)
            return "550 5.7.1 Relay denied"
        envelope.rcpt_tos.append(addr)
        return "250 OK"

    async def handle_EHLO(self, server, session, envelope, hostname, responses):
        # aiosmtpd 5-arg EHLO hook does not set this; AUTH then returns
        # "503 send EHLO first" and Outlook keeps reopening the password dialog.
        session.host_name = hostname
        tls_on = bool(
            getattr(server, "_tls_protocol", None)
            or getattr(session, "ssl", None)
        )
        lines = list(responses or [])
        if tls_on and not any("AUTH" in (line or "") for line in lines):
            help_i = next(
                (i for i, line in enumerate(lines) if "HELP" in (line or "")),
                len(lines),
            )
            lines.insert(help_i, "250-AUTH LOGIN PLAIN")
        logger.info(
            "SMTP EHLO peer=%s host=%s tls=%s auth=%s",
            getattr(session, "peer", None),
            hostname,
            tls_on,
            any("AUTH" in (line or "") for line in lines),
        )
        return lines

    async def handle_AUTH(self, server, session, envelope, args):
        logger.info(
            "SMTP cmd AUTH %s peer=%s",
            (args or ["?"])[0],
            getattr(session, "peer", None),
        )
        return MISSING

    async def _deliver_external_later(self, content: bytes, from_addr: str, external_addrs: list[str]) -> None:
        try:
            await asyncio.to_thread(deliver_raw_outbound, content, from_addr, external_addrs)
            logger.info("Outbound delivered from %s to %s", from_addr, external_addrs)
        except Exception:
            logger.exception("Outbound delivery failed to %s", external_addrs)

    async def handle_DATA(self, server, session, envelope):
        """Inbound MX → local inboxes. Authenticated submission → also send external via MX."""
        logger.info("Receiving email from %s to %s", envelope.mail_from, envelope.rcpt_tos)
        authenticated = bool(getattr(session, "authenticated", False))
        try:
            content = envelope.content
            sender = None
            async with self._async_session_factory() as db:
                if authenticated:
                    auth_data = getattr(session, "auth_data", None)
                    login = (
                        _smtp_text(auth_data.login).strip().lower()
                        if isinstance(auth_data, LoginPassword)
                        else (envelope.mail_from or "").strip().lower()
                    )
                    local_part = login.split("@", 1)[0]
                    sender = (
                        await db.execute(
                            select(User).where(
                                (func.lower(User.email) == login)
                                | (func.lower(User.username) == local_part)
                            )
                        )
                    ).scalar_one_or_none()
                    if sender:
                        content, _ = inject_from_display_name(
                            content, sender.full_name or "", sender.email
                        )

                msg = BytesParser(policy=policy.default).parsebytes(content)
                subject = msg.get("subject", "No Subject")
                header_name, header_addr = parseaddr(msg.get("From") or "")
                from_address = (
                    (sender.email if sender else None)
                    or (header_addr or envelope.mail_from or "")
                ).strip().lower()
                from_name = (header_name or "").strip() or None
                body, html_body = extract_text_and_html(msg)
                rcpt_norm = [(a or "").strip() for a in envelope.rcpt_tos if (a or "").strip()]
                _local_addrs, external_addrs = partition_local_external(
                    [a.lower() for a in rcpt_norm], settings.MAIL_DOMAIN
                )
                subject = sanitize_pg_text(str(subject or ""))
                from_name = sanitize_pg_text(from_name) or None
                from_address = sanitize_pg_text(from_address)
                header_to = sanitize_pg_text((msg.get("To") or "").strip() or ", ".join(rcpt_norm))

                if is_outlook_probe(subject, from_name or ""):
                    logger.info("SMTP skip Outlook account-test message from %s", from_address)
                    return "250 2.0.0 Message accepted"

                if external_addrs and not authenticated:
                    return "550 5.7.1 Relay denied"

                local_users: list[User] = []
                for to_address in rcpt_norm:
                    to_norm = to_address.lower()
                    result = await db.execute(select(User).where(func.lower(User.email) == to_norm))
                    user = result.scalar_one_or_none()
                    if user:
                        local_users.append(user)
                        imap_uid = await allocate_imap_uid(db, user.id, False)
                        email_obj = Email(
                            user_id=user.id,
                            from_address=from_address or (envelope.mail_from or ""),
                            to_address=header_to or user.email,
                            from_name=from_name,
                            to_name=user.full_name,
                            subject=subject,
                            body=body,
                            html_body=html_body,
                            raw_rfc822=content,
                            is_sent=False,
                            imap_uid=imap_uid,
                        )
                        db.add(email_obj)
                        await db.commit()
                        logger.info(
                            "Email saved for user %s from %s (%s)",
                            user.email,
                            from_address,
                            from_name,
                        )

                # Outlook IMAP submits via SMTP and often skips APPEND to Sent.
                # Webmail already stores is_sent=True; authenticated SMTP did not.
                if authenticated and sender:
                    mid = (msg.get("Message-ID") or "").strip()
                    recent_sent = (
                        await db.execute(
                            select(Email).where(
                                Email.user_id == sender.id,
                                Email.is_sent.is_(True),
                            ).order_by(Email.id.desc()).limit(20)
                        )
                    ).scalars().all()
                    already = any(
                        raw_has_message_id(getattr(row, "raw_rfc822", None), mid)
                        for row in recent_sent
                    )
                    if not already:
                        sent_uid = await allocate_imap_uid(db, sender.id, True)
                        db.add(Email(
                            user_id=sender.id,
                            from_address=from_address or sender.email,
                            to_address=header_to or ", ".join(rcpt_norm) or sender.email,
                            from_name=from_name or sender.full_name,
                            to_name=None,
                            subject=subject,
                            body=body,
                            html_body=html_body,
                            raw_rfc822=content,
                            is_sent=True,
                            is_read=True,
                            imap_uid=sent_uid,
                        ))
                        await db.commit()
                        logger.info(
                            "SMTP saved sent copy user=%s to=%s uid=%s",
                            sender.email,
                            header_to,
                            sent_uid,
                        )

                await ingest_calendar_message(
                    db, msg, sender=sender, local_users=local_users
                )

            if external_addrs:
                from_addr = (sender.email if sender else from_address) or envelope.mail_from
                addrs = list(external_addrs)
                asyncio.create_task(self._deliver_external_later(content, from_addr, addrs))

            return "250 2.0.0 Message accepted"
        except Exception as e:
            logger.error("Error handling email: %s", e, exc_info=True)
            return "500 Error processing email"

    async def handle_exception(self, error):
        """aiosmtpd calls this instead of logging ERROR+traceback for session errors."""
        cause = error.__cause__ or error
        peer_drop = (ConnectionResetError, BrokenPipeError, ConnectionAbortedError)
        if isinstance(error, TLSSetupException) or isinstance(cause, peer_drop):
            logger.info(
                "SMTP peer dropped during TLS/session (%s)",
                cause.__class__.__name__,
            )
            return "421 4.7.0 TLS handshake aborted"
        if isinstance(cause, ssl.SSLError):
            logger.warning("SMTP TLS handshake failed: %s", cause)
            return "421 4.7.0 TLS handshake failed"
        logger.exception("SMTP session exception")
        return f"500 Error: ({error.__class__.__name__}) {error}"

    @property
    def engine(self):
        return self._async_engine


class MailSMTP(SMTP):
    """Outlook AUTH LOGIN expects Username:/Password:, not aiosmtpd's 'User Name\\0'."""
    AuthLoginUsernameChallenge = "Username:"
    AuthLoginPasswordChallenge = "Password:"


def _run_smtp_servers(handler, tls_ctx, loop):
    """В одном потоке поднимает три слушателя: 25, 587 (STARTTLS) и 465 (SSL)."""
    bind_host = settings.SMTP_HOST              # адрес привязки (0.0.0.0)
    smtp_hostname = settings.smtp_hostname      # имя в SMTP-баннере (mail.alexol.io)
    port_25 = settings.SMTP_PORT
    port_587 = settings.SMTP_SUBMISSION_PORT
    port_465 = getattr(settings, 'SMTP_SSL_PORT', 465)

    def factory_25():
        # Offer STARTTLS on 25 so Gmail can encrypt inbound (require_starttls=False
        # keeps plain clients working if any).
        return MailSMTP(
            handler,
            hostname=smtp_hostname,
            tls_context=tls_ctx,
            require_starttls=False,
            ident="ESMTP",
        )

    def factory_587():
        return MailSMTP(
            handler,
            hostname=smtp_hostname,
            authenticator=handler._authenticator,
            require_starttls=(tls_ctx is not None),
            tls_context=tls_ctx,
            auth_required=True,
            ident="ESMTP",
        )

    def factory_465():
        # Implicit TLS on the socket (smtps). aiosmtpd still thinks AUTH needs STARTTLS
        # unless auth_require_tls is off — Outlook then gets 538 5.7.11.
        return MailSMTP(
            handler,
            hostname=smtp_hostname,
            authenticator=handler._authenticator,
            require_starttls=False,
            tls_context=None,
            auth_require_tls=False,
            auth_required=True,
            ident="ESMTP",
        )

    async def run():
        server_25 = await loop.create_server(factory_25, bind_host, port_25)
        server_587 = await loop.create_server(factory_587, bind_host, port_587)
        logger.info(
            "SMTP (receive) started on %s:%s hostname=%s (%s)",
            bind_host,
            port_25,
            smtp_hostname,
            "STARTTLS offered" if tls_ctx else "plain only",
        )
        logger.info(
            "SMTP (submission) started on %s:%s hostname=%s (auth + %s)",
            bind_host, port_587, smtp_hostname, "STARTTLS" if tls_ctx else "no TLS",
        )
        servers = [server_25, server_587]
        if tls_ctx:
            server_465 = await loop.create_server(factory_465, bind_host, port_465, ssl=tls_ctx)
            logger.info("SMTP (SSL) started on %s:%s hostname=%s (auth + SSL)",
                        bind_host, port_465, smtp_hostname)
            servers.append(server_465)
        return tuple(servers)

    return loop.run_until_complete(run())


class SMTPServer:
    """SMTP: порт 25 (приём), 587 (STARTTLS), 465 (SSL). Один поток, один loop."""

    def __init__(self):
        self._loop = None
        self._thread = None
        self._servers = ()  # (server_25, server_587)
        self.handler = None

    def start(self):
        import threading
        self._loop = asyncio.new_event_loop()
        self.handler = CustomSMTPHandler()
        tls_ctx = _make_tls_context()

        def thread_target():
            asyncio.set_event_loop(self._loop)
            self._servers = _run_smtp_servers(self.handler, tls_ctx, self._loop)
            self._loop.run_forever()

        self._thread = threading.Thread(target=thread_target, daemon=True)
        self._thread.start()

    async def _dispose_engines(self):
        if not self.handler:
            return
        try:
            await self.handler._async_engine.dispose()
        except Exception:
            logger.warning("SMTP async engine dispose failed", exc_info=True)
        try:
            self.handler._sync_engine.dispose()
        except Exception:
            logger.warning("SMTP sync engine dispose failed", exc_info=True)

    async def cleanup(self):
        """Engines are disposed on the SMTP loop inside stop()."""
        return

    def stop(self):
        if self._loop and self._loop.is_running():
            fut = asyncio.run_coroutine_threadsafe(self._dispose_engines(), self._loop)
            try:
                fut.result(timeout=8)
            except Exception:
                logger.warning("SMTP engine dispose on worker loop failed", exc_info=True)
        if self._loop and self._servers:
            for s in self._servers:
                s.close()
            self._loop.call_soon_threadsafe(self._loop.stop)
            if self._thread:
                self._thread.join(timeout=5)
            logger.info("SMTP servers stopped")


smtp_server = SMTPServer()
