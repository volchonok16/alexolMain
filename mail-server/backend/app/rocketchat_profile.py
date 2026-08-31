"""Push mailbox profile (photo, phone, title, telegram) into Rocket.Chat."""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import secrets
import time
from dataclasses import dataclass
from typing import Any, Optional
from urllib.parse import urlencode

import httpx

from app.avatar_resolve import load_avatar_bytes
from app.config import settings
from app.mail_photos import image_bytes_to_jpeg, public_avatar_url
from app.models import User

logger = logging.getLogger(__name__)

_MAIL_PUSH_TTL_SEC = 90.0
_mail_push_until: dict[str, float] = {}
_avatar_etag: dict[str, str] = {}


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


def mark_mail_origin_push(email: str) -> None:
    key = (email or "").strip().lower()
    if key:
        _mail_push_until[key] = time.monotonic() + _MAIL_PUSH_TTL_SEC


def recently_pushed_from_mail(email: str) -> bool:
    key = (email or "").strip().lower()
    return time.monotonic() < _mail_push_until.get(key, 0)


def remember_avatar_etag(email: str, etag: str) -> None:
    key = (email or "").strip().lower()
    token = (etag or "").strip()
    if key and token:
        _avatar_etag[key] = token


def known_avatar_etag(email: str) -> str:
    return _avatar_etag.get((email or "").strip().lower(), "")


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
    """Authorization URL for Custom OAuth (never the bare /_oauth/alexol callback)."""
    return chat_oauth_authorize_url()


def chat_oauth_authorize_url() -> str:
    chat = (settings.CHAT_PUBLIC_URL or "https://chat.alexol.io").rstrip("/")
    mail = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    client_id = (settings.OAUTH_ROCKETCHAT_CLIENT_ID or "alexol-chat").strip()
    redirect_uri = f"{chat}/_oauth/alexol"
    state = {
        "loginStyle": "redirect",
        "credentialToken": secrets.token_urlsafe(16),
        "isCordova": False,
        "redirectUrl": f"{chat}/home",
    }
    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid profile email",
            "state": base64.b64encode(
                json.dumps(state, separators=(",", ":")).encode()
            ).decode(),
        }
    )
    return f"{mail}/api/oauth/authorize?{query}"


def chat_browser_login_url(user: User) -> str:
    """Log this mailbox into chat in the current tab (resumeToken, else OAuth)."""
    try:
        url = _resume_token_login_url(snapshot_mailbox(user))
        if url:
            return url
    except Exception:
        logger.warning("rocketchat resume token failed, falling back to OAuth", exc_info=True)
    return chat_oauth_authorize_url()


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
    mark_mail_origin_push(profile.email)
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


_admin_login_give_up = False


def _login_admin(client: httpx.Client, base: str) -> Optional[dict[str, str]]:
    global _admin_login_give_up
    if _admin_login_give_up:
        return None
    username = (settings.ROCKETCHAT_ADMIN_USERNAME or "admin").strip()
    password = _admin_password()
    login = client.post(
        f"{base}/api/v1/login",
        json={"user": username, "password": password},
    )
    if login.status_code == 429:
        logger.warning("rocketchat profile sync: admin login rate-limited (429)")
        _admin_login_give_up = True
        return None
    body = login.json() if login.headers.get("content-type", "").startswith("application/json") else {}
    auth = (body.get("data") or {}) if login.status_code == 200 else {}
    token = auth.get("authToken")
    user_id = auth.get("userId")
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if not token or not user_id:
        login = client.post(
            f"{base}/api/v1/login",
            json={"user": username, "password": password},
            headers={"X-2FA-Code": digest, "X-2FA-Method": "password"},
        )
        if login.status_code == 429:
            logger.warning("rocketchat profile sync: admin login rate-limited (429)")
            _admin_login_give_up = True
            return None
        body = login.json() if login.headers.get("content-type", "").startswith("application/json") else {}
        auth = (body.get("data") or {}) if login.status_code == 200 else {}
        token = auth.get("authToken")
        user_id = auth.get("userId")
    if not token or not user_id:
        logger.warning("rocketchat profile sync: admin login failed status=%s", login.status_code)
        if login.status_code in (401, 403):
            _admin_login_give_up = True
        return None
    return {
        "X-Auth-Token": token,
        "X-User-Id": user_id,
        "X-2FA-Code": digest,
        "X-2FA-Method": "password",
    }


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
        refreshed = _find_user(client, base, headers, profile) or found
        remember_avatar_etag(profile.email, str(refreshed.get("avatarETag") or ""))
        mark_mail_origin_push(profile.email)
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


def _json_body(resp: httpx.Response) -> dict[str, Any]:
    try:
        data = resp.json()
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _ensure_chat_user(
    client: httpx.Client,
    base: str,
    headers: dict[str, str],
    profile: ChatProfile,
) -> Optional[dict[str, Any]]:
    found = _find_user(client, base, headers, profile)
    if found:
        return found
    created = client.post(
        f"{base}/api/v1/users.create",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "email": profile.email,
            "name": profile.name,
            "username": profile.username,
            "password": secrets.token_urlsafe(24),
            "verified": True,
            "joinDefaultChannels": True,
        },
    )
    user = (_json_body(created).get("user") or {}) if created.status_code < 400 else {}
    if user.get("_id"):
        return user
    logger.warning(
        "rocketchat users.create failed for %s status=%s body=%s",
        profile.email,
        created.status_code,
        (created.text or "")[:200],
    )
    return _find_user(client, base, headers, profile)


def _resume_token_login_url(profile: ChatProfile) -> Optional[str]:
    if not profile.email or not _admin_password():
        return None
    base = _api_base()
    chat = (settings.CHAT_PUBLIC_URL or "https://chat.alexol.io").rstrip("/")
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        headers = _login_admin(client, base)
        if not headers:
            return None
        found = _ensure_chat_user(client, base, headers, profile)
        if not found:
            return None
        target_id = found.get("_id") or found.get("id")
        payload: dict[str, Any] = (
            {"userId": target_id} if target_id else {"username": profile.username}
        )
        token_resp = client.post(
            f"{base}/api/v1/users.createToken",
            headers={**headers, "Content-Type": "application/json"},
            json=payload,
        )
        data = _json_body(token_resp).get("data") or {}
        auth = data.get("authToken") or data.get("token")
        if token_resp.status_code >= 400 or not auth:
            logger.warning(
                "rocketchat users.createToken failed for %s status=%s body=%s",
                profile.email,
                token_resp.status_code,
                (token_resp.text or "")[:200],
            )
            return None
        return f"{chat}/home?resumeToken={auth}"


@dataclass(frozen=True)
class RemoteChatProfile:
    name: str
    avatar_etag: str
    avatar_jpeg: Optional[bytes]


def fetch_remote_chat_profile(username: str, email: str) -> Optional[RemoteChatProfile]:
    """Read name + custom avatar from Rocket.Chat (None if the user is missing)."""
    login = (username or "").strip().lower()
    addr = (email or "").strip().lower()
    if not login or not _admin_password():
        return None
    base = _api_base()
    if not base:
        return None
    stub = ChatProfile(
        email=addr or f"{login}@alexol.io",
        username=login,
        name=login,
        phone="",
        telegram="",
        job_title="",
        picture="",
    )
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        headers = _login_admin(client, base)
        if not headers:
            return None
        found = _find_user(client, base, headers, stub)
        if not found:
            return None
        name = (found.get("name") or "").strip()
        etag = str(found.get("avatarETag") or "").strip()
        jpeg = None
        if etag and etag != known_avatar_etag(addr):
            avatar = client.get(f"{base}/avatar/{login}", headers=headers)
            ctype = (avatar.headers.get("content-type") or "").lower()
            data = avatar.content or b""
            looks_image = "image" in ctype or data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n"
            if avatar.status_code < 400 and looks_image:
                jpeg = image_bytes_to_jpeg(data)
        return RemoteChatProfile(name=name, avatar_etag=etag, avatar_jpeg=jpeg)
