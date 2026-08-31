from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import timedelta, datetime
from typing import List, Optional
import io
import uuid
import secrets
import string
import base64

from jose import JWTError, jwt

from app.logging_setup import configure_quiet_logging
from app.database import get_db, engine, Base, AsyncSessionLocal, wait_for_database
from app.models import User, Email, EmailTemplate
from app.schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserAdminUpdate,
    SyncUserCreate,
    SyncUserEnsure,
    SyncUserUpdate,
    LoginRequest,
    ForgotPasswordRequest,
    Token,
    SsoExchangeRequest,
    SsoTicketResponse,
    EmailCreate,
    EmailResponse,
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTemplateResponse,
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_admin_user
)
from app.mail_body import coerce_stored_bodies
from app.mail_sync import allocate_imap_uid, backfill_imap_uids
from app.config import settings
from app.mailbox import find_local_mailbox
from app.smtp_server import smtp_server
from app.imap_server import imap_server
from app.ldap_server import ldap_server
from app.minio_client import minio_client
from app.avatar_resolve import peer_info_map, to_browser_avatar_url, parse_from_header, import_avatar_to_minio
from app.outbound import deliver_composed_email
from app.recipients import (
    format_to_header,
    parse_recipient_addresses,
    split_address_field,
)
from app import admin_sync
from app import carddav
from app.org import router as org_router
from app.oauth import router as oauth_router
from app.rocketchat_profile import schedule_rocketchat_profile_sync
from app.chat_profile_loop import start_chat_profile_loop, stop_chat_profile_loop
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy import text
from urllib.parse import unquote

configure_quiet_logging()

app = FastAPI(title="Mail Server API")

# CORS - mail SPA + admin/local dev
_CORS_ORIGINS = [
    "https://mail.alexol.io",
    "https://admin.alexol.io",
    "https://chat.alexol.io",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5176",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(org_router, prefix="/api")
app.include_router(oauth_router, prefix="/api")
app.include_router(carddav.router, prefix="/api")


@app.api_route("/.well-known/carddav", methods=["GET", "HEAD", "OPTIONS", "PROPFIND"])
async def well_known_carddav():
    return RedirectResponse("/api/dav/contacts", status_code=301)


def verify_mail_sync_key(x_mail_sync_key: Optional[str] = Header(None, alias="X-Mail-Sync-Key")):
    """Service-to-service auth for alexolMain ↔ mail user provisioning."""
    expected = settings.MAIL_SYNC_SECRET
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Mail sync is not configured",
        )
    if not x_mail_sync_key or not secrets.compare_digest(x_mail_sync_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sync key",
        )
    return True

@app.on_event("startup")
async def startup_event():
    """Initialize database and create default admin"""
    await wait_for_database()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Existing DBs: create_all does not add new columns
        await conn.execute(
            text("ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_name VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE emails ADD COLUMN IF NOT EXISTS to_name VARCHAR")
        )
        await conn.execute(
            text(
                "ALTER TABLE email_templates "
                "ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_feed_token VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS ical_uid VARCHAR")
        )
        await conn.execute(
            text(
                "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS ical_sequence "
                "INTEGER NOT NULL DEFAULT 0"
            )
        )
        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_calendar_events_ical_uid "
                "ON calendar_events (ical_uid) WHERE ical_uid IS NOT NULL"
            )
        )
        await conn.execute(
            text(
                "UPDATE calendar_events SET ical_uid = 'event-' || id::text || '@alexol.io' "
                "WHERE ical_uid IS NULL"
            )
        )
        await conn.execute(
            text("ALTER TABLE emails ADD COLUMN IF NOT EXISTS raw_rfc822 BYTEA")
        )
        await conn.execute(
            text(
                "ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_draft "
                "BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        await conn.execute(
            text("ALTER TABLE emails ADD COLUMN IF NOT EXISTS imap_uid INTEGER")
        )
        await conn.execute(
            text(
                "ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_deleted "
                "BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS inbox_uidnext "
                "INTEGER NOT NULL DEFAULT 1"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS sent_uidnext "
                "INTEGER NOT NULL DEFAULT 1"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS trash_uidnext "
                "INTEGER NOT NULL DEFAULT 1"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_trashed "
                "BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        # Existing admin-created templates become org-shared so users keep access
        await conn.execute(
            text(
                "UPDATE email_templates SET is_shared = TRUE "
                "WHERE is_shared = FALSE AND user_id IN ("
                "  SELECT id FROM users WHERE is_admin = TRUE"
                ")"
            )
        )
    
    # Create default admin
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = User(
                email=settings.DEFAULT_ADMIN_EMAIL,
                username="admin",
                full_name="Administrator",
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                is_admin=True,
                is_active=True
            )
            db.add(admin)
            await db.commit()
            print(f"Default admin created: {settings.DEFAULT_ADMIN_EMAIL}")
        await backfill_imap_uids(db)
    
    # Start SMTP server
    smtp_server.start()
    imap_server.start()
    ldap_server.start()
    await start_chat_profile_loop()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop SMTP and IMAP servers"""
    smtp_server.stop()
    await smtp_server.cleanup()
    imap_server.stop()
    ldap_server.stop()
    await stop_chat_profile_loop()

# Auth endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login user by email or username (non-admins OK - this is mail, not site admin)."""
    identity = (login_data.email or "").strip().lower()
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    domain = settings.MAIL_DOMAIN.lower()
    if "@" in identity:
        local, id_domain = identity.split("@", 1)
        username = local
        # Only accept mailbox domain - personal emails from admin profile are not logins.
        if id_domain != domain:
            print(f"[auth] login rejected: foreign domain {identity!r} (use login@{domain})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Войдите как login@{domain} или просто логин",
            )
        email_identity = f"{username}@{domain}"
    else:
        username = identity
        email_identity = f"{identity}@{domain}"

    result = await db.execute(select(User).where(func.lower(User.email) == email_identity))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(func.lower(User.username) == username))
        user = result.scalar_one_or_none()

    if not user:
        print(f"[auth] login failed: user not found for {identity!r}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(login_data.password, user.hashed_password):
        print(f"[auth] login failed: bad password for {user.email!r}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )

    # Normalize stored email to lowercase so JWT ↔ DB lookups stay consistent
    if user.email != user.email.lower():
        user.email = user.email.lower()
        await db.commit()
        await db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.email.lower()})
    user_out = UserResponse.model_validate(user).model_copy(
        update={
            "avatar_url": to_browser_avatar_url(user.avatar_url) or user.avatar_url
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_out,
    }


CONTACT_ADMIN_DETAIL = "В профиле не указан Telegram. Свяжитесь с администратором."


def _generate_mailbox_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
        ):
            return password


async def _find_mailbox_user(identity: str, db: AsyncSession) -> Optional[User]:
    return await find_local_mailbox(db, identity)


@app.post("/api/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generate a new mailbox password and send it via the news Telegram bot."""
    user = await _find_mailbox_user(payload.email, db)
    if not user or not user.is_active or not (user.telegram or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=CONTACT_ADMIN_DETAIL,
        )

    new_password = _generate_mailbox_password()
    message = (
        f"Новый пароль для почты mail.alexol.io\n\n"
        f"Логин: {user.username}\n"
        f"Пароль: {new_password}\n\n"
        f"После входа смените его в профиле."
    )
    sent, error = await admin_sync.send_news_bot_dm(telegram=user.telegram, text=message)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=error or CONTACT_ADMIN_DETAIL,
        )

    user.hashed_password = get_password_hash(new_password)
    await db.commit()

    await admin_sync.push_user_ensure(
        username=user.username,
        full_name=user.full_name,
        password=new_password,
        is_admin=user.is_admin,
        is_active=user.is_active,
        phone=user.phone,
        job_title=user.job_title,
        telegram=user.telegram,
        avatar_url=user.avatar_url,
    )

    return {"message": "Новый пароль отправлен в Telegram."}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    data = UserResponse.model_validate(current_user)
    return data.model_copy(
        update={
            "avatar_url": to_browser_avatar_url(current_user.avatar_url)
            or current_user.avatar_url
        }
    )


SSO_TYP = "alexol-sso"
SSO_TTL_SEC = 90


def _sso_secret() -> str:
    secret = settings.MAIL_SYNC_SECRET
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SSO is not configured (MAIL_SYNC_SECRET)",
        )
    return secret


@app.post("/api/auth/sso/admin-ticket", response_model=SsoTicketResponse)
async def create_admin_sso_ticket(current_user: User = Depends(get_current_admin_user)):
    """Mail admin → site admin.alexol.io handoff ticket."""
    ticket = jwt.encode(
        {
            "typ": SSO_TYP,
            "aud": "admin",
            "login": current_user.username.lower(),
            "email": current_user.email.lower(),
            "name": current_user.full_name,
            "exp": datetime.utcnow() + timedelta(seconds=SSO_TTL_SEC),
        },
        _sso_secret(),
        algorithm=settings.ALGORITHM,
    )
    return {"ticket": ticket, "expires_in": SSO_TTL_SEC}


@app.post("/api/auth/sso/exchange", response_model=Token)
async def exchange_sso_ticket(body: SsoExchangeRequest, db: AsyncSession = Depends(get_db)):
    """Accept SSO ticket from site admin → mail access_token.

    If mailbox is missing, provision it from the ticket so admin↔mail
    integration works even when password sync never ran.
    """
    try:
        # jsonwebtoken (Node) embeds aud="mail". python-jose requires audience=
        # when the claim is present - otherwise decode raises JWTError.
        payload = jwt.decode(
            body.ticket,
            _sso_secret(),
            algorithms=[settings.ALGORITHM],
            audience="mail",
        )
    except JWTError as exc:
        print(f"[sso] ticket decode failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired SSO ticket",
        )

    if payload.get("typ") != SSO_TYP or payload.get("aud") != "mail":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO ticket",
        )

    login = (payload.get("login") or "").lower().strip()
    email = (payload.get("email") or "").lower().strip()
    name = (payload.get("name") or login or "User").strip()
    if not email and login:
        email = f"{login}@{settings.MAIL_DOMAIN}"

    if not email or not login:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO ticket",
        )

    result = await db.execute(select(User).where(func.lower(User.email) == email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(func.lower(User.username) == login))
        user = result.scalar_one_or_none()

    if not user:
        # Auto-create mailbox for SSO (password unknown - random; use SSO or reset in admin)
        user = User(
            email=email,
            username=login,
            full_name=name,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            is_admin=True,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"[sso] auto-provisioned mailbox {email}")
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mailbox not found or inactive",
        )

    access_token = create_access_token(data={"sub": user.email.lower()})
    user_out = UserResponse.model_validate(user).model_copy(
        update={
            "avatar_url": to_browser_avatar_url(user.avatar_url) or user.avatar_url
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_out,
    }


# Admin endpoints
@app.post("/api/admin/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Create new user (admin only)"""
    # Check if user already exists
    username = user_data.username.strip().lower()
    email = f"{username}@{settings.MAIL_DOMAIN}".lower()
    result = await db.execute(
        select(User).where(
            (func.lower(User.email) == email) | (func.lower(User.username) == username)
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    user = User(
        email=email,
        username=username,
        full_name=user_data.full_name,
        phone=user_data.phone,
        job_title=(user_data.job_title or "").strip() or None,
        telegram=user_data.telegram,
        hashed_password=get_password_hash(user_data.password),
        is_admin=bool(user_data.is_admin),
        is_active=True
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)

    synced = await admin_sync.push_user_ensure(
        username=user.username,
        full_name=user.full_name,
        password=user_data.password,
        is_admin=user.is_admin,
        is_active=user.is_active,
        phone=user.phone,
        job_title=user.job_title,
        telegram=user.telegram,
        avatar_url=user.avatar_url,
    )
    if not synced:
        await db.delete(user)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось создать пользователя в admin.alexol.io. Ящик откатан. Проверьте ALEXOL_API_URL / MAIL_SYNC_SECRET.",
        )

    schedule_rocketchat_profile_sync(user)

    return user

@app.get("/api/admin/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """List all users (admin only)"""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users

@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Delete user (admin only). Also deletes matching account on admin.alexol.io."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    username = user.username
    # Remote first so sides stay aligned; abort if admin sync fails.
    ok = await admin_sync.push_user_delete(username)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось удалить пользователя в admin.alexol.io. Ящик не удалён. Проверьте ALEXOL_API_URL / MAIL_SYNC_SECRET.",
        )

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}

@app.put("/api/admin/users/{user_id}", response_model=UserResponse)
async def update_user_by_admin(
    user_id: int,
    user_data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Update user (admin only) - can edit all fields including admin status"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    if user_data.phone is not None:
        user.phone = user_data.phone
    if user_data.job_title is not None:
        user.job_title = (user_data.job_title or "").strip() or None
    if user_data.telegram is not None:
        user.telegram = (user_data.telegram or "").strip() or None
    if user_data.password is not None:
        user.hashed_password = get_password_hash(user_data.password)
    if user_data.is_admin is not None:
        # Prevent removing admin from yourself
        if user.id == admin.id and user_data.is_admin == False:
            raise HTTPException(
                status_code=400, 
                detail="Cannot remove admin privileges from yourself"
            )
        user.is_admin = user_data.is_admin
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    await db.commit()
    await db.refresh(user)

    await admin_sync.push_user_ensure(
        username=user.username,
        full_name=user.full_name,
        password=user_data.password,
        is_admin=user.is_admin,
        is_active=user.is_active,
        phone=user.phone,
        job_title=user.job_title,
        telegram=user.telegram,
        avatar_url=user.avatar_url,
    )

    schedule_rocketchat_profile_sync(user)

    return user

@app.post("/api/admin/users/{user_id}/make-admin")
async def make_user_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Make user an admin (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_admin:
        raise HTTPException(status_code=400, detail="User is already an admin")
    
    user.is_admin = True
    await db.commit()
    await db.refresh(user)

    await admin_sync.push_user_ensure(
        username=user.username,
        full_name=user.full_name,
        is_admin=True,
        is_active=user.is_active,
        phone=user.phone,
        job_title=user.job_title,
        telegram=user.telegram,
        avatar_url=user.avatar_url,
    )

    return {"message": f"User {user.email} is now an admin", "user": user}

@app.post("/api/admin/users/{user_id}/remove-admin")
async def remove_user_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Remove admin privileges from user (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_admin:
        raise HTTPException(status_code=400, detail="User is not an admin")
    
    # Prevent removing admin from yourself
    if user.id == admin.id:
        raise HTTPException(
            status_code=400, 
            detail="Cannot remove admin privileges from yourself"
        )
    
    user.is_admin = False
    await db.commit()
    await db.refresh(user)

    await admin_sync.push_user_ensure(
        username=user.username,
        full_name=user.full_name,
        is_admin=False,
        is_active=user.is_active,
        phone=user.phone,
        job_title=user.job_title,
        telegram=user.telegram,
        avatar_url=user.avatar_url,
    )

    return {"message": f"Admin privileges removed from {user.email}", "user": user}

# User profile endpoints
@app.put("/api/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile"""
    if user_data.full_name:
        current_user.full_name = user_data.full_name
    if user_data.phone is not None:
        current_user.phone = (user_data.phone or "").strip() or None
    if user_data.job_title is not None:
        current_user.job_title = (user_data.job_title or "").strip() or None
    if user_data.telegram is not None:
        current_user.telegram = (user_data.telegram or "").strip() or None
    if user_data.password:
        current_user.hashed_password = get_password_hash(user_data.password)
    
    await db.commit()
    await db.refresh(current_user)

    await admin_sync.push_user_ensure(
        username=current_user.username,
        full_name=current_user.full_name,
        password=user_data.password,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        phone=current_user.phone,
        job_title=current_user.job_title,
        telegram=current_user.telegram,
        avatar_url=current_user.avatar_url,
    )

    schedule_rocketchat_profile_sync(current_user)

    return UserResponse.model_validate(current_user).model_copy(
        update={
            "avatar_url": to_browser_avatar_url(current_user.avatar_url)
            or current_user.avatar_url
        }
    )

@app.post("/api/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload user avatar"""
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    if content_type in ("image/heic", "image/heif"):
        raise HTTPException(
            status_code=400,
            detail="HEIC не поддерживается. Сохраните фото как JPG или PNG.",
        )

    raw_name = file.filename or "avatar.jpg"
    file_extension = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else "jpg"
    if file_extension not in ("jpg", "jpeg", "png", "webp", "gif"):
        file_extension = "jpg"
    file_name = f"{current_user.username}_{uuid.uuid4().hex}.{file_extension}"

    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Empty file")
    file_stream = io.BytesIO(file_data)

    avatar_url = minio_client.upload_file(
        file_stream, file_name, content_type or "image/jpeg"
    )

    current_user.avatar_url = avatar_url
    await db.commit()

    await admin_sync.push_user_ensure(
        username=current_user.username,
        full_name=current_user.full_name,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        phone=current_user.phone,
        job_title=current_user.job_title,
        telegram=current_user.telegram,
        avatar_url=avatar_url,
    )

    schedule_rocketchat_profile_sync(current_user)

    browser_url = to_browser_avatar_url(avatar_url) or avatar_url
    return {"avatar_url": browser_url}


async def _emails_to_response(db: AsyncSession, emails) -> List[EmailResponse]:
    """Attach from/to avatar URLs and display names."""
    rows = list(emails)
    to_addrs: list[str] = []
    for e in rows:
        split = split_address_field(e.to_address)
        to_addrs.extend(split or [e.to_address])
    peers = await peer_info_map(
        db,
        [e.from_address for e in rows] + to_addrs,
    )
    out: List[EmailResponse] = []
    for e in rows:
        from_key, _ = parse_from_header(e.from_address)
        addrs = split_address_field(e.to_address)
        first_to = addrs[0] if addrs else (parse_from_header(e.to_address)[0] or "")
        from_peer = peers.get(from_key)
        to_peer = peers.get(first_to)
        from_name = (getattr(e, "from_name", None) or "").strip() or (
            from_peer.name if from_peer else None
        )
        stored_to_name = (getattr(e, "to_name", None) or "").strip()
        if stored_to_name:
            to_name = stored_to_name
        elif len(addrs) > 1:
            labels = []
            for addr in addrs:
                peer = peers.get(addr)
                labels.append((peer.name if peer and peer.name else addr) or addr)
            to_name = ", ".join(labels)
        else:
            to_name = to_peer.name if to_peer else None
        body, html_body = coerce_stored_bodies(e.body, e.html_body)
        out.append(
            EmailResponse(
                id=e.id,
                from_address=e.from_address,
                to_address=e.to_address,
                subject=e.subject,
                body=body,
                html_body=html_body or None,
                is_read=e.is_read,
                is_sent=e.is_sent,
                received_at=e.received_at,
                from_avatar_url=from_peer.avatar_url if from_peer else None,
                to_avatar_url=to_peer.avatar_url if to_peer else None,
                from_name=from_name,
                to_name=to_name,
            )
        )
    return out


@app.get("/api/media/{bucket}/{object_name:path}")
async def media_proxy(
    bucket: str,
    object_name: str,
):
    """Public read of MinIO avatars (SPA <img> cannot send Bearer)."""
    if bucket != settings.MINIO_BUCKET:
        raise HTTPException(status_code=404, detail="Not found")
    object_name = unquote(object_name or "").lstrip("/")
    if not object_name or ".." in object_name:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        minio_client._ensure_bucket()
        obj = minio_client.client.get_object(bucket, object_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Object not found: {e}") from e

    content_type = obj.headers.get("Content-Type") or "application/octet-stream"
    if content_type == "application/octet-stream":
        lower = object_name.lower()
        if lower.endswith((".jpg", ".jpeg")):
            content_type = "image/jpeg"
        elif lower.endswith(".png"):
            content_type = "image/png"
        elif lower.endswith(".webp"):
            content_type = "image/webp"
        elif lower.endswith(".gif"):
            content_type = "image/gif"

    def iter_file():
        try:
            for chunk in obj.stream(32 * 1024):
                yield chunk
        finally:
            obj.close()
            obj.release_conn()

    return StreamingResponse(
        iter_file(),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


async def _commit_and_deliver(
    *,
    db: AsyncSession,
    current_user: User,
    to_raw: str,
    subject: str,
    body: str,
    html_body: Optional[str],
    attachments: Optional[List[tuple]] = None,
) -> Email:
    addresses = parse_recipient_addresses(to_raw)
    peers = await peer_info_map(db, addresses)
    names = {
        addr: (peers[addr].name or "")
        for addr in addresses
        if peers.get(addr) and peers[addr].name
    }
    to_labels = [
        names[addr] if addr in names else addr
        for addr in addresses
    ]
    imap_uid = await allocate_imap_uid(db, current_user.id, True)
    email_obj = Email(
        user_id=current_user.id,
        from_address=current_user.email,
        to_address=", ".join(addresses),
        from_name=current_user.full_name,
        to_name=", ".join(to_labels) if to_labels else None,
        subject=subject,
        body=body,
        html_body=html_body,
        is_sent=True,
        is_read=True,
        imap_uid=imap_uid,
    )
    db.add(email_obj)
    await db.commit()
    await admin_sync.ensure_user_avatar(current_user, db)
    raw = await deliver_composed_email(
        current_user=current_user,
        to_addresses=addresses,
        to_header=format_to_header(addresses, names),
        subject=subject,
        body=body,
        html_body=html_body,
        attachments=attachments,
    )
    email_obj.raw_rfc822 = raw
    await db.commit()
    return email_obj


@app.post("/api/emails/send")
async def send_email(
    email_data: EmailCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send email without attachments (JSON payload). To: accepts several addresses."""
    email_obj = await _commit_and_deliver(
        db=db,
        current_user=current_user,
        to_raw=email_data.to_address,
        subject=email_data.subject,
        body=email_data.body,
        html_body=email_data.html_body,
        attachments=None,
    )
    return {"message": "Email sent successfully", "email_id": email_obj.id}


def _template_response(template: EmailTemplate, current_user: User) -> EmailTemplateResponse:
    return EmailTemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        type=template.type,
        description=template.description,
        html_content=template.html_content,
        is_shared=bool(getattr(template, "is_shared", False)),
        is_mine=template.user_id == current_user.id,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


def _can_manage_template(template: EmailTemplate, user: User) -> bool:
    return user.is_admin or template.user_id == user.id


@app.get("/api/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    template_type: Optional[str] = None,
    mine_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List templates: own + shared. Admins see all unless mine_only=true."""
    query = select(EmailTemplate)
    if mine_only:
        query = query.where(EmailTemplate.user_id == current_user.id)
    elif not current_user.is_admin:
        query = query.where(
            or_(
                EmailTemplate.user_id == current_user.id,
                EmailTemplate.is_shared.is_(True),
            )
        )
    if template_type:
        query = query.where(EmailTemplate.type == template_type)

    result = await db.execute(query.order_by(EmailTemplate.created_at.desc()))
    templates = result.scalars().all()
    return [_template_response(t, current_user) for t in templates]


@app.post("/api/templates", response_model=EmailTemplateResponse)
async def create_template(
    template_data: EmailTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create template - any user (private). Admins may mark is_shared."""
    is_shared = bool(template_data.is_shared) if current_user.is_admin else False
    template = EmailTemplate(
        user_id=current_user.id,
        name=template_data.name,
        type=template_data.type,
        description=template_data.description,
        html_content=template_data.html_content,
        is_shared=is_shared,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return _template_response(template, current_user)


@app.put("/api/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: int,
    template_data: EmailTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update template - owner or admin."""
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if not _can_manage_template(template, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to edit this template")

    if template_data.name is not None:
        template.name = template_data.name
    if template_data.type is not None:
        template.type = template_data.type
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.html_content is not None:
        template.html_content = template_data.html_content
    if template_data.is_shared is not None and current_user.is_admin:
        template.is_shared = bool(template_data.is_shared)

    await db.commit()
    await db.refresh(template)
    return _template_response(template, current_user)


@app.delete("/api/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete template - owner or admin."""
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if not _can_manage_template(template, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to delete this template")

    await db.delete(template)
    await db.commit()
    return {"message": "Template deleted successfully"}


@app.post("/api/emails/send-with-attachments")
async def send_email_with_attachments(
    to_address: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    html_body: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send email with optional file attachments (multipart/form-data). To: accepts several addresses."""
    attachments_data: List[tuple] = []
    for file in files or []:
        content = await file.read()
        attachments_data.append((file.filename, file.content_type or "", content))

    email_obj = await _commit_and_deliver(
        db=db,
        current_user=current_user,
        to_raw=to_address,
        subject=subject,
        body=body,
        html_body=html_body,
        attachments=attachments_data or None,
    )
    return {"message": "Email sent successfully", "email_id": email_obj.id}

@app.get("/api/emails/inbox", response_model=List[EmailResponse])
async def get_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user inbox"""
    result = await db.execute(
        select(Email)
        .where(
            Email.user_id == current_user.id,
            Email.is_sent == False,
            Email.is_deleted.is_(False),
            Email.is_trashed.is_not(True),
        )
        .order_by(Email.received_at.desc())
    )
    emails = result.scalars().all()
    return await _emails_to_response(db, emails)

@app.get("/api/emails/sent", response_model=List[EmailResponse])
async def get_sent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get sent emails"""
    result = await db.execute(
        select(Email)
        .where(
            Email.user_id == current_user.id,
            Email.is_sent == True,
            Email.is_deleted.is_(False),
            Email.is_trashed.is_not(True),
        )
        .order_by(Email.received_at.desc())
    )
    emails = result.scalars().all()
    return await _emails_to_response(db, emails)

@app.get("/api/emails/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get email by ID (also marks inbound as read)."""
    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == current_user.id)
    )
    email = result.scalar_one_or_none()
    
    if not email or email.is_deleted or email.is_trashed:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # Mark as read
    if not email.is_read and not email.is_sent:
        email.is_read = True
        await db.commit()
        await db.refresh(email)
    
    enriched = await _emails_to_response(db, [email])
    return enriched[0]


@app.post("/api/emails/{email_id}/read", response_model=EmailResponse)
async def mark_email_read(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Explicitly mark an inbound email as read."""
    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == current_user.id)
    )
    email = result.scalar_one_or_none()
    if not email or email.is_deleted or email.is_trashed:
        raise HTTPException(status_code=404, detail="Email not found")
    if email.is_sent:
        raise HTTPException(status_code=400, detail="Sent emails cannot be marked unread/read this way")
    if not email.is_read:
        email.is_read = True
        await db.commit()
        await db.refresh(email)
    enriched = await _emails_to_response(db, [email])
    return enriched[0]


@app.delete("/api/emails/{email_id}")
async def delete_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete email"""
    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == current_user.id)
    )
    email = result.scalar_one_or_none()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    await db.delete(email)
    await db.commit()
    
    return {"message": "Email deleted successfully"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


# ── Internal sync API (alexolMain admin → mailbox provisioning) ──────────────

def _apply_avatar_from_sync(user: User, user_data: SyncUserEnsure | SyncUserUpdate | SyncUserCreate) -> None:
    """Set avatar_url from sync payload (absolute URL or base64 → MinIO)."""
    avatar_url = getattr(user_data, "avatar_url", None)
    avatar_b64 = getattr(user_data, "avatar_base64", None)
    content_type = getattr(user_data, "avatar_content_type", None) or "image/jpeg"
    username = (user.username or user.email.split("@", 1)[0]).strip().lower()
    if avatar_b64:
        try:
            raw = base64.b64decode(avatar_b64)
            imported = import_avatar_to_minio(
                username,
                raw_bytes=raw,
                content_type=content_type,
            )
            if imported:
                user.avatar_url = imported
        except Exception as exc:
            print(f"[sync] avatar base64 upload failed: {exc}")
    elif avatar_url:
        source = avatar_url.strip()
        imported = import_avatar_to_minio(username, source_url=source)
        if imported:
            user.avatar_url = imported
        elif "/uploads/" in source or "api.alexol.io" in source:
            user.avatar_url = source


@app.post("/api/internal/users/ensure", response_model=UserResponse, dependencies=[Depends(verify_mail_sync_key)])
async def sync_ensure_user(user_data: SyncUserEnsure, db: AsyncSession = Depends(get_db)):
    """Create mailbox if missing; update profile/flags/avatar; set password when provided."""
    username = user_data.username.strip().lower()
    email = f"{username}@{settings.MAIL_DOMAIN}".lower()

    result = await db.execute(
        select(User).where(
            (func.lower(User.email) == email) | (func.lower(User.username) == username)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.username = username
        existing.email = email
        existing.full_name = user_data.full_name
        existing.is_admin = bool(user_data.is_admin)
        existing.is_active = bool(user_data.is_active)
        if user_data.phone is not None:
            existing.phone = (user_data.phone or "").strip() or None
        if user_data.job_title is not None:
            existing.job_title = (user_data.job_title or "").strip() or None
        if user_data.telegram is not None:
            existing.telegram = (user_data.telegram or "").strip() or None
        if user_data.password:
            existing.hashed_password = get_password_hash(user_data.password)
        _apply_avatar_from_sync(existing, user_data)
        await db.commit()
        await db.refresh(existing)
        schedule_rocketchat_profile_sync(existing)
        return existing

    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="password is required to create a new mailbox",
        )

    user = User(
        email=email,
        username=username,
        full_name=user_data.full_name,
        phone=user_data.phone,
        job_title=(user_data.job_title or "").strip() or None,
        telegram=user_data.telegram,
        hashed_password=get_password_hash(user_data.password),
        is_admin=bool(user_data.is_admin),
        is_active=bool(user_data.is_active),
    )
    _apply_avatar_from_sync(user, user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    schedule_rocketchat_profile_sync(user)
    return user


@app.post("/api/internal/users", response_model=UserResponse, dependencies=[Depends(verify_mail_sync_key)])
async def sync_create_user(user_data: SyncUserCreate, db: AsyncSession = Depends(get_db)):
    """Create mailbox user from alexolMain (idempotent if username already exists)."""
    # Delegate to ensure so username/email are always normalized.
    return await sync_ensure_user(
        SyncUserEnsure(
            username=user_data.username,
            full_name=user_data.full_name,
            password=user_data.password,
            is_admin=user_data.is_admin,
            is_active=user_data.is_active,
            phone=user_data.phone,
            job_title=user_data.job_title,
            telegram=user_data.telegram,
            avatar_url=user_data.avatar_url,
        ),
        db,
    )


@app.put("/api/internal/users/{username}", response_model=UserResponse, dependencies=[Depends(verify_mail_sync_key)])
async def sync_update_user(
    username: str,
    user_data: SyncUserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update mailbox user by username (login from alexolMain)."""
    login = username.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.username) == login))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Mail user not found")

    if user_data.new_username and user_data.new_username.strip().lower() != login:
        new_username = user_data.new_username.strip().lower()
        new_email = f"{new_username}@{settings.MAIL_DOMAIN}".lower()
        clash = await db.execute(
            select(User).where(
                ((func.lower(User.username) == new_username) | (func.lower(User.email) == new_email))
                & (User.id != user.id)
            )
        )
        if clash.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken in mail")
        user.username = new_username
        user.email = new_email

    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    if user_data.password is not None:
        user.hashed_password = get_password_hash(user_data.password)
    if user_data.is_admin is not None:
        user.is_admin = bool(user_data.is_admin)
    if user_data.is_active is not None:
        user.is_active = bool(user_data.is_active)
    if user_data.phone is not None:
        user.phone = user_data.phone
    if user_data.job_title is not None:
        user.job_title = (user_data.job_title or "").strip() or None
    if user_data.telegram is not None:
        user.telegram = (user_data.telegram or "").strip() or None
    if getattr(user_data, "avatar_url", None):
        user.avatar_url = user_data.avatar_url

    await db.commit()
    await db.refresh(user)
    schedule_rocketchat_profile_sync(user)
    return user


@app.delete("/api/internal/users/{username}", dependencies=[Depends(verify_mail_sync_key)])
async def sync_delete_user(username: str, db: AsyncSession = Depends(get_db)):
    """Delete mailbox user by username."""
    login = username.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.username) == login))
    user = result.scalar_one_or_none()
    if not user:
        return {"message": "Mail user not found (already absent)"}

    await db.delete(user)
    await db.commit()
    return {"message": "Mail user deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

