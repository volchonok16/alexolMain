# Alexol.io - Проект

Монорепозиторий для проекта Alexol.io, включающий фронтенд, админ-панель и бэкенд.

## Структура проекта

```
alexolMain/
├── frontend/          # Основной фронтенд сайта
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── admin/            # Админ-панель
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/          # Backend API
│   ├── src/
│   ├── prisma/
│   └── package.json
│
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD для деплоя
```

## Разработка

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Admin
```bash
cd admin
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Деплой

Автоматический деплой происходит при пуше в ветку `master` через GitHub Actions.

### Frontend

1. Сборка проекта в `frontend/dist/`
2. Загрузка на сервер в `/var/www/alexol.io/html`

### Backend

1. Копирование кода в `/var/www/alexol.io/back`
2. Запуск через Docker Compose
3. Применение миграций базы данных

**Порты:**
- Backend API: `8547`
- PostgreSQL: `7432`

### Первоначальная настройка сервера

1. Убедитесь, что на сервере установлены Docker и Docker Compose
2. Создайте директорию `/var/www/alexol.io/back` (создаётся автоматически при деплое)
3. Файл `.env` создаётся автоматически из секрета `ENV_BE` при деплое

### Настройка GitHub Secrets

Для работы автоматического деплоя необходимы следующие секреты:

**Серверные:**
- `SERVER_IP` - IP адрес сервера
- `SERVER_USER` - пользователь для SSH
- `SERVER_SSH_KEY` - приватный SSH ключ
- `SERVER_SSH_PORT` - порт SSH (по умолчанию 22)
- `PWD` - пароль sudo для пользователя

**Backend:**
- `ENV_BE` - содержимое .env файла для бэкенда

Пример содержимого `ENV_BE`:
```env
POSTGRES_USER=alexol_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=alexol_db
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://alexol_user:your_secure_password@postgres:5432/alexol_db
JWT_SECRET=your_very_secure_jwt_secret_min_32_chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://alexol.io
```

## Технологии

### Frontend & Admin
- React 18
- TypeScript
- Vite
- SCSS
- Framer Motion
- React Query

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Docker & Docker Compose
- JWT Authentication

