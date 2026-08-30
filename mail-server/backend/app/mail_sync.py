"""Stable IMAP UIDs and Seen/Deleted flags shared by webmail and IMAP."""
from __future__ import annotations

import re
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models import Email, User

_STORE_RE = re.compile(
    r"^(\S+)\s+(\+|-)?FLAGS(\.SILENT)?\s+(.*)$",
    re.I | re.S,
)
_CANON_FLAGS = {
    "\\SEEN": "\\Seen",
    "\\DELETED": "\\Deleted",
    "\\FLAGGED": "\\Flagged",
    "\\ANSWERED": "\\Answered",
    "\\DRAFT": "\\Draft",
}


def parse_imap_flags(blob: str) -> list[str]:
    text = (blob or "").strip()
    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1]
    out: list[str] = []
    for part in text.split():
        token = part.strip()
        if not token:
            continue
        if not token.startswith("\\"):
            token = "\\" + token
        out.append(_CANON_FLAGS.get(token.upper(), token))
    return out


def parse_store_args(args: str) -> Optional[tuple[str, str, bool, list[str]]]:
    """Return (sequence-set, mode, silent, flags) or None."""
    match = _STORE_RE.match((args or "").strip())
    if not match:
        return None
    seq_set = match.group(1)
    sign = match.group(2)
    silent = bool(match.group(3))
    flags = parse_imap_flags(match.group(4))
    if not sign:
        mode = "replace"
    elif sign == "+":
        mode = "add"
    else:
        mode = "remove"
    return seq_set, mode, silent, flags


def flags_for_email(row: Email) -> list[str]:
    flags: list[str] = []
    if row.is_sent or row.is_read:
        flags.append("\\Seen")
    if row.is_deleted:
        flags.append("\\Deleted")
    return flags


def apply_store_flags(row: Email, flags: list[str], mode: str) -> None:
    names = {flag.upper() for flag in flags}

    def wanted(name: str) -> bool:
        return name.upper() in names

    if mode == "replace":
        if not row.is_sent:
            row.is_read = wanted("\\SEEN")
        row.is_deleted = wanted("\\DELETED")
        return
    if mode == "add":
        if wanted("\\SEEN") and not row.is_sent:
            row.is_read = True
        if wanted("\\DELETED"):
            row.is_deleted = True
        return
    if mode == "remove":
        if wanted("\\SEEN") and not row.is_sent:
            row.is_read = False
        if wanted("\\DELETED"):
            row.is_deleted = False


def _bump_uid(user: User, is_sent: bool) -> int:
    if is_sent:
        uid = int(user.sent_uidnext or 1)
        user.sent_uidnext = uid + 1
        return uid
    uid = int(user.inbox_uidnext or 1)
    user.inbox_uidnext = uid + 1
    return uid


def allocate_imap_uid_sync(db: Session, user_id: int, is_sent: bool) -> int:
    user = db.execute(
        select(User).where(User.id == user_id).with_for_update()
    ).scalar_one()
    return _bump_uid(user, is_sent)


async def allocate_imap_uid(db: AsyncSession, user_id: int, is_sent: bool) -> int:
    user = (
        await db.execute(select(User).where(User.id == user_id).with_for_update())
    ).scalar_one()
    return _bump_uid(user, is_sent)


async def backfill_imap_uids(db: AsyncSession) -> None:
    """Give existing rows mailbox-local UIDs 1..N (same order Outlook already FETCHed)."""
    users = (await db.execute(select(User))).scalars().all()
    for user in users:
        for is_sent, attr in ((False, "inbox_uidnext"), (True, "sent_uidnext")):
            rows = (
                await db.execute(
                    select(Email)
                    .where(Email.user_id == user.id, Email.is_sent == is_sent)
                    .order_by(Email.id)
                )
            ).scalars().all()
            max_uid = 0
            for row in rows:
                if row.imap_uid:
                    max_uid = max(max_uid, int(row.imap_uid))
            for row in rows:
                if not row.imap_uid:
                    max_uid += 1
                    row.imap_uid = max_uid
            current = int(getattr(user, attr) or 1)
            setattr(user, attr, max(current, max_uid + 1))
    await db.commit()


def raw_has_message_id(raw: bytes | None, message_id: str) -> bool:
    """True if this RFC822 blob already contains the Message-ID (sent-copy dedup)."""
    needle = (message_id or "").strip().encode("utf-8", errors="ignore")
    return bool(needle) and needle in (raw or b"")


def is_outlook_probe(subject: str, from_name: str = "") -> bool:
    """Outlook 'Test Account Settings' mail — do not store it in the mailbox."""
    text = (subject or "").lower()
    sender = (from_name or "").strip().lower()
    if "microsoft outlook test message" in text:
        return True
    if "тестовое сообщение microsoft outlook" in text:
        return True
    return sender == "microsoft outlook" and "outlook" in text
