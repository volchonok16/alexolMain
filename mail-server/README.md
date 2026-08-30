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

## PTR / SPF / DMARC (чтобы письма не падали в спам Яндекса)

Яндекс пишет «некорректно настроена ptr-запись», если **обратный DNS IP сервера** не совпадает с именем почтового хоста.

PTR **нельзя** задать в Cloudflare. Его ставит **хостер VPS** (Hetzner / Timeweb / Selectel / …) на публичный IP машины, с которой уходит SMTP (тот же `SERVER_IP`).

| Запись | Где | Значение |
|--------|-----|----------|
| **PTR** (reverse DNS) | Панель VPS, IP сервера | `mail.alexol.io` |
| **A** `mail.alexol.io` | Cloudflare, **DNS only** (серое облако) | тот же публичный IP |
| **MX** `alexol.io` | Cloudflare, DNS only | `mail.alexol.io` (приоритет 10) |
| **SPF** TXT `@` | Cloudflare, DNS only | `v=spf1 mx a:mail.alexol.io -all` |
| **DMARC** TXT `_dmarc` | Cloudflare, DNS only | `v=DMARC1; p=none; rua=mailto:admin@alexol.io` |

Проверка после смены PTR (может занять до суток):

```bash
dig +short mail.alexol.io A
dig +short -x <ПУБЛИЧНЫЙ_IP>
# PTR должен вернуть mail.alexol.io.
```

Исходящий EHLO сервер теперь объявляет `mail.alexol.io` — это имя должно совпадать с PTR.

## Run

```bash
docker compose up -d --build
```

API listens on `127.0.0.1:17000`. SMTP/IMAP on 25/465/587/143/993.

## Rocket.Chat SSO

OAuth2 на этом API (`/api/oauth/*`). Секреты — в MAIL_ENV, те же что в `rocket/env.example`:

```
CHAT_PUBLIC_URL=https://chat.alexol.io
OAUTH_ROCKETCHAT_CLIENT_ID=alexol-chat
OAUTH_ROCKETCHAT_CLIENT_SECRET=
OAUTH_ROCKETCHAT_REDIRECT_URI=https://chat.alexol.io/_oauth/alexol
```

Профиль чата берёт email, username, full_name и публичный аватар ящика.
Подробности: `rocket/README.md`.
