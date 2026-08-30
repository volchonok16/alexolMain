"""Inbound MIME body extraction must not put NULs into Postgres text."""
import unittest
from email.message import EmailMessage
from email.parser import BytesParser
from email import policy

from app.mail_body import (
    coerce_stored_bodies,
    extract_text_and_html,
    maybe_decode_stored,
    sanitize_pg_text,
)


class SanitizePgTextTests(unittest.TestCase):
    def test_strips_nul(self):
        self.assertEqual(sanitize_pg_text("a\x00b"), "ab")
        self.assertEqual(sanitize_pg_text(None), "")


class ZipDmarcBodyTests(unittest.TestCase):
    def test_zip_payload_does_not_include_nul(self):
        msg = EmailMessage()
        msg["From"] = "noreply-dmarc-support@google.com"
        msg["To"] = "admin@alexol.io"
        msg["Subject"] = "Report domain: alexol.io"
        zip_bytes = (
            b"PK\x03\x04\n\x00\x00\x00\x08\x00"
            + b"google.com!alexol.io.xml"
            + b"\x00\x01\x02"
        )
        msg.set_content(zip_bytes, maintype="application", subtype="zip")
        msg.set_param("filename", "google.com!alexol.io.xml.zip", "content-type")
        plain, html = extract_text_and_html(msg)
        self.assertNotIn("\x00", plain)
        self.assertNotIn("\x00", html)
        self.assertTrue(plain.startswith("["))


class CalendarAndBase64BodyTests(unittest.TestCase):
    def test_invite_mime_shows_html_not_base64_or_ics(self):
        from datetime import datetime
        from types import SimpleNamespace
        from app.cal_invite import build_meeting_rfc822

        org = SimpleNamespace(full_name="No Reply", email="no-reply@alexol.io")
        att = SimpleNamespace(
            email="altaraskin@alexol.io", display_name="Alex", status="invited"
        )
        event = SimpleNamespace(
            id=1,
            ical_uid="event-1@alexol.io",
            ical_sequence=0,
            title="qweewqqweewq",
            description="desc",
            location="office",
            start_at=datetime(2026, 9, 1, 8, 0),
            end_at=datetime(2026, 9, 1, 9, 0),
            updated_at=datetime(2026, 8, 30, 12, 0),
            created_at=datetime(2026, 8, 30, 12, 0),
            organizer=org,
            attendees=[att],
        )
        html = "<p>No - Reply приглашает на встречу.</p><p><strong>qweewqqweewq</strong></p>"
        raw = build_meeting_rfc822(
            organizer=org,
            event=event,
            to_addrs=[att.email],
            subject="Встреча: qweewqqweewq",
            body="plain hello",
            html=html,
            method="REQUEST",
        )
        html_section = raw.split(b"text/html", 1)[1][:400]
        self.assertNotIn(b"Content-Transfer-Encoding: base64", html_section)
        msg = BytesParser(policy=policy.default).parsebytes(raw)
        plain, got_html = extract_text_and_html(msg)
        self.assertEqual(plain, "plain hello")
        self.assertIn("приглашает", got_html)
        self.assertNotIn("BEGIN:VCALENDAR", got_html)
        self.assertNotIn("PHA+", got_html)

    def test_outlook_ics_only_becomes_readable(self):
        ics = (
            "BEGIN:VCALENDAR\r\nMETHOD:REQUEST\r\nBEGIN:VEVENT\r\n"
            "UID:x@alexol.io\r\nSUMMARY:Planerka\r\n"
            "DTSTART:20260831T120000Z\r\nDTEND:20260831T123000Z\r\n"
            "LOCATION:Room\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
        )
        msg = EmailMessage()
        msg["From"] = "altaraskin@alexol.io"
        msg["To"] = "info@alexol.io"
        msg.set_content(ics, subtype="calendar")
        plain, html = extract_text_and_html(msg)
        self.assertNotIn("BEGIN:VCALENDAR", plain)
        self.assertIn("Planerka", plain)
        self.assertIn("Planerka", html)
        self.assertIn("<p", html)

    def test_stored_base64_html_is_decoded(self):
        import base64

        html = "<p>No - Reply приглашает на встречу.</p>"
        blob = base64.b64encode(html.encode("utf-8")).decode("ascii")
        _body, got = coerce_stored_bodies(blob, "")
        self.assertIn("приглашает", got)
        self.assertTrue(got.startswith("<p>"))
        self.assertEqual(maybe_decode_stored(blob), html)

    def test_stored_ics_becomes_meeting_card(self):
        ics = (
            "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a@b\nSUMMARY:Test meet\n"
            "DTSTART:20260831T120000Z\nDTEND:20260831T123000Z\nEND:VEVENT\nEND:VCALENDAR\n"
        )
        body, html = coerce_stored_bodies(ics, "")
        self.assertIn("Test meet", body)
        self.assertIn("Test meet", html)
        self.assertNotIn("BEGIN:VCALENDAR", html)


class MeetingInviteLayoutTests(unittest.TestCase):
    def test_html_has_join_button(self):
        from datetime import datetime
        from app.mail_body import meeting_invite_html, meeting_invite_plain

        html = meeting_invite_html(
            lead="Alexander приглашает на встречу.",
            title="Стендап",
            when="30 августа 2026, 10:00–11:00",
            location="Переговорка · https://meet.alexol.io/alexol-1-abc",
            description="Повестка дня",
            organizer="Alexander Taraskin",
            attendees=["Info"],
        )
        self.assertIn("Присоединиться к видеозвонку", html)
        self.assertIn("https://meet.alexol.io/alexol-1-abc", html)
        self.assertIn("Стендап", html)
        self.assertIn("Переговорка", html)
        self.assertIn("<table", html)
        plain = meeting_invite_plain(
            lead="Alexander приглашает на встречу.",
            title="Стендап",
            when="30 августа 2026, 10:00–11:00",
            location="https://meet.alexol.io/alexol-1-abc",
        )
        self.assertIn("Видеозвонок:", plain)

    def test_cancel_has_no_join_button(self):
        from app.mail_body import meeting_invite_html

        html = meeting_invite_html(
            lead="Встреча отменена",
            title="Стендап",
            when="30 августа 2026, 10:00–11:00",
            location="https://meet.alexol.io/room",
            method="CANCEL",
        )
        self.assertIn("Встреча отменена", html)
        self.assertNotIn("Присоединиться к видеозвонку", html)


if __name__ == "__main__":
    unittest.main()
