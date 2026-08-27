"""Resolve avatar URLs and display names for mailbox users and external addresses."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Iterable, Optional
from urllib.parse import quote

from email.utils import parseaddr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User


@dataclass
class PeerInfo:
    avatar_url: str
    name: Optional[str] = None


def gravatar_url(email: str, size: int = 128) -> str:
    """Deterministic avatar for any address (mp = mystery-person silhouette)."""
    addr = (email or "").strip().lower()
    digest = hashlib.md5(addr.encode("utf-8")).hexdigest()
    return f"https://www.gravatar.com/avatar/{digest}?s={size}&d=mp"


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
        return f"/api/media/{bucket}/{quote(object_name, safe='._-')}"
    if "minio:9000" in url or url.startswith("http://minio/"):
        parts = url.rstrip("/").split("/")
        if parts:
            return f"/api/media/{bucket}/{quote(parts[-1], safe='._-')}"
    return url


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
    unique = {((e or "").strip().lower()) for e in emails if (e or "").strip()}
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
            avatar = browser or gravatar_url(addr)
        else:
            avatar = gravatar_url(addr)
        name = (user.full_name.strip() if user and user.full_name else None) or None
        out[addr] = PeerInfo(avatar_url=avatar, name=name)
    return out


async def avatar_map_for_emails(
    db: AsyncSession, emails: Iterable[str]
) -> dict[str, str]:
    """Backward-compatible email → avatar URL map."""
    peers = await peer_info_map(db, emails)
    return {k: v.avatar_url for k, v in peers.items()}
