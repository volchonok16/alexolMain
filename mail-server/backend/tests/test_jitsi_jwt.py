"""Jitsi identity JWT carries mailbox name and public avatar."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from jose import jwt


class JitsiJwtTests(unittest.TestCase):
    def test_issue_skips_without_secret(self):
        from app.jitsi_jwt import issue_jitsi_jwt

        user = SimpleNamespace(email="altaraskin@alexol.io", full_name="Alexander Taraskin")
        with patch("app.jitsi_jwt.settings") as settings:
            settings.JITSI_JWT_APP_SECRET = ""
            settings.JITSI_JWT_APP_ID = "alexol"
            settings.JITSI_PUBLIC_URL = "https://meet.alexol.io"
            self.assertIsNone(issue_jitsi_jwt(user, room="altaraskin"))

    def test_issue_includes_name_and_avatar(self):
        from app.jitsi_jwt import issue_jitsi_jwt

        user = SimpleNamespace(email="altaraskin@alexol.io", full_name="Alexander Taraskin")
        with patch("app.jitsi_jwt.settings") as settings, patch(
            "app.jitsi_jwt.public_avatar_url",
            return_value="https://mail.alexol.io/api/public/avatar/altaraskin@alexol.io",
        ):
            settings.JITSI_JWT_APP_SECRET = "unit-test-secret"
            settings.JITSI_JWT_APP_ID = "alexol"
            settings.JITSI_PUBLIC_URL = "https://meet.alexol.io"
            token = issue_jitsi_jwt(user, room="altaraskin")
        self.assertTrue(token)
        payload = jwt.decode(token, "unit-test-secret", algorithms=["HS256"], audience="alexol")
        self.assertEqual(payload["iss"], "alexol")
        self.assertEqual(payload["sub"], "meet.alexol.io")
        self.assertEqual(payload["room"], "altaraskin")
        self.assertEqual(payload["context"]["user"]["name"], "Alexander Taraskin")
        self.assertEqual(payload["context"]["user"]["email"], "altaraskin@alexol.io")
        self.assertEqual(payload["context"]["user"]["affiliation"], "owner")
        self.assertIn("/api/public/avatar/", payload["context"]["user"]["avatar"])

    def test_guest_token_skipped_for_closed_room(self):
        from app.jitsi_jwt import issue_guest_jwt

        with patch("app.jitsi_jwt.settings") as settings:
            settings.JITSI_JWT_APP_SECRET = "unit-test-secret"
            settings.JITSI_JWT_APP_ID = "alexol"
            settings.JITSI_PUBLIC_URL = "https://meet.alexol.io"
            self.assertIsNone(issue_guest_jwt("c-alexol-1-abc"))
            token = issue_guest_jwt("o-alexol-1-abc")
        payload = jwt.decode(token, "unit-test-secret", algorithms=["HS256"], audience="alexol")
        self.assertEqual(payload["context"]["user"]["name"], "Гость")
        self.assertEqual(payload["context"]["user"]["affiliation"], "member")


if __name__ == "__main__":
    unittest.main()
