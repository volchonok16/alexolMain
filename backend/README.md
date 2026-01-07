# Backend API

REST API для проекта Alexol.io

## Технологии

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Swagger Documentation
- Docker & Docker Compose

## Локальная разработка

### Установка

```bash
npm install
```

### Настройка

Создайте файл `.env` на основе `env.example`:

```bash
cp env.example .env
```

### Миграции базы данных

```bash
npm run prisma:migrate
```

### Запуск

```bash
npm run dev
```

## Деплой с Docker Compose

### Автоматический деплой через GitHub Actions

Файл `.env` создаётся автоматически из GitHub Secret `ENV_BE` при деплое.

Добавьте в GitHub Secrets → `ENV_BE` содержимое файла с переменными окружения.

### Ручной деплой на сервере

#### 1. Настройка переменных окружения

Создайте файл `.env` на сервере:

```bash
cd /var/www/alexol.io/back
cp env.example .env
nano .env
```

Укажите безопасные значения для:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN`

#### 2. Запуск

```bash
docker-compose up -d --build
```

#### 3. Проверка статуса

```bash
docker-compose ps
docker-compose logs -f backend
```

#### 4. Остановка

```bash
docker-compose down
```

## Порты

- **Backend API**: `8547` (внешний) → `3000` (внутренний)
- **PostgreSQL**: `7432` (внешний) → `5432` (внутренний)

## API Documentation

После запуска документация доступна по адресу:
```
http://your-server:8547/api-docs
```

## Health Check

```
GET http://your-server:8547/api/health
```

## Автоматический деплой через GitHub Actions

При пуше в ветку `master` GitHub Actions автоматически:
1. Создаёт `.env` файл из секрета `ENV_BE`
2. Копирует код бэкенда на сервер в `/var/www/alexol.io/back`
3. Останавливает старые контейнеры
4. Запускает `docker-compose up -d --build`
5. Применяет миграции базы данных (автоматически через CMD в Dockerfile)
6. Показывает статус контейнеров

### Необходимые GitHub Secrets:
- `ENV_BE` - содержимое .env файла
- `SERVER_IP`, `SERVER_USER`, `SERVER_SSH_KEY`, `SERVER_SSH_PORT`
