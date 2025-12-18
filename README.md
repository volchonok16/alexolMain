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

Деплой фронтенда происходит автоматически при пуше в ветку `newDesign` через GitHub Actions.

Workflow:
1. Установка зависимостей в папке `frontend/`
2. Сборка проекта (`npm run build`)
3. Загрузка `frontend/dist/` на сервер через SSH

### Настройка GitHub Secrets

Для работы автоматического деплоя необходимы следующие секреты:
- `SERVER_IP` - IP адрес сервера
- `SERVER_USER` - пользователь для SSH
- `SERVER_SSH_KEY` - приватный SSH ключ
- `SERVER_SSH_PORT` - порт SSH (по умолчанию 22)

## Технологии

### Frontend & Admin
- React 18
- TypeScript
- Vite
- SCSS
- Framer Motion
- React Query

### Backend
- Node.js
- Express
- Prisma
- PostgreSQL

