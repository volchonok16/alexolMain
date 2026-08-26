# Mail server (SMTP/IMAP + API)

FastAPI mail backend for frontend `mail.alexol.io` (domain https://mail.alexol.io).

## Sync with alexolMain admin

Set the same secret in both places:

- `mail-server` env: `MAIL_SYNC_SECRET`
- alexolMain `backend/.env`: `MAIL_SYNC_SECRET` + `MAIL_API_URL=http://127.0.0.1:17000`
  (from Docker: `http://host.docker.internal:17000` — add `extra_hosts` on Linux)

When a user is created/updated/deleted in admin, the backend calls:

- `POST /api/internal/users`
- `PUT /api/internal/users/{username}`
- `DELETE /api/internal/users/{username}`

Header: `X-Mail-Sync-Key: <MAIL_SYNC_SECRET>`

Mailbox address: `{login}@alexol.io` with the same password.

## Run

```bash
docker compose up -d --build
```

API listens on `127.0.0.1:17000`. SMTP/IMAP on 25/465/587/143/993.
