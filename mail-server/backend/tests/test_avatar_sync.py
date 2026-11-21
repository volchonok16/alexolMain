"""Atlassian cron avatar list payload."""
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace

from app.mail_photos import avatar_sync_entry, avatar_updated_at_unix


class AvatarSyncPayloadTests(unittest.TestCase):
    def test_entry_uses_internal_url_and_stamp(self):
        user = SimpleNamespace(
            email="altaraskin@alexol.io",
            avatar_url="http://minio:9000/avatars/altaraskin.jpg",
            is_active=True,
            updated_at=datetime(2026, 1, 2, 12, 0, tzinfo=timezone.utc),
        )
        entry = avatar_sync_entry(user)
        self.assertEqual(entry["email"], "altaraskin@alexol.io")
        self.assertEqual(
            entry["avatar_url"],
            "https://mail.alexol.io/api/internal/users/altaraskin@alexol.io/avatar",
        )
        self.assertIsInstance(entry["avatar_updated_at"], int)
        self.assertGreater(entry["avatar_updated_at"], 0)
        later = SimpleNamespace(
            email=user.email,
            avatar_url="http://minio:9000/avatars/altaraskin-v2.jpg",
            is_active=True,
            updated_at=user.updated_at,
        )
        self.assertNotEqual(avatar_updated_at_unix(user), avatar_updated_at_unix(later))

    def test_skips_inactive_and_missing_photo(self):
        self.assertIsNone(
            avatar_sync_entry(
                SimpleNamespace(
                    email="x@alexol.io",
                    avatar_url="",
                    is_active=True,
                    updated_at=None,
                )
            )
        )
        self.assertIsNone(
            avatar_sync_entry(
                SimpleNamespace(
                    email="x@alexol.io",
                    avatar_url="http://minio:9000/avatars/x.jpg",
                    is_active=False,
                    updated_at=None,
                )
            )
        )


class AtlassianDirectoryTests(unittest.TestCase):
    def test_slug_and_sso_username(self):
        from app.mail_photos import atlassian_directory_entry

        entry = atlassian_directory_entry(
            SimpleNamespace(
                email="altaraskin@alexol.io",
                full_name="Altar Askin",
                is_active=True,
                is_admin=False,
                username="altaraskin",
            )
        )
        self.assertEqual(
            entry,
            {
                "email": "altaraskin@alexol.io",
                "full_name": "Altar Askin",
                "is_active": True,
                "is_admin": False,
                "username": "altaraskin@alexol.io",
                "bitbucket_slug": "altaraskin_alexol.io",
            },
        )
