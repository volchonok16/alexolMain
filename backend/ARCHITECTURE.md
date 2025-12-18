# 🏗️ Архитектура Backend

## 📋 Описание приложения

Backend API для системы управления пользователями с аутентификацией на базе JWT. Реализован на Node.js + TypeScript с использованием современных практик и паттернов проектирования.

## 🎯 Основные возможности

- Регистрация и авторизация пользователей
- JWT аутентификация
- Защищенные API endpoints
- Валидация данных
- Безопасное хранение паролей (bcrypt)
- CORS для работы с frontend
- Обработка ошибок

## 🏛️ Layered Architecture

Приложение построено по принципу многослойной архитектуры с четким разделением ответственности:

```
┌─────────────────────────────────────┐
│         HTTP Layer (Routes)         │  ← Маршрутизация запросов
├─────────────────────────────────────┤
│      Controllers (Handlers)         │  ← Обработка HTTP запросов/ответов
├─────────────────────────────────────┤
│      Services (Business Logic)      │  ← Бизнес-логика приложения
├─────────────────────────────────────┤
│    Repositories (Data Access)       │  ← Работа с базой данных
├─────────────────────────────────────┤
│         Database (Prisma)           │  ← PostgreSQL через Prisma ORM
└─────────────────────────────────────┘
```

## 📁 Структура проекта

### `/src/config/` - Конфигурация

**env.ts** - Переменные окружения
- Загрузка и валидация .env файла
- Экспорт конфигурации (порт, JWT секрет, DATABASE_URL)

**database.ts** - Prisma клиент
- Инициализация подключения к БД
- Singleton экземпляр PrismaClient

### `/src/routes/` - Маршруты API

**auth.routes.ts** - Роуты аутентификации
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход

**user.routes.ts** - Роуты пользователей
- `GET /api/users/me` - текущий пользователь (защищен)
- `GET /api/users` - список пользователей (защищен)

### `/src/controllers/` - HTTP обработчики

**auth.controller.ts** - Контроллер аутентификации
- Принимает HTTP запросы
- Валидирует данные через Zod
- Вызывает методы сервиса
- Возвращает HTTP ответы

**user.controller.ts** - Контроллер пользователей
- Обработка запросов пользователей
- Работа с AuthRequest (req.userId)
- Форматирование ответов

### `/src/services/` - Бизнес-логика

**auth.service.ts** - Сервис аутентификации
- Регистрация: проверка существования, хеширование пароля, создание токена
- Вход: проверка credentials, генерация JWT
- Генерация JWT токенов

**user.service.ts** - Сервис пользователей
- Получение пользователя по ID
- Получение всех пользователей
- Удаление пароля из ответа (безопасность)

### `/src/repositories/` - Слой данных

**user.repository.ts** - Репозиторий пользователей
- `create()` - создание пользователя
- `findById()` - поиск по ID
- `findByEmail()` - поиск по email
- `findAll()` - получение всех пользователей
- Изоляция Prisma запросов

### `/src/middleware/` - Middleware

**auth.ts** - Аутентификация
- Проверка JWT токена из заголовка Authorization
- Декодирование токена и извлечение userId
- Добавление userId в req объект
- Возврат 401 при невалидном токене

**errorHandler.ts** - Обработка ошибок
- Глобальный обработчик ошибок Express
- Логирование ошибок
- Возврат JSON с описанием ошибки

### `/src/validators/` - Валидация

**auth.validator.ts** - Zod схемы
- `registerSchema` - валидация регистрации (email, password min 6, name min 2)
- `loginSchema` - валидация входа (email, password)

### `/src/types/` - TypeScript типы

**index.ts** - Глобальные типы
- `AuthRequest` - расширение Express Request с userId
- `ApiResponse<T>` - типизация API ответов

### `/prisma/` - База данных

**schema.prisma** - Схема БД
- Модель User (id, email, password, name, timestamps)
- Настройка PostgreSQL
- Генерация Prisma Client

### Корневые файлы

**index.ts** - Точка входа
- Инициализация Express
- Подключение middleware (helmet, cors, json)
- Регистрация роутов
- Запуск сервера

**package.json** - Зависимости и скрипты
- `dev` - разработка с hot reload (tsx)
- `build` - компиляция TypeScript
- `start` - запуск продакшн версии
- `prisma:generate` - генерация Prisma Client
- `prisma:migrate` - миграции БД

**tsconfig.json** - TypeScript конфигурация
- Strict mode включен
- ES2022 target
- ESNext modules
- Path aliases (@/*)

**.env** - Переменные окружения
- DATABASE_URL - подключение к PostgreSQL
- JWT_SECRET - секрет для JWT
- PORT - порт сервера
- CORS_ORIGIN - разрешенный origin

## 🔄 Поток данных

### Регистрация пользователя:
```
1. POST /api/auth/register
2. authRouter → AuthController.register()
3. Zod валидация (registerSchema)
4. AuthService.register()
   - UserRepository.findByEmail() - проверка существования
   - bcrypt.hash() - хеширование пароля
   - UserRepository.create() - создание в БД
   - jwt.sign() - генерация токена
5. Ответ: { token, user }
```

### Защищенный запрос:
```
1. GET /api/users/me + Authorization: Bearer <token>
2. authenticate middleware
   - Извлечение токена
   - jwt.verify() - проверка токена
   - req.userId = decoded.userId
3. UserController.getMe()
4. UserService.findById(req.userId)
5. UserRepository.findById()
6. Ответ: { data: user }
```

## 🔐 Безопасность

- **Helmet** - защита HTTP заголовков
- **CORS** - ограничение доступа по origin
- **Bcrypt** - хеширование паролей (10 rounds)
- **JWT** - токены с истечением (7 дней)
- **Zod** - валидация входных данных
- **Пароли** - никогда не возвращаются в API ответах

## 🚀 Запуск

```bash
# Установка зависимостей
npm install

# Настройка .env
cp .env.example .env
# Отредактировать DATABASE_URL

# Генерация Prisma Client
npm run prisma:generate

# Создание таблиц в БД
npm run prisma:migrate

# Запуск в режиме разработки
npm run dev

# Сборка для продакшн
npm run build
npm start
```

## 📚 API Документация

Swagger UI доступен по адресу: `http://localhost:3000/api-docs`

- Интерактивная документация всех endpoints
- Возможность тестирования API прямо из браузера
- Схемы запросов и ответов
- JWT авторизация через интерфейс

## 📦 Технологии

| Технология | Назначение |
|------------|------------|
| Express.js | Веб-фреймворк |
| TypeScript | Типобезопасность |
| Prisma | ORM для PostgreSQL |
| JWT | Аутентификация |
| Zod | Валидация данных |
| Bcrypt | Хеширование паролей |
| Helmet | Безопасность HTTP |
| CORS | Cross-Origin запросы |
| tsx | TypeScript execution |
| Swagger | API документация |
| Multer | Загрузка файлов |

## 🎨 Принципы

- **Separation of Concerns** - каждый слой отвечает за свою задачу
- **Single Responsibility** - один класс = одна ответственность
- **Dependency Injection** - сервисы инжектят репозитории
- **Type Safety** - TypeScript strict mode
- **Error Handling** - централизованная обработка ошибок
- **Validation** - валидация на входе (Zod)
- **Security First** - безопасность на каждом уровне
