# 🔧 Конфигурация API URL для админ панели

## Важно понимать

Админ панель - это **Single Page Application (SPA)**, которая работает в браузере клиента. Все API запросы выполняются из браузера пользователя, а не с сервера.

## ❌ Почему localhost не подходит

```javascript
// ЭТО НЕ СРАБОТАЕТ в production!
const baseURL = 'http://localhost:3000/api';
```

**Причина**: Когда пользователь открывает `https://admin.alexol.io` в своем браузере и админка пытается сделать запрос на `localhost`, браузер обращается к `localhost` **на компьютере пользователя**, а не на сервере!

## ✅ Правильные варианты

### Вариант 1: Отдельный поддомен (Рекомендуется) ⭐

```env
VITE_API_URL=https://api.alexol.io/api
```

**Плюсы:**
- Чистая архитектура
- Легко масштабировать
- API может быть на отдельном сервере
- Легко настроить CORS

**Требуется:**
- Настроить DNS запись для `api.alexol.io`
- Настроить nginx для проксирования на порт 8547

```nginx
# /etc/nginx/sites-available/api.alexol.io
server {
    listen 80;
    server_name api.alexol.io;

    location / {
        proxy_pass http://localhost:8547;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Вариант 2: Относительный путь

```javascript
// В client.ts можно использовать относительный путь
const baseURL = '/api';
```

Но тогда nginx на `admin.alexol.io` должен проксировать `/api/*` на бэкенд:

```nginx
# /etc/nginx/sites-available/admin.alexol.io
server {
    server_name admin.alexol.io;
    root /var/www/alexol.io/admin/html;
    
    # Статические файлы админки
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Проксирование API запросов
    location /api/ {
        proxy_pass http://localhost:8547/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Вариант 3: Основной домен с путем

```env
VITE_API_URL=https://alexol.io/api
```

Работает если nginx на основном домене настроен на проксирование.

## 🎯 Текущая конфигурация

В вашем проекте настроен **Вариант 1** с отдельным поддоменом:

```
https://api.alexol.io/api
```

Это правильное и рекомендуемое решение!

## 📝 Как применить изменения

### Для GitHub Actions деплоя

Обновите секрет `ADMIN_ENV`:

```env
VITE_API_URL=https://api.alexol.io/api
VITE_ENV=production
```

### Для ручного деплоя

```bash
cd /var/www/alexol.io/admin
export VITE_API_URL=https://api.alexol.io/api
npm run build
cp -r dist/* html/
```

## 🔍 Проверка конфигурации nginx

Убедитесь что у вас настроен поддомен:

```bash
# Проверьте DNS
nslookup api.alexol.io

# Проверьте nginx
cat /etc/nginx/sites-enabled/api.alexol.io
# или
cat /etc/nginx/conf.d/api.alexol.io.conf

# Проверьте что бэкенд работает
curl http://localhost:8547/api/health

# Проверьте через поддомен
curl https://api.alexol.io/api/health
```

## 🐛 Отладка

Если запросы не работают, проверьте:

1. **CORS настройки в бэкенде**
   ```
   CORS_ORIGIN=https://alexol.io,https://admin.alexol.io
   ```

2. **Браузер DevTools → Network**
   - Смотрите на какой URL уходят запросы
   - Проверьте CORS ошибки

3. **Бэкенд логи**
   ```bash
   docker-compose logs -f backend
   ```

---

*Последнее обновление: 30 января 2026*
