"""Public avatars, vCard, and MIME helpers for Outlook / Gmail / Yandex."""
from __future__ import annotations

import base64
import re
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
import io
from typing import Optional
from urllib.parse import quote

from app.avatar_resolve import load_avatar_bytes
from app.config import settings
from app.models import User
from app.org_profile import org_role_labels

def image_bytes_to_jpeg(data: bytes, max_side: int = 240, max_bytes: int = 100_000) -> Optional[bytes]:
    """Outlook GAL photos are JPEG (`jpegPhoto` / `thumbnailPhoto`)."""
    if not data:
        return None
    try:
        from PIL import Image
    except ImportError:
        return data if data[:3] == b"\xff\xd8\xff" and len(data) <= max_bytes else None
    try:
        image = Image.open(io.BytesIO(data))
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        elif image.mode == "L":
            image = image.convert("RGB")
        image.thumbnail((max_side, max_side))
        quality = 85
        out = b""
        while quality >= 40:
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=quality, optimize=True)
            out = buf.getvalue()
            if len(out) <= max_bytes:
                return out
            quality -= 15
        return out if out[:3] == b"\xff\xd8\xff" else None
    except Exception:
        return data if data[:3] == b"\xff\xd8\xff" and len(data) <= max_bytes else None


_ldap_photo_cache: dict[str, dict[str, list[bytes]]] = {}


def user_ldap_photos(user: User) -> dict[str, list[bytes]]:
    """Per-mailbox JPEG for Outlook — never reuse another person's file."""
    url = (getattr(user, "avatar_url", None) or "").strip()
    if not url:
        return {}
    cache_key = f"{getattr(user, 'id', '')}:{url}"
    cached = _ldap_photo_cache.get(cache_key)
    if cached is not None:
        return cached
    loaded = load_avatar_bytes(url)
    out: dict[str, list[bytes]] = {}
    if loaded:
        data, _ctype, _name = loaded
        full = image_bytes_to_jpeg(data, 240, 100_000)
        thumb = image_bytes_to_jpeg(data, 96, 40_000)
        if full:
            out["jpegPhoto"] = [full]
        if thumb:
            out["thumbnailPhoto"] = [thumb]
    _ldap_photo_cache[cache_key] = out
    if len(_ldap_photo_cache) > 80:
        _ldap_photo_cache.pop(next(iter(_ldap_photo_cache)))
    return out


def public_avatar_url(email: str) -> str:
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return f"{base}/api/public/avatar/{quote((email or '').strip().lower(), safe='@.')}"


def oauth_picture_url(email: str) -> str:
    """Public HTTPS avatar for OIDC `picture` (Bitbucket downloads without auth)."""
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return f"{base}/api/users/avatar/{quote((email or '').strip().lower(), safe='@.')}"


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
    """Embedded base64 only — Outlook imports photos from vCard, not from HTTP URIs."""
    if not user.avatar_url:
        return []
    loaded = load_avatar_bytes(user.avatar_url)
    if not loaded:
        return []
    data, content_type, _name = loaded
    subtype = "JPEG"
    if "png" in content_type:
        subtype = "PNG"
    elif "gif" in content_type:
        subtype = "GIF"
    b64 = base64.b64encode(data).decode("ascii")
    return [_fold_vcard_line(f"PHOTO;ENCODING=b;TYPE={subtype}:{b64}")]


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
        f"URL:{public_vcard_url(user.email)}",
    ]
    direction = (getattr(user, "direction", None) or "").strip()
    org = settings.MAIL_DOMAIN
    if direction:
        lines.append(f"ORG:{_vcard_escape(org)};{_vcard_escape(direction)}")
    else:
        lines.append(f"ORG:{_vcard_escape(org)}")
    role_labels = org_role_labels(getattr(user, "org_roles", None))
    if role_labels:
        lines.append(f"ROLE:{_vcard_escape(', '.join(role_labels))}")
    if direction:
        lines.append(f"NOTE:{_vcard_escape('Направление: ' + direction)}")
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
