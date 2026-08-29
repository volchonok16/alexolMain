"""
IMAP4rev1 сервер: даёт доступ к почте через стандартные клиенты (Outlook, Apple Mail, etc.)

Порты:
  143  - plain / STARTTLS
  993  - SSL (IMAPS)

Поддерживаемые команды:
  CAPABILITY, NOOP, IDLE, LOGOUT, LOGIN, AUTHENTICATE, STARTTLS,
  SELECT, EXAMINE, LIST, LSUB, STATUS, SEARCH, FETCH, UID, STORE,
  EXPUNGE, CLOSE, NAMESPACE, ID, SUBSCRIBE, UNSUBSCRIBE
"""
import asyncio
import ssl
import os
import re
import logging
import subprocess
import tempfile
from datetime import datetime, timezone
from email.header import Header
from email.message import Message
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import format_datetime, formataddr, getaddresses, parseaddr
from email.parser import BytesParser
from email import policy as email_policy

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker, Session

from app.models import User, Email
from app.auth import verify_password
from app.config import settings
from app.mail_body import coerce_stored_bodies, extract_text_and_html
from app.database import sync_connect_args

logger = logging.getLogger(__name__)

# Bump when FETCH/UID/SELECT format changes so Outlook drops a stale empty cache.
# 11: mailbox-local UIDs 1..N (DB ids as UIDs made UIDNEXT=86 with EXISTS=14; Outlook skipped FETCH).
UIDVALIDITY = 11
_IMAP_MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def _imap_internaldate(dt: datetime) -> str:
    """RFC 3501 INTERNALDATE: \"07-Jan-2026 15:04:05 +0000\"."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return (
        f'"{dt.day:02d}-{_IMAP_MONTHS[dt.month - 1]}-{dt.year} '
        f"{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d} +0000\""
    )


def _imap_uid(em: dict) -> int:
    """IMAP UID for a message. Prefer mailbox-local uid over the database id."""
    return int(em.get("uid") or em["id"])


def _uidnext(emails: list[dict]) -> int:
    if not emails:
        return 1
    return max(_imap_uid(e) for e in emails) + 1


def _normalize_mailbox(args: str) -> str:
    """First IMAP argument only — ignore SELECT/STATUS modifiers like (CONDSTORE)."""
    parsed = _parse_args(args or "")
    return (parsed[0] if parsed else "INBOX").strip()


def _classify_mailbox(name: str) -> str | None:
    n = (name or "").strip().strip('"').upper()
    if n in ("INBOX", "", "ВХОДЯЩИЕ", "ВХОДЯЩИЕ СООБЩЕНИЯ"):
        return "INBOX"
    if n in (
        "SENT", "SENT ITEMS", "SENT MESSAGES", "GESENDETE ELEMENTE",
        "ОТПРАВЛЕННЫЕ", "ОТПРАВЛЕННЫЕ СООБЩЕНИЯ",
    ):
        return "Sent"
    if n in ("DRAFTS", "DRAFT", "ЧЕРНОВИКИ"):
        return "Drafts"
    return None


def _imap_quoted(s: str) -> str:
    """7-bit IMAP quoted-string. Non-ASCII becomes RFC 2047 (Outlook rejects UTF-8 here)."""
    text = (s or "").replace("\r", " ").replace("\n", " ").replace("\x00", "")
    try:
        text.encode("ascii")
    except UnicodeEncodeError:
        text = Header(text, "utf-8", maxlinelen=998).encode()
        text = text.replace("\r", " ").replace("\n", " ")
    text = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def _envelope_one_addr(display: str, addr: str) -> str:
    name, email_addr = parseaddr(addr or "")
    personal = (display or name or "").strip()
    if not email_addr:
        raw = (addr or "").strip()
        if raw.count("@") == 1 and "<" not in raw:
            email_addr = raw
    mailbox, _, host = (email_addr or "").partition("@")
    pers = _imap_quoted(personal) if personal else "NIL"
    mb = _imap_quoted(mailbox) if mailbox else "NIL"
    ht = _imap_quoted(host) if host else "NIL"
    return f"({pers} NIL {mb} {ht})"


def _envelope_addr_list(raw: str, display: str = "") -> str:
    if not (raw or "").strip():
        return "NIL"
    pairs = getaddresses([raw])
    parts: list[str] = []
    for name, addr in pairs:
        if not addr and not name:
            continue
        parts.append(_envelope_one_addr(name or display, addr or name))
    if not parts:
        return f"({_envelope_one_addr(display, raw)})"
    return "(" + "".join(parts) + ")"


def _imap_envelope(parsed: Message, em: dict) -> str:
    date_hdr = parsed.get("Date") or ""
    if date_hdr:
        date_s = _imap_quoted(str(date_hdr))
    else:
        date = em.get("date") or datetime.now(timezone.utc)
        if isinstance(date, datetime) and date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
        date_s = _imap_quoted(format_datetime(date))
    subj = parsed.get("Subject")
    if subj is None:
        subj = em.get("subject") or ""
    frm_raw = parsed.get("From") or em.get("from") or ""
    to_raw = parsed.get("To") or em.get("to") or ""
    cc_raw = parsed.get("Cc") or ""
    bcc_raw = parsed.get("Bcc") or ""
    irt = parsed.get("In-Reply-To")
    mid = parsed.get("Message-ID") or f"<{em['id']}@{settings.MAIL_DOMAIN}>"
    frm = _envelope_addr_list(str(frm_raw), em.get("from_name") or "")
    sender = _envelope_addr_list(str(parsed.get("Sender") or frm_raw), em.get("from_name") or "")
    reply_to = _envelope_addr_list(str(parsed.get("Reply-To") or frm_raw), em.get("from_name") or "")
    to = _envelope_addr_list(str(to_raw), em.get("to_name") or "")
    cc = _envelope_addr_list(str(cc_raw)) if cc_raw else "NIL"
    bcc = _envelope_addr_list(str(bcc_raw)) if bcc_raw else "NIL"
    irt_s = _imap_quoted(str(irt)) if irt else "NIL"
    return (
        f"({date_s} {_imap_quoted(str(subj))} {frm} {sender} {reply_to} {to} "
        f"{cc} {bcc} {irt_s} {_imap_quoted(str(mid))})"
    )


def _part_octets_and_lines(part: Message) -> tuple[int, int]:
    payload = part.get_payload(decode=True)
    if payload is None:
        raw = part.get_payload()
        if isinstance(raw, str):
            payload = raw.encode("utf-8", "replace")
        elif isinstance(raw, bytes):
            payload = raw
        else:
            payload = b""
    return len(payload), payload.count(b"\n") + (1 if payload else 0)


def _bodystructure(part: Message) -> str:
    """RFC 3501 BODYSTRUCTURE from a parsed message (sizes match the real MIME)."""
    if part.is_multipart():
        payload = part.get_payload()
        if not isinstance(payload, list):
            payload = []
        children = "".join(_bodystructure(p) for p in payload)
        subtype = (part.get_content_subtype() or "mixed").upper()
        return f"({children} {_imap_quoted(subtype)})"
    ctype = part.get_content_type() or "text/plain"
    main, _, sub = ctype.partition("/")
    main = (main or "TEXT").upper()
    sub = (sub or "PLAIN").upper()
    charset = part.get_content_charset() or "UTF-8"
    params = f'("CHARSET" {_imap_quoted(charset)})'
    cte = (part.get("Content-Transfer-Encoding") or "8BIT").split()[0].upper()
    if cte not in ("7BIT", "8BIT", "BINARY", "BASE64", "QUOTED-PRINTABLE"):
        cte = "8BIT"
    octets, lines = _part_octets_and_lines(part)
    cid = part.get("Content-ID")
    cid_s = _imap_quoted(str(cid)) if cid else "NIL"
    desc = part.get("Content-Description")
    desc_s = _imap_quoted(str(desc)) if desc else "NIL"
    if main == "TEXT":
        return (
            f"({_imap_quoted(main)} {_imap_quoted(sub)} {params} {cid_s} {desc_s} "
            f"{_imap_quoted(cte)} {octets} {lines})"
        )
    return (
        f"({_imap_quoted(main)} {_imap_quoted(sub)} {params} {cid_s} {desc_s} "
        f"{_imap_quoted(cte)} {octets})"
    )


def _safe_bodystructure(rfc: bytes, em: dict) -> str:
    try:
        parsed = BytesParser(policy=email_policy.compat32).parsebytes(rfc)
        return _bodystructure(parsed)
    except Exception:
        n = len(rfc)
        lines = rfc.count(b"\n") + 1
        kind = "HTML" if em.get("html_body") else "PLAIN"
        return f'("TEXT" "{kind}" ("CHARSET" "UTF-8") NIL NIL "8BIT" {n} {lines})'


def _header_subset_bytes(parsed: Message, wanted: set[str] | None) -> bytes:
    lines: list[str] = []
    for key, value in parsed.items():
        if wanted is not None and key.upper() not in wanted:
            continue
        val = value if isinstance(value, str) else str(value)
        val = val.replace("\r", " ").replace("\n", " ")
        try:
            val.encode("ascii")
        except UnicodeEncodeError:
            val = Header(val, "utf-8", maxlinelen=998).encode().replace("\r", " ").replace("\n", " ")
        lines.append(f"{key}: {val}\r\n")
    return ("".join(lines) + "\r\n").encode("utf-8")

# ---------------------------------------------------------------------------
# TLS helpers
# ---------------------------------------------------------------------------

def _get_sync_db_url() -> str:
    if settings.DATABASE_URL_SYNC:
        return settings.DATABASE_URL_SYNC
    return settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")


def _make_tls_context() -> ssl.SSLContext | None:
    """Server TLS for IMAPS/STARTTLS. TLS 1.2+; no client certs."""
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
            logger.info("IMAP TLS: using configured cert %s", settings.SMTP_TLS_CERT_FILE)
            return ctx

    try:
        tmpdir = tempfile.mkdtemp()
        cert = os.path.join(tmpdir, "cert.pem")
        key = os.path.join(tmpdir, "key.pem")
        subprocess.run(
            [
                "openssl", "req", "-x509", "-newkey", "rsa:2048",
                "-keyout", key, "-out", cert,
                "-days", "3650", "-nodes",
                "-subj", f"/CN={settings.MAIL_DOMAIN}",
            ],
            capture_output=True, check=True, timeout=30,
        )
        ctx = _server_ctx()
        ctx.load_cert_chain(cert, key)
        logger.info("IMAP TLS: generated self-signed cert (CN=%s)", settings.MAIL_DOMAIN)
        return ctx
    except Exception as exc:
        logger.warning("IMAP: cannot create TLS context: %s - ports 993/STARTTLS disabled", exc)
        return None


# ---------------------------------------------------------------------------
# Protocol helpers
# ---------------------------------------------------------------------------

def _parse_args(s: str) -> list[str]:
    """Parse IMAP argument string honouring quoted strings."""
    result: list[str] = []
    s = s.strip()
    i = 0
    while i < len(s):
        if s[i] == '"':
            try:
                j = s.index('"', i + 1)
            except ValueError:
                j = len(s)
            result.append(s[i + 1:j])
            i = j + 1
        elif s[i] == ' ':
            i += 1
        else:
            j = s.find(' ', i)
            if j == -1:
                result.append(s[i:])
                break
            result.append(s[i:j])
            i = j
    return result


def _parse_seq_set(seq_set: str, total: int, uid_mode: bool,
                   emails: list[dict]) -> list[tuple[int, dict]]:
    """Expand sequence-set (e.g. '1:*', '2,4', '5') into (seq_num, email) pairs."""
    result: list[tuple[int, dict]] = []
    if not emails or total == 0:
        return result

    def _resolve(s: str, max_val: int) -> int:
        return max_val if s == '*' else int(s)

    for part in seq_set.split(','):
        part = part.strip()
        if ':' in part:
            a, b = part.split(':', 1)
            if uid_mode:
                all_uids = [_imap_uid(e) for e in emails]
                lo = _resolve(a, max(all_uids))
                hi = _resolve(b, max(all_uids))
                if lo == 0:
                    lo = min(all_uids)
                matched = []
                for idx, e in enumerate(emails):
                    if lo <= _imap_uid(e) <= hi:
                        matched.append((idx + 1, e))
                # Outlook sometimes treats UIDs as 1..EXISTS even when DB ids are larger.
                if not matched and lo >= 1 and hi <= total:
                    for seq in range(lo, hi + 1):
                        matched.append((seq, emails[seq - 1]))
                result.extend(matched)
            else:
                lo = _resolve(a, total)
                hi = _resolve(b, total)
                lo, hi = max(1, lo), min(total, hi)
                for seq in range(lo, hi + 1):
                    result.append((seq, emails[seq - 1]))
        else:
            if uid_mode:
                uid = _resolve(part, max(_imap_uid(e) for e in emails) if emails else 0)
                # UID 0 is invalid; Outlook sends it when a prior FETCH omitted UID.
                if uid == 0:
                    for idx, e in enumerate(emails):
                        result.append((idx + 1, e))
                    continue
                found = False
                for idx, e in enumerate(emails):
                    if _imap_uid(e) == uid:
                        result.append((idx + 1, e))
                        found = True
                        break
                if not found and 1 <= uid <= total:
                    result.append((uid, emails[uid - 1]))
            else:
                seq = _resolve(part, total)
                seq = max(1, min(total, seq))
                if seq <= len(emails):
                    result.append((seq, emails[seq - 1]))
    return result


def _email_to_rfc822(em: dict) -> bytes:
    date = em.get('date') or datetime.now(timezone.utc)
    if isinstance(date, datetime) and date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    date_str = format_datetime(date)

    if em.get('html_body'):
        msg = MIMEMultipart('alternative')
        msg.attach(MIMEText(em.get('body', '') or '', 'plain', 'utf-8'))
        msg.attach(MIMEText(em['html_body'], 'html', 'utf-8'))
    else:
        msg = MIMEText(em.get('body', '') or '', 'plain', 'utf-8')

    from_addr = em.get('from', '') or ''
    from_name = (em.get('from_name') or '').strip()
    msg['From'] = formataddr((from_name, from_addr)) if from_addr else from_name
    msg['To'] = em.get('to', '')
    subj = em.get('subject', '') or ''
    try:
        subj.encode('ascii')
        msg['Subject'] = subj
    except UnicodeEncodeError:
        msg['Subject'] = Header(subj, 'utf-8')
    msg['Date'] = date_str
    msg['Message-ID'] = f"<{em['id']}@{settings.MAIL_DOMAIN}>"
    return msg.as_bytes()


def _message_bytes(em: dict) -> bytes:
    raw = em.get("raw")
    if raw:
        return bytes(raw)
    return _email_to_rfc822(em)


def _imap_literal(name: str, payload: bytes) -> bytes:
    """IMAP literal: name {octet-count}\\r\\n + exact payload bytes."""
    return f"{name} {{{len(payload)}}}\r\n".encode("ascii") + payload


def _build_fetch_response(seq_num: int, em: dict, items_str: str,
                           uid_mode: bool) -> bytes:
    upper = items_str.upper()
    flags_str = " ".join(em.get("flags", []))
    uid = _imap_uid(em)

    date = em.get("date") or datetime.now(timezone.utc)
    if isinstance(date, datetime) and date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)

    parts: list[bytes] = []

    def add_text(piece: str) -> None:
        try:
            parts.append(piece.encode("ascii"))
        except UnicodeEncodeError:
            logger.warning("IMAP FETCH non-ascii metadata uid=%s", uid)
            parts.append(piece.encode("utf-8", "replace"))

    add_text(f"UID {uid}")

    if "FLAGS" in upper:
        add_text(f"FLAGS ({flags_str})")

    if "INTERNALDATE" in upper:
        add_text(f"INTERNALDATE {_imap_internaldate(date)}")

    peek = "BODY.PEEK[" in upper
    body_bracket = "BODY[" in upper.replace(" ", "") or peek
    wants_full_rfc822 = bool(re.search(r"(?<![.\w])RFC822(?![.\w])", upper))
    rfc: bytes | None = None
    if (
        wants_full_rfc822
        or body_bracket
        or "RFC822.SIZE" in upper
        or "ENVELOPE" in upper
        or "BODYSTRUCTURE" in upper
        or re.search(r"(?<![.\w])BODY(?![.\w\[])", upper)
    ):
        rfc = _message_bytes(em)

    if rfc is not None and "RFC822.SIZE" in upper:
        add_text(f"RFC822.SIZE {len(rfc)}")

    if rfc is not None and wants_full_rfc822:
        parts.append(_imap_literal("RFC822", rfc))

    if rfc is not None and body_bracket:
        section_match = re.search(
            r"BODY(?:\.PEEK)?\[([^\]]*)\](?:<(\d+)\.(\d+)>)?",
            items_str,
            re.IGNORECASE,
        )
        section = (section_match.group(1) if section_match else "").strip()
        origin = section_match.group(2) if section_match else None
        slen = section_match.group(3) if section_match else None
        section_up = section.upper()
        fields_match = re.match(
            r"HEADER\.FIELDS(?:\.NOT)?\s*\((.*)\)\s*$", section, re.I | re.S
        )

        if section_up in ("HEADER",) or fields_match:
            parsed = BytesParser(policy=email_policy.compat32).parsebytes(rfc)
            wanted = None
            if fields_match:
                wanted = {n.strip().upper() for n in fields_match.group(1).split() if n.strip()}
                label = f"BODY[{section}]"
            else:
                label = "BODY[HEADER]"
            payload = _header_subset_bytes(parsed, wanted)
        elif section_up == "TEXT":
            parsed = BytesParser(policy=email_policy.compat32).parsebytes(rfc)
            if parsed.is_multipart():
                payload = parsed.as_bytes().split(b"\r\n\r\n", 1)[-1]
                if payload == parsed.as_bytes():
                    payload = parsed.as_bytes().split(b"\n\n", 1)[-1]
            else:
                decoded = parsed.get_payload(decode=True)
                payload = decoded if isinstance(decoded, bytes) else rfc
            label = "BODY[TEXT]"
        else:
            label = "BODY[]" if not section else f"BODY[{section}]"
            payload = rfc

        if origin is not None and slen is not None:
            o, ln = int(origin), int(slen)
            payload = payload[o:o + ln]
            label = f"{label}<{o}>"
        parts.append(_imap_literal(label, payload))

    if rfc is not None and "ENVELOPE" in upper:
        parsed = BytesParser(policy=email_policy.compat32).parsebytes(rfc)
        add_text(f"ENVELOPE {_imap_envelope(parsed, em)}")

    if rfc is not None and "BODYSTRUCTURE" in upper:
        add_text(f"BODYSTRUCTURE {_safe_bodystructure(rfc, em)}")
    elif rfc is not None and re.search(r"(?<![.\w])BODY(?![.\w\[])", upper):
        add_text(f"BODY {_safe_bodystructure(rfc, em)}")

    if not parts:
        add_text(f"FLAGS ({flags_str})")

    return b"* " + str(seq_num).encode("ascii") + b" FETCH (" + b" ".join(parts) + b")\r\n"


# ---------------------------------------------------------------------------
# IMAP session handler
# ---------------------------------------------------------------------------

class IMAPSession:
    NOT_AUTH = 'NOT_AUTHENTICATED'
    AUTHENTICATED = 'AUTHENTICATED'
    SELECTED = 'SELECTED'
    LOGOUT = 'LOGOUT'

    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter,
                 db_factory, tls_ctx: ssl.SSLContext | None, is_ssl: bool = False):
        self.reader = reader
        self.writer = writer
        self._db = db_factory
        self._tls_ctx = tls_ctx
        self._is_ssl = is_ssl
        self.state = self.NOT_AUTH
        self.user: User | None = None
        self.selected_mailbox: str | None = None
        self.selected_emails: list[dict] = []

    def _peer(self):
        return self.writer.get_extra_info("peername")

    async def handle(self):
        logger.info("IMAP connected peer=%s ssl=%s", self._peer(), self._is_ssl)
        await self._send(f'* OK {settings.smtp_hostname} IMAP4rev1 Service Ready')
        try:
            while self.state != self.LOGOUT:
                line = await asyncio.wait_for(self.reader.readline(), timeout=300)
                if not line:
                    break
                line = line.decode('utf-8', errors='replace').rstrip('\r\n')
                if not line:
                    continue
                logger.debug('IMAP < %s', line)
                await self._dispatch(line)
        except asyncio.TimeoutError:
            try:
                await self._send('* BYE Autologout; idle for too long')
            except Exception:
                pass
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
            # Client closed connection - normal for iOS/Outlook
            logger.debug('IMAP: client disconnected')
        except ssl.SSLError as exc:
            logger.warning('IMAP TLS peer=%s: %s', self._peer(), exc)
        except Exception as exc:
            logger.error('IMAP session error: %s', exc, exc_info=True)
        finally:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass

    async def _send(self, data: str):
        await self._send_bytes((data + "\r\n").encode("utf-8"))

    async def _send_bytes(self, data: bytes):
        logger.debug("IMAP > %s", data[:200])
        try:
            self.writer.write(data)
            await self.writer.drain()
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
            raise

    async def _dispatch(self, line: str):
        m = re.match(r'^(\S+)\s+(\S+)(.*)', line)
        if not m:
            logger.info("IMAP unparsed %r peer=%s", line[:200], self._peer())
            return
        tag, cmd, rest = m.group(1), m.group(2).upper(), m.group(3).strip()
        if cmd == "LOGIN":
            login = _parse_args(rest)[0] if rest else "?"
            logger.info("IMAP cmd=LOGIN user=%s peer=%s", login, self._peer())
        else:
            logger.info(
                "IMAP cmd=%s %s peer=%s user=%s",
                cmd,
                rest[:180],
                self._peer(),
                self.user.email if self.user else "-",
            )

        dispatch = {
            'CAPABILITY': self._capability,
            'NOOP': self._noop,
            'IDLE': self._idle,
            'LOGOUT': self._logout,
            'LOGIN': self._login,
            'AUTHENTICATE': self._authenticate,
            'STARTTLS': self._starttls,
            'SELECT': self._select,
            'EXAMINE': self._select,
            'LIST': self._list,
            'XLIST': self._list,
            'LSUB': self._lsub,
            'STATUS': self._status,
            'SEARCH': self._search,
            'FETCH': self._fetch,
            'UID': self._uid,
            'STORE': self._store,
            'EXPUNGE': self._expunge,
            'CLOSE': self._close,
            'NAMESPACE': self._namespace,
            'ID': self._id,
            'SUBSCRIBE': self._ok,
            'UNSUBSCRIBE': self._ok,
            'APPEND': self._append,
            'CREATE': self._ok,
            'CHECK': self._noop,
            'COPY': self._ok,
        }
        handler = dispatch.get(cmd, self._unknown)
        await handler(tag, cmd, rest)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

    async def _capability(self, tag, cmd, args):
        caps = 'IMAP4rev1 AUTH=PLAIN AUTH=LOGIN IDLE SPECIAL-USE'
        if self._tls_ctx and not self._is_ssl:
            caps += ' STARTTLS'
        await self._send(f'* CAPABILITY {caps}')
        await self._send(f'{tag} OK CAPABILITY completed')

    async def _push_mailbox_updates(self) -> None:
        """Re-read DB and tell the client if new messages appeared (NOOP/IDLE)."""
        if self.state != self.SELECTED or not self.selected_mailbox:
            return
        old_n = len(self.selected_emails)
        old_ids = {e['id'] for e in self.selected_emails}
        if self.selected_mailbox == 'Sent':
            emails = self._fetch_sent()
        elif self.selected_mailbox == 'Drafts':
            emails = []
        else:
            emails = self._fetch_inbox()
        self.selected_emails = emails
        n = len(emails)
        recent = sum(1 for e in emails if e['id'] not in old_ids)
        if n != old_n or recent:
            await self._send(f'* {n} EXISTS')
            if recent:
                await self._send(f'* {recent} RECENT')

    async def _noop(self, tag, cmd, args):
        await self._push_mailbox_updates()
        await self._send(f'{tag} OK {cmd} completed')

    async def _idle(self, tag, cmd, args):
        if self.state != self.SELECTED:
            await self._send(f'{tag} NO Not in selected state')
            return
        logger.info(
            "IMAP IDLE start mailbox=%s user=%s",
            self.selected_mailbox,
            self.user.email if self.user else "?",
        )
        await self._send('+ idling')
        try:
            while True:
                try:
                    line = await asyncio.wait_for(self.reader.readline(), timeout=20)
                except asyncio.TimeoutError:
                    await self._push_mailbox_updates()
                    continue
                if not line:
                    break
                text = line.decode('utf-8', errors='replace').strip()
                if text.upper() == 'DONE' or text.upper().endswith(' DONE'):
                    break
                # Outlook sometimes pipelines FETCH without DONE; don't eat it.
                if text:
                    logger.info("IMAP IDLE interrupted by %r", text[:120])
                    await self._push_mailbox_updates()
                    await self._send(f'{tag} OK IDLE completed')
                    await self._dispatch(text)
                    return
            await self._push_mailbox_updates()
            await self._send(f'{tag} OK IDLE completed')
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
            raise

    async def _ok(self, tag, cmd, args):
        await self._send(f'{tag} OK {cmd} completed')

    async def _append(self, tag, cmd, args):
        """Consume IMAP APPEND literals. Outlook hangs on 'still sending' if we ACK without reading the body."""
        if self.state not in (self.AUTHENTICATED, self.SELECTED) or not self.user:
            await self._send(f'{tag} NO Not authenticated')
            return
        literal = re.search(r'~?\{(\d+)(\+)?\}\s*$', args or '')
        if not literal:
            await self._send(f'{tag} BAD APPEND requires a literal')
            return
        size = int(literal.group(1))
        non_sync = bool(literal.group(2))
        mailbox = (_parse_args(args[: literal.start()]) or ['INBOX'])[0]
        if not non_sync:
            await self._send('+ Ready for literal data')
        try:
            data = await asyncio.wait_for(self.reader.readexactly(size), timeout=120)
            crlf = await asyncio.wait_for(self.reader.readexactly(2), timeout=10)
            if crlf not in (b'\r\n', b'\n\r'):
                pass
        except Exception as exc:
            logger.warning('IMAP APPEND read failed peer=%s: %s', self._peer(), exc)
            await self._send(f'{tag} NO APPEND failed')
            return

        box = (mailbox or 'INBOX').strip().strip('"').upper()
        is_sent = box in (
            'SENT', 'SENT ITEMS', 'SENT MESSAGES',
            'ОТПРАВЛЕННЫЕ', 'ОТПРАВЛЕННЫЕ СООБЩЕНИЯ',
        )
        is_draft = box in ('DRAFTS', 'DRAFT', 'ЧЕРНОВИКИ')
        if is_sent:
            self._save_appended_sent(data)
        elif is_draft:
            logger.debug('IMAP APPEND Drafts discarded user=%s bytes=%s', self.user.email, size)
        await self._send(f'{tag} OK APPEND completed')

    def _save_appended_sent(self, data: bytes) -> None:
        if not self.user or not data:
            return
        try:
            msg = BytesParser(policy=email_policy.default).parsebytes(data)
            mid = (msg.get('Message-ID') or '').strip()
            header_name, header_addr = parseaddr(msg.get('From') or '')
            from_address = (header_addr or self.user.email).strip().lower()
            body, html_body = extract_text_and_html(msg)
            with self._db() as db:
                if mid:
                    recent = db.execute(
                        select(Email).where(
                            Email.user_id == self.user.id,
                            Email.is_sent.is_(True),
                        ).order_by(Email.id.desc()).limit(20)
                    ).scalars().all()
                    needle = mid.encode('utf-8', errors='ignore')
                    for row in recent:
                        raw = getattr(row, 'raw_rfc822', None) or b''
                        if needle and needle in raw:
                            return
                db.add(Email(
                    user_id=self.user.id,
                    from_address=from_address,
                    to_address=(msg.get('To') or '').strip() or self.user.email,
                    from_name=(header_name or '').strip() or self.user.full_name,
                    subject=msg.get('subject', '') or '',
                    body=body,
                    html_body=html_body,
                    raw_rfc822=data,
                    is_sent=True,
                    is_read=True,
                ))
                db.commit()
        except Exception as exc:
            logger.warning('IMAP APPEND Sent save failed: %s', exc)

    async def _unknown(self, tag, cmd, args):
        logger.info("IMAP unknown cmd=%s args=%s peer=%s", cmd, (args or "")[:80], self._peer())
        await self._send(f'{tag} BAD Command {cmd} not supported')

    async def _logout(self, tag, cmd, args):
        await self._send('* BYE IMAP4rev1 Server logging out')
        await self._send(f'{tag} OK LOGOUT completed')
        self.state = self.LOGOUT

    async def _login(self, tag, cmd, args):
        parts = _parse_args(args)
        if len(parts) < 2:
            await self._send(f'{tag} BAD LOGIN requires username and password')
            return
        user = self._auth(parts[0], parts[1])
        if user:
            self.user = user
            self.state = self.AUTHENTICATED
            await self._send(f'{tag} OK LOGIN completed')
            logger.debug("IMAP LOGIN ok user=%s peer=%s", user.email, self._peer())
        else:
            logger.warning("IMAP LOGIN failed user=%r peer=%s", parts[0], self._peer())
            await self._send(f'{tag} NO [AUTHENTICATIONFAILED] Invalid credentials')

    async def _authenticate(self, tag, cmd, args):
        # Simple AUTH=PLAIN inline (some clients send it as: AUTHENTICATE PLAIN <base64>)
        mech = args.strip().split()[0].upper() if args.strip() else ''
        if mech == 'PLAIN':
            # Expect base64-encoded \0user\0pass or wait for it on next line
            rest = args.strip()[len('PLAIN'):].strip()
            if not rest:
                await self._send('+ ')
                rest = (await asyncio.wait_for(self.reader.readline(), timeout=60)).decode('utf-8', errors='replace').strip()
            try:
                import base64
                decoded = base64.b64decode(rest).split(b'\x00')
                username = decoded[1].decode() if len(decoded) >= 3 else decoded[0].decode()
                password = decoded[2].decode() if len(decoded) >= 3 else decoded[1].decode()
            except Exception:
                await self._send(f'{tag} NO [AUTHENTICATIONFAILED] Invalid PLAIN encoding')
                return
            user = self._auth(username, password)
            if user:
                self.user = user
                self.state = self.AUTHENTICATED
                await self._send(f'{tag} OK AUTHENTICATE completed')
                logger.debug("IMAP AUTHENTICATE ok user=%s peer=%s", user.email, self._peer())
            else:
                await self._send(f'{tag} NO [AUTHENTICATIONFAILED] Invalid credentials')
        else:
            await self._send(f'{tag} NO AUTHENTICATE mechanism not supported, use LOGIN')

    async def _starttls(self, tag, cmd, args):
        if self._is_ssl:
            await self._send(f'{tag} NO Already using TLS')
            return
        if self._tls_ctx is None:
            await self._send(f'{tag} NO STARTTLS not available')
            return
        await self._send(f'{tag} OK Begin TLS negotiation now')
        transport = self.writer.transport
        loop = asyncio.get_event_loop()
        try:
            new_transport = await loop.start_tls(
                transport, transport.get_protocol(),
                self._tls_ctx, server_side=True,
            )
            self.writer._transport = new_transport  # type: ignore[attr-defined]
            self.reader._transport = new_transport  # type: ignore[attr-defined]
            self._is_ssl = True
        except Exception as exc:
            logger.warning('STARTTLS upgrade failed peer=%s: %s', self._peer(), exc)
            try:
                self.writer.close()
            except Exception:
                pass
            return

    async def _select(self, tag, cmd, args):
        if self.state not in (self.AUTHENTICATED, self.SELECTED):
            await self._send(f'{tag} NO Not authenticated')
            return
        kind = _classify_mailbox(_normalize_mailbox(args))
        if kind == 'INBOX':
            emails = self._fetch_inbox()
            self.selected_mailbox = 'INBOX'
        elif kind == 'Sent':
            emails = self._fetch_sent()
            self.selected_mailbox = 'Sent'
        elif kind == 'Drafts':
            emails = []
            self.selected_mailbox = 'Drafts'
        else:
            await self._send(f'{tag} NO Mailbox "{args.strip()}" not found')
            return

        self.selected_emails = emails
        self.state = self.SELECTED
        n = len(emails)
        first_unseen = next(
            (i + 1 for i, e in enumerate(emails) if '\\Seen' not in e['flags']),
            None,
        )
        uidnext = _uidnext(emails)

        # Same SELECT shape as when Outlook still issued FETCH 1:N. Do not append
        # extra text after [UIDVALIDITY]/[UIDNEXT] and do not advertise \*.
        await self._send('* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)')
        await self._send('* OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)]')
        await self._send(f'* {n} EXISTS')
        await self._send('* 0 RECENT')
        if first_unseen:
            await self._send(f'* OK [UNSEEN {first_unseen}] First unseen')
        await self._send(f'* OK [UIDVALIDITY {UIDVALIDITY}]')
        await self._send(f'* OK [UIDNEXT {uidnext}]')
        read_write = 'READ-ONLY' if cmd == 'EXAMINE' else 'READ-WRITE'
        await self._send(f'{tag} OK [{read_write}] {cmd} completed')
        logger.info(
            "IMAP %s mailbox=%s messages=%s uidnext=%s user=%s",
            cmd,
            self.selected_mailbox,
            n,
            uidnext,
            self.user.email if self.user else "?",
        )

    async def _list(self, tag, cmd, args):
        await self._send('* LIST (\\HasNoChildren \\Inbox) "/" INBOX')
        await self._send('* LIST (\\HasNoChildren \\Sent) "/" Sent')
        await self._send('* LIST (\\HasNoChildren \\Drafts) "/" Drafts')
        await self._send(f'{tag} OK LIST completed')

    async def _lsub(self, tag, cmd, args):
        await self._send('* LSUB () "/" "INBOX"')
        await self._send('* LSUB () "/" "Sent"')
        await self._send('* LSUB () "/" "Drafts"')
        await self._send(f'{tag} OK LSUB completed')

    async def _status(self, tag, cmd, args):
        name = _normalize_mailbox(args)
        kind = _classify_mailbox(name)
        if kind == 'INBOX':
            emails = self._fetch_inbox()
            listed = 'INBOX'
        elif kind == 'Sent':
            emails = self._fetch_sent()
            listed = 'Sent'
        elif kind == 'Drafts':
            emails = []
            listed = 'Drafts'
        else:
            await self._send(f'{tag} NO Mailbox not found')
            return
        n = len(emails)
        unseen = sum(1 for e in emails if '\\Seen' not in e['flags'])
        uid_next = _uidnext(emails)
        await self._send(
            f'* STATUS "{listed}" '
            f'(MESSAGES {n} RECENT 0 UNSEEN {unseen} UIDNEXT {uid_next} UIDVALIDITY {UIDVALIDITY})'
        )
        await self._send(f'{tag} OK STATUS completed')

    async def _search(self, tag, cmd, args):
        await self._do_search(tag, args, uid_mode=False)

    async def _fetch(self, tag, cmd, args):
        await self._do_fetch(tag, args, uid_mode=False)

    async def _uid(self, tag, cmd, args):
        parts = args.strip().split(' ', 1)
        sub = parts[0].upper()
        sub_args = parts[1] if len(parts) > 1 else ''
        if sub == 'FETCH':
            await self._do_fetch(tag, sub_args, uid_mode=True)
        elif sub == 'SEARCH':
            await self._do_search(tag, sub_args, uid_mode=True)
        elif sub == 'STORE':
            await self._do_store(tag, sub_args, uid_mode=True)
        elif sub == 'COPY':
            await self._send(f'{tag} OK UID COPY completed')
        else:
            await self._send(f'{tag} BAD UID {sub} unknown')

    async def _store(self, tag, cmd, args):
        await self._do_store(tag, args, uid_mode=False)

    async def _do_store(self, tag, args, uid_mode=False):
        # Minimal: parse flags and acknowledge - persistence not needed for basic client support
        await self._send(f'{tag} OK STORE completed')

    async def _expunge(self, tag, cmd, args):
        await self._send(f'{tag} OK EXPUNGE completed')

    async def _close(self, tag, cmd, args):
        self.state = self.AUTHENTICATED
        self.selected_mailbox = None
        self.selected_emails = []
        await self._send(f'{tag} OK CLOSE completed')

    async def _namespace(self, tag, cmd, args):
        await self._send('* NAMESPACE (("" "/")) NIL NIL')
        await self._send(f'{tag} OK NAMESPACE completed')

    async def _id(self, tag, cmd, args):
        await self._send('* ID ("name" "MailServer" "version" "1.0")')
        await self._send(f'{tag} OK ID completed')

    # ------------------------------------------------------------------
    # Core logic helpers
    # ------------------------------------------------------------------

    async def _do_fetch(self, tag: str, args: str, uid_mode: bool):
        if self.state != self.SELECTED:
            await self._send(f'{tag} NO Not in selected state')
            return
        parts = args.strip().split(' ', 1)
        seq_set = parts[0]
        items_str = parts[1] if len(parts) > 1 else 'FLAGS'
        # Strip outer parens if present
        if items_str.startswith('(') and items_str.endswith(')'):
            items_str = items_str[1:-1]

        pairs = _parse_seq_set(seq_set, len(self.selected_emails), uid_mode, self.selected_emails)
        if not pairs and uid_mode:
            if self.selected_mailbox == "Sent":
                self.selected_emails = self._fetch_sent()
            elif self.selected_mailbox == "Drafts":
                self.selected_emails = []
            else:
                self.selected_emails = self._fetch_inbox()
            pairs = _parse_seq_set(seq_set, len(self.selected_emails), uid_mode, self.selected_emails)
        logger.info(
            "IMAP FETCH user=%s mailbox=%s uid=%s set=%s items=%s hits=%s",
            self.user.email if self.user else "?",
            self.selected_mailbox,
            uid_mode,
            seq_set,
            items_str[:120],
            len(pairs),
        )
        for seq_num, em in pairs:
            try:
                await self._send_bytes(_build_fetch_response(seq_num, em, items_str, uid_mode))
            except Exception as exc:
                logger.exception(
                    "IMAP FETCH build failed uid=%s user=%s: %s",
                    em.get("id"),
                    self.user.email if self.user else "?",
                    exc,
                )
        await self._send(f"{tag} OK FETCH completed")

    async def _do_search(self, tag: str, args: str, uid_mode: bool):
        # Simplified: return all messages (handles ALL, UNSEEN, etc. as "all")
        if uid_mode:
            nums = ' '.join(str(_imap_uid(e)) for e in self.selected_emails)
        else:
            nums = ' '.join(str(i + 1) for i in range(len(self.selected_emails)))
        logger.info(
            "IMAP SEARCH user=%s mailbox=%s uid=%s args=%s hits=%s",
            self.user.email if self.user else "?",
            self.selected_mailbox,
            uid_mode,
            (args or "")[:80],
            len(self.selected_emails),
        )
        await self._send(f'* SEARCH {nums}' if nums else '* SEARCH')
        await self._send(f'{tag} OK SEARCH completed')

    def _auth(self, username: str, password: str) -> User | None:
        if isinstance(username, (bytes, bytearray)):
            username = username.decode("utf-8", errors="replace")
        if isinstance(password, (bytes, bytearray)):
            password = password.decode("utf-8", errors="replace")
        login = (username or "").strip().lower()
        local = login.split("@", 1)[0]
        try:
            with self._db() as db:
                user = db.execute(
                    select(User).where(
                        (func.lower(User.email) == login)
                        | (func.lower(User.username) == local)
                    )
                ).scalar_one_or_none()
                if user and user.is_active and verify_password(password, user.hashed_password):
                    logger.info("IMAP login ok user=%s peer=%s", user.email, self._peer())
                    return user
                logger.warning("IMAP login failed login=%r peer=%s", login, self._peer())
        except Exception as exc:
            logger.error('IMAP auth error: %s', exc)
        return None

    def _fetch_inbox(self) -> list[dict]:
        return self._fetch_emails(is_sent=False)

    def _fetch_sent(self) -> list[dict]:
        return self._fetch_emails(is_sent=True)

    def _fetch_emails(self, is_sent: bool) -> list[dict]:
        if not self.user:
            return []
        try:
            with self._db() as db:
                rows = db.execute(
                    select(Email)
                    .where(
                        Email.user_id == self.user.id,
                        Email.is_sent == is_sent,
                        Email.is_draft.is_(False),
                    )
                    .order_by(Email.id)
                ).scalars().all()
                result = []
                for idx, e in enumerate(rows, start=1):
                    flags = ['\\Seen'] if (is_sent or e.is_read) else []
                    body, html_body = coerce_stored_bodies(e.body, e.html_body)
                    result.append({
                        'id': e.id,
                        'uid': idx,
                        'from': e.from_address,
                        'from_name': e.from_name,
                        'to': e.to_address,
                        'to_name': e.to_name,
                        'subject': e.subject or '',
                        'body': body,
                        'html_body': html_body,
                        'raw': getattr(e, 'raw_rfc822', None),
                        'date': e.received_at,
                        'flags': flags,
                    })
                return result
        except Exception as exc:
            logger.error('IMAP fetch error: %s', exc)
            return []


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

class IMAPServer:
    """Запускает IMAP4 на портах 143 (plain+STARTTLS) и 993 (SSL)."""

    def __init__(self):
        self._servers: list[asyncio.AbstractServer] = []
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread = None
        self._tls_ctx: ssl.SSLContext | None = None

    def start(self):
        import threading
        self._loop = asyncio.new_event_loop()

        def _run():
            asyncio.set_event_loop(self._loop)
            self._loop.run_until_complete(self._start_servers())
            self._loop.run_forever()

        self._thread = threading.Thread(target=_run, daemon=True, name='imap-thread')
        self._thread.start()
        logger.info('IMAPServer thread launched')

    async def _start_servers(self):
        sync_url = _get_sync_db_url()
        engine = create_engine(
            sync_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args=sync_connect_args(sync_url),
        )
        SyncSession = sessionmaker(engine, class_=Session, expire_on_commit=False)

        self._tls_ctx = _make_tls_context()
        host = settings.IMAP_HOST
        port_plain = settings.IMAP_PORT           # 143
        port_ssl = getattr(settings, 'IMAP_SSL_PORT', 993)

        async def _handle_plain(reader, writer):
            sess = IMAPSession(reader, writer, SyncSession, self._tls_ctx, is_ssl=False)
            await sess.handle()

        async def _handle_ssl(reader, writer):
            sess = IMAPSession(reader, writer, SyncSession, self._tls_ctx, is_ssl=True)
            await sess.handle()

        srv_plain = await asyncio.start_server(_handle_plain, host, port_plain)
        self._servers.append(srv_plain)
        logger.info('IMAP plain started on %s:%s (STARTTLS=%s)', host, port_plain, bool(self._tls_ctx))

        if self._tls_ctx:
            srv_ssl = await asyncio.start_server(_handle_ssl, host, port_ssl, ssl=self._tls_ctx)
            self._servers.append(srv_ssl)
            logger.info('IMAP SSL started on %s:%s', host, port_ssl)
        else:
            logger.warning('IMAP: no TLS context - port %s (SSL) not available', port_ssl)

    def stop(self):
        if self._servers and self._loop:
            for srv in self._servers:
                self._loop.call_soon_threadsafe(srv.close)
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread:
            self._thread.join(timeout=5)
        logger.info('IMAP servers stopped')


imap_server = IMAPServer()
