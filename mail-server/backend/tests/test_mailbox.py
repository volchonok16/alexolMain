"""Local mailbox identity: display-name RCPT and username fallback."""
import unittest

from app.mailbox import normalize_mailbox_address, split_local_identity


class NormalizeMailboxAddressTests(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(normalize_mailbox_address("admin@alexol.io"), "admin@alexol.io")

    def test_brackets_and_case(self):
        self.assertEqual(
            normalize_mailbox_address("<ADMIN@Alexol.io>"),
            "admin@alexol.io",
        )

    def test_display_name(self):
        self.assertEqual(
            normalize_mailbox_address("Alexol Admin <admin@alexol.io>"),
            "admin@alexol.io",
        )

    def test_trailing_dot_fqdn(self):
        self.assertEqual(
            normalize_mailbox_address("admin@alexol.io."),
            "admin@alexol.io",
        )


class SplitLocalIdentityTests(unittest.TestCase):
    def test_email(self):
        self.assertEqual(
            split_local_identity("admin@alexol.io", "alexol.io"),
            ("admin@alexol.io", "admin"),
        )

    def test_local_part_only(self):
        self.assertEqual(
            split_local_identity("admin", "alexol.io"),
            ("admin@alexol.io", "admin"),
        )

    def test_foreign_domain(self):
        self.assertIsNone(split_local_identity("admin@gmail.com", "alexol.io"))

    def test_display_name_is_local(self):
        self.assertEqual(
            split_local_identity("Admin <admin@alexol.io>", "alexol.io"),
            ("admin@alexol.io", "admin"),
        )


if __name__ == "__main__":
    unittest.main()
