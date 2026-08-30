"""iMIP / iCalendar parse and Outlook invite MIME."""
import unittest
from datetime import datetime
from email import policy
from email.parser import BytesParser
from types import SimpleNamespace

from app.cal_invite import (
    build_meeting_rfc822,
    build_vcalendar,
    extract_calendar_parts,
    parse_calendar,
    parse_ics_datetime,
)


def _event(**kwargs):
    org = SimpleNamespace(full_name="Alexander Taraskin", email="altaraskin@alexol.io")
    att = SimpleNamespace(
        email="info@alexol.io",
        display_name="Info",
        status="invited",
    )
    defaults = dict(
        id=7,
        ical_uid="event-7@alexol.io",
        ical_sequence=0,
        title="Созвон",
        description="Повестка",
        location="Meet",
        start_at=datetime(2026, 8, 30, 14, 0),
        end_at=datetime(2026, 8, 30, 15, 0),
        updated_at=datetime(2026, 8, 30, 12, 0),
        created_at=datetime(2026, 8, 30, 12, 0),
        organizer=org,
        attendees=[att],
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class ParseIcsTests(unittest.TestCase):
    def test_request_roundtrip(self):
        ics = build_vcalendar(_event(), "REQUEST")
        parsed = parse_calendar(ics)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed.method, "REQUEST")
        self.assertEqual(parsed.uid, "event-7@alexol.io")
        self.assertEqual(parsed.title, "Созвон")
        self.assertEqual(parsed.location, "Meet")
        self.assertEqual(parsed.start_at, datetime(2026, 8, 30, 14, 0))
        self.assertEqual(parsed.end_at, datetime(2026, 8, 30, 15, 0))
        emails = [a[0] for a in parsed.attendees]
        self.assertIn("info@alexol.io", emails)

    def test_cancel_method(self):
        ics = build_vcalendar(_event(ical_sequence=1), "CANCEL")
        parsed = parse_calendar(ics)
        self.assertEqual(parsed.method, "CANCEL")
        self.assertEqual(parsed.status, "CANCELLED")

    def test_outlook_tzid_moscow(self):
        ics = "\r\n".join(
            [
                "BEGIN:VCALENDAR",
                "METHOD:REQUEST",
                "BEGIN:VEVENT",
                "UID:outlook-guid@alexol.io",
                "SUMMARY:Планёрка",
                "DTSTART;TZID=Russian Standard Time:20260830T170000",
                "DTEND;TZID=Russian Standard Time:20260830T180000",
                "ORGANIZER;CN=Alex:mailto:altaraskin@alexol.io",
                "ATTENDEE;PARTSTAT=NEEDS-ACTION:mailto:info@alexol.io",
                "END:VEVENT",
                "END:VCALENDAR",
            ]
        )
        parsed = parse_calendar(ics)
        self.assertEqual(parsed.title, "Планёрка")
        # 17:00 Moscow = 14:00 UTC
        self.assertEqual(parsed.start_at, datetime(2026, 8, 30, 14, 0))

    def test_utc_zulu(self):
        dt = parse_ics_datetime("20260830T140000Z", {})
        self.assertEqual(dt, datetime(2026, 8, 30, 14, 0))

    def test_valarm_does_not_overwrite_description(self):
        ics = "\r\n".join(
            [
                "BEGIN:VCALENDAR",
                "METHOD:REQUEST",
                "BEGIN:VEVENT",
                "UID:alarm@alexol.io",
                "SUMMARY:wqeqweqwe",
                "DESCRIPTION:Повестка",
                "DTSTART:20260907T143000Z",
                "DTEND:20260907T150000Z",
                "ORGANIZER:mailto:altaraskin@alexol.io",
                "ATTENDEE:mailto:no-reply@alexol.io",
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                "DESCRIPTION:Reminder",
                "TRIGGER:-PT15M",
                "END:VALARM",
                "END:VEVENT",
                "END:VCALENDAR",
            ]
        )
        parsed = parse_calendar(ics)
        self.assertEqual(parsed.title, "wqeqweqwe")
        self.assertEqual(parsed.description, "Повестка")
        self.assertNotEqual(parsed.description.lower(), "reminder")

    def test_fold_long_cyrillic_does_not_break_utf8(self):
        from app.cal_invite import _fold_line

        line = "LOCATION:Переговорка · https://meet.alexol.io/a-alexol-376-949992/" + "я" * 40
        folded = _fold_line(line)
        folded.encode("utf-8")
        self.assertIn("\r\n ", folded)
        ics = build_vcalendar(
            _event(
                title="ФЫВФЫВ",
                location="Переговорка у окна · https://meet.alexol.io/a-alexol-376-949992",
                description="Повестка " * 25,
            ),
            "REQUEST",
        )
        ics.encode("utf-8")
        parsed = parse_calendar(ics)
        self.assertEqual(parsed.title, "ФЫВФЫВ")
        self.assertIn("meet.alexol.io", parsed.location)
        raw = build_meeting_rfc822(
            organizer=SimpleNamespace(full_name="Alexol Info", email="info@alexol.io"),
            event=_event(
                title="ФЫВФЫВ",
                location="Переговорка · https://meet.alexol.io/a-alexol-376-949992",
            ),
            to_addrs=["altaraskin@alexol.io"],
            subject="Встреча: ФЫВФЫВ",
            body="text",
            html="<p>text</p>",
        )
        self.assertTrue(raw.startswith(b"From:") or b"text/calendar" in raw)


class InviteMimeTests(unittest.TestCase):
    def test_mime_has_calendar_part(self):
        raw = build_meeting_rfc822(
            organizer=SimpleNamespace(full_name="Alex", email="altaraskin@alexol.io"),
            event=_event(),
            to_addrs=["info@alexol.io"],
            subject="Встреча: Созвон",
            body="text",
            html="<p>text</p>",
            method="REQUEST",
        )
        raw_text = raw.decode("utf-8", "replace")
        self.assertIn("text/calendar", raw_text.lower())
        self.assertIn("quoted-printable", raw_text.lower())
        self.assertIn("Date:", raw_text)
        self.assertIn("<p>text</p>", raw_text)
        self.assertNotIn("PHA+", raw_text)
        self.assertNotIn("multipart/mixed", raw_text.lower())
        html_section = raw.split(b"text/html", 1)[1]
        self.assertNotIn(b"Content-Transfer-Encoding: base64", html_section.split(b"--", 1)[0])
        msg = BytesParser(policy=policy.default).parsebytes(raw)
        parts = extract_calendar_parts(msg)
        self.assertTrue(parts)
        method, ics = parts[0]
        self.assertIn("BEGIN:VCALENDAR", ics)
        parsed = parse_calendar(ics, default_method=method)
        self.assertEqual(parsed.uid, "event-7@alexol.io")

    def test_html_cyrillic_is_not_8bit_base64(self):
        raw = build_meeting_rfc822(
            organizer=SimpleNamespace(full_name="No - Reply", email="no-reply@alexol.io"),
            event=_event(),
            to_addrs=["altaraskin@alexol.io"],
            subject="Встреча: 123",
            body="привет",
            html="<p>No - Reply приглашает на встречу.</p>",
            method="REQUEST",
        )
        self.assertNotIn(b"PHA+", raw)
        self.assertIn(b"Content-Transfer-Encoding: quoted-printable", raw)
        self.assertIn(b"Content-Class: urn:content-classes:calendarmessage", raw)

    def test_extract_ics_from_outlook_text_plain(self):
        ics = (
            "BEGIN:VCALENDAR\r\nMETHOD:REQUEST\r\nBEGIN:VEVENT\r\n"
            "UID:plain@alexol.io\r\nSUMMARY:FromOutlook\r\n"
            "DTSTART:20260907T143000Z\r\nDTEND:20260907T150000Z\r\n"
            "ORGANIZER:mailto:altaraskin@alexol.io\r\n"
            "ATTENDEE:mailto:no-reply@alexol.io\r\n"
            "END:VEVENT\r\nEND:VCALENDAR\r\n"
        )
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"] = "altaraskin@alexol.io"
        msg["To"] = "no-reply@alexol.io"
        msg.set_content(ics)
        parts = extract_calendar_parts(msg)
        self.assertTrue(parts)
        parsed = parse_calendar(parts[0][1])
        self.assertEqual(parsed.title, "FromOutlook")
        self.assertEqual(parsed.uid, "plain@alexol.io")


class SmtpIngestHookTests(unittest.TestCase):
    def test_smtp_calls_ingest(self):
        from pathlib import Path

        src = (Path(__file__).resolve().parents[1] / "app" / "smtp_server.py").read_text(
            encoding="utf-8"
        )
        self.assertIn("ingest_calendar_message", src)
        self.assertIn("from app.org import ingest_calendar_message", src)
        org_src = (Path(__file__).resolve().parents[1] / "app" / "org.py").read_text(
            encoding="utf-8"
        )
        self.assertIn("~CalendarEvent.attendees.any()", org_src)
        self.assertIn("existing.is_company = False", org_src)
        self.assertIn("_attach_jitsi_link", org_src)
        self.assertIn("awaitable_attrs.attendees", org_src)
        self.assertIn("added_jitsi", org_src)


if __name__ == "__main__":
    unittest.main()
