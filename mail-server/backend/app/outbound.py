"""Build and deliver outbound mail to one or many recipients."""

from __future__ import annotations

import asyncio
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape as html_escape
from typing import Optional

import httpx
import smtplib
from fastapi import HTTPException

from app.config import settings
from app.dkim_signer import sign_message
from app.mail_photos import attach_cid_photo, has_inline_photo, html_photo_src, photo_html_tag, prepend_people_bar
from app.models import User
from app.recipients import group_by_domain, partition_local_external


def wrap_outbound_html(content_html: str, signature_html: str) -> str:
    """
    Wrap fragment HTML in a Gmail/Outlook-friendly table layout.
    Skip outer chrome if the fragment already looks like a full document.
    """
    lowered = (content_html or "").lower()
    already_full = "<html" in lowered or "<body" in lowered
    has_sig = 'data-alexol-sig="1"' in lowered or "data-alexol-sig='1'" in lowered
    sig = "" if has_sig else signature_html

    if already_full:
        return content_html + sig

    return (
        "<!DOCTYPE html>"
        '<html lang="ru">'
        "<head>"
        '<meta charset="utf-8" />'
        '<meta name="viewport" content="width=device-width, initial-scale=1" />'
        "<title>Email</title>"
        "</head>"
        '<body style="margin:0;padding:0;background:#f1f5f9;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="border-collapse:collapse;background:#f1f5f9;width:100%;">'
        "<tr><td align=\"center\" style=\"padding:24px 12px;\">"
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
        'style="border-collapse:collapse;width:100%;max-width:600px;'
        'background:#ffffff;border-radius:12px;overflow:hidden;'
        'border:1px solid #e2e8f0;">'
        "<tr><td style=\"padding:28px 32px;font-family:-apple-system,BlinkMacSystemFont,"
        "'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;"
        'color:#0f172a;">'
        f"{content_html}"
        f"{sig}"
        "</td></tr>"
        "</table>"
        "</td></tr>"
        "</table>"
        "</body>"
        "</html>"
    )


def _mail_domain() -> str:
    return (settings.MAIL_DOMAIN or "").replace("@", "").lower()


def _build_mime(
    *,
    current_user: User,
    to_header: str,
    subject: str,
    body: str,
    html_body: Optional[str],
    attachments: Optional[list[tuple]] = None,
) -> tuple[MIMEMultipart, str, str]:
    display_name = current_user.full_name or current_user.email
    sender_cid = has_inline_photo(current_user.avatar_url)

    if html_body and html_body.strip():
        content_html = html_body
    else:
        content_html = (
            f"<pre style='font-family:inherit;white-space:pre-wrap;margin:0'>"
            f"{html_escape(body or '')}</pre>"
        )

    signature_html = (
        "<div data-alexol-sig=\"1\" style='margin-top:28px;padding-top:16px;"
        "border-top:1px solid #e2e8f0;"
        "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'>"
        f"{photo_html_tag(html_photo_src(current_user.email, current_user.avatar_url, 'from-photo', sender_cid), display_name)}"
        f"<div style='font-weight:600;color:#0f172a;font-size:14px;margin-top:8px'>"
        f"{html_escape(display_name)}</div>"
        f"<div style='color:#64748b;font-size:13px;margin-top:2px'>"
        f"{html_escape(current_user.email)}</div>"
        "</div>"
    )
    signature_text = f"\n\n--\n{display_name}\n{current_user.email}\n"
    full_html = wrap_outbound_html(content_html, signature_html)
    full_html = prepend_people_bar(
        full_html,
        html_photo_src(
            current_user.email,
            current_user.avatar_url,
            "from-photo",
            sender_cid,
        ),
        display_name,
    )
    full_text = (body or "") + signature_text

    alternative = MIMEMultipart("alternative")
    related = MIMEMultipart("related")
    if attachments:
        msg = MIMEMultipart("mixed")
        msg.attach(related)
    else:
        msg = related

    msg["From"] = formataddr((display_name, current_user.email))
    msg["To"] = to_header
    msg["Subject"] = subject

    alternative.attach(MIMEText(full_text, "plain", "utf-8"))
    alternative.attach(MIMEText(full_html, "html", "utf-8"))
    related.attach(alternative)
    attach_cid_photo(related, current_user.avatar_url, "from-photo")

    if attachments:
        for filename, content_type, content in attachments:
            part = MIMEApplication(content, Name=filename)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            if content_type:
                part.add_header("Content-Type", content_type)
            msg.attach(part)

    return sign_message(msg), full_text, full_html


def _smtp_send(msg, *, host: str, port: int, from_addr: str, envelope: list[str], **kwargs) -> None:
    starttls = kwargs.get("starttls", False)
    timeout = kwargs.get("timeout", 30)
    local_hostname = kwargs.get("local_hostname")
    login = kwargs.get("login")
    password = kwargs.get("password")
    tls_ctx = kwargs.get("tls_ctx")

    with smtplib.SMTP(host, port, timeout=timeout, local_hostname=local_hostname) as smtp:
        smtp.ehlo()
        if starttls:
            smtp.starttls(context=tls_ctx) if tls_ctx else smtp.starttls()
            smtp.ehlo()
        if login and password:
            smtp.login(login, password)
        smtp.send_message(msg, from_addr=from_addr, to_addrs=envelope)


def _send_local(msg, from_addr: str, envelope: list[str]) -> None:
    print(f"[EMAIL] Local delivery via localhost:{settings.SMTP_PORT} -> {envelope}")
    _smtp_send(
        msg,
        host="localhost",
        port=settings.SMTP_PORT,
        from_addr=from_addr,
        envelope=envelope,
        local_hostname=settings.smtp_hostname,
    )


def _send_relay(msg, from_addr: str, envelope: list[str]) -> None:
    print(
        f"[EMAIL] SMTP relay {settings.SMTP_RELAY_HOST}:{settings.SMTP_RELAY_PORT} -> {envelope}"
    )
    with smtplib.SMTP(settings.SMTP_RELAY_HOST, settings.SMTP_RELAY_PORT) as smtp:
        if settings.SMTP_RELAY_USE_TLS:
            smtp.starttls()
        if settings.SMTP_RELAY_USER and settings.SMTP_RELAY_PASSWORD:
            smtp.login(settings.SMTP_RELAY_USER, settings.SMTP_RELAY_PASSWORD)
        smtp.send_message(msg, from_addr=from_addr, to_addrs=envelope)


def _send_mx(msg, from_addr: str, domain: str, envelope: list[str]) -> None:
    import dns.resolver

    print(f"[EMAIL] Direct MX for {domain} -> {envelope}")
    try:
        mx_records = dns.resolver.resolve(domain, "MX")
        mx_records = sorted(mx_records, key=lambda r: r.preference)
        sent = False
        tls_ctx = ssl.create_default_context()
        last_error: Exception | None = None
        for mx in mx_records:
            mx_host = str(mx.exchange).rstrip(".")
            try:
                with smtplib.SMTP(
                    mx_host,
                    25,
                    timeout=30,
                    local_hostname=settings.smtp_hostname,
                ) as smtp:
                    smtp.ehlo()
                    if smtp.has_extn("starttls"):
                        smtp.starttls(context=tls_ctx)
                        smtp.ehlo()
                    smtp.send_message(msg, from_addr=from_addr, to_addrs=envelope)
                print(f"[EMAIL] Sent via {mx_host}:25 (STARTTLS if available)")
                sent = True
                break
            except Exception as mx_error:
                last_error = mx_error
                print(f"Failed to send via {mx_host}: {mx_error}")
                continue
        if not sent:
            raise last_error or Exception("All MX servers failed")
    except dns.resolver.NXDOMAIN:
        raise HTTPException(status_code=400, detail=f"Домен {domain} не существует") from None
    except dns.resolver.NoAnswer:
        raise HTTPException(status_code=400, detail=f"Нет MX-записей для {domain}") from None
    except HTTPException:
        raise
    except Exception as dns_error:
        if domain == _mail_domain():
            _send_local(msg, from_addr, envelope)
            return
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(dns_error)}",
        ) from dns_error


def deliver_raw_outbound(content: bytes, from_addr: str, recipients: list[str]) -> None:
    """Send an already-composed message (Outlook/IMAP SMTP) to external MX or relay."""
    from email import message_from_bytes
    from email import policy as email_policy

    if not recipients:
        return
    msg = sign_message(message_from_bytes(content, policy=email_policy.SMTP))
    relay_ok = bool(settings.SMTP_RELAY_ENABLED and settings.SMTP_RELAY_HOST)
    if relay_ok:
        _send_relay(msg, from_addr, recipients)
        return
    for domain, addrs in group_by_domain(recipients).items():
        _send_mx(msg, from_addr, domain, addrs)


def _use_sendgrid_api() -> bool:
    return bool(
        settings.SENDGRID_USE_API
        and settings.SMTP_RELAY_HOST
        and "sendgrid" in settings.SMTP_RELAY_HOST.lower()
        and settings.SMTP_RELAY_PASSWORD
    )


async def _send_sendgrid(
    *,
    current_user: User,
    envelope: list[str],
    subject: str,
    full_text: str,
    full_html: str,
) -> None:
    print(f"[EMAIL] SendGrid API -> {envelope}")
    payload = {
        "personalizations": [{"to": [{"email": addr} for addr in envelope]}],
        "from": {
            "email": current_user.email,
            "name": current_user.full_name or current_user.email,
        },
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": full_text or ""},
            {"type": "text/html", "value": full_html},
        ],
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.SMTP_RELAY_PASSWORD}",
                "Content-Type": "application/json",
            },
        )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"SendGrid API {response.status_code}: {response.text[:300]}",
        )


async def deliver_composed_email(
    *,
    current_user: User,
    to_addresses: list[str],
    to_header: str,
    subject: str,
    body: str,
    html_body: Optional[str],
    attachments: Optional[list[tuple]] = None,
) -> None:
    """Deliver one MIME message. Local inboxes via SMTP; external via relay or MX."""
    if not to_addresses:
        raise HTTPException(status_code=400, detail="Укажите хотя бы одного получателя")

    msg, full_text, full_html = _build_mime(
        current_user=current_user,
        to_header=to_header,
        subject=subject,
        body=body,
        html_body=html_body,
        attachments=attachments,
    )
    from_addr = current_user.email
    local, external = partition_local_external(to_addresses, settings.MAIL_DOMAIN)
    print(
        f"[EMAIL] from={from_addr} to={to_addresses} local={local} external={external}"
    )

    errors: list[str] = []

    if local:
        try:
            await asyncio.to_thread(_send_local, msg, from_addr, local)
        except Exception as exc:
            # Public MX fallback if submission to localhost failed
            try:
                await asyncio.to_thread(_send_mx, msg, from_addr, _mail_domain(), local)
            except HTTPException as http_exc:
                errors.append(http_exc.detail if isinstance(http_exc.detail, str) else str(exc))
            except Exception:
                errors.append(f"локальная доставка: {exc}")

    if external:
        relay_ok = bool(settings.SMTP_RELAY_ENABLED and settings.SMTP_RELAY_HOST)
        try:
            if relay_ok and _use_sendgrid_api() and not attachments:
                await _send_sendgrid(
                    current_user=current_user,
                    envelope=external,
                    subject=subject,
                    full_text=full_text,
                    full_html=full_html,
                )
            elif relay_ok:
                await asyncio.to_thread(_send_relay, msg, from_addr, external)
            else:
                for domain, addrs in group_by_domain(external).items():
                    await asyncio.to_thread(_send_mx, msg, from_addr, domain, addrs)
        except HTTPException as http_exc:
            detail = http_exc.detail if isinstance(http_exc.detail, str) else str(http_exc.detail)
            errors.append(detail)
        except Exception as exc:
            errors.append(str(exc))

    if errors:
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось отправить письмо: {'; '.join(errors)}",
        )
