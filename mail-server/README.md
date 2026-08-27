# Mail server (SMTP/IMAP + API)

FastAPI mail backend for frontend `mail.alexol.io` (domain https://mail.alexol.io).

## Sync with alexolMain admin (двусторонний HTTP)

Одинаковый секрет и Docker-сеть `alexol_mail_sync`:

| Сторона | Env |
|--------|-----|
| `mail-server/.env` | `MAIL_SYNC_SECRET`, `ALEXOL_API_URL=http://alexol_backend:3000` |
| `backend/.env` | `MAIL_SYNC_SECRET`, `MAIL_API_URL=http://mail_backend:8000` |

Header: `X-Mail-Sync-Key: <MAIL_SYNC_SECRET>`

**admin → mail:** create/update/delete пользователя в админке →
`POST /api/internal/users`, `PUT …`, `DELETE …`, `POST /api/internal/users/ensure`

**mail → admin:** create/update/delete в mail UI →
`POST /api/internal/mail-sync/users/ensure`, `DELETE /api/internal/mail-sync/users/{username}`

Внутренние sync-эндпоинты **не** вызывают обратный sync (нет петли).

Mailbox: `{login}@alexol.io`, пароль синхронизируется при создании/смене.

## Run

```bash
docker compose up -d --build
```

API listens on `127.0.0.1:17000`. SMTP/IMAP on 25/465/587/143/993.
