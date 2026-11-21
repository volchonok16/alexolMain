"""Outlook-shaped IMAP FETCH/SELECT helpers."""
import unittest
from datetime import datetime, timezone

from app.imap_server import (
    _OUTLOOK_LIST_FETCH,
    _SENT_LIST_ATOM,
    _TRASH_LIST_ATOM,
    _build_fetch_response,
    _classify_mailbox,
    _decode_mutf7,
    _encode_mutf7,
    _imap_uid,
    _normalize_mailbox,
    _parse_seq_set,
    _redact_imap_line,
    _safe_bodystructure,
    _section_payload,
    _uidnext,
)


def _sample(html=True, subject="Привет из Gmail", raw=None):
    return {
        "id": 42,
        "from": "sender@gmail.com",
        "from_name": "Sender",
        "to": "user@alexol.io, copy@alexol.io",
        "to_name": "User",
        "subject": subject,
        "body": "Hello plain",
        "html_body": "<p>Hello html</p>" if html else "",
        "raw": raw,
        "date": datetime(2026, 8, 30, 8, 0, tzinfo=timezone.utc),
        "flags": [],
    }


class MailboxNameTests(unittest.TestCase):
    def test_select_inbox_ignores_condstore(self):
        self.assertEqual(_classify_mailbox(_normalize_mailbox('INBOX (CONDSTORE)')), "INBOX")

    def test_drafts_and_inbox_aliases(self):
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Drafts")), "Drafts")
        self.assertEqual(_classify_mailbox(_normalize_mailbox('"INBOX"')), "INBOX")

    def test_hierarchical_inbox_clones_are_not_inbox(self):
        self.assertIsNone(_classify_mailbox(_normalize_mailbox("INBOX/INBOX")))
        self.assertIsNone(_classify_mailbox(_normalize_mailbox('"INBOX/INBOX/INBOX"')))
        self.assertIsNone(_classify_mailbox(_normalize_mailbox("INBOX.INBOX")))
        self.assertEqual(_classify_mailbox(_normalize_mailbox("INBOX")), "INBOX")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Sent")), "Sent")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Отправленные")), "Sent")
        self.assertEqual(_classify_mailbox(_normalize_mailbox(_SENT_LIST_ATOM)), "Sent")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("INBOX.Sent")), "Sent")

    def test_trash_aliases(self):
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Trash")), "Trash")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Deleted Items")), "Trash")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Удаленные")), "Trash")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Удалённые")), "Trash")
        self.assertEqual(_classify_mailbox(_normalize_mailbox(_TRASH_LIST_ATOM)), "Trash")
        self.assertEqual(_classify_mailbox(_normalize_mailbox("INBOX.Trash")), "Trash")
        self.assertEqual(_decode_mutf7(_TRASH_LIST_ATOM), "Удаленные элементы")
        self.assertIn(" ", _TRASH_LIST_ATOM)
        self.assertTrue(_TRASH_LIST_ATOM.isascii())

    def test_list_children_of_inbox_are_empty(self):
        from app.imap_server import _list_pattern_is_children

        self.assertTrue(_list_pattern_is_children("INBOX", "%"))
        self.assertTrue(_list_pattern_is_children("", "INBOX/%"))
        self.assertFalse(_list_pattern_is_children("", "*"))
        self.assertFalse(_list_pattern_is_children("", "%"))
        self.assertFalse(_list_pattern_is_children("", "INBOX"))

    def test_list_has_noinferiors_not_inbox_special_use(self):
        from pathlib import Path

        src = (Path(__file__).resolve().parents[1] / "app" / "imap_server.py").read_text(
            encoding="utf-8"
        )
        self.assertIn("(\\Noinferiors)", src)
        self.assertIn("(\\HasNoChildren \\Sent)", src)
        self.assertIn("(\\HasNoChildren \\Trash)", src)
        self.assertIn("_SENT_LIST_ATOM", src)
        self.assertIn("_TRASH_LIST_ATOM", src)
        self.assertIn("_list_or_lsub", src)
        self.assertNotIn("SPECIAL-USE", src.split("caps = ", 1)[-1][:80])
        self.assertIn("async def _subscribe", src)
        self.assertIn('kind not in ("INBOX", "Drafts", "Contacts")', src)
        self.assertIn("[APPENDUID", src)
        self.assertIn("[COPYUID", src)
        self.assertIn("UIDVALIDITY = 27", src)

    def test_sent_list_atom_is_mutf7_otpravlennye(self):
        self.assertEqual(_decode_mutf7(_SENT_LIST_ATOM), "Отправленные")
        self.assertEqual(_encode_mutf7("Отправленные"), _SENT_LIST_ATOM)
        self.assertTrue(_SENT_LIST_ATOM.isascii())
        self.assertNotEqual(_SENT_LIST_ATOM, "Sent")

    def test_contacts_mailbox(self):
        self.assertEqual(_classify_mailbox(_normalize_mailbox("Contacts")), "Contacts")


class FetchResponseTests(unittest.TestCase):
    def test_uid_always_present(self):
        resp = _build_fetch_response(1, _sample(), "FLAGS", True)
        self.assertIn(b"UID 42", resp)
        self.assertTrue(resp.startswith(b"* 1 FETCH ("))
        self.assertTrue(resp.endswith(b")\r\n"))

    def test_envelope_is_7bit_for_cyrillic_subject(self):
        resp = _build_fetch_response(
            1,
            _sample(),
            "UID FLAGS INTERNALDATE RFC822.SIZE ENVELOPE BODYSTRUCTURE",
            True,
        )
        resp.decode("ascii")
        self.assertIn(b"ENVELOPE", resp)
        self.assertIn(b"BODYSTRUCTURE", resp)
        self.assertIn(b"ALTERNATIVE", resp)
        self.assertNotIn(b'"100 10"', resp)
        self.assertIn(b"RFC822.SIZE", resp)

    def test_outlook_list_fetch_items_are_parseable(self):
        resp = _build_fetch_response(1, _sample(), _OUTLOOK_LIST_FETCH, True)
        resp.decode("ascii")
        self.assertIn(b"UID 42", resp)
        self.assertIn(b"ENVELOPE", resp)
        self.assertIn(b"BODY[HEADER.FIELDS", resp)
        self.assertIn(b"RFC822.SIZE", resp)

    def test_redact_authenticate_hides_sasl_payload(self):
        line = "a AUTHENTICATE PLAIN Zm9vAGJhcgB0aGVyZQ=="
        redacted = _redact_imap_line(line)
        self.assertEqual(redacted, "a AUTHENTICATE PLAIN ***")
        self.assertNotIn("Zm9v", redacted)

    def test_outlook_header_fields_fetch(self):
        items = (
            "UID RFC822.SIZE FLAGS BODY.PEEK[HEADER.FIELDS "
            "(DATE FROM SUBJECT TO CC BCC MESSAGE-ID CONTENT-TYPE)]"
        )
        resp = _build_fetch_response(1, _sample(), items, True)
        self.assertIn(b"BODY[HEADER.FIELDS", resp)
        self.assertIn(b"Subject:", resp)
        self.assertIn(b"From:", resp)
        self.assertIn(b"UID 42", resp)

    def test_body_parts_are_not_full_rfc822(self):
        em = _sample()
        rfc = _build_fetch_response(1, em, "BODY.PEEK[]", True)
        full = rfc.split(b"{", 1)[1]
        size = int(full.split(b"}", 1)[0])
        raw = full.split(b"\r\n", 1)[1][:size]
        label, part1 = _section_payload(raw, "1")
        label2, part2 = _section_payload(raw, "2")
        self.assertEqual(label, "BODY[1]")
        self.assertLess(len(part1), len(raw))
        self.assertIn(b"Hello plain", part1)
        self.assertIn(b"Hello html", part2)
        self.assertNotIn(b"Content-Type: multipart", part1)

    def test_partial_body_fetch(self):
        resp = _build_fetch_response(1, _sample(), "BODY.PEEK[]<0.20>", True)
        self.assertIn(b"BODY[]<0> {20}", resp)

    def test_bodystructure_sizes_match_html_part(self):
        em = _sample()
        rfc_resp = _build_fetch_response(1, em, "BODY.PEEK[]", True)
        size = int(rfc_resp.split(b"{", 1)[1].split(b"}", 1)[0])
        raw = rfc_resp.split(b"\r\n", 1)[1][:size]
        structure = _safe_bodystructure(raw, em)
        self.assertIn('"HTML"', structure)
        self.assertIn('"PLAIN"', structure)
        self.assertNotIn(" 100 ", structure)


    def test_compact_uids_make_uidnext_exists_plus_one(self):
        emails = [
            {"id": 84, "uid": 1},
            {"id": 90, "uid": 2},
            {"id": 101, "uid": 18},
        ]
        self.assertEqual(_imap_uid(emails[0]), 1)
        self.assertEqual(_uidnext(emails), 19)

    def test_uid_fetch_1_exists_hits_all_when_db_ids_are_large(self):
        emails = [{"id": 80 + i, "uid": i + 1, "flags": []} for i in range(18)]
        pairs = _parse_seq_set("1:18", 18, True, emails)
        self.assertEqual(len(pairs), 18)
        self.assertEqual(_imap_uid(pairs[0][1]), 1)
        self.assertEqual(_imap_uid(pairs[-1][1]), 18)

    def test_uid_fetch_0_returns_all(self):
        emails = [{"id": 84, "uid": 1, "flags": []}, {"id": 101, "uid": 2, "flags": []}]
        pairs = _parse_seq_set("0", 2, True, emails)
        self.assertEqual(len(pairs), 2)

    def test_bodystructure_includes_calendar_method(self):
        from datetime import datetime as dt
        from types import SimpleNamespace
        from app.cal_invite import build_meeting_rfc822
        from app.imap_server import _safe_bodystructure

        org = SimpleNamespace(full_name="Alex", email="altaraskin@alexol.io")
        att = SimpleNamespace(email="info@alexol.io", display_name="Info", status="invited")
        event = SimpleNamespace(
            id=7,
            ical_uid="event-7@alexol.io",
            ical_sequence=0,
            title="Созвон",
            description="Повестка",
            location="Meet",
            start_at=dt(2026, 8, 30, 14, 0),
            end_at=dt(2026, 8, 30, 15, 0),
            updated_at=dt(2026, 8, 30, 12, 0),
            created_at=dt(2026, 8, 30, 12, 0),
            organizer=org,
            attendees=[att],
        )
        raw = build_meeting_rfc822(
            organizer=org,
            event=event,
            to_addrs=["info@alexol.io"],
            subject="Встреча: Созвон",
            body="text",
            html="<p>text</p>",
            method="REQUEST",
        )
        structure = _safe_bodystructure(raw, {})
        self.assertIn('"CALENDAR"', structure)
        self.assertIn('"METHOD" "REQUEST"', structure)
        self.assertIn('"ALTERNATIVE"', structure)

    def test_fetch_uses_mailbox_uid_not_db_id(self):
        em = _sample()
        em["uid"] = 1
        resp = _build_fetch_response(1, em, "FLAGS", True)
        self.assertIn(b"UID 1", resp)
        self.assertNotIn(b"UID 42", resp)


if __name__ == "__main__":
    unittest.main()
