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

Официальные приложения подключаются только к поддерживаемой версии сервера. В ROCKET_ENV ставь `RELEASE=latest` — при деплое подтянется последний стабильный релиз. Чтобы не обновляться автоматически, укажи номер (`RELEASE=8.5.3`).

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

Письма чата (уведомления, сброс пароля) уходят с **chat@alexol.io** через SMTP `mail.alexol.io:587`. Пароль ящика — `SMTP_PASSWORD` в ROCKET_ENV.

Переход **почта → чат** не спрашивает код 2FA: почта уже подтвердила сессию. Email-2FA для OAuth выключен, новых пользователей чат в email-2FA сам не записывает.

## Jitsi из чата

Звонки идут через JWT на `meet.alexol.io`. В чате это приложение **Jitsi** из Marketplace.

Community **не включает private zip** (`Apps_Error_license-prevented`). Не заливай Jitsi файлом — только Marketplace.

Если в Marketplace счётчик **0/0** и Jitsi «Отключено» — workspace не связан с Cloud (часто после `Register_Server=false`). Деплой ставит `Register_Server=true`. Один раз в админке чата: **Marketplace → Enable unlimited apps** (или Administration → Workspace → Connectivity Services → Register). После этого Jitsi включается, звонки идут на `meet.alexol.io`.

Один раз в UI (админ чата):

1. Administration → Workspace → **Connectivity Services** → Register (если Marketplace пустой).
2. Uninstall старого Jitsi, если статус `license-prevented`.
3. Marketplace → **Jitsi** → Install.
4. Settings приложения:

| Поле | Значение |
|------|----------|
| Domain | `meet.alexol.io` |
| Use SSL | on |
| Use Authentication Token | on |
| Application ID (iss) | `alexol` |
| Application Secret | тот же `JWT_APP_SECRET` / `JITSI_JWT_APP_SECRET` |
| Token Auditor | `alexol` |
| Limit token to Jitsi Room | on |

Потом Video Conference → Default Provider = Jitsi.

При клике на видео в комнате чат предлагает ту же развилку, что почта: открытая / без организатора / закрытая. Скрипт ставит `configure.sh` в **Custom Script for Logged In Users**.

Экран входа: логотип Alexol вместо Rocket.Chat, заголовок **Alexol**, без «Powered by» и юридической строки. Если после LDAP+OAuth вылезло «Восстановить пароль» — деплой снимает `requirePasswordChange` в Mongo и помечает email verified. Hard refresh, затем «Войти через Alexol».

Из ROCKET_ENV убери `OVERWRITE_SETTING_Register_Server=false` — иначе Cloud/Marketplace снова отвалятся после рестарта.

Галочки прочтения: деплой включает **Show Read Receipts** (`Message_Read_Receipt_Enabled`). Серая галочка — доставлено, две синие — прочитали все. Подробный список «кто и когда» выключен. Пуш на телефон идёт через Cloud (`Push_enable` + gateway), письма чата — SMTP `chat@alexol.io`.

`install-jitsi-app.sh` при деплое ставит Jitsi с Marketplace и прописывает domain/JWT. Если Cloud ещё не зарегистрирован, деплой чата не падает — в логе будет инструкция Register → Marketplace → Jitsi.

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

## Бэкап

Ежедневно 23:59 (см. `scripts/crontab.example`): Mongo `rocketchat` + том `uploads`, 7 дней в `/var/www/rocket/backups`.

```bash
cd /var/www/rocket
docker compose --profile backup run --rm backup
# восстановление (чат остановить, mongo оставить):
docker compose stop rocketchat
RESTORE_DATE=YYYY-MM-DD docker compose --profile backup run --rm restore
docker compose up -d
```
