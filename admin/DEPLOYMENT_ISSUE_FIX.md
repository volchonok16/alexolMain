# 🔧 Исправление ошибки 405 Method Not Allowed

## Проблема

При попытке логина в админ панель на `https://admin.alexol.io` возникает ошибка:
```
POST https://admin.alexol.io/api/auth/login
Status: 405 Method Not Allowed
```

## Причина

Админ панель пыталась отправлять запросы на `https://admin.alexol.io/api`, но API находится на другом домене/порту.

## Решение

### 1. Определите URL вашего API

Проверьте, как настроен nginx на сервере. Возможные варианты:

- **Вариант A**: API доступен напрямую через порт
  ```
  https://alexol.io:8547/api
  ```

- **Вариант Б**: API проксируется через nginx
  ```
  https://alexol.io/api
  ```

- **Вариант В**: API на отдельном домене
  ```
  https://api.alexol.io/api
  ```

### 2. Обновите GitHub Secret для автодеплоя

1. Перейдите в GitHub → Settings → Secrets and variables → Actions
2. Найдите секрет `ADMIN_ENV`
3. Обновите его содержимое:

```env
VITE_API_URL=https://api.alexol.io/api
VITE_ENV=production
```

### 3. Запустите деплой

После коммита в ветку `master` GitHub Actions автоматически пересоберет и задеплоит админку с новыми настройками.

### 4. Или обновите вручную на сервере

Если не хотите ждать автодеплоя:

```bash
# Подключитесь к серверу
ssh user@server

# Перейдите в папку админки
cd /var/www/alexol.io/admin

# Пересоберите с правильными переменными
VITE_API_URL=https://api.alexol.io/api npm run build

# Скопируйте в html
cp -r dist/* html/
```

## Проверка nginx конфигурации (для админа сервера)

Проверьте конфигурацию nginx на сервере:

```bash
# Просмотр конфигурации nginx
cat /etc/nginx/sites-available/alexol.io

# Или
cat /etc/nginx/conf.d/alexol.io.conf
```

Убедитесь что есть проксирование для API. Пример правильной конфигурации:

```nginx
# Админка
server {
    server_name admin.alexol.io;
    root /var/www/alexol.io/admin/html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API (если нужно проксирование)
server {
    server_name api.alexol.io;
    
    location / {
        proxy_pass http://localhost:8547;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Тестирование

После деплоя проверьте:

1. Откройте DevTools → Network
2. Попробуйте войти в админку
3. Проверьте URL запроса - он должен идти на правильный API endpoint

---

*Последнее обновление: 30 января 2026*
