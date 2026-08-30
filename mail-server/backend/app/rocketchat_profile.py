"""Push mailbox profile (photo, phone, title, telegram) into Rocket.Chat."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.config import settings
from app.mail_photos import public_avatar_url
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


def schedule_rocketchat_profile_sync(user: User) -> None:
    profile = snapshot_mailbox(user)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(_sync_with_retries(profile))


async def _sync_with_retries(profile: ChatProfile) -> None:
    if not profile.email or not _admin_password():
        return
    await asyncio.sleep(2)
    for attempt in range(8):
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
        await asyncio.sleep(2)


def _sync_once(profile: ChatProfile) -> bool:
    base = _api_base()
    username = (settings.ROCKETCHAT_ADMIN_USERNAME or "admin").strip()
    password = _admin_password()
    if not base or not password:
        return True
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
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
            return False
        headers = {"X-Auth-Token": token, "X-User-Id": user_id}
        found = _find_user(client, base, headers, profile)
        if not found:
            return False
        target_id = found.get("_id") or found.get("id")
        if not target_id:
            return False
        payload: dict[str, Any] = {
            "userId": target_id,
            "data": {
                "name": profile.name,
                "bio": _bio(profile),
                "nickname": profile.telegram or profile.username,
                "statusText": profile.job_title,
                "verified": True,
                "customFields": {
                    "phone": profile.phone,
                    "telegram": profile.telegram,
                    "jobTitle": profile.job_title,
                },
            },
        }
        updated = client.post(f"{base}/api/v1/users.update", headers=headers, json=payload)
        if updated.status_code >= 400:
            payload["data"].pop("customFields", None)
            client.post(f"{base}/api/v1/users.update", headers=headers, json=payload)
        if profile.picture:
            avatar = client.post(
                f"{base}/api/v1/users.setAvatar",
                headers=headers,
                json={"userId": target_id, "avatarUrl": profile.picture},
            )
            if avatar.status_code >= 400:
                logger.warning(
                    "rocketchat setAvatar failed for %s status=%s",
                    profile.email,
                    avatar.status_code,
                )
        logger.info("rocketchat profile synced %s", profile.email)
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
