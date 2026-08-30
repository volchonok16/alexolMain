"""
IMAP4rev1 сервер: даёт доступ к почте через стандартные клиенты (Outlook, Apple Mail, etc.)

Порты:
  143  - plain / STARTTLS
  993  - SSL (IMAPS)

Поддерживаемые команды:
  CAPABILITY, NOOP, IDLE, LOGOUT, LOGIN, AUTHENTICATE, STARTTLS,
  SELECT, EXAMINE, LIST, LSUB, STATUS, SEARCH, FETCH, UID, STORE,
  EXPUNGE, CLOSE, NAMESPACE, ID, SUBSCRIBE, UNSUBSCRIBE, APPEND
"""
import asyncio
import ssl
import os
import re
import logging
import subprocess
import tempfile
from datetime import datetime, timezone
from email.charset import Charset
from email.header import Header
from email.message import Message
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import format_datetime, formataddr, getaddresses, parseaddr
from email.parser import BytesParser
from email import policy as email_policy

# CRLF like SMTP, but 8bit so reconstructed HTML is not BASE64 with mismatched sizes.
_IMAP_GEN_POLICY = email_policy.SMTP.clone(cte_type="8bit")
_UTF8_8BIT = Charset("utf-8")
_UTF8_8BIT.body_encoding = None

from sqlalchemy import create_engine, delete, func, nulls_last, select
from sqlalchemy.orm import sessionmaker, Session

from app.mail_photos import user_to_vcard
from app.mail_sync import (
    allocate_imap_uid_sync,
    apply_store_flags,
    flags_for_email,
    is_outlook_probe,
    parse_store_args,
)
from app.models import User, Email
from app.auth import verify_password
from app.config import settings
from app.mail_body import coerce_stored_bodies, extract_text_and_html
from app.from_display import inject_from_display_name
from app.database import sync_connect_args

logger = logging.getLogger(__name__)

# Bump when FETCH/SELECT/LIST format changes so Outlook drops a stale empty cache.
# 24: no SPECIAL-USE / slash hierarchy — leftover INBOX/INBOX clones stay ghosts.
UIDVALIDITY = 24
_OUTLOOK_LIST_FETCH = (
    "FLAGS UID INTERNALDATE RFC822.SIZE ENVELOPE "
    "BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT TO CC BCC MESSAGE-ID CONTENT-TYPE)]"
)
_IMAP_MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def _redact_imap_line(line: str) -> str:
    """Never log LOGIN passwords or AUTHENTICATE SASL payloads."""
    m = re.match(r'^(\S+)\s+(LOGIN|AUTHENTICATE)\b(.*)', line, re.I)
    if not m:
        return line
    cmd = m.group(2).upper()
    rest = m.group(3).strip()
    if cmd == "LOGIN":
        if rest.startswith('"'):
            end = rest.find('"', 1)
            user = rest[1:end] if end > 0 else "?"
        else:
            user = rest.split()[0] if rest else "?"
        return f"{m.group(1)} LOGIN {user} ***"
    mech = (rest.split() or ["?"])[0]
    return f"{m.group(1)} AUTHENTICATE {mech} ***"


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
    """Mailbox-local IMAP UID. DB ids as UIDs make UIDNEXT >> EXISTS; Outlook skips FETCH."""
    return int(em.get("uid") or em["id"])


def _uidnext(emails: list[dict]) -> int:
    if not emails:
        return 1
    return max(_imap_uid(e) for e in emails) + 1


def _ensure_crlf(data: bytes) -> bytes:
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n").replace(b"\n", b"\r\n")


def _normalize_mailbox(args: str) -> str:
    """First IMAP argument only — ignore SELECT/STATUS modifiers like (CONDSTORE)."""
    parsed = _parse_args(args or "")
    return (parsed[0] if parsed else "INBOX").strip()


def _classify_mailbox(name: str) -> str | None:
    n = (name or "").strip().strip('"').replace("\\", "/")
    # Outlook leftover children (INBOX/INBOX, INBOX.INBOX) are not real mailboxes.
    if "/" in n or "." in n:
        return None
    n = n.upper()
    if n in ("INBOX", "", "ВХОДЯЩИЕ", "ВХОДЯЩИЕ СООБЩЕНИЯ"):
        return "INBOX"
    if n in (
        "SENT", "SENT ITEMS", "SENT MESSAGES", "GESENDETE ELEMENTE",
        "ОТПРАВЛЕННЫЕ", "ОТПРАВЛЕННЫЕ СООБЩЕНИЯ",
    ):
        return "Sent"
    if n in ("DRAFTS", "DRAFT", "ЧЕРНОВИКИ"):
        return "Drafts"
    if n in ("CONTACTS", "CONTACT", "КОНТАКТЫ"):
        return "Contacts"
    return None


def _list_pattern_is_children(reference: str, mailbox: str) -> bool:
    """True when the client is listing children of INBOX (Outlook folder tree)."""
    ref = (reference or "").strip().strip('"')
    mb = (mailbox or "").strip().strip('"')
    combined = f"{ref}{mb}".upper().replace("\\", "/")
    if mb in ("%", "INBOX/%", "INBOX/%/", "INBOX.*"):
        return True
    if ref.upper() in ("INBOX", "INBOX/") and mb in ("%", "*", "%/"):
        return True
    if combined.startswith("INBOX/") and ("%" in mb or "*" in mb):
        return True
    return False


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
    """Octets/lines of the transfer-encoded part body — must match BODY[n]."""
    payload = _raw_part_body(part)
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


def _walk_part(msg: Message, nums: list[int]) -> Message | None:
    if not nums:
        return msg
    n, rest = nums[0], nums[1:]
    if not msg.is_multipart():
        return msg if n == 1 and not rest else None
    payload = msg.get_payload()
    if not isinstance(payload, list) or n < 1 or n > len(payload):
        return None
    return _walk_part(payload[n - 1], rest)


def _raw_part_body(part: Message) -> bytes:
    payload = part.get_payload(decode=False)
    if isinstance(payload, bytes):
        return _ensure_crlf(payload)
    if isinstance(payload, str):
        charset = part.get_content_charset() or "utf-8"
        try:
            return _ensure_crlf(payload.encode(charset, "replace"))
        except LookupError:
            return _ensure_crlf(payload.encode("utf-8", "replace"))
    raw = _ensure_crlf(part.as_bytes(policy=email_policy.compat32))
    sep = b"\r\n\r\n"
    if sep in raw:
        return raw.split(sep, 1)[1]
    return raw


def _raw_part_headers(part: Message) -> bytes:
    raw = _ensure_crlf(part.as_bytes(policy=email_policy.compat32))
    sep = b"\r\n\r\n"
    if sep in raw:
        return raw.split(sep, 1)[0] + sep
    return raw


def _header_fields_wanted(spec: str, target: Message) -> set[str] | None:
    fm = re.match(r"HEADER\.FIELDS(\.NOT)?\s*\((.*)\)\s*$", spec, re.I | re.S)
    if not fm:
        return None
    named = {n.strip().upper() for n in fm.group(2).split() if n.strip()}
    if fm.group(1):
        return {k.upper() for k in target.keys()} - named
    return named


def _section_payload(rfc: bytes, section: str) -> tuple[str, bytes]:
    """Return (BODY[section] label, octets) for an IMAP BODY[section] fetch."""
    parsed = BytesParser(policy=email_policy.compat32).parsebytes(rfc)
    section = (section or "").strip()
    label = "BODY[]" if not section else f"BODY[{section}]"
    if not section:
        return label, rfc

    nums: list[int] = []
    rest = section
    numbered = re.match(
        r"^(\d+(?:\.\d+)*)(?:\.(HEADER(?:\.FIELDS(?:\.NOT)?\s*\([^)]*\))?|MIME|TEXT))?$",
        section,
        re.I | re.S,
    )
    if numbered:
        nums = [int(x) for x in numbered.group(1).split(".")]
        rest = (numbered.group(2) or "").strip()

    target = _walk_part(parsed, nums) if nums else parsed
    if target is None:
        return label, b""

    rest_up = rest.upper()
    wanted = _header_fields_wanted(rest, target)
    if wanted is not None:
        return label, _header_subset_bytes(target, wanted)
    if rest_up in ("HEADER", "MIME"):
        return label, _raw_part_headers(target)
    if rest_up == "TEXT" or (nums and not rest):
        return label, _raw_part_body(target)
    if not nums and rest_up == "HEADER":
        return label, _raw_part_headers(parsed)
    return label, rfc


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
                # Outlook sometimes UID FETCHes 1..EXISTS even when DB ids are larger.
                if not matched and lo >= 1 and hi <= total:
                    for seq in range(lo, min(hi, total) + 1):
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


def _text_part(content: str, subtype: str) -> MIMEText:
    part = MIMEText(content or "", subtype)
    part.set_charset(_UTF8_8BIT)
    if part.get("Content-Transfer-Encoding"):
        del part["Content-Transfer-Encoding"]
    part["Content-Transfer-Encoding"] = "8bit"
    return part


def _email_to_rfc822(em: dict) -> bytes:
    date = em.get('date') or datetime.now(timezone.utc)
    if isinstance(date, datetime) and date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    date_str = format_datetime(date)

    if em.get('html_body'):
        msg = MIMEMultipart('alternative')
        msg.attach(_text_part(em.get('body', '') or '', 'plain'))
        msg.attach(_text_part(em['html_body'], 'html'))
    else:
        msg = _text_part(em.get('body', '') or '', 'plain')

    from_addr = em.get('from', '') or ''
    from_name = (em.get('from_name') or '').strip()
    msg['From'] = formataddr((from_name, from_addr)) if from_addr else from_name
    msg['To'] = em.get('to', '')
    msg['Subject'] = em.get('subject', '') or ''
    msg['Date'] = date_str
    msg['Message-ID'] = f"<{em['id']}@{settings.MAIL_DOMAIN}>"
    return _ensure_crlf(msg.as_bytes(policy=_IMAP_GEN_POLICY))


def _message_bytes(em: dict) -> bytes:
    raw = em.get("raw")
    if raw:
        return _ensure_crlf(bytes(raw))
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
        for section_match in re.finditer(
            r"BODY(?:\.PEEK)?\[([^\]]*)\](?:<(\d+)\.(\d+)>)?",
            items_str,
            re.IGNORECASE,
        ):
            section = (section_match.group(1) or "").strip()
            origin = section_match.group(2)
            slen = section_match.group(3)
            label, payload = _section_payload(rfc, section)
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
                logger.debug('IMAP < %s', _redact_imap_line(line))
                await self._dispatch(line)
        except asyncio.TimeoutError:
            try:
                await self._send('* BYE Autologout; idle for too long')
            except Exception:
                pass
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
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
        elif cmd == "AUTHENTICATE":
            mech = rest.split()[0] if rest else "?"
            logger.info(
                "IMAP cmd=AUTHENTICATE %s peer=%s user=%s",
                mech,
                self._peer(),
                self.user.email if self.user else "-",
            )
        else:
            logger.info(
                "IMAP cmd=%s %s peer=%s user=%s",
                cmd,
                rest[:160],
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
            'SUBSCRIBE': self._subscribe,
            'UNSUBSCRIBE': self._unsubscribe,
            'APPEND': self._append,
            'CREATE': self._create,
            'DELETE': self._delete_mailbox,
            'CHECK': self._noop,
            'COPY': self._ok,
            'ENABLE': self._ok,
            'MOVE': self._ok,
            'UNSELECT': self._close,
        }
        handler = dispatch.get(cmd, self._unknown)
        await handler(tag, cmd, rest)

    async def _capability(self, tag, cmd, args):
        # Exact set from the last Outlook FETCH+IDLE sessions. ID in CAPABILITY
        # made the proxy send ID and treat the session as a folder probe.
        caps = 'IMAP4rev1 AUTH=PLAIN AUTH=LOGIN IDLE'
        if self._tls_ctx and not self._is_ssl:
            caps += ' STARTTLS'
        await self._send(f'* CAPABILITY {caps}')
        await self._send(f'{tag} OK CAPABILITY completed')

    def _reload_selected(self) -> list[dict]:
        if self.selected_mailbox == 'Sent':
            return self._fetch_sent()
        if self.selected_mailbox == 'Drafts':
            return []
        if self.selected_mailbox == 'Contacts':
            return self._fetch_contacts()
        return self._fetch_inbox()

    def _uidnext_for(self, is_sent: bool) -> int:
        if not self.user:
            return 1
        try:
            with self._db() as db:
                user = db.get(User, self.user.id)
                if not user:
                    return 1
                val = user.sent_uidnext if is_sent else user.inbox_uidnext
                return int(val or 1)
        except Exception:
            return 1

    def _mailbox_uidnext(self) -> int:
        return self._uidnext_for(self.selected_mailbox == 'Sent')

    async def _push_mailbox_updates(self) -> None:
        """IDLE/NOOP: EXPUNGE deletions, FETCH FLAGS for Seen, EXISTS for new mail."""
        if self.state != self.SELECTED or not self.selected_mailbox:
            return
        if self.selected_mailbox in ('Drafts', 'Contacts'):
            return
        old = list(self.selected_emails)
        new = self._reload_selected()
        new_by_id = {e['id']: e for e in new}

        for i in range(len(old) - 1, -1, -1):
            if old[i]['id'] not in new_by_id:
                await self._send(f'* {i + 1} EXPUNGE')
                old.pop(i)

        for i, em in enumerate(old):
            nxt = new_by_id[em['id']]
            if set(em.get('flags') or []) != set(nxt.get('flags') or []):
                flags_str = ' '.join(nxt.get('flags') or [])
                await self._send(
                    f'* {i + 1} FETCH (FLAGS ({flags_str}) UID {_imap_uid(nxt)})'
                )
                old[i] = nxt

        old_ids = {e['id'] for e in old}
        added = [e for e in new if e['id'] not in old_ids]
        if added:
            await self._send(f'* {len(new)} EXISTS')
            if added:
                await self._send(f'* {len(added)} RECENT')
        self.selected_emails = new

    async def _noop(self, tag, cmd, args):
        await self._push_mailbox_updates()
        await self._send(f'{tag} OK {cmd} completed')

    async def _idle(self, tag, cmd, args):
        if self.state not in (self.AUTHENTICATED, self.SELECTED) or not self.user:
            await self._send(f'{tag} NO Not authenticated')
            return
        if self.state != self.SELECTED:
            # Some clients IDLE right after LOGIN. Do not emit EXISTS first:
            # Outlook then drops the session. Select INBOX silently, then +.
            self.selected_mailbox = 'INBOX'
            self.selected_emails = self._fetch_inbox()
            self.state = self.SELECTED
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
        """Read APPEND body. ACKing without consuming the literal hangs Outlook send."""
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
            try:
                await asyncio.wait_for(self.reader.readexactly(2), timeout=10)
            except Exception:
                pass
        except Exception as exc:
            logger.warning('IMAP APPEND read failed: %s', exc)
            await self._send(f'{tag} NO APPEND failed')
            return

        box = (mailbox or 'INBOX').strip().strip('"').upper()
        is_sent = box in (
            'SENT', 'SENT ITEMS', 'SENT MESSAGES',
            'ОТПРАВЛЕННЫЕ', 'ОТПРАВЛЕННЫЕ СООБЩЕНИЯ',
        )
        if is_sent:
            self._save_appended_sent(data)
        await self._send(f'{tag} OK APPEND completed')

    def _save_appended_sent(self, data: bytes) -> None:
        if not self.user or not data:
            return
        try:
            data, injected_name = inject_from_display_name(
                data, self.user.full_name or "", self.user.email
            )
            msg = BytesParser(policy=email_policy.default).parsebytes(data)
            mid = (msg.get('Message-ID') or '').strip()
            header_name, header_addr = parseaddr(msg.get('From') or '')
            from_address = (header_addr or self.user.email).strip().lower()
            if is_outlook_probe(msg.get("subject") or "", header_name):
                return
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
                imap_uid = allocate_imap_uid_sync(db, self.user.id, True)
                db.add(Email(
                    user_id=self.user.id,
                    from_address=from_address,
                    to_address=(msg.get('To') or '').strip() or self.user.email,
                    from_name=(injected_name or header_name or "").strip() or self.user.full_name,
                    subject=msg.get('subject', '') or '',
                    body=body,
                    html_body=html_body,
                    raw_rfc822=data,
                    is_sent=True,
                    is_read=True,
                    imap_uid=imap_uid,
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
            logger.info("IMAP LOGIN ok user=%s peer=%s", user.email, self._peer())
        else:
            logger.warning("IMAP LOGIN failed user=%r peer=%s", parts[0], self._peer())
            await self._send(f'{tag} NO [AUTHENTICATIONFAILED] Invalid credentials')

    async def _authenticate(self, tag, cmd, args):
        mech = args.strip().split()[0].upper() if args.strip() else ''
        if mech == 'PLAIN':
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
                logger.info("IMAP AUTHENTICATE ok user=%s peer=%s", user.email, self._peer())
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
            logger.warning('STARTTLS upgrade failed: %s', exc)
            try:
                self.writer.close()
            except Exception:
                pass
            self.state = self.LOGOUT
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
            # Cached Outlook folder; do not advertise Drafts in LIST.
            emails = []
            self.selected_mailbox = 'Drafts'
        elif kind == 'Contacts':
            emails = []
            self.selected_mailbox = 'Contacts'
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
        uidnext = self._mailbox_uidnext()

        # Compact UIDs 1..N so UIDNEXT = EXISTS+1. FLAGS like 72926ed (Outlook
        # skipped FETCH when UIDNEXT was a DB id, e.g. 102 with EXISTS 18).
        await self._send(r'* FLAGS (\Answered \Flagged \Deleted \Seen \Draft)')
        await self._send(r'* OK [PERMANENTFLAGS (\Answered \Flagged \Deleted \Seen \Draft)]')
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
        parsed = _parse_args(args or "")
        reference = parsed[0] if parsed else ""
        mailbox = parsed[1] if len(parsed) > 1 else "*"
        if _list_pattern_is_children(reference, mailbox):
            await self._send(f'{tag} OK LIST completed')
            return
        # NIL delimiter + \Noinferiors: Outlook cannot nest INBOX/INBOX.
        await self._send(r'* LIST (\Noinferiors) NIL INBOX')
        await self._send(r'* LIST (\HasNoChildren) NIL Sent')
        await self._send(f'{tag} OK LIST completed')

    async def _lsub(self, tag, cmd, args):
        parsed = _parse_args(args or "")
        reference = parsed[0] if parsed else ""
        mailbox = parsed[1] if len(parsed) > 1 else "*"
        if _list_pattern_is_children(reference, mailbox):
            await self._send(f'{tag} OK LSUB completed')
            return
        await self._send(r'* LSUB (\Noinferiors) NIL INBOX')
        await self._send(r'* LSUB (\HasNoChildren) NIL Sent')
        await self._send(f'{tag} OK LSUB completed')

    async def _create(self, tag, cmd, args):
        kind = _classify_mailbox(_normalize_mailbox(args))
        if kind in ("INBOX", "Sent"):
            await self._send(f'{tag} NO [ALREADYEXISTS] Mailbox exists')
            return
        await self._send(f'{tag} NO CREATE not supported')

    async def _delete_mailbox(self, tag, cmd, args):
        kind = _classify_mailbox(_normalize_mailbox(args))
        if kind in ("INBOX", "Sent"):
            await self._send(f'{tag} NO [NOPERM] Cannot delete {kind}')
            return
        await self._send(f'{tag} OK DELETE completed')

    async def _subscribe(self, tag, cmd, args):
        kind = _classify_mailbox(_normalize_mailbox(args))
        if kind in ("INBOX", "Sent"):
            await self._send(f'{tag} OK SUBSCRIBE completed')
            return
        await self._send(f'{tag} NO Mailbox not found')

    async def _unsubscribe(self, tag, cmd, args):
        await self._send(f'{tag} OK UNSUBSCRIBE completed')

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
        elif kind == 'Contacts':
            emails = self._fetch_contacts()
            listed = 'Contacts'
        else:
            await self._send(f'{tag} NO Mailbox not found')
            return
        n = len(emails)
        unseen = sum(1 for e in emails if '\\Seen' not in e['flags'])
        uid_next = self._uidnext_for(kind == 'Sent')
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
        elif sub == 'EXPUNGE':
            await self._expunge_uids(tag, sub_args)
        elif sub == 'COPY':
            await self._send(f'{tag} OK UID COPY completed')
        else:
            await self._send(f'{tag} BAD UID {sub} unknown')

    async def _store(self, tag, cmd, args):
        await self._do_store(tag, args, uid_mode=False)

    async def _do_store(self, tag, args, uid_mode=False):
        if self.state != self.SELECTED or not self.user:
            await self._send(f'{tag} NO Not in selected state')
            return
        parsed = parse_store_args(args)
        if not parsed:
            await self._send(f'{tag} BAD Invalid STORE')
            return
        seq_set, mode, silent, flags = parsed
        pairs = _parse_seq_set(
            seq_set, len(self.selected_emails), uid_mode, self.selected_emails
        )
        if not pairs:
            await self._send(f'{tag} OK STORE completed')
            return
        updates: list[tuple[int, dict]] = []
        try:
            with self._db() as db:
                ids = [em['id'] for _, em in pairs]
                rows = db.execute(
                    select(Email).where(
                        Email.id.in_(ids),
                        Email.user_id == self.user.id,
                    )
                ).scalars().all()
                by_id = {row.id: row for row in rows}
                for seq_num, em in pairs:
                    row = by_id.get(em['id'])
                    if not row:
                        continue
                    apply_store_flags(row, flags, mode)
                    em['flags'] = flags_for_email(row)
                    updates.append((seq_num, em))
                db.commit()
        except Exception as exc:
            logger.exception("IMAP STORE failed: %s", exc)
            await self._send(f'{tag} NO STORE failed')
            return
        if not silent:
            for seq_num, em in updates:
                flags_str = ' '.join(em.get('flags') or [])
                await self._send(
                    f'* {seq_num} FETCH (FLAGS ({flags_str}) UID {_imap_uid(em)})'
                )
        logger.info(
            "IMAP STORE user=%s mode=%s silent=%s flags=%s count=%s",
            self.user.email if self.user else "?",
            mode,
            silent,
            flags,
            len(updates),
        )
        await self._send(f'{tag} OK STORE completed')

    async def _expunge_deleted(self, *, only_uids: set[int] | None, silent: bool) -> None:
        victims = []
        for i, em in enumerate(self.selected_emails):
            if '\\Deleted' not in (em.get('flags') or []):
                continue
            if only_uids is not None and _imap_uid(em) not in only_uids:
                continue
            victims.append((i + 1, em))
        if not victims or not self.user:
            return
        ids = [em['id'] for _, em in victims]
        try:
            with self._db() as db:
                db.execute(
                    delete(Email).where(
                        Email.id.in_(ids),
                        Email.user_id == self.user.id,
                    )
                )
                db.commit()
        except Exception as exc:
            logger.exception("IMAP EXPUNGE failed: %s", exc)
            return
        if not silent:
            for seq, _em in reversed(victims):
                await self._send(f'* {seq} EXPUNGE')
        gone = {em['id'] for _, em in victims}
        self.selected_emails = [em for em in self.selected_emails if em['id'] not in gone]
        logger.info(
            "IMAP EXPUNGE user=%s removed=%s",
            self.user.email if self.user else "?",
            len(ids),
        )

    async def _expunge(self, tag, cmd, args):
        if self.state != self.SELECTED:
            await self._send(f'{tag} NO Not in selected state')
            return
        await self._expunge_deleted(only_uids=None, silent=False)
        await self._send(f'{tag} OK EXPUNGE completed')

    async def _expunge_uids(self, tag, args):
        if self.state != self.SELECTED:
            await self._send(f'{tag} NO Not in selected state')
            return
        pairs = _parse_seq_set(
            args.strip() or '*',
            len(self.selected_emails),
            True,
            self.selected_emails,
        )
        uids = {_imap_uid(em) for _, em in pairs}
        await self._expunge_deleted(only_uids=uids, silent=False)
        await self._send(f'{tag} OK UID EXPUNGE completed')

    async def _close(self, tag, cmd, args):
        if self.state == self.SELECTED:
            await self._expunge_deleted(only_uids=None, silent=True)
        self.state = self.AUTHENTICATED
        self.selected_mailbox = None
        self.selected_emails = []
        await self._send(f'{tag} OK {cmd} completed')

    async def _namespace(self, tag, cmd, args):
        await self._send('* NAMESPACE (("" NIL)) NIL NIL')
        await self._send(f'{tag} OK NAMESPACE completed')

    async def _id(self, tag, cmd, args):
        await self._send('* ID ("name" "MailServer" "version" "1.0")')
        await self._send(f'{tag} OK ID completed')

    async def _do_fetch(self, tag: str, args: str, uid_mode: bool):
        if self.state != self.SELECTED:
            await self._send(f'{tag} NO Not in selected state')
            return
        parts = args.strip().split(' ', 1)
        seq_set = parts[0]
        items_str = parts[1] if len(parts) > 1 else 'FLAGS'
        if items_str.startswith('(') and items_str.endswith(')'):
            items_str = items_str[1:-1]

        pairs = _parse_seq_set(seq_set, len(self.selected_emails), uid_mode, self.selected_emails)
        if not pairs and uid_mode:
            if self.selected_mailbox == "Sent":
                self.selected_emails = self._fetch_sent()
            elif self.selected_mailbox == "Drafts":
                self.selected_emails = []
            elif self.selected_mailbox == "Contacts":
                self.selected_emails = self._fetch_contacts()
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
        sent = 0
        try:
            for seq_num, em in pairs:
                await self._send_bytes(_build_fetch_response(seq_num, em, items_str, uid_mode))
                sent += 1
            await self._send(f"{tag} OK FETCH completed")
        except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
            logger.warning(
                "IMAP FETCH client closed user=%s mailbox=%s sent=%s/%s",
                self.user.email if self.user else "?",
                self.selected_mailbox,
                sent,
                len(pairs),
            )

    async def _do_search(self, tag: str, args: str, uid_mode: bool):
        emails = list(self.selected_emails)
        header_m = re.search(
            r'HEADER\s+"?MESSAGE-ID"?\s+"([^"]+)"', args or "", re.I
        )
        if header_m:
            needle = header_m.group(1).encode("utf-8", "replace")
            emails = [
                e for e in emails
                if needle in (e.get("raw") or b"")
                or needle.decode("utf-8", "replace") in (e.get("subject") or "")
            ]
        if uid_mode:
            nums = " ".join(str(_imap_uid(e)) for e in emails)
        else:
            idset = {e["id"] for e in emails}
            nums = " ".join(
                str(i + 1)
                for i, e in enumerate(self.selected_emails)
                if e["id"] in idset
            )
        logger.info(
            "IMAP SEARCH user=%s mailbox=%s uid=%s args=%s hits=%s",
            self.user.email if self.user else "?",
            self.selected_mailbox,
            uid_mode,
            (args or "")[:80],
            len(emails),
        )
        await self._send(f"* SEARCH {nums}" if nums else "* SEARCH")
        await self._send(f"{tag} OK SEARCH completed")

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
                    return user
        except Exception as exc:
            logger.error('IMAP auth error: %s', exc)
        return None

    def _fetch_inbox(self) -> list[dict]:
        return self._fetch_emails(is_sent=False)

    def _fetch_sent(self) -> list[dict]:
        return self._fetch_emails(is_sent=True)

    def _fetch_contacts(self) -> list[dict]:
        """Virtual mailbox: one vCard message per colleague for Outlook People."""
        if not self.user:
            return []
        try:
            with self._db() as db:
                rows = db.execute(
                    select(User)
                    .where(User.is_active.is_(True))
                    .order_by(User.id)
                ).scalars().all()
                result = []
                for idx, u in enumerate(rows, start=1):
                    vcf = user_to_vcard(u)
                    msg = _text_part(vcf, "vcard")
                    msg["From"] = formataddr((u.full_name or "", u.email))
                    msg["To"] = self.user.email
                    msg["Subject"] = u.full_name or u.email
                    msg["Date"] = format_datetime(datetime.now(timezone.utc))
                    msg["Message-ID"] = f"<contact-{u.id}@{settings.MAIL_DOMAIN}>"
                    raw = _ensure_crlf(msg.as_bytes(policy=_IMAP_GEN_POLICY))
                    result.append({
                        "id": u.id,
                        "uid": idx,
                        "from": u.email,
                        "from_name": u.full_name,
                        "to": self.user.email,
                        "to_name": self.user.full_name,
                        "subject": u.full_name or u.email,
                        "body": vcf,
                        "html_body": "",
                        "raw": raw,
                        "date": datetime.now(timezone.utc),
                        "flags": ["\\Seen"],
                    })
                return result
        except Exception as exc:
            logger.error("IMAP contacts fetch error: %s", exc)
            return []

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
                        Email.is_draft.is_not(True),
                    )
                    .order_by(nulls_last(Email.imap_uid), Email.id)
                ).scalars().all()
                result = []
                for idx, e in enumerate(rows, start=1):
                    flags = flags_for_email(e)
                    body, html_body = coerce_stored_bodies(e.body, e.html_body)
                    result.append({
                        'id': e.id,
                        'uid': int(e.imap_uid or idx),
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
        port_plain = settings.IMAP_PORT
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
