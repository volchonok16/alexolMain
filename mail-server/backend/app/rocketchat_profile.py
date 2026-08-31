"""Push mailbox profile (photo, phone, title, telegram) into Rocket.Chat."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.avatar_resolve import load_avatar_bytes
from app.config import settings
from app.mail_photos import image_bytes_to_jpeg, public_avatar_url
from app.models import User

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatProfile:
    email: str
    username: str
    name: str
    phone: str
    telegram: str
    job_title: str
    picture: str
    avatar_url: str = ""


def snapshot_mailbox(user: User) -> ChatProfile:
    email = (user.email or "").strip().lower()
    username = (user.username or email.split("@", 1)[0]).strip().lower()
    name = (getattr(user, "full_name", None) or username or email).strip()
    phone = (getattr(user, "phone", None) or "").strip()
    telegram = (getattr(user, "telegram", None) or "").strip().lstrip("@")
    job_title = (getattr(user, "job_title", None) or "").strip()
    return ChatProfile(
        email=email,
        username=username,
        name=name,
        phone=phone,
        telegram=telegram,
        job_title=job_title,
        picture=public_avatar_url(email) if email else "",
        avatar_url=(getattr(user, "avatar_url", None) or "").strip(),
    )


def chat_oauth_start_url() -> str:
    chat = (settings.CHAT_PUBLIC_URL or "https://chat.alexol.io").rstrip("/")
    return f"{chat}/_oauth/alexol"


def _api_base() -> str:
    return (
        (settings.ROCKETCHAT_API_URL or "").strip()
        or (settings.CHAT_PUBLIC_URL or "https://chat.alexol.io")
    ).rstrip("/")


def _admin_password() -> str:
    return (
        (settings.ROCKETCHAT_ADMIN_PASSWORD or "").strip()
        or (settings.DEFAULT_ADMIN_PASSWORD or "").strip()
    )


def _bio(profile: ChatProfile) -> str:
    parts = [
        profile.job_title,
        profile.phone,
        f"@{profile.telegram}" if profile.telegram else "",
    ]
    return " · ".join(part for part in parts if part)


def _avatar_jpeg(profile: ChatProfile) -> Optional[bytes]:
    if not profile.avatar_url:
        return None
    loaded = load_avatar_bytes(profile.avatar_url)
    if not loaded:
        return None
    data, _ctype, _name = loaded
    return image_bytes_to_jpeg(data)


def schedule_rocketchat_profile_sync(user: User) -> None:
    profile = snapshot_mailbox(user)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(_sync_with_retries(profile))


def sync_mailbox_profile_blocking(user: User, *, attempts: int = 12) -> bool:
    """Synchronous profile push (deploy script / admin tooling)."""
    profile = snapshot_mailbox(user)
    if not profile.email or not _admin_password():
        return False
    for attempt in range(attempts):
        try:
            if _sync_once(profile):
                return True
        except Exception:
            logger.warning(
                "rocketchat profile sync failed for %s (try %s)",
                profile.email,
                attempt + 1,
                exc_info=True,
            )
        if attempt + 1 < attempts:
            import time

            time.sleep(3)
    return False


async def _sync_with_retries(profile: ChatProfile) -> None:
    if not profile.email or not _admin_password():
        return
    await asyncio.sleep(4)
    for attempt in range(12):
        try:
            if await asyncio.to_thread(_sync_once, profile):
                return
        except Exception:
            logger.warning(
                "rocketchat profile sync failed for %s (try %s)",
                profile.email,
                attempt + 1,
                exc_info=True,
            )
        await asyncio.sleep(3)


def _login_admin(client: httpx.Client, base: str) -> Optional[dict[str, str]]:
    username = (settings.ROCKETCHAT_ADMIN_USERNAME or "admin").strip()
    password = _admin_password()
    login = client.post(
        f"{base}/api/v1/login",
        json={"user": username, "password": password},
    )
    body = login.json() if login.headers.get("content-type", "").startswith("application/json") else {}
    auth = (body.get("data") or {}) if login.status_code == 200 else {}
    token = auth.get("authToken")
    user_id = auth.get("userId")
    if not token or not user_id:
        logger.warning("rocketchat profile sync: admin login failed status=%s", login.status_code)
        return None
    return {"X-Auth-Token": token, "X-User-Id": user_id}


def _set_avatar(
    client: httpx.Client,
    base: str,
    headers: dict[str, str],
    target_id: str,
    profile: ChatProfile,
) -> None:
    jpeg = _avatar_jpeg(profile)
    if jpeg:
        upload = client.post(
            f"{base}/api/v1/users.setAvatar",
            headers=headers,
            data={"userId": target_id},
            files={"image": ("avatar.jpg", jpeg, "image/jpeg")},
        )
        if upload.status_code < 400:
            logger.info("rocketchat avatar uploaded for %s", profile.email)
            return
        logger.warning(
            "rocketchat avatar upload failed for %s status=%s body=%s",
            profile.email,
            upload.status_code,
            (upload.text or "")[:200],
        )
    if not profile.picture:
        return
    avatar = client.post(
        f"{base}/api/v1/users.setAvatar",
        headers={**headers, "Content-Type": "application/json"},
        json={"userId": target_id, "avatarUrl": profile.picture},
    )
    if avatar.status_code >= 400:
        logger.warning(
            "rocketchat setAvatar url failed for %s status=%s body=%s",
            profile.email,
            avatar.status_code,
            (avatar.text or "")[:200],
        )


def _sync_once(profile: ChatProfile) -> bool:
    base = _api_base()
    if not base or not _admin_password():
        return True
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        headers = _login_admin(client, base)
        if not headers:
            return False
        found = _find_user(client, base, headers, profile)
        if not found:
            logger.warning("rocketchat profile sync: user not found %s", profile.email)
            return False
        target_id = found.get("_id") or found.get("id")
        if not target_id:
            return False
        payload: dict[str, Any] = {
            "userId": target_id,
            "data": {
                "name": profile.name,
                "bio": _bio(profile),
                "nickname": profile.telegram,
                "statusText": profile.job_title,
                "verified": True,
                "customFields": {
                    "phone": profile.phone,
                    "telegram": profile.telegram,
                    "jobTitle": profile.job_title,
                },
            },
        }
        updated = client.post(
            f"{base}/api/v1/users.update",
            headers={**headers, "Content-Type": "application/json"},
            json=payload,
        )
        if updated.status_code >= 400:
            payload["data"].pop("customFields", None)
            client.post(
                f"{base}/api/v1/users.update",
                headers={**headers, "Content-Type": "application/json"},
                json=payload,
            )
        _set_avatar(client, base, headers, target_id, profile)
        logger.info("rocketchat profile synced %s name=%r", profile.email, profile.name)
        return True


def _find_user(
    client: httpx.Client,
    base: str,
    headers: dict[str, str],
    profile: ChatProfile,
) -> Optional[dict[str, Any]]:
    resp = client.get(
        f"{base}/api/v1/users.info",
        headers=headers,
        params={"username": profile.username},
    )
    if resp.status_code == 200:
        user = (resp.json() or {}).get("user") or {}
        if user.get("_id"):
            return user
    query = client.get(
        f"{base}/api/v1/users.list",
        headers=headers,
        params={"query": '{"emails.address":"%s"}' % profile.email},
    )
    if query.status_code == 200:
        users = ((query.json() or {}).get("users") or [])
        if users:
            return users[0]
    return None
