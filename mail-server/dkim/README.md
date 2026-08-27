# DKIM keys (not committed)

Generate locally or on the server:

```bash
cd mail-server
python3 scripts/generate_dkim.py --out-dir ./dkim --domain alexol.io
```

Then:
1. Add the printed TXT to Cloudflare (`default._domainkey`)
2. Copy `private.pem` to the VPS at `mail-server/dkim/private.pem`
3. `docker compose up -d --build`

`private.pem` / `public.pem` are gitignored - never commit them.
