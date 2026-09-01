"""Org profile fields: roles, direction, technical mailbox flag."""
from __future__ import annotations

import json
from typing import Any, Iterable, Optional

ORG_ROLE_ORDER = ("manager", "mentor", "employee", "student")
ORG_ROLE_LABELS = {
    "manager": "Руководитель",
    "mentor": "Наставник",
    "employee": "Сотрудник",
    "student": "Обучающийся",
}


def normalize_org_roles(value: Any) -> list[str]:
    raw: Iterable[Any]
    if value is None or value == "":
        raw = []
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            raw = []
        elif text.startswith("["):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = [part.strip() for part in text.split(",")]
            raw = parsed if isinstance(parsed, list) else []
        else:
            raw = [part.strip() for part in text.split(",")]
    elif isinstance(value, (list, tuple, set)):
        raw = value
    else:
        raw = []
    seen: set[str] = set()
    for item in raw:
        key = str(item or "").strip().lower()
        if key not in ORG_ROLE_LABELS or key in seen:
            continue
        seen.add(key)
    return [key for key in ORG_ROLE_ORDER if key in seen]


def dump_org_roles(roles: Any) -> Optional[str]:
    cleaned = normalize_org_roles(roles)
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=False)


def org_role_labels(roles: Any) -> list[str]:
    return [ORG_ROLE_LABELS[key] for key in normalize_org_roles(roles)]


def is_technical_user(user: Any) -> bool:
    return bool(getattr(user, "is_technical", False))


def apply_org_profile_fields(user: Any, data: Any, *, create: bool = False) -> None:
    if create or getattr(data, "is_technical", None) is not None:
        user.is_technical = bool(getattr(data, "is_technical", False))
    if create or getattr(data, "org_roles", None) is not None:
        user.org_roles = dump_org_roles(getattr(data, "org_roles", None))
    if create or getattr(data, "direction", None) is not None:
        user.direction = ((getattr(data, "direction", None) or "").strip() or None)
