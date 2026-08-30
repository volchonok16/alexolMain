"""CID inlining of Alexol signature images."""
import unittest

from app.sig_inline import embed_signature_images


class SigInlineTests(unittest.TestCase):
    def test_hosted_png_becomes_cid(self):
        html = (
            '<img src="https://mail.alexol.io/email/icon-phone.png?v=12" width="16" />'
            '<img src="https://alexol.io/favicon.png" alt="Alexol" />'
        )
        out, parts = embed_signature_images(html)
        self.assertIn("cid:sig-", out)
        self.assertNotIn("https://mail.alexol.io/email/", out)
        self.assertGreaterEqual(len(parts), 2)
        for part in parts:
            self.assertEqual(part.get("Content-Disposition"), "inline")
            self.assertIsNone(part.get_filename())
