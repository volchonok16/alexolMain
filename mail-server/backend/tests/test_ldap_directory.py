"""Outlook LDAP Check Names matching."""
import unittest
from types import SimpleNamespace

from app.ldap_directory import (
    bind_name_matches_user,
    eval_ldap_filter,
    ldap_base_dn,
    ldap_bind_dns,
    ldap_user_dn,
    parse_bind_identity,
    search_people,
    user_ldap_attrs,
)


def _person(**kwargs):
    return SimpleNamespace(
        full_name=kwargs.get("full_name", "Ivan Kapustkin"),
        email=kwargs.get("email", "kapustkin@alexol.io"),
        username=kwargs.get("username", "kapustkin"),
        phone=kwargs.get("phone", "+79990001122"),
        job_title=kwargs.get("job_title", "Engineer"),
        org_roles=kwargs.get("org_roles"),
        direction=kwargs.get("direction"),
    )


class BindIdentityTests(unittest.TestCase):
    def test_email_and_dn(self):
        self.assertEqual(parse_bind_identity("altaraskin@alexol.io"), "altaraskin@alexol.io")
        self.assertEqual(parse_bind_identity("uid=altaraskin,ou=people,dc=alexol,dc=io"), "altaraskin")
        self.assertEqual(
            parse_bind_identity("cn=Alexander Taraskin,dc=alexol,dc=io"),
            "Alexander Taraskin",
        )
        self.assertEqual(
            parse_bind_identity("cn=Alexander Taraskin,uid=altaraskin,dc=alexol,dc=io"),
            "altaraskin",
        )
        self.assertEqual(parse_bind_identity("  "), None)
        self.assertEqual(parse_bind_identity(""), None)

    def test_rocket_bind_uses_search_dn(self):
        self.assertTrue(
            bind_name_matches_user(
                "cn=Alexander Taraskin,dc=alexol,dc=io",
                username="altaraskin",
                mail_domain="alexol.io",
                display_name="Alexander Taraskin",
                email="altaraskin@alexol.io",
            )
        )
        self.assertIn(
            "cn=Alexander Taraskin,dc=alexol,dc=io",
            ldap_bind_dns(
                "altaraskin",
                "alexol.io",
                "Alexander Taraskin",
                "altaraskin@alexol.io",
            ),
        )
        self.assertFalse(
            bind_name_matches_user(
                "cn=Someone Else,dc=alexol,dc=io",
                username="altaraskin",
                mail_domain="alexol.io",
                display_name="Alexander Taraskin",
                email="altaraskin@alexol.io",
            )
        )


class DnTests(unittest.TestCase):
    def test_domain_split(self):
        self.assertEqual(ldap_base_dn("alexol.io"), "dc=alexol,dc=io")
        self.assertEqual(
            ldap_user_dn("kapustkin", "alexol.io", "Ivan Kapustkin"),
            "cn=Ivan Kapustkin,dc=alexol,dc=io",
        )


class FilterMatchTests(unittest.TestCase):
    def setUp(self):
        self.attrs = user_ldap_attrs(_person(), "alexol.io")

    def test_sn_and_word_in_cn(self):
        self.assertTrue(eval_ldap_filter("(sn=Kapustkin*)", self.attrs))
        self.assertTrue(eval_ldap_filter("(cn=Kapustkin*)", self.attrs))
        self.assertTrue(eval_ldap_filter("(mail=ikapustkin*)", self.attrs))
        self.assertTrue(eval_ldap_filter("(cn=ikapustkin*)", self.attrs))
        self.assertFalse(eval_ldap_filter("(sn=Taraskin*)", self.attrs))
        self.assertTrue(eval_ldap_filter("(objectClass=user)", self.attrs))
        self.assertTrue(eval_ldap_filter("(objectCategory=person)", self.attrs))
        self.assertTrue(eval_ldap_filter("(&(objectClass=*)(cn=Kapustkin*))", self.attrs))
        self.assertEqual(self.attrs["name"], ["Ivan Kapustkin"])
        self.assertEqual(self.attrs["telephoneNumber"], ["+79990001122"])
        self.assertEqual(self.attrs["mobile"], ["+79990001122"])
        self.assertEqual(self.attrs["title"], ["Engineer"])
        self.assertEqual(self.attrs["company"], ["alexol.io"])
        self.assertEqual(self.attrs["department"], ["alexol.io"])

    def test_direction_and_roles(self):
        attrs = user_ldap_attrs(
            _person(direction="Backend", org_roles='["manager","employee"]'),
            "alexol.io",
        )
        self.assertEqual(attrs["department"], ["Backend"])
        self.assertEqual(attrs["employeeType"], ["Руководитель", "Сотрудник"])

    def test_list_all_filter(self):
        from app.ldap_directory import is_list_all_filter

        self.assertTrue(is_list_all_filter("(objectClass=*)"))
        self.assertTrue(is_list_all_filter("(&(mail=*)(|(mail=*)(cn=*)(sn=*)))"))
        self.assertFalse(is_list_all_filter("(&(mail=*)(|(mail=kapu*)(cn=kapu*)))"))

    def test_outlook_or_filter(self):
        filt = "(|(cn=Kapustkin*)(mail=Kapustkin*)(sn=Kapustkin*)(givenName=Kapustkin*))"
        self.assertTrue(eval_ldap_filter(filt, self.attrs))

    def test_anr(self):
        self.assertTrue(eval_ldap_filter("(anr=Kapustkin)", self.attrs))
        taraskin = user_ldap_attrs(_person(
            full_name="Alexander Taraskin",
            email="altaraskin@alexol.io",
            username="altaraskin",
        ), "alexol.io")
        self.assertTrue(eval_ldap_filter("(anr=Taraskin)", taraskin))
        self.assertTrue(eval_ldap_filter("(anr=altaraskin)", taraskin))

    def test_objectclass_present(self):
        self.assertTrue(eval_ldap_filter("(&(objectClass=*)(mail=*kapustkin*))", self.attrs))

    def test_rocketchat_login_filter(self):
        filt = "(&(objectclass=inetOrgPerson)(|(uid=kapustkin)(mail=kapustkin@alexol.io)))"
        self.assertTrue(eval_ldap_filter(filt, self.attrs))
        self.assertFalse(
            eval_ldap_filter(
                "(&(objectclass=inetOrgPerson)(uid=zzznotauser))",
                self.attrs,
            )
        )

    def test_search_limits(self):
        people = [
            user_ldap_attrs(_person(), "alexol.io"),
            user_ldap_attrs(_person(
                full_name="Alexander Taraskin",
                email="altaraskin@alexol.io",
                username="altaraskin",
            ), "alexol.io"),
        ]
        hits = search_people(people, ldap_filter="(sn=Kapustkin*)")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["mail"], ["kapustkin@alexol.io"])
        self.assertEqual(hits[0]["displayName"], ["Ivan Kapustkin"])

    def test_one_level_under_dc(self):
        from app.ldap_directory import dn_in_scope

        dn = "cn=Ivan Kapustkin,dc=alexol,dc=io"
        self.assertTrue(dn_in_scope(dn, "dc=alexol,dc=io", 1))
        self.assertTrue(dn_in_scope(dn, "dc=alexol,dc=io", 2))
        self.assertFalse(dn_in_scope(dn, "dc=alexol,dc=io", 0))
        self.assertFalse(dn_in_scope("uid=x,ou=people,dc=alexol,dc=io", "dc=alexol,dc=io", 1))


class LdapBerTests(unittest.TestCase):
    def test_bind_and_entry_encode(self):
        from pyasn1.codec.ber import decoder
        from ldap3.protocol.rfc4511 import LDAPMessage

        from app.ldap_server import _bind_done, _entry_bytes

        bind, _ = decoder.decode(_bind_done(1, 0), asn1Spec=LDAPMessage())
        self.assertEqual(bind["protocolOp"].getName(), "bindResponse")
        raw = _entry_bytes(
            2,
            "uid=kapustkin,ou=people,dc=alexol,dc=io",
            {"cn": ["Ivan Kapustkin"], "mail": ["kapustkin@alexol.io"]},
            ["*"],
            False,
        )
        entry, _ = decoder.decode(raw, asn1Spec=LDAPMessage())
        self.assertEqual(entry["protocolOp"].getName(), "searchResEntry")
        self.assertIn("kapustkin", str(entry["protocolOp"]["searchResEntry"]["object"]))

    def test_outlook_present_filter_is_primitive(self):
        from app.ldap_ber import decode_ldap_request
        from app.ldap_directory import eval_ldap_filter, user_ldap_attrs

        def tlv(tag: int, val: bytes) -> bytes:
            n = len(val)
            if n < 128:
                return bytes([tag, n]) + val
            lb = n.to_bytes((n.bit_length() + 7) // 8, "big")
            return bytes([tag, 0x80 | len(lb)]) + lb + val

        present = tlv(0x87, b"objectClass")
        cn_sub = tlv(0xA4, tlv(0x04, b"cn") + tlv(0x30, tlv(0x80, b"Kapustkin")))
        filt = tlv(0xA0, present + tlv(0xA1, cn_sub + tlv(0xA4, tlv(0x04, b"sn") + tlv(0x30, tlv(0x80, b"Kapustkin")))))
        body = (
            tlv(0x04, b"dc=alexol,dc=io")
            + bytes([0x0A, 0x01, 0x02])
            + bytes([0x0A, 0x01, 0x00])
            + bytes([0x02, 0x01, 0x00])
            + bytes([0x02, 0x01, 0x00])
            + bytes([0x01, 0x01, 0x00])
            + filt
            + tlv(0x30, tlv(0x04, b"cn") + tlv(0x04, b"mail") + tlv(0x04, b"name"))
        )
        pdu = tlv(0x30, tlv(0x02, b"\x02") + tlv(0x63, body))
        req = decode_ldap_request(pdu)
        self.assertEqual(req["op"], "searchRequest")
        self.assertEqual(req["base"], "dc=alexol,dc=io")
        self.assertIn("objectClass=*", req["filter"])
        self.assertIn("Kapustkin", req["filter"])
        attrs = user_ldap_attrs(_person(), "alexol.io")
        self.assertTrue(eval_ldap_filter(req["filter"], attrs))

    def test_bind_simple(self):
        from app.ldap_ber import decode_ldap_request

        def tlv(tag: int, val: bytes) -> bytes:
            return bytes([tag, len(val)]) + val

        body = tlv(0x02, b"\x03") + tlv(0x04, b"altaraskin@alexol.io") + tlv(0x80, b"secret")
        pdu = tlv(0x30, tlv(0x02, b"\x01") + tlv(0x60, body))
        req = decode_ldap_request(pdu)
        self.assertEqual(req["op"], "bindRequest")
        self.assertEqual(req["name"], "altaraskin@alexol.io")
        self.assertEqual(req["password"], "secret")

    def test_jpeg_photo_on_entry(self):
        from app.ldap_server import _entry_bytes
        from app.mail_photos import image_bytes_to_jpeg, user_ldap_photos

        self.assertEqual(user_ldap_photos(_person()), {})
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow not installed")
        buf = __import__("io").BytesIO()
        Image.new("RGBA", (32, 32), (10, 20, 30, 255)).save(buf, "PNG")
        jpeg = image_bytes_to_jpeg(buf.getvalue(), 96, 40_000)
        self.assertIsNotNone(jpeg)
        self.assertTrue(jpeg.startswith(b"\xff\xd8\xff"))
        raw = _entry_bytes(
            3,
            "cn=Ivan Kapustkin,dc=alexol,dc=io",
            {"cn": ["Ivan Kapustkin"], "jpegPhoto": [jpeg]},
            ["*"],
            False,
        )
        self.assertIn(jpeg[:16], raw)
