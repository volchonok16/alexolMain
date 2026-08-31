# Rocket.Chat — chat.alexol.io

Корпоративный чат с тем же SSO, что почта / admin / Jitsi: логин ящика, ФИО, фото и email
прокидываются в профиль, пользователь создаётся при первом входе.

## Что положить в секреты

GitHub → Settings → Secrets → Actions → **ROCKET_ENV** — содержимое `env.example`
(с заполненными паролями).

Те же значения добавить в **MAIL_ENV**:

```
CHAT_PUBLIC_URL=https://chat.alexol.io
OAUTH_ROCKETCHAT_CLIENT_ID=alexol-chat
OAUTH_ROCKETCHAT_CLIENT_SECRET=<тот же секрет>
OAUTH_ROCKETCHAT_REDIRECT_URI=https://chat.alexol.io/_oauth/alexol
```

`OAUTH_ROCKETCHAT_CLIENT_SECRET` — длинная случайная строка, одинаковая в MAIL_ENV и ROCKET_ENV.

`JITSI_JWT_APP_SECRET` — тот же, что `JWT_APP_SECRET` в **jitsi_env** и MAIL_ENV.

`ADMIN_PASS` — пароль первого админа самого Rocket.Chat (не обязан совпадать с почтой).
Если у почтового админа email `admin@alexol.io`, при SSO аккаунты смержатся (`merge_users`).

## Мобильное и десктопное приложение

1. Установите **Rocket.Chat** из App Store / Google Play / с [rocket.chat/download](https://www.rocket.chat/download).
2. При первом запуске укажите сервер: **`https://chat.alexol.io`**
3. Войдите:
   - **«Войти через Alexol»** (OAuth почты), или
   - логин + пароль ящика (`user@alexol.io` / пароль почты).

`Site_Url`, `DeepLink_Url` и OAuth настраиваются в `configure.sh` при деплое.

## DNS / nginx

1. Cloudflare: A `chat` → IP сервера (как `mail.alexol.io`).
2. Deploy Nginx (workflow вручную) — появится `chat.alexol.io.conf`.
3. Первый деплой `rocket/` поднимает контейнеры на `127.0.0.1:18300`.

## SSO

Источник пользователей — почтовые ящики на mail-server.

| Поле в чате | Откуда |
|-------------|--------|
| Email | `{login}@alexol.io` |
| Username | логин ящика |
| Name (ФИО) | `full_name` |
| Avatar | публичное фото `https://mail.alexol.io/api/public/avatar/{email}` |
| Телефон / Telegram / должность | профиль почты → bio и поля чата |

С почты кнопка **Чат** ставит SSO-cookie и открывает `https://chat.alexol.io/_oauth/alexol`.
Дальше Rocket.Chat сам ходит на почту; если cookie жива — пароль не спрашивают, сразу сессия в чате.

После входа почта дописывает в профиль чата фото, ФИО, телефон, должность и telegram
(через admin API `users.update` / `users.setAvatar`).

Регистрация паролем в чате выключена. Заводятся только люди с ящиком.

На экране входа работают оба способа:

| Как | Пароль |
|-----|--------|
| «Войти через Alexol» | ящик, через OAuth почты |
| логин + пароль на форме | **тот же** пароль ящика, через LDAP почты (`:389`) |

`configure.sh` включает LDAP на `MAIL_LDAP_HOST` (с сервера чата это `host.docker.internal`). Bind — `MAIL_LDAP_BIND_DN` / `MAIL_LDAP_BIND_PASSWORD` (почтовый админ). При деплое `scripts/stitch-deploy-env.sh` подставляет bind-пароль из `DEFAULT_ADMIN_PASSWORD` (MAIL_ENV), если в ROCKET_ENV пусто.

## Jitsi из чата

Звонки у нас уже идут через JWT на `meet.alexol.io` (почта выдаёт токен с именем и аватаркой).
Rocket.Chat умеет то же самое приложением **Jitsi** из Marketplace.

После первого входа админом чата:

1. Administration → Marketplace → **Jitsi** → Install.
2. Settings приложения:

| Поле | Значение |
|------|----------|
| Domain | `meet.alexol.io` |
| Use SSL | on |
| Use Authentication Token | on |
| Application ID (iss) | `alexol` |
| Application Secret | тот же `JWT_APP_SECRET` / `JITSI_JWT_APP_SECRET` |
| Token Auditor | `alexol` |
| Limit token to Jitsi Room | on |

Без этих трёх вещей звонок из чата **не** пустит на наш Jitsi (у конференций включён JWT):

1. Секрет в ROCKET_ENV (`JITSI_JWT_APP_SECRET`) — уже в `env.example`.
2. В **jitsi_env** должны быть `ENABLE_IFRAME_API=1` и аудитории `alexol,RocketChat`
   (чтобы iframe из `chat.alexol.io` и токен приложения не отвалились). Это уже прописано в `jitsi/env.public`.
3. nginx `meet.alexol.io` отдаёт `frame-ancestors` для `chat.alexol.io`.

После установки Jitsi в чате: Video Conference → Default Provider = Jitsi.

## Локально / на сервере

```bash
cp env.example .env
# заполнить секреты
docker compose up -d
docker compose logs -f configure
```

Контейнер `rocket_configure` один раз логинится в API, создаёт Custom OAuth **Alexol**
и прописывает URL почты / поля профиля. Если Rocket.Chat ещё стартует — контейнер
перезапустится (`restart: on-failure`).
