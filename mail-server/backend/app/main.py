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

from jose import JWTError, jwt

from app.database import get_db, engine, Base, AsyncSessionLocal
from app.models import User, Email, EmailTemplate
from app.schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserAdminUpdate,
    SyncUserCreate,
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
import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

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

    # Allow "user" as well as "user@alexol.io"
    if "@" not in identity:
        identity = f"{identity}@{settings.MAIL_DOMAIN}"

    result = await db.execute(select(User).where(User.email == identity))
    user = result.scalar_one_or_none()
    if not user:
        username = identity.split("@", 1)[0]
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


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
    """Accept SSO ticket from site admin → mail access_token."""
    try:
        payload = jwt.decode(body.ticket, _sso_secret(), algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired SSO ticket",
        )

    if payload.get("typ") != SSO_TYP or payload.get("aud") != "mail":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO ticket",
        )

    email = (payload.get("email") or "").lower().strip()
    login = (payload.get("login") or "").lower().strip()
    if not email and login:
        email = f"{login}@{settings.MAIL_DOMAIN}"

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO ticket",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user and login:
        result = await db.execute(select(User).where(User.username == login))
        user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mailbox not found or inactive",
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# Admin endpoints
@app.post("/api/admin/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Create new user (admin only)"""
    # Check if user already exists
    result = await db.execute(
        select(User).where(
            (User.email == f"{user_data.username}@{settings.MAIL_DOMAIN}") |
            (User.username == user_data.username)
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    email = f"{user_data.username}@{settings.MAIL_DOMAIN}"
    user = User(
        email=email,
        username=user_data.username,
        full_name=user_data.full_name,
        phone=user_data.phone,
        hashed_password=get_password_hash(user_data.password),
        is_admin=False,
        is_active=True
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
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
    """Delete user (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
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
    
    return current_user

@app.post("/api/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload user avatar"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    file_name = f"{current_user.username}_{uuid.uuid4()}.{file_extension}"
    
    # Upload to MinIO
    file_data = await file.read()
    file_stream = io.BytesIO(file_data)
    
    avatar_url = minio_client.upload_file(file_stream, file_name, file.content_type)
    
    # Update user
    current_user.avatar_url = avatar_url
    await db.commit()
    
    return {"avatar_url": avatar_url}

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
    """
    if attachments:
        msg = MIMEMultipart("mixed")
        alternative = MIMEMultipart("alternative")
        msg.attach(alternative)
    else:
        msg = MIMEMultipart("alternative")
        alternative = msg

    msg["From"] = current_user.email
    msg["To"] = to_address
    msg["Subject"] = subject

    text_part = MIMEText(body, "plain")
    alternative.attach(text_part)

    if html_body:
        html_part = MIMEText(html_body, "html")
        alternative.attach(html_part)

    if attachments:
        for filename, content_type, content in attachments:
            part = MIMEApplication(content, Name=filename)
            part.add_header(
                "Content-Disposition", "attachment", filename=filename
            )
            if content_type:
                part.add_header("Content-Type", content_type)
            msg.attach(part)

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
                    for mx in mx_records:
                        mx_host = str(mx.exchange).rstrip(".")
                        try:
                            with smtplib.SMTP(mx_host, 25, timeout=30) as smtp:
                                smtp.send_message(msg)
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
    # Save to database as sent
    email_obj = Email(
        user_id=current_user.id,
        from_address=current_user.email,
        to_address=email_data.to_address,
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
    email_obj = Email(
        user_id=current_user.id,
        from_address=current_user.email,
        to_address=to_address,
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
    return emails

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
    return emails

@app.get("/api/emails/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get email by ID"""
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
    
    return email

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

@app.post("/api/internal/users", response_model=UserResponse, dependencies=[Depends(verify_mail_sync_key)])
async def sync_create_user(user_data: SyncUserCreate, db: AsyncSession = Depends(get_db)):
    """Create mailbox user from alexolMain (idempotent if username already exists)."""
    username = user_data.username.strip()
    email = f"{username}@{settings.MAIL_DOMAIN}"

    result = await db.execute(
        select(User).where((User.email == email) | (User.username == username))
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.full_name = user_data.full_name
        existing.hashed_password = get_password_hash(user_data.password)
        existing.is_admin = user_data.is_admin
        existing.is_active = user_data.is_active
        if user_data.phone is not None:
            existing.phone = user_data.phone
        await db.commit()
        await db.refresh(existing)
        return existing

    user = User(
        email=email,
        username=username,
        full_name=user_data.full_name,
        phone=user_data.phone,
        hashed_password=get_password_hash(user_data.password),
        is_admin=user_data.is_admin,
        is_active=user_data.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@app.put("/api/internal/users/{username}", response_model=UserResponse, dependencies=[Depends(verify_mail_sync_key)])
async def sync_update_user(
    username: str,
    user_data: SyncUserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update mailbox user by username (login from alexolMain)."""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Mail user not found")

    if user_data.new_username and user_data.new_username != username:
        new_username = user_data.new_username.strip()
        new_email = f"{new_username}@{settings.MAIL_DOMAIN}"
        clash = await db.execute(
            select(User).where(
                ((User.username == new_username) | (User.email == new_email))
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
        user.is_admin = user_data.is_admin
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    if user_data.phone is not None:
        user.phone = user_data.phone

    await db.commit()
    await db.refresh(user)
    return user


@app.delete("/api/internal/users/{username}", dependencies=[Depends(verify_mail_sync_key)])
async def sync_delete_user(username: str, db: AsyncSession = Depends(get_db)):
    """Delete mailbox user by username."""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        return {"message": "Mail user not found (already absent)"}

    await db.delete(user)
    await db.commit()
    return {"message": "Mail user deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

