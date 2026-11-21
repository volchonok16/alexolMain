"""Parse and normalize email recipient lists (To: multiple mailboxes)."""

from __future__ import annotations

import re
from email.utils import formataddr, parseaddr
from typing import Iterable

from fastapi import HTTPException

MAX_RECIPIENTS = 50
_SPLIT_RE = re.compile(r"[;,]+")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def split_address_field(raw: str | None) -> list[str]:
    """Best-effort split of a stored To field. Never raises."""
    seen: set[str] = set()
    out: list[str] = []
    for chunk in _SPLIT_RE.split(raw or ""):
        chunk = chunk.strip()
        if not chunk:
            continue
        _name, addr = parseaddr(chunk)
        addr = (addr or chunk).strip().lower()
        if not addr or addr in seen:
            continue
        seen.add(addr)
        out.append(addr)
    return out


def parse_recipient_addresses(raw: str | None) -> list[str]:
    """Parse To input into unique, validated addresses. Raises HTTP 400 on empty/invalid."""
    addresses: list[str] = []
    seen: set[str] = set()
    for chunk in _SPLIT_RE.split(raw or ""):
        chunk = chunk.strip()
        if not chunk:
            continue
        _name, parsed = parseaddr(chunk)
        addr = (parsed or chunk).strip().lower()
        if not addr or not _EMAIL_RE.match(addr):
            raise HTTPException(
                status_code=400,
                detail=f"Некорректный адрес получателя: {chunk}",
            )
        if addr in seen:
            continue
        seen.add(addr)
        addresses.append(addr)

    if not addresses:
        raise HTTPException(status_code=400, detail="Укажите хотя бы одного получателя")
    if len(addresses) > MAX_RECIPIENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Слишком много получателей (максимум {MAX_RECIPIENTS})",
        )
    return addresses


def recipient_domain(address: str) -> str:
    if "@" not in address:
        return ""
    return address.rsplit("@", 1)[-1].lower()


def group_by_domain(addresses: Iterable[str]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {}
    for addr in addresses:
        grouped.setdefault(recipient_domain(addr), []).append(addr)
    return grouped


def partition_local_external(
    addresses: Iterable[str], mail_domain: str
) -> tuple[list[str], list[str]]:
    domain = (mail_domain or "").replace("@", "").lower()
    local: list[str] = []
    external: list[str] = []
    for addr in addresses:
        if recipient_domain(addr) == domain:
            local.append(addr)
        else:
            external.append(addr)
    return local, external


def format_to_header(addresses: Iterable[str], names: dict[str, str] | None = None) -> str:
    parts: list[str] = []
    for addr in addresses:
        name = ((names or {}).get(addr) or "").strip()
        parts.append(formataddr((name, addr)) if name else addr)
    return ", ".join(parts)
