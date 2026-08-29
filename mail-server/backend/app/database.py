import asyncio
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.config import settings

_INTERNAL_DB_HOSTS = frozenset(
    {
        "postgres",
        "mail_postgres",
        "localhost",
        "127.0.0.1",
        "db",
    }
)


def _db_hostname(url: str) -> str:
    normalized = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return (urlparse(normalized).hostname or "").lower()


def is_internal_db_host(url: str) -> bool:
    """Docker/local Postgres has no TLS; asyncpg otherwise tries SSL first."""
    return _db_hostname(url) in _INTERNAL_DB_HOSTS


def async_connect_args(url: str | None = None) -> dict:
    target = url or settings.DATABASE_URL
    if is_internal_db_host(target):
        return {"ssl": False, "timeout": 30}
    return {"timeout": 30}


def sync_connect_args(url: str | None = None) -> dict:
    target = url or settings.DATABASE_URL_SYNC or settings.DATABASE_URL
    if is_internal_db_host(target):
        return {"sslmode": "disable", "connect_timeout": 30}
    return {"connect_timeout": 30}


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=async_connect_args(settings.DATABASE_URL),
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def wait_for_database(attempts: int = 30, delay: float = 2.0) -> None:
    """Retry until Postgres DNS and TCP are up (reboot / compose race)."""
    host = _db_hostname(settings.DATABASE_URL) or "?"
    last_error: BaseException | None = None
    for attempt in range(1, attempts + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            if attempt > 1:
                print(f"Database ready at {host} after {attempt} attempts")
            return
        except Exception as exc:
            last_error = exc
            print(
                f"Waiting for database {host} ({attempt}/{attempts}): "
                f"{type(exc).__name__}: {exc}"
            )
            await engine.dispose()
            if attempt < attempts:
                await asyncio.sleep(delay)
    raise RuntimeError(
        f"Database at {host} unavailable after {attempts} attempts"
    ) from last_error


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
