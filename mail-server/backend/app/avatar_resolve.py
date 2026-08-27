"""Resolve avatar URLs for mailbox users and external addresses."""
from __future__ import annotations

import hashlib
from typing import Iterable, Optional
from urllib.parse import quote

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User


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
        # Fallback: last path segment under bucket guess
        parts = url.rstrip("/").split("/")
        if parts:
            return f"/api/media/{bucket}/{quote(parts[-1], safe='._-')}"
    return url


async def avatar_map_for_emails(
    db: AsyncSession, emails: Iterable[str]
) -> dict[str, str]:
    """email(lower) → browser-usable avatar URL (local user or Gravatar)."""
    unique = {((e or "").strip().lower()) for e in emails if (e or "").strip()}
    unique.discard("")
    if not unique:
        return {}

    result = await db.execute(
        select(User).where(func.lower(User.email).in_(list(unique)))
    )
    users = {u.email.lower(): u for u in result.scalars().all()}

    out: dict[str, str] = {}
    for addr in unique:
        user = users.get(addr)
        if user and user.avatar_url:
            browser = to_browser_avatar_url(user.avatar_url)
            out[addr] = browser or gravatar_url(addr)
        else:
            out[addr] = gravatar_url(addr)
    return out
