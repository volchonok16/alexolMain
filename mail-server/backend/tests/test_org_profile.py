import unittest

from app.org_profile import dump_org_roles, is_technical_user, normalize_org_roles, org_role_labels, apply_org_profile_fields


class OrgProfileTests(unittest.TestCase):
    def test_normalize_keeps_known_order(self):
        self.assertEqual(
            normalize_org_roles(["student", "manager", "nope", "manager"]),
            ["manager", "student"],
        )
        self.assertEqual(normalize_org_roles('["mentor","employee"]'), ["mentor", "employee"])
        self.assertEqual(normalize_org_roles(None), [])
        self.assertEqual(normalize_org_roles(""), [])

    def test_dump_and_labels(self):
        self.assertEqual(dump_org_roles(["mentor"]), '["mentor"]')
        self.assertIsNone(dump_org_roles([]))
        self.assertEqual(org_role_labels(["manager", "employee"]), ["Руководитель", "Сотрудник"])

    def test_technical_flag(self):
        self.assertFalse(is_technical_user(type("U", (), {})()))
        self.assertTrue(is_technical_user(type("U", (), {"is_technical": True})()))

    def test_apply_skips_missing_fields(self):
        user = type("U", (), {"is_technical": True, "org_roles": '["manager"]', "direction": "QA"})()
        apply_org_profile_fields(user, type("D", (), {})())
        self.assertTrue(user.is_technical)
        self.assertEqual(user.org_roles, '["manager"]')
        self.assertEqual(user.direction, "QA")

    def test_apply_updates_when_sent(self):
        user = type("U", (), {"is_technical": False, "org_roles": None, "direction": None})()
        data = type(
            "D",
            (),
            {"is_technical": True, "org_roles": ["mentor", "student"], "direction": " обучение "},
        )()
        apply_org_profile_fields(user, data)
        self.assertTrue(user.is_technical)
        self.assertEqual(user.org_roles, '["mentor", "student"]')
        self.assertEqual(user.direction, "обучение")
