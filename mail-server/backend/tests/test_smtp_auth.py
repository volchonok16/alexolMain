"""Outlook AUTH LOGIN challenges (not aiosmtpd's 'User Name\\0')."""
import base64
import unittest
from pathlib import Path

try:
    from app.smtp_server import MailSMTP
except ModuleNotFoundError:
    MailSMTP = None

_SMTP_SRC = (Path(__file__).resolve().parents[1] / "app" / "smtp_server.py").read_text(
    encoding="utf-8"
)


class MailSmtpAuthLoginSourceTests(unittest.TestCase):
    def test_authenticated_smtp_stores_sent_copy(self):
        self.assertIn("SMTP saved sent copy", _SMTP_SRC)
        self.assertIn("is_sent=True", _SMTP_SRC)
        self.assertIn("if authenticated and sender:", _SMTP_SRC)

    def test_source_uses_rfc_login_challenges(self):
        self.assertIn("class MailSMTP(SMTP):", _SMTP_SRC)
        self.assertIn('AuthLoginUsernameChallenge = "Username:"', _SMTP_SRC)
        self.assertIn('AuthLoginPasswordChallenge = "Password:"', _SMTP_SRC)
        self.assertNotIn('"User Name\\x00"', _SMTP_SRC)
        self.assertEqual(base64.b64encode(b"Username:").decode("ascii"), "VXNlcm5hbWU6")
        self.assertEqual(base64.b64encode(b"Password:").decode("ascii"), "UGFzc3dvcmQ6")


@unittest.skipIf(MailSMTP is None, "aiosmtpd (and SMTP stack) not installed")
class MailSmtpAuthLoginTests(unittest.TestCase):
    def test_login_challenges_match_outlook(self):
        self.assertEqual(MailSMTP.AuthLoginUsernameChallenge, "Username:")
        self.assertEqual(MailSMTP.AuthLoginPasswordChallenge, "Password:")
        self.assertNotIn("\x00", MailSMTP.AuthLoginUsernameChallenge)
        self.assertNotIn("\x00", MailSMTP.AuthLoginPasswordChallenge)
        self.assertEqual(
            base64.b64encode(
                MailSMTP.AuthLoginUsernameChallenge.encode("ascii")
            ).decode("ascii"),
            "VXNlcm5hbWU6",
        )
        self.assertEqual(
            base64.b64encode(
                MailSMTP.AuthLoginPasswordChallenge.encode("ascii")
            ).decode("ascii"),
            "UGFzc3dvcmQ6",
        )
