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


_MONTHS_RU = (
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
)


def join_urls(location: str | None) -> list[str]:
    urls: list[str] = []
    for part in (location or "").replace("·", " ").split():
        token = part.strip().rstrip(".,;)")
        if token.lower().startswith("http://") or token.lower().startswith("https://"):
            urls.append(token)
    return urls


def location_label(location: str | None) -> str:
    text = location or ""
    for url in join_urls(text):
        text = text.replace(url, "")
    text = " ".join(text.replace("·", " ").split()).strip(" ·")
    if text:
        return text
    return "Видеозвонок Jitsi" if join_urls(location) else "—"


def format_meeting_when(start, end) -> str:
    if not start:
        return ""
    day = f"{start.day} {_MONTHS_RU[start.month - 1]} {start.year}"
    stamp = start.strftime("%H:%M")
    if end:
        stamp += "–" + end.strftime("%H:%M")
    return f"{day}, {stamp}"


def meeting_invite_plain(
    *,
    lead: str,
    title: str,
    when: str,
    location: str | None,
    description: str | None = None,
) -> str:
    lines = [lead.strip(), "", title.strip() or "Встреча"]
    if when:
        lines.append(f"Когда: {when}")
    if location:
        lines.append(f"Где: {location}")
    urls = join_urls(location)
    if urls:
        lines.append(f"Видеозвонок: {urls[0]}")
    if description:
        lines.extend(["", description.strip()])
    return "\n".join(lines).strip() + "\n"


def meeting_invite_html(
    *,
    lead: str,
    title: str,
    when: str,
    location: str | None,
    description: str | None = None,
    organizer: str | None = None,
    attendees: list[str] | None = None,
    method: str = "REQUEST",
) -> str:
    """Outlook-safe table layout with a join button. Also renders in our webmail."""
    cancelled = (method or "REQUEST").upper() == "CANCEL"
    urls = join_urls(location)
    join_url = urls[0] if urls and not cancelled else ""
    where = location_label(location)
    accent = "#94a3b8" if cancelled else "#0e7490"
    badge = "Встреча отменена" if cancelled else "Видеовстреча"
    people = [name for name in (attendees or []) if name]
    rows: list[tuple[str, str]] = []
    if when:
        rows.append(("Когда", when))
    if where and where != "—":
        rows.append(("Где", where))
    if organizer:
        rows.append(("Организатор", organizer))
    if people:
        rows.append(("Участники", ", ".join(people)))

    font = "Segoe UI,Roboto,Helvetica,Arial,sans-serif"
    meta_html = ""
    for i, (label, value) in enumerate(rows):
        pad = "12px 0" if i else "0 0 12px"
        line = "border-top:1px solid #e2e8f0;" if i else ""
        meta_html += (
            "<tr>"
            f'<td style="padding:{pad};width:120px;color:#64748b;font-size:13px;'
            f'font-family:{font};vertical-align:top;{line}">{_html(label)}</td>'
            f'<td style="padding:{pad};color:#0f172a;font-size:15px;font-weight:600;'
            f'font-family:{font};vertical-align:top;{line}">{_html(value)}</td>'
            "</tr>"
        )

    button = ""
    if join_url:
        href = _html(join_url)
        # Padding lives on <td>: Outlook strips padding/display on <a>.
        # Color lives on <span>: Outlook paints <a> with the theme hyperlink color.
        button = (
            '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0 8px">'
            "<tr>"
            '<td align="center" bgcolor="#0e7490" '
            'style="background-color:#0e7490;border-radius:10px;padding:16px 28px;">'
            f'<a class="alexol-join" href="{href}" target="_blank" '
            'style="text-decoration:none;display:block;text-align:center;">'
            f'<span class="alexol-join" style="font-family:{font};font-size:16px;'
            'font-weight:700;color:#ffffff;line-height:20px;text-decoration:none;">'
            "Присоединиться к видеозвонку</span></a>"
            "</td></tr></table>"
            f'<p style="margin:0 0 8px;font-size:12px;line-height:1.45;color:#64748b;font-family:{font}">'
            "Если кнопка не открывается, скопируйте ссылку:<br/>"
            f'<a class="alexol-join-fallback" href="{href}" style="color:#0e7490;word-break:break-all">{href}</a></p>'
        )

    desc = ""
    if description and description.strip():
        desc = (
            f'<p style="margin:16px 0 0;font-size:14px;line-height:1.55;color:#334155;font-family:{font}">'
            f"{_html(description.strip())}</p>"
        )

    return f"""
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#e8eef3">
  <tr>
    <td align="center" style="padding:24px 12px">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #dbe4ee">
        <tr>
          <td style="height:8px;line-height:8px;font-size:0;background:{accent};border-radius:16px 16px 0 0">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 32px 32px;font-family:{font}">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:{accent};font-weight:700">{_html(badge)}</p>
            <p style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a">{_html(title or "Встреча")}</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#475569">{_html(lead)}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">{meta_html}</table>
            {button}
            {desc}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
""".strip()


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
        return plain, meeting_invite_html(lead=plain, title="Встреча", when="", location=None)
    when = format_meeting_when(parsed.start_at, parsed.end_at)
    lead = "Приглашение на встречу"
    if (parsed.method or "").upper() == "CANCEL":
        lead = "Встреча отменена"
    attendee_names = [name or email for email, name, _status in parsed.attendees]
    plain = meeting_invite_plain(
        lead=lead,
        title=parsed.title or "Встреча",
        when=when,
        location=parsed.location,
        description=parsed.description,
    )
    html = meeting_invite_html(
        lead=lead,
        title=parsed.title or "Встреча",
        when=when,
        location=parsed.location,
        description=parsed.description,
        organizer=parsed.organizer_name or parsed.organizer_email,
        attendees=attendee_names,
        method=parsed.method or "REQUEST",
    )
    return plain, html


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
    return sanitize_pg_text(plain).rstrip("\r\n"), sanitize_pg_text(html)


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
