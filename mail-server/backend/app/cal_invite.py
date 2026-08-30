"""iMIP/iCalendar helpers so Outlook and mail.alexol.io share meetings."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from email import encoders, policy as email_policy
from email.message import Message
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.config import settings
from app.models import CalendarEvent

_FOLD = 75
_WIN_TZ = {
    "russian standard time": "Europe/Moscow",
    "gmt standard time": "Europe/London",
    "utc": "UTC",
    "coordinated universal time": "UTC",
    "pacific standard time": "America/Los_Angeles",
    "eastern standard time": "America/New_York",
    "central europe standard time": "Europe/Berlin",
    "w. europe standard time": "Europe/Berlin",
    "gmt+3": "Europe/Moscow",
    "saratov standard time": "Europe/Saratov",
}


def mail_domain() -> str:
    return (settings.MAIL_DOMAIN or "alexol.io").replace("@", "")


def event_uid(event: CalendarEvent) -> str:
    if (event.ical_uid or "").strip():
        return event.ical_uid.strip()
    return f"event-{event.id}@{mail_domain()}"


def _ics_escape(value: str) -> str:
    return (
        (value or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _ics_unescape(value: str) -> str:
    out: list[str] = []
    i = 0
    text = value or ""
    while i < len(text):
        if text[i] == "\\" and i + 1 < len(text):
            nxt = text[i + 1]
            out.append({"n": "\n", "N": "\n", ",": ",", ";": ";", "\\": "\\"}.get(nxt, nxt))
            i += 2
            continue
        out.append(text[i])
        i += 1
    return "".join(out)


def _fold_line(line: str) -> str:
    raw = line.encode("utf-8")
    if len(raw) <= _FOLD:
        return line
    chunks: list[bytes] = []
    while raw:
        piece = raw[:_FOLD]
        while len(piece) > 1 and (piece[-1] & 0xC0) == 0x80:
            piece = piece[:-1]
        chunks.append(piece)
        raw = raw[len(piece):]
    return "\r\n ".join(c.decode("utf-8") for c in chunks)


def _stamp(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def _partstat(status: str) -> str:
    mapping = {
        "accepted": "ACCEPTED",
        "declined": "DECLINED",
        "tentative": "TENTATIVE",
        "invited": "NEEDS-ACTION",
        "needs-action": "NEEDS-ACTION",
    }
    return mapping.get((status or "").lower(), "NEEDS-ACTION")


def from_partstat(value: str) -> str:
    mapping = {
        "ACCEPTED": "accepted",
        "DECLINED": "declined",
        "TENTATIVE": "tentative",
        "NEEDS-ACTION": "invited",
        "DELEGATED": "invited",
    }
    return mapping.get((value or "").upper(), "invited")


def build_vevent(event: CalendarEvent, *, method: str) -> str:
    uid = event_uid(event)
    stamp = _stamp(event.updated_at or event.created_at or datetime.utcnow())
    seq = int(event.ical_sequence or 0)
    if method.upper() == "CANCEL":
        seq = max(seq, 1)
    status = "CANCELLED" if method.upper() == "CANCEL" else "CONFIRMED"
    org = event.organizer
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{stamp}",
        f"DTSTART:{_stamp(event.start_at)}",
        f"DTEND:{_stamp(event.end_at)}",
        f"SUMMARY:{_ics_escape(event.title)}",
        f"SEQUENCE:{seq}",
        f"STATUS:{status}",
        "TRANSP:OPAQUE",
    ]
    if event.description:
        lines.append(f"DESCRIPTION:{_ics_escape(event.description)}")
    if event.location:
        lines.append(f"LOCATION:{_ics_escape(event.location)}")
    if org:
        lines.append(f"ORGANIZER;CN={_ics_escape(org.full_name)}:mailto:{org.email}")
        lines.append(
            f"ATTENDEE;CN={_ics_escape(org.full_name)};ROLE=CHAIR;PARTSTAT=ACCEPTED;"
            f"RSVP=FALSE:mailto:{org.email}"
        )
    for att in event.attendees or []:
        cn = _ics_escape(att.display_name or att.email)
        stat = _partstat(att.status)
        rsvp = "FALSE" if stat == "ACCEPTED" else "TRUE"
        lines.append(
            f"ATTENDEE;CN={cn};ROLE=REQ-PARTICIPANT;PARTSTAT={stat};RSVP={rsvp}:mailto:{att.email}"
        )
    lines.append("END:VEVENT")
    return "\r\n".join(_fold_line(line) for line in lines)


def build_vcalendar(event: CalendarEvent, method: str = "REQUEST") -> str:
    method = (method or "REQUEST").upper()
    chunks = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Alexol//Mail Calendar//RU",
        "CALSCALE:GREGORIAN",
        f"METHOD:{method}",
        f"X-WR-CALNAME:Alexol {mail_domain()}",
    ]
    chunks.append(build_vevent(event, method=method))
    chunks.append("END:VCALENDAR")
    return "\r\n".join(chunks) + "\r\n"


def build_meeting_rfc822(
    *,
    organizer,
    event: CalendarEvent,
    to_addrs: list[str],
    subject: str,
    body: str,
    html: str,
    method: str = "REQUEST",
) -> bytes:
    ics = build_vcalendar(event, method)
    method = (method or "REQUEST").upper()

    plain = MIMEText(body or "", "plain", "utf-8")
    rich = MIMEText(html or body or "", "html", "utf-8")
    calendar = MIMEText(ics, "calendar", "utf-8")
    calendar.replace_header(
        "Content-Type",
        f'text/calendar; method={method}; charset="UTF-8"; name="meeting.ics"',
    )
    calendar["Content-Class"] = "urn:content-classes:calendarmessage"

    alt = MIMEMultipart("alternative")
    alt.attach(plain)
    alt.attach(rich)
    alt.attach(calendar)

    ics_file = MIMEBase("application", "ics", name="meeting.ics")
    ics_file.set_payload(ics.encode("utf-8"))
    encoders.encode_base64(ics_file)
    ics_file.add_header("Content-Disposition", "attachment", filename="meeting.ics")
    ics_file.add_header("Content-Class", "urn:content-classes:calendarmessage")

    mixed = MIMEMultipart("mixed")
    mixed["From"] = formataddr((organizer.full_name or "", organizer.email))
    mixed["To"] = ", ".join(to_addrs) if to_addrs else organizer.email
    mixed["Subject"] = subject
    mixed["Message-ID"] = make_msgid(domain=mail_domain())
    mixed["Content-Class"] = "urn:content-classes:calendarmessage"
    mixed.attach(alt)
    mixed.attach(ics_file)
    return mixed.as_bytes(policy=email_policy.SMTP)


def _unfold(text: str) -> str:
    return re.sub(r"\r?\n[ \t]", "", text or "")


def _parse_prop(line: str) -> tuple[str, dict[str, str], str]:
    if ":" not in line:
        return "", {}, line
    meta, value = line.split(":", 1)
    bits = meta.split(";")
    name = (bits[0] or "").upper()
    params: dict[str, str] = {}
    for bit in bits[1:]:
        if "=" in bit:
            key, raw = bit.split("=", 1)
            params[key.upper()] = raw.strip().strip('"')
    return name, params, value


def _mailto(value: str) -> str:
    text = (value or "").strip().strip("<>")
    if text.lower().startswith("mailto:"):
        text = text[7:]
    return text.strip().lower()


def _zone(tzid: str):
    name = (tzid or "").strip().strip('"')
    if not name:
        return None
    mapped = _WIN_TZ.get(name.lower(), name)
    try:
        return ZoneInfo(mapped)
    except ZoneInfoNotFoundError:
        return timezone.utc if mapped.upper() == "UTC" else None


def parse_ics_datetime(value: str, params: dict[str, str] | None = None) -> datetime:
    params = params or {}
    text = (value or "").strip()
    if params.get("VALUE", "").upper() == "DATE" or (len(text) == 8 and "T" not in text):
        return datetime.strptime(text[:8], "%Y%m%d")
    if text.endswith("Z"):
        return datetime.strptime(text, "%Y%m%dT%H%M%SZ")
    dt = datetime.strptime(text[:15], "%Y%m%dT%H%M%S")
    zone = _zone(params.get("TZID") or "")
    if zone is not None:
        return dt.replace(tzinfo=zone).astimezone(timezone.utc).replace(tzinfo=None)
    return dt


class ParsedEvent:
    __slots__ = (
        "uid",
        "method",
        "sequence",
        "status",
        "title",
        "description",
        "location",
        "start_at",
        "end_at",
        "organizer_email",
        "organizer_name",
        "attendees",
        "all_day",
    )

    def __init__(self) -> None:
        self.uid = ""
        self.method = "REQUEST"
        self.sequence = 0
        self.status = "CONFIRMED"
        self.title = ""
        self.description = ""
        self.location = ""
        self.start_at: Optional[datetime] = None
        self.end_at: Optional[datetime] = None
        self.organizer_email = ""
        self.organizer_name = ""
        self.attendees: list[tuple[str, str, str]] = []
        self.all_day = False


def parse_calendar(ics_text: str, default_method: str = "REQUEST") -> Optional[ParsedEvent]:
    body = _unfold(ics_text.replace("\r\n", "\n").replace("\r", "\n"))
    if "BEGIN:VEVENT" not in body.upper():
        return None
    parsed = ParsedEvent()
    parsed.method = (default_method or "REQUEST").upper()
    in_event = False
    for raw in body.split("\n"):
        line = raw.strip("\n")
        if not line:
            continue
        name, params, value = _parse_prop(line)
        if name == "BEGIN" and value.upper() == "VEVENT":
            in_event = True
            continue
        if name == "END" and value.upper() == "VEVENT":
            break
        if name == "METHOD":
            parsed.method = (value or parsed.method).upper()
            continue
        if not in_event:
            continue
        if name == "UID":
            parsed.uid = value.strip()
        elif name == "SUMMARY":
            parsed.title = _ics_unescape(value).strip()
        elif name == "DESCRIPTION":
            parsed.description = _ics_unescape(value).strip()
        elif name == "LOCATION":
            parsed.location = _ics_unescape(value).strip()
        elif name == "SEQUENCE":
            try:
                parsed.sequence = int(value.strip() or "0")
            except ValueError:
                parsed.sequence = 0
        elif name == "STATUS":
            parsed.status = (value or "CONFIRMED").upper()
        elif name == "DTSTART":
            parsed.start_at = parse_ics_datetime(value, params)
            parsed.all_day = params.get("VALUE", "").upper() == "DATE" or (
                len(value.strip()) == 8 and "T" not in value
            )
        elif name == "DTEND":
            parsed.end_at = parse_ics_datetime(value, params)
        elif name == "ORGANIZER":
            parsed.organizer_email = _mailto(value)
            parsed.organizer_name = _ics_unescape(params.get("CN") or "")
        elif name == "ATTENDEE":
            email = _mailto(value)
            if email:
                parsed.attendees.append(
                    (
                        email,
                        _ics_unescape(params.get("CN") or ""),
                        from_partstat(params.get("PARTSTAT") or ""),
                    )
                )
    if not parsed.uid or not parsed.start_at:
        return None
    if parsed.end_at is None:
        parsed.end_at = parsed.start_at
    if parsed.end_at <= parsed.start_at:
        parsed.end_at = parsed.start_at
    return parsed


def extract_calendar_parts(msg: Message) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for part in msg.walk():
        ctype = (part.get_content_type() or "").lower()
        filename = (part.get_filename() or "").lower()
        if ctype not in ("text/calendar", "application/ics") and not filename.endswith(".ics"):
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        charset = part.get_content_charset() or "utf-8"
        try:
            text = bytes(payload).decode(charset, "replace")
        except LookupError:
            text = bytes(payload).decode("utf-8", "replace")
        method = (part.get_param("method") or "").upper()
        found.append((method or "REQUEST", text))
    return found
