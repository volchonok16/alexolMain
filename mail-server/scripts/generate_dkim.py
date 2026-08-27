#!/usr/bin/env python3
"""Generate DKIM RSA keypair and print Cloudflare TXT instructions.

Usage (from mail-server/):
  python3 scripts/generate_dkim.py
  python3 scripts/generate_dkim.py --out-dir ./dkim --selector default --domain alexol.io
"""
from __future__ import annotations

import argparse
import base64
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate DKIM keys for mail-server")
    parser.add_argument("--out-dir", default="dkim", help="Directory for private.pem / public.pem")
    parser.add_argument("--selector", default="default", help="DKIM selector (DNS name prefix)")
    parser.add_argument("--domain", default="alexol.io", help="Mail domain")
    parser.add_argument("--bits", type=int, default=2048, help="RSA key size")
    args = parser.parse_args()

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    priv_path = out / "private.pem"
    pub_path = out / "public.pem"

    if priv_path.exists():
        print(f"Refusing to overwrite existing {priv_path}", file=sys.stderr)
        print("Delete it or pass a different --out-dir", file=sys.stderr)
        return 1

    key = rsa.generate_private_key(public_exponent=65537, key_size=args.bits)
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    # DKIM TXT uses raw base64 of SubjectPublicKeyInfo DER (SPKI), without PEM headers.
    public_der = key.public_key().public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    public_b64 = base64.b64encode(public_der).decode("ascii")

    priv_path.write_bytes(private_pem)
    pub_path.write_bytes(public_pem)
    priv_path.chmod(0o600)

    txt_name = f"{args.selector}._domainkey"
    txt_value = f"v=DKIM1; k=rsa; p={public_b64}"

    print("Generated:")
    print(f"  Private: {priv_path.resolve()}")
    print(f"  Public:  {pub_path.resolve()}")
    print()
    print("Cloudflare DNS → Add record:")
    print(f"  Type:    TXT")
    print(f"  Name:    {txt_name}")
    print(f"  Content: {txt_value}")
    print(f"  Proxy:   DNS only")
    print()
    print("Full host:", f"{txt_name}.{args.domain}")
    print()
    print("mail-server/.env (or compose env):")
    print("  DKIM_ENABLED=true")
    print(f"  DKIM_SELECTOR={args.selector}")
    print("  DKIM_PRIVATE_KEY_PATH=/etc/dkim/private.pem")
    print()
    print("Mount on server: ./dkim → /etc/dkim:ro  (see docker-compose.yml)")
    print("Verify later: dig +short TXT {}.{}".format(txt_name, args.domain))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
