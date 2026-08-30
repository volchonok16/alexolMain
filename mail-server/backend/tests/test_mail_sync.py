"""IMAP STORE flags and UID allocation helpers."""
import unittest
from types import SimpleNamespace

from app.mail_sync import apply_store_flags, flags_for_email, is_outlook_probe, parse_store_args


class StoreParseTests(unittest.TestCase):
    def test_add_seen_silent(self):
        parsed = parse_store_args(r"1:3 +FLAGS.SILENT (\Seen)")
        self.assertIsNotNone(parsed)
        seq, mode, silent, flags = parsed
        self.assertEqual(seq, "1:3")
        self.assertEqual(mode, "add")
        self.assertTrue(silent)
        self.assertEqual(flags, ["\\Seen"])

    def test_remove_deleted(self):
        parsed = parse_store_args(r"5 -FLAGS (\Deleted)")
        seq, mode, silent, flags = parsed
        self.assertEqual(mode, "remove")
        self.assertFalse(silent)
        self.assertEqual(flags, ["\\Deleted"])

    def test_replace_flags(self):
        parsed = parse_store_args(r"2 FLAGS (\Seen \Deleted)")
        _seq, mode, _silent, flags = parsed
        self.assertEqual(mode, "replace")
        self.assertEqual(flags, ["\\Seen", "\\Deleted"])


class FlagApplyTests(unittest.TestCase):
    def test_outlook_seen_marks_web_read(self):
        row = SimpleNamespace(is_read=False, is_sent=False, is_deleted=False)
        apply_store_flags(row, ["\\Seen"], "add")
        self.assertTrue(row.is_read)
        self.assertEqual(flags_for_email(row), ["\\Seen"])

    def test_outlook_unseen_marks_web_unread(self):
        row = SimpleNamespace(is_read=True, is_sent=False, is_deleted=False)
        apply_store_flags(row, ["\\Seen"], "remove")
        self.assertFalse(row.is_read)
        self.assertEqual(flags_for_email(row), [])

    def test_deleted_flag(self):
        row = SimpleNamespace(is_read=True, is_sent=False, is_deleted=False)
        apply_store_flags(row, ["\\Deleted"], "add")
        self.assertTrue(row.is_deleted)
        self.assertIn("\\Deleted", flags_for_email(row))
        self.assertIn("\\Seen", flags_for_email(row))


class OutlookProbeTests(unittest.TestCase):
    def test_russian_and_english_subjects(self):
        self.assertTrue(is_outlook_probe("Тестовое сообщение Microsoft Outlook"))
        self.assertTrue(is_outlook_probe("Microsoft Outlook Test Message"))
        self.assertFalse(is_outlook_probe("Hello from Outlook"))
