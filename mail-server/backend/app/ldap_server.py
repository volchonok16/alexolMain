"""LDAP directory for Outlook Check Names / Address Book (GAL)."""
from __future__ import annotations

import asyncio
import logging
import ssl
import threading

from pyasn1.codec.ber import decoder, encoder
from sqlalchemy import create_engine, func, or_, select
from sqlalchemy.orm import Session, sessionmaker

from app.auth import verify_password
from app.config import settings
from app.database import sync_connect_args
from app.imap_server import _get_sync_db_url, _make_tls_context
from app.ldap_directory import (
    dn_in_scope,
    eval_ldap_filter,
    ldap_base_dn,
    ldap_people_ou,
    ldap_user_dn,
    parse_bind_identity,
    user_ldap_attrs,
)
from app.models import User
from ldap3.operation.bind import bind_request_to_dict, bind_response_operation
from ldap3.operation.search import search_request_to_dict
from ldap3.protocol.rfc4511 import (
    AttributeDescription,
    AttributeValue,
    LDAPDN,
    LDAPMessage,
    LDAPString,
    MessageID,
    PartialAttribute,
    PartialAttributeList,
    ProtocolOp,
    ResultCode,
    SearchResultDone,
    SearchResultEntry,
    Vals,
)

logger = logging.getLogger(__name__)

_SCOPE_BASE = 0
_SCOPE_ONE = 1
_SCOPE_SUB = 2
_MAX_PDU = 8_000_000


def _base_dn() -> str:
    return ldap_base_dn(settings.MAIL_DOMAIN)


def _people_ou() -> str:
    return ldap_people_ou(settings.MAIL_DOMAIN)


def _ldap_wrap(message_id: int, op_name: str, component) -> bytes:
    msg = LDAPMessage()
    msg["messageID"] = MessageID(message_id)
    msg["protocolOp"] = ProtocolOp().setComponentByName(op_name, component)
    return encoder.encode(msg)


def _search_done(message_id: int, result_code: int = 0, diagnostic: str = "") -> bytes:
    done = SearchResultDone()
    done["resultCode"] = ResultCode(result_code)
    done["matchedDN"] = LDAPDN("")
    done["diagnosticMessage"] = LDAPString(diagnostic)
    return _ldap_wrap(message_id, "searchResDone", done)


def _bind_done(message_id: int, result_code: int = 0, diagnostic: str = "") -> bytes:
    return _ldap_wrap(message_id, "bindResponse", bind_response_operation(result_code, diagnostic_message=diagnostic))


def _entry_bytes(message_id: int, dn: str, attrs: dict[str, list[str]], requested: list[str], types_only: bool) -> bytes:
    want = {a.lower() for a in requested if a not in ("*", "1.1", "")}
    no_vals = "1.1" in requested
    entry = SearchResultEntry()
    entry["object"] = LDAPDN(dn)
    pal = PartialAttributeList()
    idx = 0
    for attr, values in attrs.items():
        if attr.lower() == "entrydn":
            continue
        if want and attr.lower() not in want:
            continue
        pa = PartialAttribute()
        pa["type"] = AttributeDescription(attr)
        vals = Vals()
        if not types_only and not no_vals:
            for j, value in enumerate(values):
                raw = value.encode("utf-8") if isinstance(value, str) else value
                vals.setComponentByPosition(j, AttributeValue(raw))
        pa["vals"] = vals
        pal.setComponentByPosition(idx, pa)
        idx += 1
    entry["attributes"] = pal
    return _ldap_wrap(message_id, "searchResEntry", entry)


def _root_dse_attrs() -> dict[str, list[str]]:
    base = _base_dn()
    return {
        "objectClass": ["top"],
        "namingContexts": [base],
        "defaultNamingContext": [base],
        "supportedLDAPVersion": ["3"],
        "vendorName": ["alexol-mail"],
        "vendorVersion": ["1"],
    }


async def _read_pdu(reader: asyncio.StreamReader) -> bytes | None:
    try:
        tag = await reader.readexactly(1)
        lenb = await reader.readexactly(1)
    except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError):
        return None
    lb = lenb[0]
    try:
        if lb < 0x80:
            rest = await reader.readexactly(lb) if lb else b""
            return tag + lenb + rest
        n = lb & 0x7F
        if n == 0 or n > 4:
            raise ValueError("invalid BER length")
        rawlen = await reader.readexactly(n)
        length = int.from_bytes(rawlen, "big")
        if length > _MAX_PDU:
            raise ValueError("LDAP PDU too large")
        rest = await reader.readexactly(length)
        return tag + lenb + rawlen + rest
    except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError, ValueError):
        return None


class LDAPSession:
    def __init__(self, reader, writer, sync_session_factory, tls_ctx: ssl.SSLContext | None):
        self.reader = reader
        self.writer = writer
        self._sf = sync_session_factory
        self._tls_ctx = tls_ctx
        self.bound_user: User | None = None

    def _peer(self) -> str:
        try:
            addr = self.writer.get_extra_info("peername")
            return str(addr)
        except Exception:
            return "?"

    async def _send(self, data: bytes) -> None:
        self.writer.write(data)
        await self.writer.drain()

    def _load_people(self) -> list[tuple[str, dict[str, list[str]]]]:
        with self._sf() as db:
            rows = db.execute(select(User).where(User.is_active.is_(True)).order_by(User.full_name.asc())).scalars().all()
            out: list[tuple[str, dict[str, list[str]]]] = []
            used: set[str] = set()
            for user in rows:
                attrs = user_ldap_attrs(user, settings.MAIL_DOMAIN)
                dn = ldap_user_dn(user.username, settings.MAIL_DOMAIN, user.full_name or "")
                if dn.lower() in used:
                    dn = ldap_user_dn(user.username, settings.MAIL_DOMAIN, f"{user.full_name or user.username} ({user.username})")
                    attrs["entryDN"] = [dn]
                used.add(dn.lower())
                out.append((dn, attrs))
            return out

    def _authenticate(self, identity: str, password: str) -> User | None:
        ident = (identity or "").strip().lower()
        if not ident or not password:
            return None
        local = ident.split("@", 1)[0]
        with self._sf() as db:
            user = db.execute(
                select(User).where(
                    or_(
                        func.lower(User.email) == ident,
                        func.lower(User.username) == local,
                        func.lower(User.username) == ident,
                    )
                )
            ).scalar_one_or_none()
            if user and user.is_active and verify_password(password, user.hashed_password):
                return user
        return None

    async def _handle_bind(self, message_id: int, request) -> None:
        info = bind_request_to_dict(request)
        name = info.get("name") or ""
        auth = info.get("authentication") or {}
        if auth.get("sasl"):
            await self._send(_bind_done(message_id, 7, "SASL not supported"))
            return
        simple = auth.get("simple")
        password = "" if simple is None else str(simple).replace("\x00", "").strip()
        identity = parse_bind_identity(name)
        if identity is None and not password:
            self.bound_user = None
            await self._send(_bind_done(message_id, 0))
            logger.info("LDAP anonymous bind peer=%s", self._peer())
            return
        if identity is None or not password:
            await self._send(_bind_done(message_id, 49, "invalid credentials"))
            return
        user = self._authenticate(identity, password)
        if not user:
            await self._send(_bind_done(message_id, 49, "invalid credentials"))
            logger.info("LDAP bind failed identity=%s peer=%s", identity, self._peer())
            return
        self.bound_user = user
        await self._send(_bind_done(message_id, 0))
        logger.info("LDAP bind ok user=%s peer=%s", user.email, self._peer())

    def _under_tree(self, base: str) -> bool:
        base_l = (base or "").strip().lower()
        ours = _base_dn().lower()
        if not base_l:
            return True
        return base_l == ours or base_l.endswith("," + ours) or base_l == _people_ou().lower()

    async def _handle_search(self, message_id: int, request) -> None:
        info = search_request_to_dict(request)
        base = (info.get("base") or "").strip()
        scope = int(info.get("scope") or 0)
        ldap_filter = info.get("filter") or "(objectClass=*)"
        requested = info.get("attributes") or []
        types_only = bool(info.get("typesOnly"))
        size_limit = int(info.get("sizeLimit") or 0)

        if not base and scope == _SCOPE_BASE:
            await self._send(_entry_bytes(message_id, "", _root_dse_attrs(), requested, types_only))
            await self._send(_search_done(message_id))
            return

        if self.bound_user is None:
            await self._send(_search_done(message_id, 50, "bind required"))
            return

        if not self._under_tree(base):
            await self._send(_search_done(message_id, 32, "no such object"))
            return

        people = self._load_people()
        hits: list[tuple[str, dict[str, list[str]]]] = []
        search_base = base or _base_dn()

        def _matches(attrs: dict[str, list[str]]) -> bool:
            try:
                return eval_ldap_filter(ldap_filter, attrs)
            except ValueError:
                return False

        if scope == _SCOPE_BASE and search_base.lower() == _base_dn().lower():
            dc_attrs = {
                "objectClass": ["top", "domain", "organization"],
                "dc": [_base_dn().split(",", 1)[0].removeprefix("dc=")],
                "o": [settings.MAIL_DOMAIN],
            }
            if _matches(dc_attrs):
                hits.append((_base_dn(), dc_attrs))
        elif scope == _SCOPE_BASE:
            for dn, attrs in people:
                if dn.lower() == search_base.lower() and _matches(attrs):
                    hits.append((dn, attrs))
                    break
        else:
            for dn, attrs in people:
                if dn_in_scope(dn, search_base, scope) and _matches(attrs):
                    hits.append((dn, attrs))

        sent = 0
        for dn, attrs in hits:
            if size_limit and sent >= size_limit:
                break
            await self._send(_entry_bytes(message_id, dn, attrs, requested, types_only))
            sent += 1
        await self._send(_search_done(message_id))
        logger.info(
            "LDAP search user=%s base=%r filter=%s hits=%s peer=%s",
            self.bound_user.email if self.bound_user else "-",
            base,
            ldap_filter[:120],
            sent,
            self._peer(),
        )

    async def handle(self) -> None:
        try:
            while True:
                pdu = await _read_pdu(self.reader)
                if not pdu:
                    return
                try:
                    msg, _ = decoder.decode(pdu, asn1Spec=LDAPMessage())
                except Exception:
                    logger.warning("LDAP decode failed peer=%s", self._peer())
                    return
                message_id = int(msg["messageID"])
                op = msg["protocolOp"]
                name = op.getName()
                if name == "bindRequest":
                    await self._handle_bind(message_id, op["bindRequest"])
                elif name == "unbindRequest":
                    return
                elif name == "searchRequest":
                    await self._handle_search(message_id, op["searchRequest"])
                elif name == "abandonRequest":
                    continue
                else:
                    await self._send(_search_done(message_id, 53, "unwilling to perform"))
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
            return
        except Exception:
            logger.exception("LDAP session error peer=%s", self._peer())
        finally:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass


class LDAPServer:
    def __init__(self):
        self._servers: list[asyncio.AbstractServer] = []
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None

    def start(self):
        self._loop = asyncio.new_event_loop()

        def _run():
            asyncio.set_event_loop(self._loop)
            self._loop.run_until_complete(self._start_servers())
            self._loop.run_forever()

        self._thread = threading.Thread(target=_run, daemon=True, name="ldap-thread")
        self._thread.start()
        logger.info("LDAPServer thread launched")

    async def _start_servers(self):
        sync_url = _get_sync_db_url()
        engine = create_engine(
            sync_url,
            pool_pre_ping=True,
            pool_size=3,
            max_overflow=5,
            connect_args=sync_connect_args(sync_url),
        )
        SyncSession = sessionmaker(engine, class_=Session, expire_on_commit=False)
        tls_ctx = _make_tls_context()
        host = getattr(settings, "LDAP_HOST", "0.0.0.0")
        port_plain = getattr(settings, "LDAP_PORT", 389)
        port_ssl = getattr(settings, "LDAP_SSL_PORT", 636)

        async def _handle_plain(reader, writer):
            await LDAPSession(reader, writer, SyncSession, tls_ctx).handle()

        async def _handle_ssl(reader, writer):
            await LDAPSession(reader, writer, SyncSession, tls_ctx).handle()

        srv_plain = await asyncio.start_server(_handle_plain, host, port_plain)
        self._servers.append(srv_plain)
        logger.info("LDAP plain started on %s:%s (base=%s)", host, port_plain, _base_dn())

        if tls_ctx:
            srv_ssl = await asyncio.start_server(_handle_ssl, host, port_ssl, ssl=tls_ctx)
            self._servers.append(srv_ssl)
            logger.info("LDAP SSL started on %s:%s", host, port_ssl)
        else:
            logger.warning("LDAP: no TLS context — port %s (SSL) not available", port_ssl)

    def stop(self):
        if self._servers and self._loop:
            for srv in self._servers:
                self._loop.call_soon_threadsafe(srv.close)
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("LDAP servers stopped")


ldap_server = LDAPServer()
