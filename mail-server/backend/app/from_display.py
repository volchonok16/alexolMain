"""Fill From display name from the mailbox profile when Outlook omitted it."""
from __future__ import annotations

from email import policy as email_policy
from email.parser import BytesParser
from email.utils import formataddr, parseaddr


def from_name_is_placeholder(header_name: str, email: str) -> bool:
    """True when Outlook left From without a real personal name."""
    name = (header_name or "").strip().strip('"')
    if not name:
        return True
    addr = (email or "").strip().lower()
    n = name.lower()
    local = addr.split("@", 1)[0] if addr else ""
    return n in {addr, local}


def inject_from_display_name(
    raw: bytes,
    full_name: str,
    mailbox_email: str,
) -> tuple[bytes, str | None]:
    """
    If From has no real name, set it to mailbox full_name.
    Leaves a custom From name untouched. Returns (rfc822, display_name).
    """
    display = (full_name or "").strip()
    mailbox = (mailbox_email or "").strip().lower()
    if not raw:
        return raw, display or None

    msg = BytesParser(policy=email_policy.SMTP).parsebytes(raw)
    header_name, header_addr = parseaddr(msg.get("From") or "")
    addr = (header_addr or mailbox).strip().lower()
    current = (header_name or "").strip()

    if mailbox and addr and addr != mailbox:
        return raw, current or None

    if not display or not from_name_is_placeholder(current, addr or mailbox):
        return raw, current or display or None

    if "From" in msg:
        del msg["From"]
    msg["From"] = formataddr((display, addr or mailbox))
    return msg.as_bytes(policy=email_policy.SMTP), display
