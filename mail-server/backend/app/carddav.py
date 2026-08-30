"""Minimal CardDAV address book (company directory) for Outlook / Apple."""
from __future__ import annotations

import base64
from urllib.parse import unquote
from xml.sax.saxutils import escape as xml_escape

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import PlainTextResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import verify_password
from app.config import settings
from app.database import get_db
from app.mail_photos import user_to_vcard, vcard_filename
from app.models import User

router = APIRouter()

_DAV = 'DAV: 1, addressbook'
_ALLOW = "OPTIONS, GET, HEAD, PROPFIND"


async def _basic_user(request: Request, db: AsyncSession) -> User:
    header = request.headers.get("authorization") or ""
    if not header.lower().startswith("basic "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CardDAV requires HTTP Basic",
            headers={"WWW-Authenticate": 'Basic realm="mail.alexol.io"'},
        )
    try:
        decoded = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
        login, password = decoded.split(":", 1)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid Basic auth") from exc
    login = (login or "").strip().lower()
    local = login.split("@", 1)[0]
    row = (
        await db.execute(
            select(User).where(
                (func.lower(User.email) == login) | (func.lower(User.username) == local)
            )
        )
    ).scalar_one_or_none()
    if not row or not row.is_active or not verify_password(password, row.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": 'Basic realm="mail.alexol.io"'},
        )
    return row


def _options() -> Response:
    return Response(
        status_code=200,
        headers={"DAV": _DAV, "Allow": _ALLOW, "Content-Length": "0"},
    )


def _href(email: str) -> str:
    return f"/api/dav/contacts/{xml_escape(email)}.vcf"


@router.api_route("/.well-known/carddav", methods=["GET", "HEAD", "OPTIONS", "PROPFIND"])
async def well_known_under_api():
    return RedirectResponse("/api/dav/contacts/", status_code=301)


@router.api_route("/dav/contacts", methods=["OPTIONS", "PROPFIND", "GET", "HEAD"])
@router.api_route("/dav/contacts/", methods=["OPTIONS", "PROPFIND", "GET", "HEAD"])
async def addressbook_collection(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if request.method == "OPTIONS":
        return _options()
    await _basic_user(request, db)
    if request.method in ("GET", "HEAD"):
        return PlainTextResponse("CardDAV address book\n", media_type="text/plain")
    users = (
        await db.execute(
            select(User).where(User.is_active.is_(True)).order_by(User.full_name.asc())
        )
    ).scalars().all()
    domain = xml_escape(settings.MAIL_DOMAIN)
    chunks = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<d:multistatus xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">',
        "<d:response>",
        "<d:href>/api/dav/contacts/</d:href>",
        "<d:propstat><d:prop>",
        "<d:resourcetype><d:collection/><card:addressbook/></d:resourcetype>",
        f"<d:displayname>Alexol {domain}</d:displayname>",
        "</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>",
        "</d:response>",
    ]
    for user in users:
        chunks += [
            "<d:response>",
            f"<d:href>{_href(user.email)}</d:href>",
            "<d:propstat><d:prop>",
            "<d:getcontenttype>text/vcard; charset=utf-8</d:getcontenttype>",
            f"<d:displayname>{xml_escape(user.full_name or user.email)}</d:displayname>",
            "</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>",
            "</d:response>",
        ]
    chunks.append("</d:multistatus>")
    xml = "\n".join(chunks)
    return Response(content=xml, media_type="application/xml; charset=utf-8")


@router.api_route("/dav/contacts/{email:path}", methods=["OPTIONS", "GET", "HEAD"])
async def addressbook_card(
    email: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if request.method == "OPTIONS":
        return _options()
    await _basic_user(request, db)
    addr = unquote(email or "").strip().lower()
    if addr.endswith(".vcf"):
        addr = addr[:-4]
    row = (
        await db.execute(select(User).where(func.lower(User.email) == addr))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Unknown contact")
    return PlainTextResponse(
        user_to_vcard(row),
        media_type="text/vcard; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{vcard_filename(row)}"'},
    )
