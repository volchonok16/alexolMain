"""Sender/recipient photos for IMAP, outbound MIME, and vCard."""
from __future__ import annotations

import base64
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.avatar_resolve import (
    load_avatar_bytes,
    to_public_avatar_url,
    unavatar_url,
)


def photo_html_tag(src: str, alt: str) -> str:
    safe_alt = (alt or "").replace('"', "")
    return (
        f'<img src="{src}" width="40" height="40" alt="{safe_alt}" '
        'style="width:40px;height:40px;border-radius:20px;object-fit:cover;'
        'vertical-align:middle;border:0;" />'
    )


def has_inline_photo(avatar_url: Optional[str]) -> bool:
    return load_avatar_bytes(avatar_url) is not None


def attach_cid_photo(related: MIMEMultipart, avatar_url: Optional[str], cid: str) -> bool:
    loaded = load_avatar_bytes(avatar_url)
    if not loaded:
        return False
    data, content_type, filename = loaded
    subtype = (content_type.split("/")[-1] if "/" in content_type else "jpeg").lower()
    if subtype == "jpg":
        subtype = "jpeg"
    image = MIMEImage(data, _subtype=subtype)
    image.add_header("Content-ID", f"<{cid}>")
    image.add_header("Content-Disposition", "inline", filename=filename)
    related.attach(image)
    return True


def html_photo_src(email: str, avatar_url: Optional[str], cid: str, cid_ok: bool) -> str:
    if cid_ok:
        return f"cid:{cid}"
    public = to_public_avatar_url(avatar_url)
    if public:
        return public
    return unavatar_url(email)


def prepend_people_bar(html: str, from_src: Optional[str], from_label: str,
                       to_src: Optional[str] = None, to_label: str = "") -> str:
    if "data-alexol-people=\"1\"" in (html or ""):
        return html
    bits = ['<div data-alexol-people="1" style="margin:0 0 16px;line-height:40px;">']
    if from_src:
        bits.append(photo_html_tag(from_src, from_label))
        bits.append(
            f'<span style="margin-left:8px;font-size:13px;color:#64748b;">'
            f"{from_label}</span>"
        )
    if to_src:
        bits.append(
            '<span style="margin:0 8px;color:#94a3b8;">→</span>'
        )
        bits.append(photo_html_tag(to_src, to_label))
        bits.append(
            f'<span style="margin-left:8px;font-size:13px;color:#64748b;">'
            f"{to_label}</span>"
        )
    bits.append("</div>")
    bar = "".join(bits)
    lowered = (html or "").lower()
    body_at = lowered.find("<body")
    if body_at != -1:
        gt = lowered.find(">", body_at)
        if gt != -1:
            return html[: gt + 1] + bar + html[gt + 1 :]
    return bar + (html or "")


def vcard_photo_lines(avatar_url: Optional[str]) -> list[str]:
    loaded = load_avatar_bytes(avatar_url)
    if loaded:
        data, content_type, _name = loaded
        subtype = "JPEG"
        if "png" in content_type:
            subtype = "PNG"
        elif "gif" in content_type:
            subtype = "GIF"
        b64 = base64.b64encode(data).decode("ascii")
        return [_fold_vcard_line(f"PHOTO;ENCODING=b;TYPE={subtype}:{b64}")]
    public = to_public_avatar_url(avatar_url)
    if public:
        return [f"PHOTO;VALUE=URI:{public}"]
    return []


def _fold_vcard_line(line: str) -> str:
    if len(line) <= 75:
        return line
    parts = [line[:75]]
    rest = line[75:]
    while rest:
        parts.append(" " + rest[:74])
        rest = rest[74:]
    return "\r\n".join(parts)
