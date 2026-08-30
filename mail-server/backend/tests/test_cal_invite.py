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
        self.assertIn("<p>text</p>", raw_text)
        self.assertNotIn("PHA+", raw_text)
        msg = BytesParser(policy=policy.default).parsebytes(raw)
        parts = extract_calendar_parts(msg)
        self.assertTrue(parts)
        method, ics = parts[0]
        self.assertIn("BEGIN:VCALENDAR", ics)
        parsed = parse_calendar(ics, default_method=method)
        self.assertEqual(parsed.uid, "event-7@alexol.io")


class SmtpIngestHookTests(unittest.TestCase):
    def test_smtp_calls_ingest(self):
        from pathlib import Path

        src = (Path(__file__).resolve().parents[1] / "app" / "smtp_server.py").read_text(
            encoding="utf-8"
        )
        self.assertIn("ingest_calendar_message", src)
        self.assertIn("from app.org import ingest_calendar_message", src)


if __name__ == "__main__":
    unittest.main()
