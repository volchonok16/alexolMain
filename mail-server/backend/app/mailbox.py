"""Resolve a local mailbox from SMTP/RCPT/login identity."""
from __future__ import annotations

from email.utils import parseaddr
from typing import TYPE_CHECKING, Optional

from app.config import settings

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import Session
    from app.models import User


def normalize_mailbox_address(raw: str) -> str:
    """Strip display name / angle brackets; lowercase; drop trailing-dot FQDN."""
    text = (raw or "").strip()
    if not text:
        return ""
    _name, parsed = parseaddr(text)
    addr = (parsed or text).strip().strip("<>").strip().lower()
    if "@" in addr:
        local, domain = addr.rsplit("@", 1)
        addr = f"{local}@{domain.rstrip('.')}"
    return addr


def split_local_identity(
    identity: str, mail_domain: str | None = None
) -> Optional[tuple[str, str]]:
    """Return (email, username) when identity belongs to this mail domain."""
    domain = (mail_domain or settings.MAIL_DOMAIN or "").replace("@", "").lower().rstrip(".")
    addr = normalize_mailbox_address(identity)
    if not addr or not domain:
        return None
    if "@" not in addr:
        return f"{addr}@{domain}", addr
    local, id_domain = addr.rsplit("@", 1)
    if id_domain != domain or not local:
        return None
    return f"{local}@{domain}", local


def _mailbox_select(email: str, username: str):
    from sqlalchemy import func, select
    from app.models import User

    return select(User).where(
        (func.lower(User.email) == email) | (func.lower(User.username) == username)
    )


async def find_local_mailbox(
    db: AsyncSession,
    identity: str,
    *,
    active_only: bool = False,
) -> Optional[User]:
    keys = split_local_identity(identity)
    if not keys:
        return None
    email, username = keys
    user = (await db.execute(_mailbox_select(email, username))).scalar_one_or_none()
    if not user:
        return None
    if active_only and not user.is_active:
        return None
    return user


def find_local_mailbox_sync(
    db: Session,
    identity: str,
    *,
    active_only: bool = False,
) -> Optional[User]:
    keys = split_local_identity(identity)
    if not keys:
        return None
    email, username = keys
    user = db.execute(_mailbox_select(email, username)).scalar_one_or_none()
    if not user:
        return None
    if active_only and not user.is_active:
        return None
    return user
