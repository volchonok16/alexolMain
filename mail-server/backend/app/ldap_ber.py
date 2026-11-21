"""Lenient LDAP request decoder.

Outlook sends RFC 4511 `present` filters as primitive context tag 7 (0x87).
ldap3/pyasn1 expect constructed 0xA7, so Search PDUs never decode and the
address book stays empty after a successful bind.
"""
from __future__ import annotations


def _read_len(buf: bytes, i: int) -> tuple[int, int]:
    if i >= len(buf):
        raise ValueError("truncated BER length")
    first = buf[i]
    i += 1
    if first < 0x80:
        return first, i
    n = first & 0x7F
    if n == 0 or n > 4 or i + n > len(buf):
        raise ValueError("invalid BER length")
    return int.from_bytes(buf[i : i + n], "big"), i + n


def read_tlv(buf: bytes, i: int = 0) -> tuple[int, bool, int, bytes, int]:
    if i >= len(buf):
        raise ValueError("truncated BER tag")
    octet = buf[i]
    i += 1
    cls = (octet >> 6) & 0x3
    constructed = bool(octet & 0x20)
    tag = octet & 0x1F
    if tag == 0x1F:
        tag = 0
        while i < len(buf):
            b = buf[i]
            i += 1
            tag = (tag << 7) | (b & 0x7F)
            if not (b & 0x80):
                break
    length, i = _read_len(buf, i)
    if i + length > len(buf):
        raise ValueError("truncated BER value")
    return cls, constructed, tag, buf[i : i + length], i + length


def _as_text(raw: bytes) -> str:
    return raw.decode("utf-8", "replace")


def _esc_filter(value: str) -> str:
    out: list[str] = []
    for ch in value:
        if ch in "\\*()\0" or ord(ch) < 32:
            out.append("\\%02x" % (ord(ch) if ch != "\0" else 0))
        else:
            out.append(ch)
    return "".join(out)


def _int(raw: bytes) -> int:
    if not raw:
        return 0
    val = int.from_bytes(raw, "big", signed=False)
    if raw[0] & 0x80:
        val -= 1 << (8 * len(raw))
    return val


def _bool(raw: bytes) -> bool:
    return any(b != 0 for b in raw)


def _walk_seq(raw: bytes) -> list[tuple[int, bool, int, bytes]]:
    items: list[tuple[int, bool, int, bytes]] = []
    i = 0
    while i < len(raw):
        cls, constructed, tag, val, i = read_tlv(raw, i)
        items.append((cls, constructed, tag, val))
    return items


def filter_to_string(raw: bytes) -> str:
    if not raw:
        return "(objectClass=*)"
    cls, constructed, tag, val, _ = read_tlv(raw, 0)
    if cls != 2:
        return "(objectClass=*)"
    if tag == 0:  # and
        parts = []
        i = 0
        while i < len(val):
            start = i
            _, _, _, _, i = read_tlv(val, i)
            parts.append(filter_to_string(val[start:i]))
        return "(&" + "".join(parts) + ")"
    if tag == 1:  # or
        parts = []
        i = 0
        while i < len(val):
            start = i
            _, _, _, _, i = read_tlv(val, i)
            parts.append(filter_to_string(val[start:i]))
        return "(|" + "".join(parts) + ")"
    if tag == 2:  # not
        return "(!" + filter_to_string(val) + ")"
    if tag in (3, 5, 6, 8):  # equality / ge / le / approx
        fields = _walk_seq(val)
        attr = _as_text(fields[0][3]) if fields else ""
        value = _as_text(fields[1][3]) if len(fields) > 1 else ""
        op = {3: "=", 5: ">=", 6: "<=", 8: "~="}[tag]
        return f"({attr}{op}{_esc_filter(value)})"
    if tag == 4:  # substring
        fields = _walk_seq(val)
        attr = _as_text(fields[0][3]) if fields else "cn"
        pattern = "*"
        if len(fields) > 1:
            chunks: list[str] = []
            initial = any_parts = final = ""
            i = 0
            subs = fields[1][3]
            while i < len(subs):
                _, _, st, sv, i = read_tlv(subs, i)
                text = _esc_filter(_as_text(sv))
                if st == 0:
                    initial = text
                elif st == 1:
                    chunks.append(text)
                elif st == 2:
                    final = text
            pattern = initial + "*"
            for chunk in chunks:
                pattern += chunk + "*"
            if final:
                if not pattern.endswith("*"):
                    pattern += "*"
                pattern += final
            elif not chunks and initial:
                pass
        return f"({attr}={pattern})"
    if tag == 7:  # present (primitive 0x87 or constructed 0xA7)
        attr = _as_text(val)
        if constructed and val:
            try:
                _, _, _, inner, _ = read_tlv(val, 0)
                attr = _as_text(inner)
            except ValueError:
                attr = _as_text(val)
        return f"({attr}=*)"
    if tag == 9:  # extensibleMatch
        matching_rule = attr = value = ""
        for fcls, _c, ftag, fval in _walk_seq(val):
            if fcls != 2:
                continue
            if ftag == 1:
                matching_rule = _as_text(fval)
            elif ftag == 2:
                attr = _as_text(fval)
            elif ftag == 3:
                value = _as_text(fval)
        if matching_rule.endswith("1.2.840.113556.1.4.1791") or attr.lower() == "anr":
            return f"(anr={_esc_filter(value)})"
        if attr:
            return f"({attr}={_esc_filter(value)})"
        return f"(anr={_esc_filter(value)})"
    return "(objectClass=*)"


def decode_ldap_request(pdu: bytes) -> dict:
    """Parse one LDAPMessage into a small dict. Raises ValueError on garbage."""
    cls, constructed, tag, val, _ = read_tlv(pdu, 0)
    if cls != 0 or tag != 16 or not constructed:
        raise ValueError("not an LDAPMessage")
    items = _walk_seq(val)
    if not items:
        raise ValueError("empty LDAPMessage")
    message_id = _int(items[0][3])
    op_cls, op_cons, op_tag, op_val = items[1]
    if op_cls != 1:
        raise ValueError("missing protocolOp")
    if op_tag == 0:
        return {"id": message_id, "op": "bindRequest", **_decode_bind(op_val)}
    if op_tag == 2:
        return {"id": message_id, "op": "unbindRequest"}
    if op_tag == 3:
        return {"id": message_id, "op": "searchRequest", **_decode_search(op_val)}
    if op_tag == 16:
        return {"id": message_id, "op": "abandonRequest"}
    if op_tag == 23:
        return {"id": message_id, "op": "extendedReq"}
    return {"id": message_id, "op": f"app{op_tag}"}


def _decode_bind(raw: bytes) -> dict:
    fields = _walk_seq(raw)
    name = ""
    password = ""
    sasl = False
    if len(fields) > 1:
        name = _as_text(fields[1][3])
    if len(fields) > 2:
        fcls, _c, ftag, fval = fields[2]
        if fcls == 2 and ftag == 0:
            password = _as_text(fval).replace("\x00", "")
        elif fcls == 2 and ftag == 3:
            sasl = True
    return {"name": name, "password": password, "sasl": sasl}


def _decode_search(raw: bytes) -> dict:
    fields = _walk_seq(raw)
    base = _as_text(fields[0][3]) if fields else ""
    scope = _int(fields[1][3]) if len(fields) > 1 else 0
    size_limit = _int(fields[3][3]) if len(fields) > 3 else 0
    types_only = _bool(fields[5][3]) if len(fields) > 5 else False
    ldap_filter = "(objectClass=*)"
    if len(fields) > 6:
        fcls, fcons, ftag, fval = fields[6]
        # Reconstruct the filter TLV so filter_to_string sees the CHOICE tag.
        tag_byte = (fcls << 6) | (0x20 if fcons else 0) | ftag
        length = len(fval)
        if length < 0x80:
            filt_raw = bytes([tag_byte, length]) + fval
        else:
            lb = length.to_bytes((length.bit_length() + 7) // 8, "big")
            filt_raw = bytes([tag_byte, 0x80 | len(lb)]) + lb + fval
        ldap_filter = filter_to_string(filt_raw)
    requested: list[str] = []
    if len(fields) > 7:
        i = 0
        attr_raw = fields[7][3]
        while i < len(attr_raw):
            _, _, _, aval, i = read_tlv(attr_raw, i)
            requested.append(_as_text(aval))
    return {
        "base": base,
        "scope": scope,
        "sizeLimit": size_limit,
        "typesOnly": types_only,
        "filter": ldap_filter,
        "attributes": requested,
    }
