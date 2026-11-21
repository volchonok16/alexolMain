"""Fill From display name from mailbox full_name."""
import unittest

from app.from_display import from_name_is_placeholder, inject_from_display_name


class PlaceholderTests(unittest.TestCase):
    def test_empty_and_email(self):
        self.assertTrue(from_name_is_placeholder("", "altaraskin@alexol.io"))
        self.assertTrue(from_name_is_placeholder("altaraskin@alexol.io", "altaraskin@alexol.io"))
        self.assertTrue(from_name_is_placeholder("altaraskin", "altaraskin@alexol.io"))
        self.assertFalse(from_name_is_placeholder("Alexander Taraskin", "altaraskin@alexol.io"))
        self.assertFalse(from_name_is_placeholder("Alex", "altaraskin@alexol.io"))


class InjectTests(unittest.TestCase):
    def test_fills_bare_from(self):
        raw = (
            b"From: altaraskin@alexol.io\r\n"
            b"To: info@alexol.io\r\n"
            b"Subject: Test\r\n"
            b"\r\n"
            b"hi\r\n"
        )
        out, name = inject_from_display_name(raw, "Alexander Taraskin", "altaraskin@alexol.io")
        self.assertEqual(name, "Alexander Taraskin")
        self.assertIn(b"Alexander Taraskin", out)
        self.assertIn(b"altaraskin@alexol.io", out)

    def test_keeps_custom_name(self):
        raw = (
            b'From: "Alex" <altaraskin@alexol.io>\r\n'
            b"To: info@alexol.io\r\n"
            b"Subject: Test\r\n"
            b"\r\n"
            b"hi\r\n"
        )
        out, name = inject_from_display_name(raw, "Alexander Taraskin", "altaraskin@alexol.io")
        self.assertEqual(name, "Alex")
        self.assertIn(b"Alex", out)
        self.assertNotIn(b"Alexander Taraskin", out)
