#!/usr/bin/env python3
"""Push all active mailbox profiles (name + photo) into Rocket.Chat."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.database import sync_connect_args
from app.models import User
from app.rocketchat_profile import sync_mailbox_profile_blocking


def main() -> int:
    url = settings.DATABASE_URL_SYNC or settings.DATABASE_URL.replace(
        "postgresql+asyncpg://", "postgresql://", 1
    )
    engine = create_engine(url, connect_args=sync_connect_args(url))
    SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)
    ok = 0
    fail = 0
    with SessionLocal() as db:
        users = db.execute(select(User).where(User.is_active.is_(True))).scalars().all()
        for user in users:
            if sync_mailbox_profile_blocking(user):
                ok += 1
                print(f"synced {user.email}")
            else:
                fail += 1
                print(f"FAILED {user.email}", file=sys.stderr)
    print(f"done: ok={ok} fail={fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
