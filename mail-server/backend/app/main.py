from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import timedelta, datetime
from typing import List, Optional
import io
import uuid
import asyncio
import secrets
import base64

from jose import JWTError, jwt

from app.database import get_db, engine, Base, AsyncSessionLocal
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
from app.config import settings
from app.smtp_server import smtp_server
from app.imap_server import imap_server
from app.minio_client import minio_client
from app.dkim_signer import sign_message
from app.avatar_resolve import peer_info_map, to_browser_avatar_url
from app import admin_sync
import smtplib
import ssl
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formataddr
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from urllib.parse import unquote
from html import escape as html_escape

app = FastAPI(title="Mail Server API")

# CORS — mail SPA + admin/local dev
_CORS_ORIGINS = [
    "https://mail.alexol.io",
    "https://admin.alexol.io",
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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Existing DBs: create_all does not add new columns
        await conn.execute(
            text("ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_name VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE emails ADD COLUMN IF NOT EXISTS to_name VARCHAR")
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
    
    # Start SMTP server
    smtp_server.start()
    # Start IMAP server
    imap_server.start()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop SMTP and IMAP servers"""
    smtp_server.stop()
    await smtp_server.cleanup()
    imap_server.stop()

# Auth endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login user by email or username (non-admins OK — this is mail, not site admin)."""
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
        # Only accept mailbox domain — personal emails from admin profile are not logins.
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
        # when the claim is present — otherwise decode raises JWTError.
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
        # Auto-create mailbox for SSO (password unknown — random; use SSO or reset in admin)
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
        avatar_url=user.avatar_url,
    )
    if not synced:
        await db.delete(user)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось создать пользователя в admin.alexol.io. Ящик откатан. Проверьте ALEXOL_API_URL / MAIL_SYNC_SECRET.",
        )

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
        avatar_url=user.avatar_url,
    )

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
    if user_data.phone:
        current_user.phone = user_data.phone
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
        avatar_url=current_user.avatar_url,
    )

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
        avatar_url=avatar_url,
    )

    browser_url = to_browser_avatar_url(avatar_url) or avatar_url
    return {"avatar_url": browser_url}


async def _emails_to_response(db: AsyncSession, emails) -> List[EmailResponse]:
    """Attach from/to avatar URLs and display names."""
    rows = list(emails)
    peers = await peer_info_map(
        db,
        [e.from_address for e in rows] + [e.to_address for e in rows],
    )
    out: List[EmailResponse] = []
    for e in rows:
        from_key = (e.from_address or "").lower()
        to_key = (e.to_address or "").lower()
        from_peer = peers.get(from_key)
        to_peer = peers.get(to_key)
        from_name = (getattr(e, "from_name", None) or "").strip() or (
            from_peer.name if from_peer else None
        )
        to_name = (getattr(e, "to_name", None) or "").strip() or (
            to_peer.name if to_peer else None
        )
        out.append(
            EmailResponse(
                id=e.id,
                from_address=e.from_address,
                to_address=e.to_address,
                subject=e.subject,
                body=e.body,
                html_body=e.html_body,
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


def _build_and_send_email_message(
    *,
    current_user: User,
    to_address: str,
    subject: str,
    body: str,
    html_body: Optional[str],
    attachments: Optional[List[tuple]] = None,
):
    """
    Build MIME message (with optional attachments) and return (msg, sender_callable_or_coroutine).
    attachments: list of tuples (filename, content_type, bytes_content).

    Note: Gmail's header avatar (circle next to name) is Google-controlled and cannot be
    set via SMTP — do not embed profile photos in the body as a fake substitute.
    """
    display_name = current_user.full_name or current_user.email

    if html_body and html_body.strip():
        content_html = html_body
    else:
        content_html = (
            f"<pre style='font-family:inherit;white-space:pre-wrap;margin:0'>"
            f"{html_escape(body or '')}</pre>"
        )

    signature_html = (
        "<div style='margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;"
        "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'>"
        f"<div style='font-weight:600;color:#0f172a'>{html_escape(display_name)}</div>"
        f"<div style='color:#64748b;font-size:13px'>{html_escape(current_user.email)}</div>"
        "</div>"
    )
    signature_text = f"\n\n--\n{display_name}\n{current_user.email}\n"

    full_html = content_html + signature_html
    full_text = (body or "") + signature_text

    if attachments:
        msg = MIMEMultipart("mixed")
        alternative = MIMEMultipart("alternative")
        msg.attach(alternative)
    else:
        msg = MIMEMultipart("alternative")
        alternative = msg

    msg["From"] = formataddr((display_name, current_user.email))
    msg["To"] = to_address
    msg["Subject"] = subject

    alternative.attach(MIMEText(full_text, "plain", "utf-8"))
    alternative.attach(MIMEText(full_html, "html", "utf-8"))

    if attachments:
        for filename, content_type, content in attachments:
            part = MIMEApplication(content, Name=filename)
            part.add_header(
                "Content-Disposition", "attachment", filename=filename
            )
            if content_type:
                part.add_header("Content-Type", content_type)
            msg.attach(part)

    msg = sign_message(msg)

    print(f"[EMAIL] Starting send process: from={current_user.email}, to={to_address}")
    try:
        recipient_domain = to_address.split("@")[1] if "@" in to_address else None

        if not recipient_domain:
            raise HTTPException(status_code=400, detail="Invalid recipient email address")

        print(
            f"[EMAIL] Recipient domain: {recipient_domain}, Mail domain: {settings.MAIL_DOMAIN}"
        )
        print(
            f"[EMAIL] SMTP_RELAY_ENABLED: {settings.SMTP_RELAY_ENABLED}, SMTP_RELAY_HOST: {settings.SMTP_RELAY_HOST}"
        )

        if (
            recipient_domain != settings.MAIL_DOMAIN.replace("@", "")
            and settings.SMTP_RELAY_ENABLED
            and settings.SMTP_RELAY_HOST
        ):
            use_sendgrid_api = (
                settings.SENDGRID_USE_API
                and settings.SMTP_RELAY_HOST
                and "sendgrid" in settings.SMTP_RELAY_HOST.lower()
                and settings.SMTP_RELAY_PASSWORD
            )
            if use_sendgrid_api:
                print(
                    f"[EMAIL] Sending via SendGrid API (HTTPS) to {to_address}"
                )
                try:
                    payload = {
                        "personalizations": [{"to": [{"email": to_address}]}],
                        "from": {
                            "email": current_user.email,
                            "name": current_user.full_name or current_user.email,
                        },
                        "subject": subject,
                        "content": [{"type": "text/plain", "value": body or ""}],
                    }
                    if html_body:
                        payload["content"].append(
                            {"type": "text/html", "value": html_body}
                        )
                    import httpx  # local import to avoid circular issues

                    async def _send_via_sendgrid():
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            r = await client.post(
                                "https://api.sendgrid.com/v3/mail/send",
                                json=payload,
                                headers={
                                    "Authorization": f"Bearer {settings.SMTP_RELAY_PASSWORD}",
                                    "Content-Type": "application/json",
                                },
                            )
                        if r.status_code >= 400:
                            raise Exception(f"SendGrid API {r.status_code}: {r.text}")

                    return msg, _send_via_sendgrid
                except Exception as api_err:
                    print(f"[EMAIL] SendGrid API error: {api_err}")
                    raise
            else:
                print(f"[EMAIL] Sending via SMTP Relay to {to_address}")
                print(
                    f"[EMAIL] Relay config: {settings.SMTP_RELAY_HOST}:{settings.SMTP_RELAY_PORT}, user: {settings.SMTP_RELAY_USER}"
                )

                def _send_via_relay():
                    with smtplib.SMTP(
                        settings.SMTP_RELAY_HOST, settings.SMTP_RELAY_PORT
                    ) as smtp:
                        if settings.SMTP_RELAY_USE_TLS:
                            smtp.starttls()
                        if settings.SMTP_RELAY_USER and settings.SMTP_RELAY_PASSWORD:
                            smtp.login(
                                settings.SMTP_RELAY_USER, settings.SMTP_RELAY_PASSWORD
                            )
                        smtp.send_message(msg)

                return msg, _send_via_relay
        else:
            print(
                f"[EMAIL] Using direct SMTP (not using relay). Reason: domain={recipient_domain}, mail_domain={settings.MAIL_DOMAIN}, relay_enabled={settings.SMTP_RELAY_ENABLED}, relay_host={settings.SMTP_RELAY_HOST}"
            )
            import dns.resolver

            def _send_direct():
                try:
                    mx_records = dns.resolver.resolve(recipient_domain, "MX")
                    mx_records = sorted(mx_records, key=lambda r: r.preference)
                    sent = False
                    tls_ctx = ssl.create_default_context()
                    for mx in mx_records:
                        mx_host = str(mx.exchange).rstrip(".")
                        try:
                            with smtplib.SMTP(mx_host, 25, timeout=30) as smtp:
                                smtp.ehlo()
                                # Gmail marks "did not encrypt" if we skip STARTTLS on port 25
                                if smtp.has_extn("starttls"):
                                    smtp.starttls(context=tls_ctx)
                                    smtp.ehlo()
                                smtp.send_message(msg)
                            print(f"[EMAIL] Sent via {mx_host}:25 (STARTTLS if available)")
                            sent = True
                            break
                        except Exception as mx_error:
                            print(f"Failed to send via {mx_host}: {mx_error}")
                            continue
                    if not sent:
                        raise Exception("All MX servers failed")
                except dns.resolver.NXDOMAIN:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Domain {recipient_domain} does not exist",
                    )
                except dns.resolver.NoAnswer:
                    raise HTTPException(
                        status_code=400,
                        detail=f"No MX records found for {recipient_domain}",
                    )
                except Exception as dns_error:
                    if recipient_domain == settings.MAIL_DOMAIN.replace("@", ""):
                        with smtplib.SMTP("localhost", settings.SMTP_PORT) as smtp:
                            smtp.send_message(msg)
                    else:
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to send email: {str(dns_error)}",
                        )

            return msg, _send_direct
    except HTTPException:
        raise
    except Exception as e:
        print(f"Could not prepare email for sending: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}",
        )


@app.post("/api/emails/send")
async def send_email(
    email_data: EmailCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send email without attachments (JSON payload)"""
    to_addr = (email_data.to_address or "").strip().lower()
    peers = await peer_info_map(db, [to_addr])
    to_peer = peers.get(to_addr)
    # Save to database as sent
    email_obj = Email(
        user_id=current_user.id,
        from_address=current_user.email,
        to_address=email_data.to_address,
        from_name=current_user.full_name,
        to_name=to_peer.name if to_peer else None,
        subject=email_data.subject,
        body=email_data.body,
        html_body=email_data.html_body,
        is_sent=True
    )
    db.add(email_obj)
    await db.commit()

    msg, sender = _build_and_send_email_message(
        current_user=current_user,
        to_address=email_data.to_address,
        subject=email_data.subject,
        body=email_data.body,
        html_body=email_data.html_body,
        attachments=None,
    )

    send_callable = sender
    if asyncio.iscoroutinefunction(send_callable):
        await send_callable()
    else:
        send_callable()

    return {"message": "Email sent successfully", "email_id": email_obj.id}


@app.get("/api/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    template_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List email templates (authenticated users)."""
    _ = current_user
    query = select(EmailTemplate)
    if template_type:
        query = query.where(EmailTemplate.type == template_type)

    result = await db.execute(query.order_by(EmailTemplate.created_at.desc()))
    templates = result.scalars().all()
    return templates


@app.post("/api/templates", response_model=EmailTemplateResponse)
async def create_template(
    template_data: EmailTemplateCreate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new email template (admin only)"""
    template = EmailTemplate(
        user_id=admin.id,
        name=template_data.name,
        type=template_data.type,
        description=template_data.description,
        html_content=template_data.html_content,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@app.put("/api/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: int,
    template_data: EmailTemplateUpdate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update existing email template (admin only)"""
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template_data.name is not None:
        template.name = template_data.name
    if template_data.type is not None:
        template.type = template_data.type
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.html_content is not None:
        template.html_content = template_data.html_content

    await db.commit()
    await db.refresh(template)
    return template


@app.delete("/api/templates/{template_id}")
async def delete_template(
    template_id: int,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete email template (admin only)"""
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

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
    """Send email with optional file attachments (multipart/form-data)."""
    to_norm = (to_address or "").strip().lower()
    peers = await peer_info_map(db, [to_norm])
    to_peer = peers.get(to_norm)
    email_obj = Email(
        user_id=current_user.id,
        from_address=current_user.email,
        to_address=to_address,
        from_name=current_user.full_name,
        to_name=to_peer.name if to_peer else None,
        subject=subject,
        body=body,
        html_body=html_body,
        is_sent=True,
    )
    db.add(email_obj)
    await db.commit()

    attachments_data: List[tuple] = []
    for file in files or []:
        content = await file.read()
        attachments_data.append((file.filename, file.content_type or "", content))

    msg, sender = _build_and_send_email_message(
        current_user=current_user,
        to_address=to_address,
        subject=subject,
        body=body,
        html_body=html_body,
        attachments=attachments_data or None,
    )

    send_callable = sender
    if asyncio.iscoroutinefunction(send_callable):
        await send_callable()
    else:
        send_callable()

    return {"message": "Email sent successfully", "email_id": email_obj.id}

@app.get("/api/emails/inbox", response_model=List[EmailResponse])
async def get_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user inbox"""
    result = await db.execute(
        select(Email)
        .where(Email.user_id == current_user.id, Email.is_sent == False)
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
        .where(Email.user_id == current_user.id, Email.is_sent == True)
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
    
    if not email:
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
    if not email:
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
    if avatar_b64:
        try:
            raw = base64.b64decode(avatar_b64)
            ext = "jpg"
            if "png" in content_type:
                ext = "png"
            elif "webp" in content_type:
                ext = "webp"
            elif "gif" in content_type:
                ext = "gif"
            file_name = f"{user.username}_{uuid.uuid4()}.{ext}"
            url = minio_client.upload_file(io.BytesIO(raw), file_name, content_type)
            user.avatar_url = url
        except Exception as exc:
            print(f"[sync] avatar base64 upload failed: {exc}")
    elif avatar_url:
        user.avatar_url = avatar_url


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
            existing.phone = user_data.phone
        if user_data.password:
            existing.hashed_password = get_password_hash(user_data.password)
        _apply_avatar_from_sync(existing, user_data)
        await db.commit()
        await db.refresh(existing)
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
        hashed_password=get_password_hash(user_data.password),
        is_admin=bool(user_data.is_admin),
        is_active=bool(user_data.is_active),
    )
    _apply_avatar_from_sync(user, user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
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
    if getattr(user_data, "avatar_url", None):
        user.avatar_url = user_data.avatar_url

    await db.commit()
    await db.refresh(user)
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

