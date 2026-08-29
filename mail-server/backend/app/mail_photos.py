"""Public avatars, vCard, and MIME helpers for Outlook / Gmail / Yandex."""
from __future__ import annotations

import base64
import re
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from typing import Optional
from urllib.parse import quote

from app.avatar_resolve import load_avatar_bytes
from app.config import settings
from app.models import User


def public_avatar_url(email: str) -> str:
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return f"{base}/api/public/avatar/{quote((email or '').strip().lower(), safe='@.')}"


def public_vcard_url(email: str) -> str:
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return f"{base}/api/public/vcard/{quote((email or '').strip().lower(), safe='@.')}"


def _vcard_escape(value: str) -> str:
    return (value or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold_vcard_line(line: str) -> str:
    if len(line) <= 75:
        return line
    parts = [line[:75]]
    rest = line[75:]
    while rest:
        parts.append(" " + rest[:74])
        rest = rest[74:]
    return "\r\n".join(parts)


def vcard_photo_lines(user: User) -> list[str]:
    lines: list[str] = []
    if user.avatar_url:
        lines.append(f"PHOTO;VALUE=URI:{public_avatar_url(user.email)}")
        loaded = load_avatar_bytes(user.avatar_url)
        if loaded:
            data, content_type, _name = loaded
            subtype = "JPEG"
            if "png" in content_type:
                subtype = "PNG"
            elif "gif" in content_type:
                subtype = "GIF"
            b64 = base64.b64encode(data).decode("ascii")
            lines.append(_fold_vcard_line(f"PHOTO;ENCODING=b;TYPE={subtype}:{b64}"))
    return lines


def user_to_vcard(user: User) -> str:
    parts = (user.full_name or "").strip().split(None, 1)
    first = parts[0] if parts else (user.full_name or user.email)
    last = parts[1] if len(parts) > 1 else ""
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{_vcard_escape(user.full_name or user.email)}",
        f"N:{_vcard_escape(last)};{_vcard_escape(first)};;;",
        f"EMAIL;TYPE=WORK,INTERNET:{user.email}",
        f"ORG:{_vcard_escape(settings.MAIL_DOMAIN)}",
        f"URL:{public_vcard_url(user.email)}",
    ]
    if user.job_title:
        lines.append(f"TITLE:{_vcard_escape(user.job_title)}")
    if user.phone:
        lines.append(f"TEL;TYPE=WORK,VOICE:{_vcard_escape(user.phone)}")
    if user.telegram:
        lines.append(f"X-TELEGRAM:{_vcard_escape(user.telegram)}")
    if user.username:
        lines.append(f"NICKNAME:{_vcard_escape(user.username)}")
    lines.extend(vcard_photo_lines(user))
    lines.append("END:VCARD")
    return "\r\n".join(lines) + "\r\n"


def vcard_filename(user: User) -> str:
    name = re.sub(r"[^\w.\- ]+", "", user.full_name or "contact", flags=re.UNICODE).strip()
    return f"{name or 'contact'}.vcf"


def attach_sender_vcard(msg: MIMEMultipart, user: User) -> None:
    payload = user_to_vcard(user).encode("utf-8")
    part = MIMEApplication(payload, _subtype="vcard", Name=vcard_filename(user))
    part.set_type("text/vcard")
    part.add_header("Content-Disposition", "attachment", filename=vcard_filename(user))
    part.add_header("Content-Type", 'text/vcard; charset="utf-8"; name="%s"' % vcard_filename(user))
    msg.attach(part)
