# Mail client

Vite + React SPA for **https://mail.alexol.io**

## Dev

```bash
npm install
npm run dev   # http://localhost:5176  (proxies /api → :17000)
```

Backend: `../mail-server`

## Production

- Domain: `mail.alexol.io`
- Static build → `/var/www/alexol.io/mail/html`
- Nginx proxies `/api` → `127.0.0.1:17000`
- Users are provisioned from **admin.alexol.io** → mailbox `login@alexol.io`
