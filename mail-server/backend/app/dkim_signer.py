"""DKIM signing for outbound mail (own keys + TXT default._domainkey)."""
from __future__ import annotations

import logging
from email import message_from_bytes, policy
from email.message import Message
from email.utils import formatdate, make_msgid
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

_private_key: Optional[bytes] = None
_load_attempted = False


def _load_private_key() -> Optional[bytes]:
    global _private_key, _load_attempted
    if _load_attempted:
        return _private_key
    _load_attempted = True

    path = settings.DKIM_PRIVATE_KEY_PATH
    if path:
        p = Path(path)
        if p.is_file():
            _private_key = p.read_bytes()
            logger.info("DKIM: loaded private key from %s", path)
            return _private_key
        logger.warning("DKIM: private key file not found: %s", path)

    if settings.DKIM_PRIVATE_KEY:
        raw = settings.DKIM_PRIVATE_KEY.strip()
        # Allow escaped newlines from .env
        raw = raw.replace("\\n", "\n")
        _private_key = raw.encode("utf-8")
        logger.info("DKIM: loaded private key from DKIM_PRIVATE_KEY env")
        return _private_key

    return None


def dkim_ready() -> bool:
    if not settings.DKIM_ENABLED:
        return False
    return _load_private_key() is not None


def dns_txt_preview(public_key_b64: str) -> str:
    """Build Cloudflare TXT value for selector._domainkey."""
    return f"v=DKIM1; k=rsa; p={public_key_b64}"


def ensure_identity_headers(msg: Message) -> None:
    if "Date" not in msg:
        msg["Date"] = formatdate(localtime=True)
    if "Message-ID" not in msg:
        msg["Message-ID"] = make_msgid(domain=settings.MAIL_DOMAIN)


def sign_message(msg: Message) -> Message:
    """
    Add Date/Message-ID if missing and DKIM-Signature when enabled.
    Returns the (possibly signed) message; never raises on sign failure - logs and returns unsigned.
    """
    ensure_identity_headers(msg)

    if not settings.DKIM_ENABLED:
        return msg

    priv = _load_private_key()
    if not priv:
        logger.warning("DKIM enabled but no private key - sending unsigned")
        return msg

    try:
        import dkim
    except ImportError:
        logger.error("DKIM enabled but dkimpy not installed")
        return msg

    try:
        raw = msg.as_bytes(policy=policy.SMTP)
        selector = (settings.DKIM_SELECTOR or "default").encode("ascii")
        domain = settings.MAIL_DOMAIN.encode("ascii")
        sig = dkim.sign(
            raw,
            selector,
            domain,
            priv,
            include_headers=[
                b"from",
                b"to",
                b"subject",
                b"date",
                b"message-id",
            ],
        )
        signed = message_from_bytes(sig + raw, policy=policy.SMTP)
        logger.info(
            "DKIM: signed message selector=%s domain=%s",
            settings.DKIM_SELECTOR,
            settings.MAIL_DOMAIN,
        )
        return signed
    except Exception as e:
        logger.exception("DKIM sign failed: %s", e)
        return msg
