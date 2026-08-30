"""Company directory, calendar meetings, vCard and ICS feeds."""
from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import datetime
from email import policy as email_policy
from email.message import EmailMessage
from email.parser import BytesParser
from typing import Optional
from urllib.parse import quote, unquote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, get_current_user_token_or_query
from app.admin_sync import ensure_user_avatar
from app.avatar_resolve import load_avatar_bytes, local_avatar_api_path, to_browser_avatar_url
from app.cal_invite import (
    build_meeting_rfc822,
    build_vevent,
    event_uid,
    extract_calendar_parts,
    mail_domain,
    parse_calendar,
)
from app.config import settings
from app.database import get_db
from app.jitsi_jwt import is_auto_start_room, is_closed_room, issue_guest_jwt, issue_jitsi_jwt
from app.mail_photos import user_to_vcard, vcard_filename
from app.mail_body import format_meeting_when, meeting_invite_html, meeting_invite_plain
from app.mail_sync import allocate_imap_uid
from app.models import CalendarAttendee, CalendarBusySlot, CalendarEvent, Email, User
from app.outbound import deliver_raw_outbound
from app.recipients import partition_local_external
from app.schemas import (
    BusyMapResponse,
    BusySlotOut,
    CalendarAttendeeIn,
    CalendarAttendeeOut,
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarFeedUrlResponse,
    DirectoryPerson,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _naive(dt: datetime) -> datetime:
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def _person(user: User, busy: Optional[CalendarBusySlot] = None) -> DirectoryPerson:
    return DirectoryPerson(
        email=user.email,
        full_name=user.full_name,
        job_title=user.job_title,
        avatar_url=local_avatar_api_path(user.email)
        or to_browser_avatar_url(user.avatar_url)
        or user.avatar_url,
        phone=user.phone,
        telegram=user.telegram,
        username=user.username,
        is_busy=bool(busy),
        busy_until=busy.end_at if busy else None,
        busy_title=busy.title if busy else None,
    )


def _user_to_vcard(user: User) -> str:
    return user_to_vcard(user)


def _calendar_ics(events: list[CalendarEvent]) -> str:
    domain = mail_domain()
    chunks = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Alexol//Mail Calendar//RU",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:Alexol {domain}",
        "X-WR-TIMEZONE:UTC",
    ]
    for event in events:
        chunks.append(build_vevent(event, method="PUBLISH"))
    chunks.append("END:VCALENDAR")
    return "\r\n".join(chunks) + "\r\n"


async def _load_colleagues(db: AsyncSession, query: str, limit: int) -> list[User]:
    stmt = select(User).where(User.is_active.is_(True))
    if query:
        like = f"%{query}%"
        stmt = stmt.where(
            or_(
                User.full_name.ilike(like),
                User.email.ilike(like),
                User.username.ilike(like),
                User.job_title.ilike(like),
                User.phone.ilike(like),
            )
        )
    result = await db.execute(stmt.order_by(User.full_name.asc()).limit(limit))
    return list(result.scalars().all())


async def _busy_now_by_email(db: AsyncSession) -> dict[str, CalendarBusySlot]:
    now = datetime.utcnow()
    result = await db.execute(
        select(CalendarBusySlot).where(
            CalendarBusySlot.is_busy.is_(True),
            CalendarBusySlot.start_at <= now,
            CalendarBusySlot.end_at > now,
        )
    )
    out: dict[str, CalendarBusySlot] = {}
    for slot in result.scalars().all():
        key = slot.email.lower()
        prev = out.get(key)
        if not prev or slot.end_at > prev.end_at:
            out[key] = slot
    return out


def _busy_out(slot: CalendarBusySlot, names: dict[str, str]) -> BusySlotOut:
    return BusySlotOut(
        email=slot.email,
        full_name=names.get(slot.email.lower()),
        start_at=slot.start_at,
        end_at=slot.end_at,
        event_id=slot.event_id,
        title=slot.title,
        is_busy=slot.is_busy,
    )


async def _names_for_emails(db: AsyncSession, emails: list[str]) -> dict[str, str]:
    if not emails:
        return {}
    found = await db.execute(select(User).where(User.email.in_(emails)))
    return {u.email.lower(): u.full_name for u in found.scalars().all()}


async def _find_conflicts(
    db: AsyncSession,
    emails: list[str],
    start: datetime,
    end: datetime,
    exclude_event_id: Optional[int] = None,
) -> list[CalendarBusySlot]:
    if not emails:
        return []
    lowered = [e.lower() for e in emails]
    stmt = select(CalendarBusySlot).where(
        CalendarBusySlot.is_busy.is_(True),
        CalendarBusySlot.start_at < end,
        CalendarBusySlot.end_at > start,
        or_(*[CalendarBusySlot.email.ilike(e) for e in lowered]),
    )
    if exclude_event_id is not None:
        stmt = stmt.where(CalendarBusySlot.event_id != exclude_event_id)
    result = await db.execute(stmt.order_by(CalendarBusySlot.start_at.asc()))
    return list(result.scalars().all())


async def _write_busy(db: AsyncSession, event: CalendarEvent) -> None:
    await db.execute(delete(CalendarBusySlot).where(CalendarBusySlot.event_id == event.id))
    people: list[tuple[Optional[int], str]] = []
    org = event.organizer
    if org:
        people.append((org.id, org.email.lower()))
    for att in event.attendees or []:
        people.append((att.user_id, (att.email or "").lower()))
    seen: set[str] = set()
    for user_id, email in people:
        if not email or email in seen:
            continue
        seen.add(email)
        db.add(
            CalendarBusySlot(
                event_id=event.id,
                user_id=user_id,
                email=email,
                start_at=event.start_at,
                end_at=event.end_at,
                title=event.title,
                is_busy=True,
            )
        )


def _visible_event_filter(user: User):
    """Organizer and invitees only. Whole company only when marked so and nobody was invited."""
    invited = or_(
        CalendarEvent.organizer_id == user.id,
        CalendarEvent.attendees.any(CalendarAttendee.user_id == user.id),
        CalendarEvent.attendees.any(CalendarAttendee.email.ilike(user.email)),
    )
    company_wide = and_(
        CalendarEvent.is_company.is_(True),
        ~CalendarEvent.attendees.any(),
    )
    return or_(invited, company_wide)


async def _event_response(
    db: AsyncSession,
    event: CalendarEvent,
    current: User,
    conflicts: Optional[list[CalendarBusySlot]] = None,
) -> CalendarEventResponse:
    avatars = {}
    emails = [a.email.lower() for a in event.attendees]
    if emails:
        found = await db.execute(
            select(User).where(User.email.in_([a.email for a in event.attendees]))
        )
        for u in found.scalars().all():
            avatars[u.email.lower()] = to_browser_avatar_url(u.avatar_url) or u.avatar_url
    org = event.organizer
    resp = CalendarEventResponse(
        id=event.id,
        organizer_email=org.email if org else "",
        organizer_name=org.full_name if org else "",
        title=event.title,
        description=event.description,
        location=event.location,
        start_at=event.start_at,
        end_at=event.end_at,
        all_day=event.all_day,
        is_company=event.is_company,
        attendees=[
            CalendarAttendeeOut(
                email=a.email,
                display_name=a.display_name,
                status=a.status,
                avatar_url=avatars.get(a.email.lower()),
            )
            for a in event.attendees
        ],
        can_edit=bool(current.is_admin or event.organizer_id == current.id),
        conflicts=[],
    )
    if conflicts:
        names = await _names_for_emails(db, [s.email for s in conflicts])
        resp.conflicts = [_busy_out(s, names) for s in conflicts]
    return resp


async def _resolve_attendees(
    db: AsyncSession, items: list[CalendarAttendeeIn], organizer: User
) -> list[CalendarAttendee]:
    seen = {organizer.email.lower()}
    out: list[CalendarAttendee] = []
    for item in items:
        email = (item.email or "").strip().lower()
        if not email or email in seen:
            continue
        seen.add(email)
        result = await db.execute(select(User).where(User.email.ilike(email)))
        peer = result.scalar_one_or_none()
        out.append(
            CalendarAttendee(
                user_id=peer.id if peer else None,
                email=peer.email if peer else email,
                display_name=(item.display_name or (peer.full_name if peer else None)),
                status="invited",
            )
        )
    return out


def _has_jitsi(location: Optional[str]) -> bool:
    return "meet.alexol.io" in (location or "").lower()


def _first_jitsi_url(location: Optional[str]) -> Optional[str]:
    for part in (location or "").replace("·", " ").split():
        token = part.strip().rstrip(".,;)")
        if "meet.alexol.io" in token.lower() and token.lower().startswith("http"):
            return token
    return None


def _jitsi_base() -> str:
    return (settings.JITSI_PUBLIC_URL or "https://meet.alexol.io").rstrip("/")


def _attach_jitsi_link(
    event: CalendarEvent,
    enabled: bool,
    location: Optional[str],
    *,
    open_room: bool = True,
    no_host: bool = True,
) -> None:
    loc = (location or "").strip()
    if not enabled:
        event.location = loc or None
        return
    if not open_room:
        prefix = "c"
    elif no_host:
        prefix = "a"
    else:
        prefix = "o"
    url = f"{_jitsi_base()}/{prefix}-alexol-{event.id}-{secrets.token_hex(3)}"
    if not loc:
        event.location = url
        return
    if "meet.alexol.io" in loc.lower() or loc.lower().startswith("http"):
        event.location = loc
        return
    event.location = f"{loc} · {url}"


async def _notify_meeting(
    db: AsyncSession,
    event: CalendarEvent,
    organizer: User,
    *,
    method: str = "REQUEST",
) -> None:
    when = format_meeting_when(event.start_at, event.end_at)
    where = event.location or ""
    method = (method or "REQUEST").upper()
    if method == "CANCEL":
        subject = f"Отмена встречи: {event.title}"
        lead = f"{organizer.full_name} отменяет встречу."
    else:
        subject = f"Встреча: {event.title}"
        lead = f"{organizer.full_name} приглашает на встречу."
    people = [a.display_name or a.email for a in (event.attendees or []) if a.email]
    body = meeting_invite_plain(
        lead=lead,
        title=event.title or "Встреча",
        when=when,
        location=where,
        description=event.description,
    )
    html = meeting_invite_html(
        lead=lead,
        title=event.title or "Встреча",
        when=when,
        location=where,
        description=event.description,
        organizer=organizer.full_name,
        attendees=people,
        method=method,
    )
    to_addrs = [a.email for a in (event.attendees or []) if a.email]
    raw = build_meeting_rfc822(
        organizer=organizer,
        event=event,
        to_addrs=to_addrs or [organizer.email],
        subject=subject,
        body=body,
        html=html,
        method=method,
    )
    for att in event.attendees or []:
        if not att.user_id:
            continue
        db.add(
            Email(
                user_id=att.user_id,
                from_address=organizer.email,
                to_address=att.email,
                from_name=organizer.full_name,
                to_name=att.display_name,
                subject=subject,
                body=body,
                html_body=html,
                raw_rfc822=raw,
                is_read=False,
                is_sent=False,
                imap_uid=await allocate_imap_uid(db, att.user_id, False),
            )
        )
    db.add(
        Email(
            user_id=organizer.id,
            from_address=organizer.email,
            to_address=", ".join(to_addrs) or organizer.email,
            from_name=organizer.full_name,
            subject=subject,
            body=body,
            html_body=html,
            raw_rfc822=raw,
            is_read=True,
            is_sent=True,
            imap_uid=await allocate_imap_uid(db, organizer.id, True),
        )
    )
    _local, external = partition_local_external(to_addrs, settings.MAIL_DOMAIN)
    if external:
        try:
            await asyncio.to_thread(deliver_raw_outbound, raw, organizer.email, external)
        except Exception:
            logger.exception("Calendar invite SMTP failed to %s", external)


async def _user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    addr = (email or "").strip().lower()
    if not addr:
        return None
    return (
        await db.execute(select(User).where(func.lower(User.email) == addr))
    ).scalar_one_or_none()


async def ingest_calendar_message(
    db: AsyncSession,
    msg,
    *,
    sender: Optional[User],
    local_users: list[User],
) -> None:
    """Create/update/cancel a meeting from an Outlook/iMIP calendar part."""
    parts = extract_calendar_parts(msg)
    if not parts:
        return
    recipients = list(local_users)
    for method_hint, ics_text in parts:
        parsed = parse_calendar(ics_text, default_method=method_hint)
        if not parsed:
            continue
        try:
            await _apply_parsed_event(db, parsed, sender=sender, local_users=recipients)
        except Exception:
            logger.exception("Calendar ingest failed uid=%s", parsed.uid)


async def _apply_parsed_event(
    db: AsyncSession,
    parsed,
    *,
    sender: Optional[User],
    local_users: list[User],
) -> None:
    existing = (
        await db.execute(
            select(CalendarEvent)
            .options(
                selectinload(CalendarEvent.attendees),
                selectinload(CalendarEvent.organizer),
            )
            .where(CalendarEvent.ical_uid == parsed.uid)
        )
    ).scalar_one_or_none()
    method = (parsed.method or "REQUEST").upper()
    cancelled = method == "CANCEL" or parsed.status == "CANCELLED"
    if cancelled:
        if existing:
            await db.delete(existing)
            await db.commit()
            logger.info("Calendar cancelled uid=%s", parsed.uid)
        return
    if method == "REPLY":
        if not existing:
            return
        replies = {email: status for email, _name, status in parsed.attendees}
        if sender and sender.email.lower() not in replies:
            replies[sender.email.lower()] = "accepted"
        for att in existing.attendees:
            if att.email.lower() in replies:
                att.status = replies[att.email.lower()]
        await db.commit()
        return
    if existing and int(existing.ical_sequence or 0) > int(parsed.sequence or 0):
        return

    org_user = await _user_by_email(db, parsed.organizer_email)
    if org_user is None:
        org_user = sender
    if org_user is None and local_users:
        org_user = local_users[0]
    if org_user is None:
        return

    title = parsed.title or "Встреча"
    start = parsed.start_at
    end = parsed.end_at or parsed.start_at
    previous_location = existing.location if existing else None
    if existing:
        existing.title = title
        existing.description = parsed.description or None
        existing.location = parsed.location or None
        existing.start_at = start
        existing.end_at = end
        existing.all_day = bool(parsed.all_day)
        existing.ical_sequence = int(parsed.sequence or 0)
        existing.organizer_id = org_user.id
        existing.is_company = False
        event = existing
    else:
        event = CalendarEvent(
            organizer_id=org_user.id,
            title=title,
            description=parsed.description or None,
            location=parsed.location or None,
            start_at=start,
            end_at=end,
            all_day=bool(parsed.all_day),
            is_company=False,
            ical_uid=parsed.uid,
            ical_sequence=int(parsed.sequence or 0),
        )
        db.add(event)
        await db.flush()

    event.ical_uid = parsed.uid
    event.is_company = False
    seen = {org_user.email.lower()}
    attendees: list[CalendarAttendee] = []
    for email, name, status in parsed.attendees:
        if not email or email in seen:
            continue
        seen.add(email)
        peer = await _user_by_email(db, email)
        attendees.append(
            CalendarAttendee(
                user_id=peer.id if peer else None,
                email=peer.email if peer else email,
                display_name=name or (peer.full_name if peer else None),
                status=status or "invited",
            )
        )
    # Recipients of this copy (SMTP RCPT / mailbox owner), not everyone on To/Cc.
    for peer in local_users or []:
        if not peer.email or peer.email.lower() in seen:
            continue
        seen.add(peer.email.lower())
        attendees.append(
            CalendarAttendee(
                user_id=peer.id,
                email=peer.email,
                display_name=peer.full_name,
                status="invited",
            )
        )
    await db.refresh(event, attribute_names=["attendees"])
    event.attendees.clear()
    event.attendees.extend(attendees)
    await db.refresh(event, attribute_names=["organizer", "attendees"])
    added_jitsi = False
    if not _has_jitsi(event.location):
        prev = _first_jitsi_url(previous_location)
        if prev:
            loc = (event.location or "").strip()
            event.location = f"{loc} · {prev}" if loc else prev
        else:
            _attach_jitsi_link(event, True, event.location)
            added_jitsi = True
            event.ical_sequence = max(int(event.ical_sequence or 0), int(parsed.sequence or 0)) + 1
    await _write_busy(db, event)
    if added_jitsi:
        await _notify_meeting(db, event, org_user)
    await db.commit()
    logger.info("Calendar ingested uid=%s title=%s jitsi=%s", parsed.uid, title, added_jitsi)


@router.get("/directory", response_model=list[DirectoryPerson])
async def search_directory(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = current_user
    query = (q or "").strip()
    limit = 80 if query else 500
    users = await _load_colleagues(db, query, limit)
    busy = await _busy_now_by_email(db)
    return [_person(u, busy.get(u.email.lower())) for u in users]


@router.get("/jitsi/token")
async def jitsi_token(
    room: str = Query("", max_length=200),
    current_user: User = Depends(get_current_user),
):
    slug = (room or "*").strip() or "*"
    return {"token": issue_jitsi_jwt(current_user, room=slug, moderator=True), "open": not is_closed_room(slug)}


@router.get("/jitsi/guest-token")
async def jitsi_guest_token(
    room: str = Query("", max_length=200),
    name: str = Query("", max_length=80),
):
    slug = (room or "*").strip() or "*"
    if is_closed_room(slug):
        return {"token": None, "open": False, "auto_start": False}
    return {
        "token": issue_guest_jwt(slug, name=name),
        "open": True,
        "auto_start": is_auto_start_room(slug),
    }


@router.get("/contacts", response_model=list[DirectoryPerson])
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = current_user
    users = await _load_colleagues(db, "", 500)
    busy = await _busy_now_by_email(db)
    return [_person(u, busy.get(u.email.lower())) for u in users]


@router.get("/contacts.vcf")
async def download_contacts_vcf(
    current_user: User = Depends(get_current_user_token_or_query),
    db: AsyncSession = Depends(get_db),
):
    _ = current_user
    users = await _load_colleagues(db, "", 500)
    payload = "".join(_user_to_vcard(u) for u in users)
    return PlainTextResponse(
        payload,
        media_type="text/vcard; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="alexol-contacts.vcf"'},
    )


@router.get("/public/avatar/{email:path}")
async def public_avatar(email: str, db: AsyncSession = Depends(get_db)):
    addr = unquote(email or "").strip().lower()
    if addr.startswith("mailto:"):
        addr = addr[7:]
    result = await db.execute(select(User).where(func.lower(User.email) == addr))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No photo",
            headers={"Cache-Control": "no-store"},
        )
    loaded = load_avatar_bytes(user.avatar_url) if user.avatar_url else None
    if not loaded:
        await ensure_user_avatar(user, db)
        loaded = load_avatar_bytes(user.avatar_url)
    if not loaded:
        raise HTTPException(
            status_code=404,
            detail="No photo",
            headers={"Cache-Control": "no-store"},
        )
    data, content_type, _name = loaded
    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/public/vcard/{email:path}")
async def public_vcard(email: str, db: AsyncSession = Depends(get_db)):
    addr = unquote(email or "").strip().lower()
    if addr.startswith("mailto:"):
        addr = addr[7:]
    result = await db.execute(select(User).where(func.lower(User.email) == addr))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Unknown mailbox")
    payload = user_to_vcard(user)
    return PlainTextResponse(
        payload,
        media_type="text/vcard; charset=utf-8",
        headers={
            "Content-Disposition": f'inline; filename="{vcard_filename(user)}"',
            "Cache-Control": "public, max-age=3600",
        },
    )


async def _backfill_calendar_from_mail(db: AsyncSession, user: User) -> None:
    """Turn already-received Outlook invites into calendar rows (idempotent)."""
    rows = (
        await db.execute(
            select(Email).where(Email.user_id == user.id).order_by(Email.id.desc()).limit(80)
        )
    ).scalars().all()
    for row in rows:
        raw = getattr(row, "raw_rfc822", None)
        raw_text = ""
        if raw:
            try:
                raw_text = bytes(raw).decode("utf-8", "replace")
            except Exception:
                raw_text = ""
        stored = f"{row.body or ''}\n{row.html_body or ''}"
        if "BEGIN:VCALENDAR" not in raw_text.upper() and "BEGIN:VCALENDAR" not in stored.upper():
            continue
        try:
            if raw:
                msg = BytesParser(policy=email_policy.default).parsebytes(bytes(raw))
            else:
                fake = EmailMessage()
                fake["From"] = row.from_address or user.email
                fake["To"] = row.to_address or user.email
                fake.set_content(stored)
                msg = fake
            sender = await _user_by_email(db, row.from_address or "")
            await ingest_calendar_message(db, msg, sender=sender or user, local_users=[user])
        except Exception:
            logger.exception("Calendar backfill failed email_id=%s", row.id)


@router.get("/calendar/events", response_model=list[CalendarEventResponse])
async def list_events(
    from_at: Optional[datetime] = None,
    to_at: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _backfill_calendar_from_mail(db, current_user)
    stmt = (
        select(CalendarEvent)
        .options(selectinload(CalendarEvent.attendees), selectinload(CalendarEvent.organizer))
        .where(_visible_event_filter(current_user))
    )
    if from_at:
        stmt = stmt.where(CalendarEvent.end_at >= from_at.replace(tzinfo=None) if from_at.tzinfo else from_at)
    if to_at:
        stmt = stmt.where(CalendarEvent.start_at <= to_at.replace(tzinfo=None) if to_at.tzinfo else to_at)
    result = await db.execute(stmt.order_by(CalendarEvent.start_at.asc()))
    events = result.scalars().unique().all()
    return [await _event_response(db, e, current_user) for e in events]


@router.post("/calendar/events", response_model=CalendarEventResponse)
async def create_event(
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Укажите название встречи")
    start = _naive(payload.start_at)
    end = _naive(payload.end_at)
    if end <= start:
        raise HTTPException(status_code=400, detail="Конец встречи должен быть позже начала")
    attendees = await _resolve_attendees(db, payload.attendees, current_user)
    involved = [current_user.email] + [a.email for a in attendees]
    conflicts = await _find_conflicts(db, involved, start, end)
    event = CalendarEvent(
        organizer_id=current_user.id,
        title=title,
        description=(payload.description or "").strip() or None,
        location=None,
        start_at=start,
        end_at=end,
        all_day=payload.all_day,
        is_company=payload.is_company,
    )
    event.attendees = attendees
    db.add(event)
    await db.flush()
    _attach_jitsi_link(
        event,
        payload.video_jitsi,
        payload.location,
        open_room=payload.jitsi_open,
        no_host=payload.jitsi_no_host,
    )
    event.ical_uid = event.ical_uid or event_uid(event)
    await db.refresh(event, attribute_names=["attendees", "organizer"])
    await _write_busy(db, event)
    await _notify_meeting(db, event, current_user)
    await db.commit()
    result = await db.execute(
        select(CalendarEvent)
        .options(selectinload(CalendarEvent.attendees), selectinload(CalendarEvent.organizer))
        .where(CalendarEvent.id == event.id)
    )
    saved = result.scalar_one()
    return await _event_response(db, saved, current_user, conflicts)


@router.delete("/calendar/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CalendarEvent)
        .options(selectinload(CalendarEvent.attendees), selectinload(CalendarEvent.organizer))
        .where(CalendarEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Встреча не найдена")
    if event.organizer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужую встречу")
    event.ical_sequence = int(event.ical_sequence or 0) + 1
    if event.organizer:
        await _notify_meeting(db, event, event.organizer, method="CANCEL")
    await db.delete(event)
    await db.commit()
    return None


@router.get("/calendar/busy", response_model=BusyMapResponse)
async def list_busy(
    from_at: datetime,
    to_at: datetime,
    emails: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ = current_user
    start = _naive(from_at)
    end = _naive(to_at)
    wanted = [e.strip().lower() for e in emails.split(",") if e.strip()]
    stmt = select(CalendarBusySlot).where(
        CalendarBusySlot.is_busy.is_(True),
        CalendarBusySlot.start_at < end,
        CalendarBusySlot.end_at > start,
    )
    if wanted:
        stmt = stmt.where(or_(*[CalendarBusySlot.email.ilike(e) for e in wanted]))
    result = await db.execute(stmt.order_by(CalendarBusySlot.start_at.asc()))
    slots = list(result.scalars().all())
    names = await _names_for_emails(db, [s.email for s in slots])
    return BusyMapResponse(slots=[_busy_out(s, names) for s in slots])


@router.get("/calendar/feed-url", response_model=CalendarFeedUrlResponse)
async def calendar_feed_url(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.calendar_feed_token:
        current_user.calendar_feed_token = secrets.token_urlsafe(24)
        await db.commit()
        await db.refresh(current_user)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or settings.MAIL_HOSTNAME
    proto = request.headers.get("x-forwarded-proto") or "https"
    token = current_user.calendar_feed_token
    url = f"{proto}://{host}/api/calendar/feed.ics?token={quote(token)}"
    return CalendarFeedUrlResponse(url=url, token=token)


@router.get("/calendar/feed.ics")
async def calendar_feed_ics(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.calendar_feed_token == token))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Недействительная ссылка календаря")
    stmt = (
        select(CalendarEvent)
        .options(selectinload(CalendarEvent.attendees), selectinload(CalendarEvent.organizer))
        .where(_visible_event_filter(user))
        .order_by(CalendarEvent.start_at.asc())
    )
    events = (await db.execute(stmt)).scalars().unique().all()
    return PlainTextResponse(
        _calendar_ics(list(events)),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="alexol.ics"'},
    )
