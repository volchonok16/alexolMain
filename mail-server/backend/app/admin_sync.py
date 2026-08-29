"""Push mailbox user changes to alexolMain admin (HTTP sync over shared Docker network)."""

from __future__ import annotations

import base64
import logging
from typing import Any, Optional
from urllib.parse import quote

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
    job_title: Optional[str] = None,
    telegram: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> bool:
    if not _enabled():
        logger.warning("[admin-sync] ensure skipped: ALEXOL_API_URL / MAIL_SYNC_SECRET not set")
        return False
    payload: dict[str, Any] = {
        "username": username.strip().lower(),
        "full_name": full_name,
        "is_admin": is_admin,
        "is_active": is_active,
    }
    if password:
        payload["password"] = password
    # Always send contact fields so clearing a value in mail also clears it in admin.
    payload["phone"] = (phone or "").strip()
    payload["job_title"] = (job_title or "").strip()
    payload["telegram"] = (telegram or "").strip()
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
                return False
            return True
    except Exception as exc:
        logger.warning("[admin-sync] ensure error: %s", exc)
        return False


async def push_user_delete(username: str) -> bool:
    if not _enabled():
        logger.warning("[admin-sync] delete skipped: ALEXOL_API_URL / MAIL_SYNC_SECRET not set")
        return False
    for attempt in range(1, 3):
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.delete(
                    f"{_base()}/api/internal/mail-sync/users/{username.strip().lower()}",
                    headers=_headers(),
                )
                if res.status_code < 400 or res.status_code == 404:
                    return True
                logger.warning(
                    "[admin-sync] delete failed %s (attempt %s): %s",
                    res.status_code,
                    attempt,
                    res.text[:300],
                )
        except Exception as exc:
            logger.warning("[admin-sync] delete error (attempt %s): %s", attempt, exc)
    return False


async def send_news_bot_dm(*, telegram: str, text: str) -> tuple[bool, str]:
    """Send a private message via the news bot (alexol_backend → Telegram)."""
    if not _enabled():
        return False, "Синхронизация с ботом не настроена. Свяжитесь с администратором."
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                f"{_base()}/api/internal/mail-sync/telegram-dm",
                headers=_headers(),
                json={"telegram": telegram, "text": text},
            )
            if res.status_code < 400:
                return True, ""
            detail = ""
            try:
                payload = res.json()
                detail = str(payload.get("error") or payload.get("detail") or "")
            except Exception:
                detail = (res.text or "")[:300]
            logger.warning("[admin-sync] telegram-dm failed %s: %s", res.status_code, detail)
            return False, detail or "Не удалось отправить пароль в Telegram. Свяжитесь с администратором."
    except Exception as exc:
        logger.warning("[admin-sync] telegram-dm error: %s", exc)
        return False, "Не удалось отправить пароль в Telegram. Свяжитесь с администратором."


async def fetch_admin_photo_url(username: str) -> Optional[str]:
    """Read admin user photo path from alexolMain backend."""
    if not _enabled():
        return None
    login = username.strip().lower()
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.get(
                f"{_base()}/api/internal/mail-sync/users/{quote(login, safe='')}",
                headers=_headers(),
            )
            if res.status_code >= 400:
                return None
            photo = (res.json() or {}).get("photo")
            if not photo or not isinstance(photo, str):
                return None
            photo = photo.strip()
            if photo.startswith("http://") or photo.startswith("https://"):
                return photo
            if photo.startswith("/"):
                return f"{_base()}{photo}"
            return photo
    except Exception as exc:
        logger.warning("[admin-sync] fetch photo for %s: %s", login, exc)
        return None


async def ensure_user_avatar(user, db) -> bool:
    """
    Make sure mailbox user has a MinIO-backed avatar_url.
    Pulls from admin when missing; imports external URLs into MinIO.
    """
    from app.avatar_resolve import import_avatar_to_minio, load_avatar_bytes, minio_object_name_from_avatar_url

    changed = False
    username = (user.username or user.email.split("@", 1)[0]).strip().lower()

    if user.avatar_url:
        if minio_object_name_from_avatar_url(user.avatar_url) and load_avatar_bytes(user.avatar_url):
            return False
        imported = import_avatar_to_minio(username, source_url=user.avatar_url)
        if imported and imported != user.avatar_url:
            user.avatar_url = imported
            changed = True
    else:
        admin_url = await fetch_admin_photo_url(username)
        if admin_url:
            imported = import_avatar_to_minio(username, source_url=admin_url)
            if imported:
                user.avatar_url = imported
                changed = True

    if changed:
        await db.commit()
        await db.refresh(user)
    return changed
