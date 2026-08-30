"""Inbound MIME body extraction must not put NULs into Postgres text."""
import unittest
from email.message import EmailMessage

from app.mail_body import extract_text_and_html, sanitize_pg_text


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


if __name__ == "__main__":
    unittest.main()
