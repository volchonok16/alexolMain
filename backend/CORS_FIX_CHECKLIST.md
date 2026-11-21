# Чек-лист исправления CORS

## Ошибка
```
Access to XMLHttpRequest at 'https://api.alexol.io/api/auth/login' from origin 'https://admin.alexol.io' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

Это означает что `OPTIONS /api/auth/login` возвращает не-2xx статус (404/500/403 и т.п.).

---

## ШАГ 1: Убрать CORS из nginx (КРИТИЧНО!)

### На сервере откройте конфиг nginx:
```bash
sudo nano /etc/nginx/sites-available/default
# или
sudo nano /etc/nginx/conf.d/alexol.conf
```

### В блоке `server { server_name api.alexol.io; ... }` УДАЛИТЕ:

```nginx
# УДАЛИТЬ ВСЁ ЭТО:
add_header 'Access-Control-Allow-Origin' 'https://admin.alexol.io' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, Origin, X-Requested-With' always;

if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' 'https://admin.alexol.io' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, Origin, X-Requested-With' always;
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Type' 'text/plain; charset=utf-8';
    add_header 'Content-Length' 0;
    return 204;
}
```

### Должно остаться только:

```nginx
server {
    server_name api.alexol.io;

    location / {
        proxy_pass http://localhost:8547;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/alexol.io-0002/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alexol.io-0002/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

### Проверьте и перезагрузите nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ШАГ 2: Проверить переменные окружения backend

### На сервере проверьте `.env`:
```bash
cat /var/www/alexol.io/back/.env | grep CORS_ORIGIN
```

### Должно быть:
```env
CORS_ORIGIN=https://admin.alexol.io,https://alexol.io
```

**БЕЗ пробелов** вокруг запятой!

### Если нет или неправильно - исправьте:
```bash
nano /var/www/alexol.io/back/.env
```

---

## ШАГ 3: Пересобрать и перезапустить backend

```bash
cd /var/www/alexol.io/back
sudo docker-compose down
sudo docker-compose up -d --build
```

### Проверьте логи:
```bash
sudo docker-compose logs -f backend | grep CORS
```

Должно появиться при запросе:
```
[CORS] Incoming request from origin: https://admin.alexol.io
[CORS] Allowed origins: [ 'https://admin.alexol.io', 'https://alexol.io' ]
```

---

## ШАГ 4: Проверить через curl

```bash
curl -H "Origin: https://admin.alexol.io" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     -v \
     https://api.alexol.io/api/auth/login
```

### Ожидается:
```
< HTTP/2 204
< access-control-allow-origin: https://admin.alexol.io
< access-control-allow-credentials: true
< access-control-allow-methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

### Если видите:
- `HTTP/2 404` → backend не получает запрос / роутинг ломается
- `HTTP/2 500` → backend падает на preflight (смотрите логи)
- `access-control-allow-origin: *` → старый nginx CORS конфликтует

---

## ШАГ 5: Проверить GitHub Secret (если используете автодеплой)

1. GitHub → Settings → Secrets and variables → Actions
2. Найдите `ENV_BE`
3. Убедитесь что там есть:

```env
CORS_ORIGIN=https://admin.alexol.io,https://alexol.io
```

4. После правки сделайте push в `master` → автодеплой применит изменения.

---

## Быстрая диагностика

### Проверка 1: Доходит ли OPTIONS до backend?
```bash
sudo docker-compose logs -f backend
```

Затем в браузере попробуйте логин. Если в логах **ничего не появляется** - значит nginx блокирует или возвращает свой ответ.

### Проверка 2: Какой статус возвращает preflight?
В браузере → DevTools → Network → найдите `login` запрос с методом `OPTIONS` → посмотрите Status Code.

- **204 / 200** → CORS заголовки неправильные (смотрите Response Headers)
- **404 / 500** → backend/nginx неправильно обрабатывает OPTIONS
- **Нет OPTIONS вообще** → браузер не шлёт preflight (странно)

---

## Если ничего не помогло

Временный workaround на время отладки - измените запросы так, чтобы не требовался preflight:

1. В `admin/src/api/client.ts` уберите заголовок `Authorization` из дефолтных:
```typescript
export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  // Убираем Content-Type чтобы браузер не шлял preflight
  withCredentials: false,
});

// Добавляйте Authorization только в interceptor
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Но это НЕ решение - только для проверки что проблема именно в preflight.

---

## Контакты для дебага

Если нужна помощь:
- Пришлите вывод `curl` команды из Шага 4
- Пришлите Response Headers из браузера (DevTools → Network → OPTIONS login)
- Пришлите логи backend: `sudo docker-compose logs backend | tail -50`
