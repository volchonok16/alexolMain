"""OAuth2 / OIDC authorization-code provider for Rocket.Chat and Atlassian.

Users are mailboxes: email, full_name, username, public avatar.
A first SSO login auto-creates the Rocket.Chat account via Custom OAuth.
Atlassian (Jira / Confluence / Bitbucket) uses a separate client secret.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from hmac import compare_digest
from typing import Any, Optional
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, verify_password, _user_from_access_token
from app.config import settings
from app.database import get_db
from app.mail_photos import public_avatar_url
from app.mailbox import find_local_mailbox
from app.models import User
from app.rocketchat_profile import chat_browser_login_url, schedule_rocketchat_profile_sync

router = APIRouter()

OAUTH_CODE_TYP = "alexol-oauth-code"
OAUTH_ACCESS_TYP = "alexol-oauth-access"
OAUTH_SESSION_TYP = "alexol-oauth-session"
OAUTH_CODE_TTL_SEC = 120
OAUTH_ACCESS_TTL_SEC = 3600
OAUTH_SESSION_TTL_SEC = 60 * 60 * 24 * 7
OAUTH_COOKIE = "alexol_oauth"

CHAT_CLIENT_IDS = ("alexol-chat", "alexol-rocketchat")
ATLASSIAN_CLIENT_IDS = (
    "alexol-atlassian",
    "alexol-jira",
    "alexol-confluence",
    "alexol-bitbucket",
)


def _oauth_secret() -> str:
    secret = (settings.OAUTH_ROCKETCHAT_CLIENT_SECRET or "").strip() or (
        settings.SECRET_KEY or ""
    ).strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth is not configured (OAUTH_ROCKETCHAT_CLIENT_SECRET)",
        )
    return secret


def _client_id() -> str:
    return (settings.OAUTH_ROCKETCHAT_CLIENT_ID or "alexol-chat").strip()


def _csv(raw: Optional[str]) -> list[str]:
    return [item.strip() for item in (raw or "").split(",") if item.strip()]


def _allowed_client_ids() -> list[str]:
    configured = _csv(getattr(settings, "OAUTH_CLIENT_IDS", None))
    if configured:
        return configured
    ids = [_client_id()]
    for extra in ATLASSIAN_CLIENT_IDS:
        if extra not in ids:
            ids.append(extra)
    return ids


def _is_atlassian_client(client_id: str) -> bool:
    cid = (client_id or "").strip().lower()
    if cid in ATLASSIAN_CLIENT_IDS:
        return True
    return any(token in cid for token in ("jira", "confluence", "bitbucket", "atlassian"))


def _is_chat_client(client_id: str) -> bool:
    cid = (client_id or "").strip().lower()
    return cid in CHAT_CLIENT_IDS or cid == _client_id().lower()


def _client_secret_for(client_id: str) -> str:
    atlassian = (getattr(settings, "OAUTH_ATLASSIAN_CLIENT_SECRET", None) or "").strip()
    rocket = (settings.OAUTH_ROCKETCHAT_CLIENT_SECRET or "").strip()
    if _is_atlassian_client(client_id):
        return atlassian or rocket
    return rocket


def _allowed_redirects() -> list[str]:
    raw = (settings.OAUTH_ROCKETCHAT_REDIRECT_URI or "").strip()
    if raw:
        return _csv(raw)
    chat = (settings.CHAT_PUBLIC_URL or "https://chat.alexol.io").rstrip("/")
    jira = (getattr(settings, "JIRA_PUBLIC_URL", None) or "https://jira.alexol.io").rstrip("/")
    confluence = (
        getattr(settings, "CONFLUENCE_PUBLIC_URL", None) or "https://confluence.alexol.io"
    ).rstrip("/")
    bitbucket = (
        getattr(settings, "BITBUCKET_PUBLIC_URL", None) or "https://bitbucket.alexol.io"
    ).rstrip("/")
    return [
        f"{chat}/_oauth/alexol",
        f"{jira}/plugins/servlet/oidc/callback",
        f"{confluence}/plugins/servlet/oidc/callback",
        f"{bitbucket}/plugins/servlet/oidc/callback",
    ]


def redirect_uri_allowed(redirect_uri: str) -> bool:
    got = (redirect_uri or "").strip()
    if not got:
        return False
    for allowed in _allowed_redirects():
        if got == allowed:
            return True
        # Rocket.Chat may append query params to the callback.
        if got.startswith(allowed + "?"):
            return True
    return False


def client_id_allowed(client_id: str) -> bool:
    got = (client_id or "").strip()
    if not got:
        return False
    allowed = {item.lower() for item in _allowed_client_ids()}
    return got.lower() in allowed


def encode_oauth_jwt(payload: dict[str, Any], ttl_sec: int) -> str:
    now = datetime.now(timezone.utc)
    body = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl_sec)).timestamp()),
    }
    return jwt.encode(body, _oauth_secret(), algorithm=settings.ALGORITHM)


def decode_oauth_jwt(token: str, typ: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, _oauth_secret(), algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OAuth token",
        ) from exc
    if payload.get("typ") != typ:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OAuth token",
        )
    return payload


def oauth_userinfo(user: User) -> dict[str, Any]:
    email = (user.email or "").strip().lower()
    username = (user.username or email.split("@", 1)[0]).strip().lower()
    name = (user.full_name or username or email).strip()
    picture = public_avatar_url(email) if email else ""
    phone = (getattr(user, "phone", None) or "").strip()
    telegram = (getattr(user, "telegram", None) or "").strip().lstrip("@")
    job_title = (getattr(user, "job_title", None) or "").strip()
    bio_parts = [part for part in (job_title, phone, f"@{telegram}" if telegram else "") if part]
    info: dict[str, Any] = {
        "id": str(user.id),
        "sub": email or username,
        "username": username,
        "preferred_username": username,
        "email": email,
        "email_verified": True,
        "name": name,
        "picture": picture,
        "avatar": picture,
        "avatarUrl": picture,
        "avatar_url": picture,
        "given_name": name.split(" ", 1)[0] if name else username,
        "family_name": name.split(" ", 1)[1] if name and " " in name else "",
        "phone": phone,
        "telephone": phone,
        "telegram": telegram,
        "job_title": job_title,
        "title": job_title,
        "bio": " · ".join(bio_parts),
        "nickname": telegram or "",
    }
    if user.is_admin:
        info["roles"] = ["admin"]
    return info


async def find_mailbox(db: AsyncSession, identity: str) -> Optional[User]:
    return await find_local_mailbox(db, identity, active_only=True)


def _cookie_secure(request: Request) -> bool:
    _ = request
    public = (settings.MAIL_PUBLIC_URL or "").lower()
    return public.startswith("https://")


def _session_cookie(request: Request, token: str) -> dict[str, Any]:
    return {
        "key": OAUTH_COOKIE,
        "value": token,
        "max_age": OAUTH_SESSION_TTL_SEC,
        "httponly": True,
        "secure": _cookie_secure(request),
        "samesite": "lax",
        "path": "/",
    }


def _login_html(
    error: str = "",
    hidden: dict[str, str] | None = None,
    client_id: str = "",
) -> str:
    fields = hidden or {}
    cid = client_id or fields.get("client_id") or ""
    atlassian = _is_atlassian_client(cid)
    hidden_inputs = "".join(
        f'<input type="hidden" name="{key}" value="{_html(value)}" />'
        for key, value in fields.items()
        if value
    )
    err = f'<p class="error">{_html(error)}</p>' if error else ""
    mail = _html((settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/"))
    if atlassian:
        title = "Вход Alexol — Atlassian"
        heading = "Alexol Atlassian"
        button = "Войти в Атласиан"
        jira = _html((getattr(settings, "JIRA_PUBLIC_URL", None) or "https://jira.alexol.io").rstrip("/"))
        confluence = _html(
            (getattr(settings, "CONFLUENCE_PUBLIC_URL", None) or "https://confluence.alexol.io").rstrip("/")
        )
        bitbucket = _html(
            (getattr(settings, "BITBUCKET_PUBLIC_URL", None) or "https://bitbucket.alexol.io").rstrip("/")
        )
        hint = (
            f'Профиль (ФИО, фото, почта) подтянется с <a href="{mail}">{mail.replace("https://", "")}</a>. '
            f'Jira: <a href="{jira}">{jira}</a>. '
            f'Confluence: <a href="{confluence}">{confluence}</a>. '
            f'Bitbucket: <a href="{bitbucket}">{bitbucket}</a>'
        )
    else:
        title = "Вход Alexol — чат"
        heading = "Alexol Chat"
        button = "Войти в чат"
        chat = _html((settings.CHAT_PUBLIC_URL or "https://chat.alexol.io").rstrip("/"))
        hint = (
            f'Профиль (ФИО, фото, почта) подтянется с <a href="{mail}">{mail.replace("https://", "")}</a>. '
            f'Чат: {chat}'
        )
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    :root {{ color-scheme: dark; }}
    body {{
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: Inter, system-ui, sans-serif;
      background: #0b1220; color: #e8eef7;
    }}
    .card {{
      width: min(420px, calc(100vw - 32px));
      background: #121a2b; border: 1px solid #243049; border-radius: 16px;
      padding: 28px 24px 22px; box-shadow: 0 18px 60px rgba(0,0,0,.35);
    }}
    h1 {{ margin: 0 0 4px; font-size: 1.35rem; }}
    p.sub {{ margin: 0 0 20px; color: #8fa0b8; font-size: .95rem; }}
    label {{ display: block; margin: 12px 0 6px; font-size: .85rem; color: #b7c4d6; }}
    input[type=text], input[type=password] {{
      width: 100%; box-sizing: border-box; padding: 11px 12px; border-radius: 10px;
      border: 1px solid #2c3d5c; background: #0d1524; color: #e8eef7; font-size: 1rem;
    }}
    button {{
      width: 100%; margin-top: 18px; padding: 12px; border: 0; border-radius: 10px;
      background: #06b6d4; color: #041018; font-weight: 700; font-size: 1rem; cursor: pointer;
    }}
    .error {{ color: #f87171; margin: 12px 0 0; }}
    .hint {{ margin: 16px 0 0; font-size: .8rem; color: #7f8fa6; }}
    a {{ color: #67e8f9; }}
  </style>
</head>
<body>
  <form class="card" method="post" action="/api/oauth/authorize">
    <h1>{heading}</h1>
    <p class="sub">Тот же логин и пароль, что у почты</p>
    {hidden_inputs}
    <label for="login">Email или логин</label>
    <input id="login" name="login" type="text" autocomplete="username" required placeholder="user@alexol.io" />
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required />
    {err}
    <button type="submit">{button}</button>
    <p class="hint">{hint}</p>
  </form>
</body>
</html>"""


def _html(value: str) -> str:
    return (
        (value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _auth_code_for(user: User, redirect_uri: str, client_id: str, nonce: str = "") -> str:
    payload: dict[str, Any] = {
        "typ": OAUTH_CODE_TYP,
        "sub": (user.email or "").lower(),
        "uid": user.id,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
    }
    if nonce:
        payload["nonce"] = nonce
    return encode_oauth_jwt(payload, OAUTH_CODE_TTL_SEC)


def _redirect_with_code(
    request: Request,
    user: User,
    redirect_uri: str,
    client_id: str,
    state: str,
    *,
    set_session: bool,
    nonce: str = "",
) -> RedirectResponse:
    code = _auth_code_for(user, redirect_uri, client_id, nonce)
    parsed = urlparse(redirect_uri)
    sep = "&" if parsed.query else "?"
    target = f"{redirect_uri}{sep}{urlencode({'code': code, 'state': state})}"
    response = RedirectResponse(target, status_code=302)
    if set_session:
        session = encode_oauth_jwt(
            {"typ": OAUTH_SESSION_TYP, "sub": (user.email or "").lower()},
            OAUTH_SESSION_TTL_SEC,
        )
        response.set_cookie(**_session_cookie(request, session))
    return response


async def _user_from_session(request: Request, db: AsyncSession) -> Optional[User]:
    token = request.cookies.get(OAUTH_COOKIE)
    if not token:
        return None
    try:
        payload = decode_oauth_jwt(token, OAUTH_SESSION_TYP)
    except HTTPException:
        return None
    return await find_mailbox(db, payload.get("sub") or "")


@router.get("/oauth/authorize", response_class=HTMLResponse)
async def authorize_get(
    request: Request,
    response_type: str = "code",
    client_id: str = "",
    redirect_uri: str = "",
    state: str = "",
    scope: str = "",
    nonce: str = "",
    db: AsyncSession = Depends(get_db),
):
    _ = scope
    if response_type != "code":
        return HTMLResponse(
            _login_html("Поддерживается только authorization code", client_id=client_id),
            status_code=400,
        )
    if not client_id_allowed(client_id) or not redirect_uri_allowed(redirect_uri):
        return HTMLResponse(
            _login_html("Неверный OAuth-клиент или redirect_uri", client_id=client_id),
            status_code=400,
        )

    hidden = {
        "response_type": response_type,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "nonce": nonce,
    }
    existing = await _user_from_session(request, db)
    if existing:
        return _redirect_with_code(
            request,
            existing,
            redirect_uri,
            client_id,
            state,
            set_session=True,
            nonce=nonce,
        )
    return HTMLResponse(_login_html("", hidden, client_id))


@router.post("/oauth/authorize")
async def authorize_post(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    form = await request.form()
    login = str(form.get("login") or "")
    password = str(form.get("password") or "")
    client_id = str(form.get("client_id") or "")
    redirect_uri = str(form.get("redirect_uri") or "")
    state = str(form.get("state") or "")
    response_type = str(form.get("response_type") or "code")
    nonce = str(form.get("nonce") or "")
    hidden = {
        "response_type": response_type,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "nonce": nonce,
    }
    if response_type != "code" or not client_id_allowed(client_id) or not redirect_uri_allowed(redirect_uri):
        return HTMLResponse(
            _login_html("Неверный OAuth-клиент или redirect_uri", hidden, client_id),
            status_code=400,
        )

    user = await find_mailbox(db, login)
    if not user or not verify_password(password, user.hashed_password):
        return HTMLResponse(
            _login_html("Неверный email или пароль", hidden, client_id),
            status_code=401,
        )

    if _is_chat_client(client_id):
        schedule_rocketchat_profile_sync(user)
    return _redirect_with_code(
        request, user, redirect_uri, client_id, state, set_session=True, nonce=nonce
    )


def _parse_basic_client(request: Request) -> tuple[str, str]:
    import base64

    header = request.headers.get("authorization") or ""
    if not header.lower().startswith("basic "):
        return "", ""
    try:
        raw = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
        client_id, client_secret = raw.split(":", 1)
        return client_id, client_secret
    except Exception:
        return "", ""


@router.post("/oauth/token")
async def oauth_token(request: Request, db: AsyncSession = Depends(get_db)):
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        body = await request.json()
    else:
        form = await request.form()
        body = {key: form.get(key) for key in form.keys()}

    grant_type = str(body.get("grant_type") or "")
    code = str(body.get("code") or "")
    redirect_uri = str(body.get("redirect_uri") or "")
    client_id = str(body.get("client_id") or "")
    client_secret = str(body.get("client_secret") or "")
    basic_id, basic_secret = _parse_basic_client(request)
    client_id = client_id or basic_id
    client_secret = client_secret or basic_secret

    expected_secret = _client_secret_for(client_id)
    if grant_type != "authorization_code":
        return JSONResponse({"error": "unsupported_grant_type"}, status_code=400)
    if (
        not client_id_allowed(client_id)
        or not expected_secret
        or not compare_digest(client_secret, expected_secret)
    ):
        return JSONResponse({"error": "invalid_client"}, status_code=401)
    if not redirect_uri_allowed(redirect_uri):
        return JSONResponse({"error": "invalid_grant"}, status_code=400)

    payload = decode_oauth_jwt(code, OAUTH_CODE_TYP)
    if payload.get("client_id") != client_id or payload.get("redirect_uri") != redirect_uri:
        return JSONResponse({"error": "invalid_grant"}, status_code=400)

    user = await find_mailbox(db, payload.get("sub") or "")
    if not user:
        return JSONResponse({"error": "invalid_grant"}, status_code=400)

    access = encode_oauth_jwt(
        {"typ": OAUTH_ACCESS_TYP, "sub": (user.email or "").lower(), "uid": user.id},
        OAUTH_ACCESS_TTL_SEC,
    )
    if _is_chat_client(client_id):
        schedule_rocketchat_profile_sync(user)
    token_body: dict[str, Any] = {
        "access_token": access,
        "token_type": "bearer",
        "expires_in": OAUTH_ACCESS_TTL_SEC,
        "scope": "openid profile email",
    }
    token_body["id_token"] = _id_token_for(
        user, client_id, nonce=str(payload.get("nonce") or "")
    )
    return token_body


def _id_token_for(user: User, client_id: str, nonce: str = "") -> str:
    info = oauth_userinfo(user)
    mail = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    claims: dict[str, Any] = {
        "iss": mail,
        "aud": client_id,
        "sub": info["sub"],
        "email": info["email"],
        "email_verified": True,
        "name": info["name"],
        "preferred_username": info["preferred_username"],
        "picture": info.get("picture") or "",
    }
    if nonce:
        claims["nonce"] = nonce
    return encode_oauth_jwt(claims, OAUTH_ACCESS_TTL_SEC)


def _bearer_token(request: Request, access_token: Optional[str] = None) -> str:
    if access_token:
        return access_token
    header = request.headers.get("authorization") or ""
    if header.lower().startswith("bearer "):
        return header.split(" ", 1)[1].strip()
    return ""


@router.get("/oauth/userinfo")
@router.get("/oauth/me")
async def oauth_userinfo_endpoint(
    request: Request,
    access_token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    token = _bearer_token(request, access_token)
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token")
    payload = decode_oauth_jwt(token, OAUTH_ACCESS_TYP)
    user = await find_mailbox(db, payload.get("sub") or "")
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    return oauth_userinfo(user)


@router.post("/oauth/chat-handoff")
async def chat_handoff(request: Request, current_user: User = Depends(get_current_user)):
    """Mail SPA: set SSO cookie, then start Rocket.Chat OAuth (no login form)."""
    schedule_rocketchat_profile_sync(current_user)
    session = encode_oauth_jwt(
        {"typ": OAUTH_SESSION_TYP, "sub": (current_user.email or "").lower()},
        OAUTH_SESSION_TTL_SEC,
    )
    target = await asyncio.to_thread(chat_browser_login_url, current_user)
    response = JSONResponse({"url": target, "ok": True})
    response.set_cookie(**_session_cookie(request, session))
    return response


@router.post("/oauth/chat-handoff-redirect")
async def chat_handoff_redirect(
    request: Request,
    access_token: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Browser form POST: set SSO cookie, then 303 to Rocket.Chat OAuth (redirect mode)."""
    token = (access_token or "").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    user = await _user_from_access_token(token, db)
    schedule_rocketchat_profile_sync(user)
    session = encode_oauth_jwt(
        {"typ": OAUTH_SESSION_TYP, "sub": (user.email or "").lower()},
        OAUTH_SESSION_TTL_SEC,
    )
    target = await asyncio.to_thread(chat_browser_login_url, user)
    response = RedirectResponse(target, status_code=303)
    response.set_cookie(**_session_cookie(request, session))
    return response


@router.get("/oauth/.well-known")
async def oauth_discovery():
    mail = (settings.MAIL_PUBLIC_URL or "https://mail.alexol.io").rstrip("/")
    return {
        "issuer": mail,
        "authorization_endpoint": f"{mail}/api/oauth/authorize",
        "token_endpoint": f"{mail}/api/oauth/token",
        "userinfo_endpoint": f"{mail}/api/oauth/userinfo",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["HS256"],
        "token_endpoint_auth_methods_supported": [
            "client_secret_post",
            "client_secret_basic",
        ],
        "scopes_supported": ["openid", "profile", "email"],
        "claims_supported": [
            "sub",
            "email",
            "email_verified",
            "name",
            "preferred_username",
            "picture",
        ],
    }


@router.get("/oauth/health")
async def oauth_health():
    configured = bool(
        (settings.OAUTH_ROCKETCHAT_CLIENT_SECRET or "").strip()
        or (getattr(settings, "OAUTH_ATLASSIAN_CLIENT_SECRET", None) or "").strip()
    )
    return Response(
        content='{"ok":true,"configured":%s}' % ("true" if configured else "false"),
        media_type="application/json",
        status_code=200 if configured else 503,
    )
