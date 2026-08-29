"""Extract plain/HTML bodies from inbound MIME and recover HTML stored as text."""

from __future__ import annotations

import re

_HTML_DOC = re.compile(r"^\s*(?:<!DOCTYPE\s+html|<html[\s>])", re.I)
_TAG_HINTS = re.compile(r"<(?:table|div|h1|p|img|body|head)\b", re.I)


def looks_like_html(text: str | None) -> bool:
    if not text:
        return False
    t = text.replace("\ufeff", "").strip()
    if not t:
        return False
    if _HTML_DOC.match(t):
        return True
    if re.search(r"<body[\s>]", t, re.I) and re.search(r"</html>", t, re.I):
        return True
    return len(_TAG_HINTS.findall(t)) >= 4


def coerce_stored_bodies(body: str | None, html_body: str | None) -> tuple[str, str]:
    """If HTML arrived as a single-part / text/plain payload, expose it as html_body."""
    body = body or ""
    html_body = html_body or ""
    if html_body.strip():
        return body, html_body
    if looks_like_html(body):
        return body, body
    return body, html_body


def _decode_part(part) -> str:
    if part is None:
        return ""
    try:
        content = part.get_content()
    except Exception:
        raw = part.get_payload(decode=True)
        if not raw:
            return ""
        charset = part.get_content_charset() or "utf-8"
        try:
            content = raw.decode(charset, errors="replace")
        except LookupError:
            content = raw.decode("utf-8", errors="replace")
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    return (content or "").replace("\ufeff", "")


def extract_text_and_html(msg) -> tuple[str, str]:
    html = ""
    plain = ""
    get_body = getattr(msg, "get_body", None)
    if callable(get_body):
        html = _decode_part(get_body(preferencelist=("html",)))
        plain = _decode_part(get_body(preferencelist=("plain",)))

    if not html:
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            disp = (part.get_content_disposition() or "").lower()
            if disp == "attachment":
                continue
            if part.get_content_type() == "text/html":
                html = _decode_part(part)
                break

    if not plain:
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            disp = (part.get_content_disposition() or "").lower()
            if disp == "attachment":
                continue
            if part.get_content_type() == "text/plain":
                plain = _decode_part(part)
                break

    if not html and not plain:
        ctype = (msg.get_content_type() or "").lower()
        text = _decode_part(msg)
        if ctype == "text/html" or looks_like_html(text):
            html = text
        else:
            plain = text

    return plain, html


def peek_rfc822_header(content: bytes, name: str) -> str:
    """Read one header without parsing the whole MIME tree (fast path for SMTP/IMAP)."""
    if not content or not name:
        return ""
    blob = content[:16384]
    split = blob.split(b"\r\n\r\n", 1)[0]
    if split == blob:
        split = blob.split(b"\n\n", 1)[0]
    try:
        text = split.decode("utf-8", errors="replace")
    except Exception:
        text = split.decode("latin-1", errors="replace")
    key = name.lower() + ":"
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.lower().startswith(key):
            value = line.split(":", 1)[1].strip()
            i += 1
            while i < len(lines) and lines[i][:1] in (" ", "\t"):
                value += " " + lines[i].strip()
                i += 1
            return value.strip()
        i += 1
    return ""
