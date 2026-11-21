"""Pull Rocket.Chat avatar into mail (then admin). Names stay owned by mail."""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app import admin_sync
from app.avatar_resolve import import_avatar_to_minio
from app.database import AsyncSessionLocal
from app.models import User
from app.rocketchat_profile import (
    fetch_remote_chat_profile,
    recently_pushed_from_mail,
    remember_avatar_etag,
)

logger = logging.getLogger(__name__)

_INTERVAL_SEC = 45.0
_task: asyncio.Task | None = None


async def start_chat_profile_loop() -> None:
    global _task
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_run(), name="chat-profile-loop")


async def stop_chat_profile_loop() -> None:
    global _task
    if not _task:
        return
    _task.cancel()
    try:
        await _task
    except asyncio.CancelledError:
        pass
    _task = None


async def _run() -> None:
    await asyncio.sleep(20)
    while True:
        try:
            await sync_chat_profiles_from_rocketchat()
        except Exception:
            logger.warning("chat profile pull failed", exc_info=True)
        await asyncio.sleep(_INTERVAL_SEC)


async def sync_chat_profiles_from_rocketchat() -> None:
    async with AsyncSessionLocal() as db:
        users = (
            await db.execute(select(User).where(User.is_active.is_(True)))
        ).scalars().all()
        for user in users:
            email = (user.email or "").strip().lower()
            if not email or recently_pushed_from_mail(email):
                continue
            remote = await asyncio.to_thread(
                fetch_remote_chat_profile, user.username, email
            )
            if not remote:
                continue
            changed = False
            # Mail is canonical for ФИО. A stale Rocket.Chat name must not overwrite it.
            if remote.avatar_jpeg:
                imported = import_avatar_to_minio(
                    user.username,
                    raw_bytes=remote.avatar_jpeg,
                    content_type="image/jpeg",
                )
                if imported:
                    user.avatar_url = imported
                    remember_avatar_etag(email, remote.avatar_etag)
                    changed = True
            if not changed:
                continue
            await db.commit()
            await db.refresh(user)
            await admin_sync.push_user_ensure(
                username=user.username,
                full_name=user.full_name,
                is_admin=user.is_admin,
                is_active=user.is_active,
                phone=user.phone,
                job_title=user.job_title,
                telegram=user.telegram,
                avatar_url=user.avatar_url,
                **admin_sync.org_sync_fields(user),
            )
            logger.info("chat profile pulled into mail for %s", email)