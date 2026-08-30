"""Extract plain/HTML bodies from inbound MIME and recover HTML stored as text."""

from __future__ import annotations

import base64
import re

_HTML_DOC = re.compile(r"^\s*(?:<!DOCTYPE\s+html|<html[\s>])", re.I)
_TAG_HINTS = re.compile(r"<(?:table|div|h1|p|img|body|head)\b", re.I)
_B64 = re.compile(r"^[A-Za-z0-9+/=\s]+$")


def looks_like_html(text: str | None) -> bool:
    if not text:
        return False
    t = text.replace("\ufeff", "").strip()
    if not t:
        return False
    if _HTML_DOC.match(t):
        return True
    if t.lstrip().startswith("<p>") or t.lstrip().startswith("<div"):
        return True
    if re.search(r"<body[\s>]", t, re.I) and re.search(r"</html>", t, re.I):
        return True
    return len(_TAG_HINTS.findall(t)) >= 4


def looks_like_ics(text: str | None) -> bool:
    t = (text or "").lstrip()
    return t.startswith("BEGIN:VCALENDAR")


def maybe_decode_stored(text: str) -> str:
    """Undo CTE left in the body (base64 HTML/ICS shown as garbage in webmail)."""
    raw = sanitize_pg_text(text or "")
    if not raw.strip() or looks_like_html(raw) or looks_like_ics(raw):
        return raw
    compact = re.sub(r"\s+", "", raw)
    if len(compact) < 16 or not _B64.fullmatch(compact):
        return raw
    pad = (-len(compact)) % 4
    try:
        decoded = base64.b64decode(compact + "=" * pad).decode("utf-8")
    except Exception:
        return raw
    decoded = sanitize_pg_text(decoded)
    if looks_like_html(decoded) or looks_like_ics(decoded) or decoded.lstrip().startswith("<"):
        return decoded
    return raw


def meeting_bodies_from_ics(ics_text: str) -> tuple[str, str]:
    from app.cal_invite import parse_calendar

    parsed = parse_calendar(ics_text)
    if not parsed:
        plain = "Приглашение на встречу"
        return plain, f"<p>{plain}</p>"
    when = ""
    if parsed.start_at:
        when = parsed.start_at.strftime("%d.%m.%Y %H:%M")
        if parsed.end_at:
            when += "–" + parsed.end_at.strftime("%H:%M")
    lines = ["Приглашение на встречу"]
    if parsed.title:
        lines.append(parsed.title)
    if when:
        lines.append(f"Когда: {when} UTC")
    if parsed.location:
        lines.append(f"Где: {parsed.location}")
    if parsed.description:
        lines.append(parsed.description)
    plain = "\n".join(lines)
    html_bits = ["<p>Приглашение на встречу</p>"]
    if parsed.title:
        html_bits.append(f"<p><strong>{_html(parsed.title)}</strong></p>")
    meta = []
    if when:
        meta.append(f"Когда: {_html(when)} UTC")
    if parsed.location:
        meta.append(f"Где: {_html(parsed.location)}")
    if meta:
        html_bits.append("<p>" + "<br/>".join(meta) + "</p>")
    if parsed.description:
        html_bits.append(f"<p>{_html(parsed.description)}</p>")
    return plain, "".join(html_bits)


def _html(value: str) -> str:
    return (
        (value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("\n", "<br/>")
    )


def coerce_stored_bodies(body: str | None, html_body: str | None) -> tuple[str, str]:
    """If HTML arrived as a single-part / text/plain payload, expose it as html_body."""
    body = maybe_decode_stored(sanitize_pg_text(body or ""))
    html_body = maybe_decode_stored(sanitize_pg_text(html_body or ""))
    if looks_like_ics(html_body):
        return meeting_bodies_from_ics(html_body)
    if looks_like_ics(body):
        return meeting_bodies_from_ics(body)
    if html_body.strip():
        return body, html_body
    if looks_like_html(body):
        return body, body
    return body, html_body


def sanitize_pg_text(value: str | None) -> str:
    """Postgres text/varchar cannot store NUL (0x00). ZIP/DMARC payloads often have it."""
    if value is None:
        return ""
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    return str(value).replace("\x00", "").replace("\ufeff", "")


def _looks_binary(text: str) -> bool:
    if not text:
        return False
    if "\x00" in text:
        return True
    return text.startswith("PK") and len(text) > 4 and not text[2:4].isprintable()


def _is_calendar_part(part) -> bool:
    ctype = (part.get_content_type() or "").lower()
    if ctype in ("text/calendar", "application/ics"):
        return True
    name = (part.get_filename() or "").lower()
    return name.endswith(".ics")


def _decode_part(part) -> str:
    if part is None or _is_calendar_part(part):
        return ""
    main = (part.get_content_maintype() or "").lower()
    if main and main not in ("text", "multipart", "message"):
        return ""
    raw = None
    try:
        raw = part.get_payload(decode=True)
    except Exception:
        raw = None
    charset = part.get_content_charset() or "utf-8"
    text = ""
    if isinstance(raw, (bytes, bytearray)):
        try:
            text = bytes(raw).decode(charset, errors="replace")
        except LookupError:
            text = bytes(raw).decode("utf-8", errors="replace")
    elif isinstance(raw, str):
        text = raw
    else:
        try:
            content = part.get_content()
        except Exception:
            payload = part.get_payload()
            content = payload if isinstance(payload, str) else ""
        if isinstance(content, bytes):
            content = content.decode("utf-8", errors="replace")
        text = content or ""
    text = maybe_decode_stored((text or "").replace("\ufeff", ""))
    if _looks_binary(text):
        name = part.get_filename() or part.get_content_type() or "attachment"
        return f"[{name}]"
    return sanitize_pg_text(text)


def extract_text_and_html(msg) -> tuple[str, str]:
    html = ""
    plain = ""
    ics_fallback = ""
    get_body = getattr(msg, "get_body", None)
    if callable(get_body):
        html = _decode_part(get_body(preferencelist=("html",)))
        plain = _decode_part(get_body(preferencelist=("plain",)))

    if not html:
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            disp = (part.get_content_disposition() or "").lower()
            if disp == "attachment" or _is_calendar_part(part):
                continue
            if part.get_content_type() == "text/html":
                html = _decode_part(part)
                if html:
                    break

    if not plain:
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            disp = (part.get_content_disposition() or "").lower()
            if disp == "attachment" or _is_calendar_part(part):
                continue
            if part.get_content_type() == "text/plain":
                plain = _decode_part(part)
                if plain:
                    break

    if not html and not plain:
        for part in msg.walk():
            if not _is_calendar_part(part):
                continue
            try:
                raw = part.get_payload(decode=True) or b""
                ics_fallback = bytes(raw).decode("utf-8", errors="replace")
            except Exception:
                ics_fallback = ""
            if looks_like_ics(ics_fallback):
                break
        ctype = (msg.get_content_type() or "").lower()
        main = (msg.get_content_maintype() or "").lower()
        if looks_like_ics(ics_fallback):
            return meeting_bodies_from_ics(ics_fallback)
        if main != "text":
            name = msg.get_filename() or ctype or "attachment"
            plain = f"[{name}]"
        else:
            text = maybe_decode_stored(_decode_part(msg) or "")
            if not text and _is_calendar_part(msg):
                try:
                    raw = msg.get_payload(decode=True) or b""
                    text = bytes(raw).decode("utf-8", errors="replace")
                except Exception:
                    text = ""
            if looks_like_ics(text):
                return meeting_bodies_from_ics(text)
            if ctype == "text/html" or looks_like_html(text):
                html = text
            else:
                plain = text

    if looks_like_ics(html):
        return meeting_bodies_from_ics(html)
    if looks_like_ics(plain) and not html:
        return meeting_bodies_from_ics(plain)
    return sanitize_pg_text(plain), sanitize_pg_text(html)


def peek_rfc822_header(content: bytes, name: str) -> str:
    """Read one header without parsing the whole MIME tree (fast path for SMTP/IMAP)."""
    if not content or not name:
        return ""
    blob = content[:16384]
    split = blob.split(b"\r\n\r\n", 1)[0]
    if split == blob:
        split = blob.split(b"\n\n", 1)[0]
    try:
        text = split.decode("utf-8", errors="replace")
    except Exception:
        text = split.decode("latin-1", errors="replace")
    key = name.lower() + ":"
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.lower().startswith(key):
            value = line.split(":", 1)[1].strip()
            i += 1
            while i < len(lines) and lines[i][:1] in (" ", "\t"):
                value += " " + lines[i].strip()
                i += 1
            return value.strip()
        i += 1
    return ""
