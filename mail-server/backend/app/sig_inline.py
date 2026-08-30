"""Inline signature images as CID so Outlook does not block https://mail.alexol.io."""
from __future__ import annotations

import re
from email.mime.image import MIMEImage
from pathlib import Path
from urllib.parse import urlparse, unquote

_ASSET_DIR = Path(__file__).resolve().parent / "email_assets"
_IMG_SRC = re.compile(
    r"""(?is)(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2"""
)
_KNOWN = {
    "icon-email.png",
    "icon-phone.png",
    "icon-telegram.png",
    "icon-web.png",
    "icon-whatsapp.png",
    "sig-divider.png",
    "favicon.png",
}


def _asset_name(url: str) -> str | None:
    path = unquote(urlparse(url).path or "")
    name = path.rsplit("/", 1)[-1].split("?", 1)[0].lower()
    if name in _KNOWN:
        return name
    if "favicon" in path.lower():
        return "favicon.png"
    return None


def _read_asset(name: str) -> bytes | None:
    path = _ASSET_DIR / name
    if not path.is_file():
        return None
    return path.read_bytes()


def embed_signature_images(html: str) -> tuple[str, list[MIMEImage]]:
    """Rewrite hosted signature <img src> to cid: and return inline parts without filenames."""
    attached: dict[str, str] = {}
    parts: list[MIMEImage] = []
    counter = 0

    def repl(match: re.Match) -> str:
        nonlocal counter
        prefix, quote, url = match.group(1), match.group(2), match.group(3)
        if url.lower().startswith("cid:"):
            return match.group(0)
        name = _asset_name(url)
        if not name:
            return match.group(0)
        if name not in attached:
            data = _read_asset(name)
            if not data:
                return match.group(0)
            counter += 1
            cid = f"sig-{counter}-{name}"
            image = MIMEImage(data, _subtype="png")
            image.add_header("Content-ID", f"<{cid}>")
            image.add_header("Content-Disposition", "inline")
            parts.append(image)
            attached[name] = cid
        return f"{prefix}{quote}cid:{attached[name]}{quote}"

    return _IMG_SRC.sub(repl, html or ""), parts
