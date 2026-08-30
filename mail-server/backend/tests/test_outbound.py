"""Outbound DKIM import and sender photo in MIME."""
import unittest
from pathlib import Path

_OUTBOUND_SRC = (Path(__file__).resolve().parents[1] / "app" / "outbound.py").read_text(
    encoding="utf-8"
)
_ORG_SRC = (Path(__file__).resolve().parents[1] / "app" / "org.py").read_text(
    encoding="utf-8"
)


class OutboundSourceTests(unittest.TestCase):
    def test_sign_message_is_imported(self):
        self.assertIn("from app.dkim_signer import sign_message", _OUTBOUND_SRC)
        self.assertIn("return sign_message(msg)", _OUTBOUND_SRC)

    def test_no_vcard_or_profile_photo_attachments(self):
        self.assertNotIn("attach_sender_vcard", _OUTBOUND_SRC)
        self.assertNotIn("cid:sender-avatar", _OUTBOUND_SRC)
        self.assertIn("embed_signature_images", _OUTBOUND_SRC)


class PublicAvatarSourceTests(unittest.TestCase):
    def test_public_avatar_restores_from_admin(self):
        self.assertIn("await ensure_user_avatar(user, db)", _ORG_SRC)
