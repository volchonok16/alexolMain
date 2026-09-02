"""OAuth2 identity for Rocket.Chat carries mailbox name, email and avatar."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from jose import jwt


class OauthHelpersTests(unittest.TestCase):
    def test_userinfo_maps_profile_fields(self):
        from app.oauth import oauth_userinfo

        user = SimpleNamespace(
            id=7,
            email="altaraskin@alexol.io",
            username="altaraskin",
            full_name="Alexander Taraskin",
            is_admin=True,
            phone="+79990001122",
            telegram="altaraskin",
            job_title="Engineer",
        )
        with patch(
            "app.oauth.public_avatar_url",
            return_value="https://mail.alexol.io/api/public/avatar/altaraskin@alexol.io",
        ):
            info = oauth_userinfo(user)
        self.assertEqual(info["id"], "7")
        self.assertEqual(info["username"], "altaraskin")
        self.assertEqual(info["email"], "altaraskin@alexol.io")
        self.assertTrue(info["email_verified"])
        self.assertEqual(info["name"], "Alexander Taraskin")
        self.assertEqual(info["given_name"], "Alexander")
        self.assertEqual(info["family_name"], "Taraskin")
        self.assertEqual(
            info["picture"],
            "https://mail.alexol.io/api/public/avatar/altaraskin@alexol.io",
        )
        self.assertEqual(info["avatarUrl"], info["picture"])
        self.assertEqual(info["phone"], "+79990001122")
        self.assertEqual(info["telegram"], "altaraskin")
        self.assertEqual(info["job_title"], "Engineer")
        self.assertIn("Engineer", info["bio"])
        self.assertEqual(info["roles"], ["admin"])
        self.assertEqual(info["groups"], ["jira-users", "confluence-users", "stash-users"])
        self.assertNotIn("bitbucket-users", info["groups"])

    def test_chat_handoff_starts_oauth(self):
        from urllib.parse import parse_qs, urlparse

        from app.rocketchat_profile import chat_oauth_start_url

        with patch("app.rocketchat_profile.settings") as settings:
            settings.CHAT_PUBLIC_URL = "https://chat.alexol.io"
            settings.MAIL_PUBLIC_URL = "https://mail.alexol.io"
            settings.OAUTH_ROCKETCHAT_CLIENT_ID = "alexol-chat"
            parsed = urlparse(chat_oauth_start_url())
            self.assertEqual(parsed.scheme, "https")
            self.assertEqual(parsed.netloc, "mail.alexol.io")
            self.assertEqual(parsed.path, "/api/oauth/authorize")
            query = parse_qs(parsed.query)
            self.assertEqual(query.get("response_type"), ["code"])
            self.assertEqual(
                query.get("redirect_uri"),
                ["https://chat.alexol.io/_oauth/alexol"],
            )
            self.assertTrue(query.get("state"))

    def test_redirect_uri_allows_configured_callback(self):
        from app.oauth import redirect_uri_allowed

        with patch("app.oauth.settings") as settings:
            settings.OAUTH_ROCKETCHAT_REDIRECT_URI = "https://chat.alexol.io/_oauth/alexol"
            settings.CHAT_PUBLIC_URL = "https://chat.alexol.io"
            self.assertTrue(redirect_uri_allowed("https://chat.alexol.io/_oauth/alexol"))
            self.assertTrue(
                redirect_uri_allowed("https://chat.alexol.io/_oauth/alexol?close=true")
            )
            self.assertFalse(redirect_uri_allowed("https://evil.example/_oauth/alexol"))

    def test_client_ids_allow_chat_and_atlassian(self):
        from app.oauth import client_id_allowed, _login_html

        with patch("app.oauth.settings") as settings:
            settings.OAUTH_ROCKETCHAT_CLIENT_ID = "alexol-chat"
            settings.OAUTH_CLIENT_IDS = (
                "alexol-chat,alexol-atlassian,alexol-jira,alexol-confluence,alexol-bitbucket"
            )
            settings.MAIL_PUBLIC_URL = "https://mail.alexol.io"
            settings.CHAT_PUBLIC_URL = "https://chat.alexol.io"
            settings.JIRA_PUBLIC_URL = "https://jira.alexol.io"
            settings.CONFLUENCE_PUBLIC_URL = "https://confluence.alexol.io"
            settings.BITBUCKET_PUBLIC_URL = "https://bitbucket.alexol.io"
            self.assertTrue(client_id_allowed("alexol-chat"))
            self.assertTrue(client_id_allowed("alexol-jira"))
            self.assertTrue(client_id_allowed("alexol-atlassian"))
            self.assertFalse(client_id_allowed("unknown-app"))
            chat_html = _login_html("", {"client_id": "alexol-chat"}, "alexol-chat")
            self.assertIn("Войти в чат", chat_html)
            self.assertIn("Alexol Chat", chat_html)
            atl_html = _login_html("", {"client_id": "alexol-jira"}, "alexol-jira")
            self.assertIn("Войти в Атласиан", atl_html)
            self.assertIn("Alexol Atlassian", atl_html)
            self.assertIn("jira.alexol.io", atl_html)

    def test_code_jwt_roundtrip(self):
        from app.oauth import OAUTH_CODE_TYP, decode_oauth_jwt, encode_oauth_jwt

        with patch("app.oauth.settings") as settings, patch(
            "app.oauth._oauth_secret", return_value="unit-oauth-secret"
        ):
            settings.ALGORITHM = "HS256"
            token = encode_oauth_jwt(
                {
                    "typ": OAUTH_CODE_TYP,
                    "sub": "altaraskin@alexol.io",
                    "redirect_uri": "https://chat.alexol.io/_oauth/alexol",
                    "client_id": "alexol-chat",
                },
                120,
            )
            payload = decode_oauth_jwt(token, OAUTH_CODE_TYP)
        self.assertEqual(payload["sub"], "altaraskin@alexol.io")
        self.assertEqual(payload["client_id"], "alexol-chat")
        raw = jwt.get_unverified_claims(token)
        self.assertEqual(raw["typ"], OAUTH_CODE_TYP)

    def test_mail_origin_push_blocks_immediate_pull(self):
        from app.rocketchat_profile import (
            known_avatar_etag,
            mark_mail_origin_push,
            recently_pushed_from_mail,
            remember_avatar_etag,
        )

        mark_mail_origin_push("altaraskin@alexol.io")
        self.assertTrue(recently_pushed_from_mail("altaraskin@alexol.io"))
        self.assertFalse(recently_pushed_from_mail("other@alexol.io"))
        remember_avatar_etag("altaraskin@alexol.io", "etag-1")
        self.assertEqual(known_avatar_etag("altaraskin@alexol.io"), "etag-1")
