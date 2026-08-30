"""Outlook LDAP Check Names matching."""
import unittest
from types import SimpleNamespace

from app.ldap_directory import (
    eval_ldap_filter,
    ldap_base_dn,
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
    )


class BindIdentityTests(unittest.TestCase):
    def test_email_and_dn(self):
        self.assertEqual(parse_bind_identity("altaraskin@alexol.io"), "altaraskin@alexol.io")
        self.assertEqual(parse_bind_identity("uid=altaraskin,ou=people,dc=alexol,dc=io"), "altaraskin")
        self.assertEqual(parse_bind_identity("  "), None)
        self.assertEqual(parse_bind_identity(""), None)


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
