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

## DKIM

Своя подпись исходящих (direct SMTP / SMTP relay). SendGrid HTTP API подписывает сам.

```bash
# на машине с cryptography (или в venv mail-server)
cd mail-server
pip install cryptography   # если ещё нет
python3 scripts/generate_dkim.py --out-dir ./dkim --selector default --domain alexol.io
```

Скрипт создаст `dkim/private.pem` и напечатает TXT для Cloudflare:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| TXT | `default._domainkey` | `v=DKIM1; k=rsa; p=...` | DNS only |

На сервере: каталог `./dkim` смонтирован в контейнер как `/etc/dkim` (см. `docker-compose.yml`).  
Приватный ключ в git не коммитить.

### Деплой через GitHub Actions

1. На Mac:
   ```bash
   base64 -i mail-server/dkim/private.pem | pbcopy
   ```
2. Repo → Settings → Secrets → Actions → New secret:
   - Name: `MAIL_DKIM_PRIVATE_KEY_B64`
   - Value: вставить из буфера
3. При деплое workflow пишет `mail-server/dkim/private.pem` и копирует на `/var/www/mail/dkim/`.

Проверка DNS: `dig +short TXT default._domainkey.alexol.io`

## Run

```bash
docker compose up -d --build
```

API listens on `127.0.0.1:17000`. SMTP/IMAP on 25/465/587/143/993.
