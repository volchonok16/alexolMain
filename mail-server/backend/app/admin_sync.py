"""Push mailbox user changes to alexolMain admin (HTTP sync over shared Docker network)."""

from __future__ import annotations

import base64
import logging
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _enabled() -> bool:
    return bool(settings.ALEXOL_API_URL and settings.MAIL_SYNC_SECRET)


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Mail-Sync-Key": settings.MAIL_SYNC_SECRET or "",
    }


def _base() -> str:
    return (settings.ALEXOL_API_URL or "").rstrip("/")


async def _avatar_fields(avatar_url: Optional[str]) -> dict[str, Any]:
    """Prefer base64 for internal MinIO URLs; pass through public https URLs."""
    if not avatar_url:
        return {}
    if avatar_url.startswith("https://") or avatar_url.startswith("http://api.") or "/uploads/" in avatar_url:
        # Public admin CDN / already-absolute usable URL
        if avatar_url.startswith("https://") or avatar_url.startswith("/uploads/"):
            return {"avatar_url": avatar_url}
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.get(avatar_url)
            if res.status_code >= 400:
                logger.warning("[admin-sync] avatar fetch %s -> %s", avatar_url, res.status_code)
                return {"avatar_url": avatar_url}
            return {
                "avatar_base64": base64.b64encode(res.content).decode("ascii"),
                "avatar_content_type": res.headers.get("content-type") or "image/jpeg",
            }
    except Exception as exc:
        logger.warning("[admin-sync] avatar fetch error: %s", exc)
        return {"avatar_url": avatar_url}


async def push_user_ensure(
    *,
    username: str,
    full_name: str,
    password: Optional[str] = None,
    is_admin: bool = False,
    is_active: bool = True,
    phone: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> None:
    if not _enabled():
        return
    payload: dict[str, Any] = {
        "username": username.strip().lower(),
        "full_name": full_name,
        "is_admin": is_admin,
        "is_active": is_active,
    }
    if password:
        payload["password"] = password
    if phone is not None:
        payload["phone"] = phone
    payload.update(await _avatar_fields(avatar_url))
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                f"{_base()}/api/internal/mail-sync/users/ensure",
                headers=_headers(),
                json=payload,
            )
            if res.status_code >= 400:
                logger.warning(
                    "[admin-sync] ensure failed %s: %s",
                    res.status_code,
                    res.text[:300],
                )
    except Exception as exc:
        logger.warning("[admin-sync] ensure error: %s", exc)


async def push_user_delete(username: str) -> None:
    if not _enabled():
        return
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.delete(
                f"{_base()}/api/internal/mail-sync/users/{username.strip().lower()}",
                headers=_headers(),
            )
            if res.status_code >= 400 and res.status_code != 404:
                logger.warning(
                    "[admin-sync] delete failed %s: %s",
                    res.status_code,
                    res.text[:300],
                )
    except Exception as exc:
        logger.warning("[admin-sync] delete error: %s", exc)
