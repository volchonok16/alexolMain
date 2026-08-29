"""Resolve avatar URLs and display names for mailbox users and external addresses."""
from __future__ import annotations

import hashlib
import io
import logging
import uuid
from dataclasses import dataclass
from typing import Iterable, Optional, Tuple
from urllib.parse import quote, unquote

from email.utils import parseaddr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User

logger = logging.getLogger(__name__)

ALEXOL_DOMAIN = (settings.MAIL_DOMAIN or "alexol.io").lower()


@dataclass
class PeerInfo:
    avatar_url: str
    name: Optional[str] = None


def gravatar_url(email: str, size: int = 128) -> str:
    addr = (email or "").strip().lower()
    digest = hashlib.md5(addr.encode("utf-8")).hexdigest()
    return f"https://www.gravatar.com/avatar/{digest}?s={size}&d=mp"


def unavatar_url(email: str) -> str:
    """
    Aggregator (Gravatar / Google / GitHub / …). Better chance for Gmail faces
    than Gravatar-alone. SPA onError still falls back to initials.
    """
    addr = (email or "").strip().lower()
    return f"https://unavatar.io/{quote(addr, safe='@.')}?fallback=https://www.gravatar.com/avatar/{hashlib.md5(addr.encode()).hexdigest()}?d=mp"


def public_media_url(object_name: str) -> str:
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return f"{base}/api/media/{settings.MINIO_BUCKET}/{object_name.lstrip('/')}"


def to_browser_avatar_url(url: Optional[str]) -> Optional[str]:
    """
    Turn internal MinIO URLs into same-origin API paths the SPA can load.
    http://minio:9000/avatars/foo.jpg → /api/media/avatars/foo.jpg
    """
    if not url:
        return None
    url = url.strip()
    bucket = settings.MINIO_BUCKET
    marker = f"/{bucket}/"
    if marker in url:
        object_name = url.split(marker, 1)[1].split("?", 1)[0]
        return f"/api/media/{bucket}/{object_name}"
    if "minio:9000" in url or url.startswith("http://minio/"):
        parts = url.rstrip("/").split("/")
        if parts:
            return f"/api/media/{bucket}/{quote(parts[-1], safe='._-')}"
    return url


def to_public_avatar_url(url: Optional[str]) -> Optional[str]:
    """Absolute HTTPS URL for embedding in outbound mail (Gmail must fetch it)."""
    if not url:
        return None
    browser = to_browser_avatar_url(url)
    if not browser:
        return None
    if browser.startswith("http://") or browser.startswith("https://"):
        return browser
    base = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    if browser.startswith("/"):
        return f"{base}{browser}"
    return f"{base}/{browser}"


def admin_origin() -> str:
    """alexolMain origin for /uploads (strip trailing /api)."""
    base = (settings.ALEXOL_API_URL or "https://api.alexol.io").rstrip("/")
    if base.lower().endswith("/api"):
        base = base[:-4]
    return base or "https://api.alexol.io"


def admin_upload_candidates(filename: str) -> list[str]:
    name = (filename or "").strip().split("/")[-1].split("?")[0]
    if not name or "." not in name:
        return []
    if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
        return []
    origin = admin_origin()
    urls = [f"{origin}/uploads/{name}"]
    public = f"https://api.alexol.io/uploads/{name}"
    if public not in urls:
        urls.append(public)
    return urls


def minio_object_name_from_avatar_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = unquote(url.strip())
    if "/uploads/" in url:
        return None
    bucket = settings.MINIO_BUCKET
    marker = f"/{bucket}/"
    if marker in url:
        return url.split(marker, 1)[1].split("?", 1)[0].lstrip("/")
    if "/api/media/" in url:
        parts = url.split("/api/media/", 1)[1].split("?", 1)[0].split("/")
        if parts and parts[0] == bucket:
            return "/".join(parts[1:]).lstrip("/") or None
        return "/".join(parts).lstrip("/") or None
    return None


def _guess_image_type(name: str, fallback: str = "image/jpeg") -> str:
    lower = (name or "").lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".gif"):
        return "image/gif"
    return fallback


def _http_fetch_image(url: str) -> Optional[Tuple[bytes, str, str]]:
    raw = (url or "").strip()
    if not raw:
        return None
    if raw.startswith("/uploads/"):
        raw = f"{admin_origin()}{raw}"
    if not raw.startswith("http://") and not raw.startswith("https://"):
        return None
    if "minio:9000" in raw or "://minio/" in raw:
        return None
    try:
        import httpx

        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(raw)
            resp.raise_for_status()
        ctype = (resp.headers.get("content-type") or "image/jpeg").split(";")[0]
        if not ctype.startswith("image/"):
            return None
        name = raw.rsplit("/", 1)[-1].split("?", 1)[0] or "avatar.jpg"
        return resp.content, ctype, name
    except Exception as e:
        logger.warning("Could not fetch remote avatar %s: %s", raw, e)
        return None


def load_avatar_bytes(avatar_url: Optional[str]) -> Optional[Tuple[bytes, str, str]]:
    """Load avatar from MinIO, then admin /uploads, then the original http(s) URL."""
    if not avatar_url:
        return None
    object_name = minio_object_name_from_avatar_url(avatar_url)
    if object_name:
        try:
            from app.minio_client import minio_client

            minio_client._ensure_bucket()
            obj = minio_client.client.get_object(settings.MINIO_BUCKET, object_name)
            try:
                data = obj.read()
            finally:
                obj.close()
                obj.release_conn()
            return data, _guess_image_type(object_name), object_name.split("/")[-1]
        except Exception as e:
            logger.info("MinIO miss for %s (%s); trying admin /uploads", object_name, e)
            for candidate in admin_upload_candidates(object_name.split("/")[-1]):
                recovered = _http_fetch_image(candidate)
                if recovered:
                    return recovered

    raw = avatar_url.strip()
    if "/uploads/" in raw:
        name = raw.split("/uploads/", 1)[1].split("?", 1)[0]
        for candidate in admin_upload_candidates(name) or [raw]:
            fetched = _http_fetch_image(candidate)
            if fetched:
                return fetched
    return _http_fetch_image(raw)


def _ext_from_content_type(content_type: str) -> str:
    lower = (content_type or "").lower()
    if "png" in lower:
        return "png"
    if "webp" in lower:
        return "webp"
    if "gif" in lower:
        return "gif"
    return "jpg"


def import_avatar_to_minio(
    username: str,
    *,
    source_url: Optional[str] = None,
    raw_bytes: Optional[bytes] = None,
    content_type: str = "image/jpeg",
) -> Optional[str]:
    """
    Store avatar bytes in MinIO and return internal object URL.
    Idempotent when the object already lives in our bucket.
    """
    if raw_bytes:
        data = raw_bytes
        ctype = content_type or "image/jpeg"
    elif source_url:
        loaded = load_avatar_bytes(source_url)
        if not loaded:
            logger.warning("import_avatar_to_minio: could not load %s", source_url)
            return None
        data, ctype, _name = loaded
        object_name = minio_object_name_from_avatar_url(source_url)
        if object_name:
            try:
                from app.minio_client import minio_client

                minio_client._ensure_bucket()
                minio_client.client.stat_object(settings.MINIO_BUCKET, object_name)
                return source_url.strip()
            except Exception:
                pass
    else:
        return None

    from app.minio_client import minio_client

    ext = _ext_from_content_type(ctype)
    file_name = f"{username.strip().lower()}_{uuid.uuid4().hex}.{ext}"
    try:
        return minio_client.upload_file(io.BytesIO(data), file_name, ctype)
    except Exception as exc:
        logger.warning("import_avatar_to_minio upload failed: %s", exc)
        return None


def local_avatar_api_path(email: str) -> str:
    return f"/api/public/avatar/{quote((email or '').strip().lower(), safe='')}"


def is_local_mailbox(email: str) -> bool:
    addr = (email or "").strip().lower()
    return addr.endswith(f"@{ALEXOL_DOMAIN}")


def parse_from_header(raw: Optional[str]) -> tuple[str, Optional[str]]:
    """Return (email, display_name) from a From/To header value."""
    name, addr = parseaddr(raw or "")
    addr = (addr or "").strip().lower()
    name = (name or "").strip() or None
    return addr, name


async def peer_info_map(
    db: AsyncSession, emails: Iterable[str]
) -> dict[str, PeerInfo]:
    """email(lower) → avatar + full_name when local user exists."""
    unique: set[str] = set()
    for raw in emails:
        addr, _name = parse_from_header(raw)
        if addr:
            unique.add(addr)
    unique.discard("")
    if not unique:
        return {}

    result = await db.execute(
        select(User).where(func.lower(User.email).in_(list(unique)))
    )
    users = {u.email.lower(): u for u in result.scalars().all()}

    out: dict[str, PeerInfo] = {}
    for addr in unique:
        user = users.get(addr)
        if user and is_local_mailbox(addr):
            avatar = local_avatar_api_path(addr)
        elif user and user.avatar_url:
            browser = to_browser_avatar_url(user.avatar_url)
            avatar = browser or local_avatar_api_path(addr)
        else:
            # No dummy Gravatar/Unavatar silhouettes — SPA falls back to initials.
            avatar = ""
        name = (user.full_name.strip() if user and user.full_name else None) or None
        out[addr] = PeerInfo(avatar_url=avatar, name=name)
    return out


async def avatar_map_for_emails(
    db: AsyncSession, emails: Iterable[str]
) -> dict[str, str]:
    """Backward-compatible email → avatar URL map."""
    peers = await peer_info_map(db, emails)
    return {k: v.avatar_url for k, v in peers.items()}
