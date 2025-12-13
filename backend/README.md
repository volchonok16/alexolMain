# Backend API

Современный backend на Node.js + TypeScript с layered architecture.

## Архитектура

```
src/
├── config/          # Конфигурация (env, database)
├── controllers/     # HTTP обработчики
├── services/        # Бизнес-логика
├── repositories/    # Работа с БД
├── routes/          # Маршруты API
├── middleware/      # Middleware (auth, errors)
├── validators/      # Валидация данных (Zod)
├── types/           # TypeScript типы
└── index.ts         # Точка входа
```

## Установка

```bash
npm install
cp .env.example .env
# Настройте DATABASE_URL в .env
npm run prisma:generate
npm run prisma:migrate
```

## Запуск

```bash
npm run dev          # Разработка
npm run build        # Сборка
npm start            # Продакшн
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Users
- `GET /api/users/me` - Текущий пользователь (требует auth)
- `GET /api/users` - Все пользователи (требует auth)

## Технологии

- Express.js - веб-фреймворк
- TypeScript - типобезопасность
- Prisma - ORM
- JWT - аутентификация
- Zod - валидация
- Bcrypt - хеширование паролей
