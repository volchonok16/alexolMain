"""Company directory for Outlook Check Names (LDAP GAL)."""
from __future__ import annotations

import re
from typing import Any, Iterable

ANR_ATTRS = (
    "cn",
    "sn",
    "givenname",
    "displayname",
    "mail",
    "uid",
    "telephonenumber",
)


def ldap_base_dn(mail_domain: str) -> str:
    parts = [p for p in (mail_domain or "alexol.io").lower().replace("@", "").split(".") if p]
    return ",".join(f"dc={p}" for p in parts) or "dc=alexol,dc=io"


def ldap_people_ou(mail_domain: str) -> str:
    return f"ou=people,{ldap_base_dn(mail_domain)}"


def _escape_dn_value(value: str) -> str:
    s = (value or "").replace("\\", "\\\\").replace(",", "\\,").replace("+", "\\+")
    s = s.replace('"', '\\"').replace(";", "\\;").replace("<", "\\<").replace(">", "\\>")
    if s.startswith("#") or s.startswith(" "):
        s = "\\" + s
    if s.endswith(" "):
        s = s[:-1] + "\\ "
    return s


def ldap_user_dn(username: str, mail_domain: str, display_name: str = "") -> str:
    """Direct child of dc=alexol,dc=io so Outlook one-level browse lists people."""
    uid = (username or "user").strip() or "user"
    label = (display_name or "").strip() or uid
    return f"cn={_escape_dn_value(label)},{ldap_base_dn(mail_domain)}"


def parse_bind_identity(name: str) -> str | None:
    """Bind DN or mailbox login → lookup key (email or username). None = anonymous."""
    n = (name or "").strip()
    if not n:
        return None
    if "=" in n:
        for part in n.split(","):
            key, _, val = part.strip().partition("=")
            key = key.strip().lower()
            val = val.strip()
            if key in ("mail", "uid", "cn") and val:
                return val
        return None
    return n


def user_ldap_attrs(user: Any, mail_domain: str) -> dict[str, list[str]]:
    full = (getattr(user, "full_name", None) or "").strip()
    email = (getattr(user, "email", None) or "").strip()
    username = (getattr(user, "username", None) or "").strip() or (email.split("@", 1)[0] if email else "user")
    parts = full.split()
    given = parts[0] if parts else (full or username)
    sn = parts[-1] if len(parts) > 1 else (full or username)
    display = full or email or username
    dn = ldap_user_dn(username, mail_domain, display)
    attrs: dict[str, list[str]] = {
        "objectClass": ["top", "person", "organizationalPerson", "inetOrgPerson", "user"],
        "objectCategory": ["person"],
        "cn": [display],
        "sn": [sn],
        "givenName": [given],
        "displayName": [display],
        "name": [display],
        "mail": [email] if email else [],
        "uid": [username],
        "mailNickname": [username],
        "sAMAccountName": [username],
        "distinguishedName": [dn],
    }
    phone = (getattr(user, "phone", None) or "").strip()
    if phone:
        attrs["telephoneNumber"] = [phone]
        attrs["otherTelephone"] = [phone]
        attrs["mobile"] = [phone]
        attrs["homePhone"] = [phone]
    title = (getattr(user, "job_title", None) or "").strip()
    if title:
        attrs["title"] = [title]
        attrs["description"] = [title]
    telegram = (getattr(user, "telegram", None) or "").strip().lstrip("@")
    if telegram:
        attrs["labeledURI"] = [f"https://t.me/{telegram}"]
        attrs["wWWHomePage"] = [f"https://t.me/{telegram}"]
        attrs["info"] = [f"Telegram: @{telegram}"]
    attrs["entryDN"] = [dn]
    if email:
        attrs["rfc822Mailbox"] = [email]
        attrs["userPrincipalName"] = [email]
        attrs["proxyAddresses"] = [f"SMTP:{email}", email]
    attrs["o"] = [mail_domain]
    attrs["company"] = [mail_domain]
    attrs["organizationName"] = [mail_domain]
    attrs["physicalDeliveryOfficeName"] = [mail_domain]
    attrs["department"] = [mail_domain]
    if given and sn:
        attrs["initials"] = ["".join(p[0] for p in parts if p)[:2].upper()]
    return {k: v for k, v in attrs.items() if v}


def is_list_all_filter(filt: str) -> bool:
    """True when Outlook is browsing / not typing a name prefix."""
    compact = (filt or "").replace(" ", "")
    if not compact or compact in (
        "(objectClass=*)",
        "(&(objectClass=*))",
        "(mail=*)",
        "(&(mail=*))",
        "(&(objectClass=*)(mail=*))",
    ):
        return True
    if re.search(r"=[^*)]+\*", compact):
        return False
    return "=*" in compact


def _norm_map(attrs: dict[str, list[str]]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for key, vals in attrs.items():
        out[key.lower()] = [str(v) for v in vals]
    return out


def _unescape_filter_value(value: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(value):
        if value[i] == "\\" and i + 2 < len(value):
            hexpart = value[i + 1 : i + 3]
            try:
                out.append(chr(int(hexpart, 16)))
                i += 3
                continue
            except ValueError:
                pass
        out.append(value[i])
        i += 1
    return "".join(out)


def _values(attrs: dict[str, list[str]], attr: str) -> list[str]:
    return attrs.get(attr.lower(), [])


def _word_initial(values: Iterable[str], prefix: str) -> bool:
    p = prefix.lower()
    if not p:
        return True
    for raw in values:
        text = raw.lower()
        if text.startswith(p):
            return True
        if any(word.startswith(p) for word in text.replace(".", " ").replace("@", " ").split()):
            return True
    return False


def _contains(values: Iterable[str], needle: str) -> bool:
    n = needle.lower().replace(" ", "")
    if not n:
        return True
    for raw in values:
        lower = raw.lower()
        compact = lower.replace(" ", "")
        local = compact.split("@", 1)[0]
        if n in compact or compact in n or n in local or local in n:
            return True
        for word in lower.replace("@", " ").replace(".", " ").replace(",", " ").split():
            w = word.strip()
            if len(w) >= 2 and (n in w or w in n):
                return True
    return False


def _exact(values: Iterable[str], needle: str) -> bool:
    n = needle.lower()
    return any(raw.lower() == n for raw in values)


def _match_substring(values: list[str], pattern: str) -> bool:
    parts = pattern.split("*")
    if len(parts) == 1:
        return _exact(values, pattern)
    initial, *rest = parts
    final = rest.pop() if rest else ""
    any_parts = rest
    for raw in values:
        text = raw.lower()
        pos = 0
        if initial:
            if not (_word_initial([raw], initial) or text.startswith(initial.lower())):
                continue
            pos = len(initial) if text.startswith(initial.lower()) else 0
            if pos == 0:
                # matched a later word — find it
                idx = text.find(initial.lower())
                if idx < 0:
                    continue
                pos = idx + len(initial)
        ok = True
        for chunk in any_parts:
            if not chunk:
                continue
            found = text.find(chunk.lower(), pos)
            if found < 0:
                ok = False
                break
            pos = found + len(chunk)
        if not ok:
            continue
        if final and not text.endswith(final.lower()):
            continue
        return True
    return False


def _match_ava(attr: str, op: str, value: str, attrs: dict[str, list[str]]) -> bool:
    attr_l = attr.lower()
    value = _unescape_filter_value(value)
    if attr_l == "anr":
        needle = value.replace("*", "")
        hay: list[str] = []
        for name in ANR_ATTRS:
            hay.extend(_values(attrs, name))
        return _word_initial(hay, needle) or _contains(hay, needle)
    if attr_l == "objectcategory":
        needle = value.lower().replace("*", "")
        return (not needle) or "person" in needle or "user" in needle or "contact" in needle
    if attr_l == "objectclass" and value.lower().replace("*", "") in (
        "user",
        "person",
        "organizationalperson",
        "inetorgperson",
        "contact",
        "top",
    ):
        return True
    vals = _values(attrs, attr_l)
    if op == "=*":
        return bool(vals) or attr_l in ("objectclass", "objectcategory")
    if op == "~=":
        return _word_initial(vals, value) or _contains(vals, value)
    if op in (">=", "<="):
        return _contains(vals, value) or _exact(vals, value)
    if "*" in value:
        ok = _match_substring(vals, value) or _contains(vals, value.replace("*", ""))
        if not ok and attr_l in ("cn", "displayname", "name", "sn", "givenname"):
            extra: list[str] = []
            for name in ("mail", "uid", "rfc822mailbox", "samaccountname"):
                extra.extend(_values(attrs, name))
            ok = _match_substring(extra, value) or _contains(extra, value.replace("*", ""))
        return ok
    if attr_l in ("cn", "displayname", "name", "sn", "givenname", "mail", "uid", "rfc822mailbox"):
        return _exact(vals, value) or _word_initial(vals, value) or _contains(vals, value)
    return _exact(vals, value)


def _parse_filter(text: str, i: int, attrs: dict[str, list[str]]) -> tuple[bool, int]:
    if i >= len(text) or text[i] != "(":
        raise ValueError("LDAP filter must start with '('")
    i += 1
    if i >= len(text):
        raise ValueError("truncated LDAP filter")
    ch = text[i]
    if ch in "&|":
        i += 1
        parts: list[bool] = []
        while i < len(text) and text[i] != ")":
            val, i = _parse_filter(text, i, attrs)
            parts.append(val)
        if i >= len(text) or text[i] != ")":
            raise ValueError("unclosed LDAP filter")
        i += 1
        if ch == "&":
            return (all(parts) if parts else True), i
        return (any(parts) if parts else False), i
    if ch == "!":
        i += 1
        val, i = _parse_filter(text, i, attrs)
        if i >= len(text) or text[i] != ")":
            raise ValueError("unclosed LDAP filter")
        return (not val), i + 1

    end = text.find(")", i)
    if end < 0:
        raise ValueError("unclosed LDAP filter")
    item = text[i:end]
    i = end + 1
    if item.endswith("=*") and ":=" not in item and "~=" not in item and ">=" not in item and "<=" not in item:
        attr = item[:-2]
        return _match_ava(attr, "=*", "", attrs), i
    for op in (":=", "~=", ">=", "<="):
        if op in item:
            attr, _, value = item.partition(op)
            return _match_ava(attr, op, value, attrs), i
    if "=" in item:
        attr, _, value = item.partition("=")
        return _match_ava(attr, "=", value, attrs), i
    return False, i


def eval_ldap_filter(filt: str, attrs: dict[str, list[str]]) -> bool:
    text = (filt or "").strip()
    if not text:
        return True
    if not text.startswith("("):
        text = f"({text})"
    result, _pos = _parse_filter(text, 0, _norm_map(attrs))
    return result


def dn_in_scope(dn: str, base: str, scope: int) -> bool:
    """RFC 4511 scopes: 0=base, 1=one, 2=sub."""
    dn_l = (dn or "").strip().lower()
    base_l = (base or "").strip().lower()
    if not base_l:
        return scope != 0 or not dn_l
    if scope == 0:
        return dn_l == base_l
    if not dn_l.endswith("," + base_l) and dn_l != base_l:
        return False
    if scope == 2:
        return True
    if dn_l == base_l:
        return False
    rest = dn_l[: -(len(base_l) + 1)]
    return "," not in rest


def search_people(
    people: list[dict[str, list[str]]],
    *,
    ldap_filter: str,
    size_limit: int = 0,
) -> list[dict[str, list[str]]]:
    hits = [p for p in people if eval_ldap_filter(ldap_filter, p)]
    if size_limit and size_limit > 0:
        return hits[:size_limit]
    return hits
