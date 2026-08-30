"""Outlook-shaped IMAP FETCH/SELECT helpers."""
import unittest
from datetime import datetime, timezone

from app.imap_server import (
    _OUTLOOK_LIST_FETCH,
    _build_fetch_response,
    _classify_mailbox,
    _normalize_mailbox,
    _redact_imap_line,
    _safe_bodystructure,
    _section_payload,
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


if __name__ == "__main__":
    unittest.main()
