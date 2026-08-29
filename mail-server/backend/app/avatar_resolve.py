"""Resolve avatar URLs and display names for mailbox users and external addresses."""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Iterable, Optional, Tuple
from urllib.parse import quote, unquote, urlparse

from email.utils import parseaddr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User

logger = logging.getLogger(__name__)


@dataclass
class PeerInfo:
    avatar_url: str
    name: Optional[str] = None


def gravatar_url(email: str, size: int = 128) -> str:
    addr = (email or "").strip().lower()
    digest = hashlib.md5(addr.encode("utf-8")).hexdigest()
    return f"https://www.gravatar.com/avatar/{digest}?s={size}&d=mp"


def unavatar_url(email: str) -> str:
    """
    Aggregator (Gravatar / Google / GitHub / …). Better chance for Gmail faces
    than Gravatar-alone. SPA onError still falls back to initials.
    """
    addr = (email or "").strip().lower()
    return f"https://unavatar.io/{quote(addr, safe='@.')}?fallback=https://www.gravatar.com/avatar/{hashlib.md5(addr.encode()).hexdigest()}?d=mp"


def public_media_url(object_name: str) -> str:
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return f"{base}/api/media/{settings.MINIO_BUCKET}/{object_name.lstrip('/')}"


def to_browser_avatar_url(url: Optional[str]) -> Optional[str]:
    """
    Turn internal MinIO URLs into same-origin API paths the SPA can load.
    http://minio:9000/avatars/foo.jpg → /api/media/avatars/foo.jpg
    """
    if not url:
        return None
    url = url.strip()
    bucket = settings.MINIO_BUCKET
    marker = f"/{bucket}/"
    if marker in url:
        object_name = url.split(marker, 1)[1].split("?", 1)[0]
        return f"/api/media/{bucket}/{object_name}"
    if "minio:9000" in url or url.startswith("http://minio/"):
        parts = url.rstrip("/").split("/")
        if parts:
            return f"/api/media/{bucket}/{quote(parts[-1], safe='._-')}"
    return url


def to_public_avatar_url(url: Optional[str]) -> Optional[str]:
    """Absolute HTTPS URL for embedding in outbound mail (Gmail must fetch it)."""
    if not url:
        return None
    browser = to_browser_avatar_url(url)
    if not browser:
        return None
    if browser.startswith("http://") or browser.startswith("https://"):
        return browser
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    if browser.startswith("/"):
        return f"{base}{browser}"
    return f"{base}/{browser}"


def minio_object_name_from_avatar_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = unquote(url.strip())
    bucket = settings.MINIO_BUCKET
    marker = f"/{bucket}/"
    if marker in url:
        return url.split(marker, 1)[1].split("?", 1)[0].lstrip("/")
    if "/api/media/" in url:
        parts = url.split("/api/media/", 1)[1].split("?", 1)[0].split("/")
        if parts and parts[0] == bucket:
            return "/".join(parts[1:]).lstrip("/") or None
        return "/".join(parts).lstrip("/") or None
    parsed = urlparse(url)
    if parsed.scheme in ("http", "https") and parsed.path:
        name = parsed.path.rsplit("/", 1)[-1]
        if "." in name and name.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            # Bare object names stored without a bucket prefix
            if bucket not in parsed.path:
                return name
    return None


def _guess_image_type(name: str, fallback: str = "image/jpeg") -> str:
    lower = (name or "").lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".gif"):
        return "image/gif"
    return fallback


def load_avatar_bytes(avatar_url: Optional[str]) -> Optional[Tuple[bytes, str, str]]:
    """Load avatar from MinIO or an http(s) photo URL. Returns (bytes, content_type, filename)."""
    if not avatar_url:
        return None
    object_name = minio_object_name_from_avatar_url(avatar_url)
    if object_name:
        try:
            from app.minio_client import minio_client

            minio_client._ensure_bucket()
            obj = minio_client.client.get_object(settings.MINIO_BUCKET, object_name)
            try:
                data = obj.read()
            finally:
                obj.close()
                obj.release_conn()
            return data, _guess_image_type(object_name), object_name.split("/")[-1]
        except Exception as e:
            logger.warning("Could not load avatar from MinIO: %s", e)

    raw = avatar_url.strip()
    if raw.startswith("http://") or raw.startswith("https://"):
        if "minio:9000" in raw or "://minio/" in raw:
            return None
        try:
            import httpx

            with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                resp = client.get(raw)
                resp.raise_for_status()
            ctype = (resp.headers.get("content-type") or "image/jpeg").split(";")[0]
            if not ctype.startswith("image/"):
                return None
            name = raw.rsplit("/", 1)[-1].split("?", 1)[0] or "avatar.jpg"
            return resp.content, ctype, name
        except Exception as e:
            logger.warning("Could not fetch remote avatar: %s", e)
    return None


def parse_from_header(raw: Optional[str]) -> tuple[str, Optional[str]]:
    """Return (email, display_name) from a From/To header value."""
    name, addr = parseaddr(raw or "")
    addr = (addr or "").strip().lower()
    name = (name or "").strip() or None
    return addr, name


async def peer_info_map(
    db: AsyncSession, emails: Iterable[str]
) -> dict[str, PeerInfo]:
    """email(lower) → avatar + full_name when local user exists."""
    unique: set[str] = set()
    for raw in emails:
        addr, _name = parse_from_header(raw)
        if addr:
            unique.add(addr)
    unique.discard("")
    if not unique:
        return {}

    result = await db.execute(
        select(User).where(func.lower(User.email).in_(list(unique)))
    )
    users = {u.email.lower(): u for u in result.scalars().all()}

    out: dict[str, PeerInfo] = {}
    for addr in unique:
        user = users.get(addr)
        if user and user.avatar_url:
            browser = to_browser_avatar_url(user.avatar_url)
            avatar = browser or f"/api/public/avatar/{quote(addr, safe='')}"
        else:
            avatar = unavatar_url(addr)
        name = (user.full_name.strip() if user and user.full_name else None) or None
        out[addr] = PeerInfo(avatar_url=avatar, name=name)
    return out


async def avatar_map_for_emails(
    db: AsyncSession, emails: Iterable[str]
) -> dict[str, str]:
    """Backward-compatible email → avatar URL map."""
    peers = await peer_info_map(db, emails)
    return {k: v.avatar_url for k, v in peers.items()}
