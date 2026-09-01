"""Profile name lives in mail; Rocket.Chat must not write it back."""
import unittest
from pathlib import Path

_LOOP_SRC = (Path(__file__).resolve().parents[1] / "app" / "chat_profile_loop.py").read_text(
    encoding="utf-8"
)
_RC_SRC = (Path(__file__).resolve().parents[1] / "app" / "rocketchat_profile.py").read_text(
    encoding="utf-8"
)
_MAIN_SRC = (Path(__file__).resolve().parents[1] / "app" / "main.py").read_text(
    encoding="utf-8"
)


class ChatProfileNameSyncTests(unittest.TestCase):
    def test_pull_does_not_copy_rocket_name_into_mail(self):
        self.assertNotIn("user.full_name = remote_name", _LOOP_SRC)
        self.assertIn("Mail is canonical for ФИО", _LOOP_SRC)

    def test_users_update_failure_is_not_ignored(self):
        self.assertIn("rocketchat users.update failed", _RC_SRC)
        self.assertIn("return False", _RC_SRC)

    def test_profile_save_pushes_admin_and_chat(self):
        self.assertIn("async def _push_mailbox_downstream", _MAIN_SRC)
        self.assertIn("await _push_mailbox_downstream(current_user", _MAIN_SRC)
        self.assertIn("await _push_mailbox_downstream(user, password=user_data.password)", _MAIN_SRC)
