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


def issue_jitsi_jwt(user: User, room: str = "*") -> Optional[str]:
    secret = (settings.JITSI_JWT_APP_SECRET or "").strip()
    if not secret:
        return None
    now = datetime.now(timezone.utc)
    slug = (room or "*").strip() or "*"
    payload = {
        "aud": settings.JITSI_JWT_APP_ID,
        "iss": settings.JITSI_JWT_APP_ID,
        "sub": jitsi_domain(),
        "room": slug,
        "nbf": int(now.timestamp()) - 10,
        "exp": int((now + timedelta(hours=3)).timestamp()),
        "context": {
            "user": {
                "id": (user.email or "").strip().lower(),
                "name": (user.full_name or user.email or "").strip(),
                "email": (user.email or "").strip().lower(),
                "avatar": public_avatar_url(user.email or ""),
                "affiliation": "owner",
            }
        },
    }
    return jwt.encode(payload, secret, algorithm="HS256")
