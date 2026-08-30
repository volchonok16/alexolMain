"""Short-lived Jitsi Meet JWTs with the mailbox name and public avatar."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

from jose import jwt

from app.config import settings
from app.mail_photos import public_avatar_url
from app.models import User


def jitsi_domain() -> str:
    host = urlparse((settings.JITSI_PUBLIC_URL or "").strip()).hostname
    return host or "meet.alexol.io"


def is_closed_room(room: str) -> bool:
    slug = (room or "").strip().lower()
    return slug.startswith("c-") or slug.startswith("closed-")


def _encode(
    *,
    room: str,
    name: str,
    email: str = "",
    avatar: str = "",
    user_id: str = "",
    moderator: bool = False,
) -> Optional[str]:
    secret = (settings.JITSI_JWT_APP_SECRET or "").strip()
    if not secret:
        return None
    now = datetime.now(timezone.utc)
    slug = (room or "*").strip() or "*"
    user: dict = {
        "id": user_id or email or "guest",
        "name": name,
        "affiliation": "owner" if moderator else "member",
    }
    if email:
        user["email"] = email
    if avatar:
        user["avatar"] = avatar
    payload = {
        "aud": settings.JITSI_JWT_APP_ID,
        "iss": settings.JITSI_JWT_APP_ID,
        "sub": jitsi_domain(),
        "room": slug,
        "nbf": int(now.timestamp()) - 10,
        "exp": int((now + timedelta(hours=3)).timestamp()),
        "context": {"user": user},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def issue_jitsi_jwt(user: User, room: str = "*", *, moderator: bool = True) -> Optional[str]:
    email = (user.email or "").strip().lower()
    return _encode(
        room=room,
        name=(user.full_name or user.email or "").strip() or "Участник",
        email=email,
        avatar=public_avatar_url(email) if email else "",
        user_id=email,
        moderator=moderator,
    )


def issue_guest_jwt(room: str = "*") -> Optional[str]:
    if is_closed_room(room):
        return None
    return _encode(
        room=room,
        name="Гость",
        user_id="guest",
        moderator=False,
    )
