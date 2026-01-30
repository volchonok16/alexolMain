# Admin Panel - Alexol Outsource

Панель администратора для управления контентом сайта.

## Установка

```bash
npm install
```

## Настройка

Создайте файл `.env` на основе `env.example`:

```bash
cp env.example .env
```

Для локальной разработки используйте:
```env
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
```

Для продакшена настройте правильный URL вашего API:
- Если через nginx: `https://alexol.io/api`
- Если напрямую с портом: `https://alexol.io:8547/api`
- Если на отдельном домене: `https://api.alexol.io/api`

## Запуск

```bash
npm run dev
```

Админка будет доступна по адресу: http://localhost:3001

## Вход

- **Логин**: alex
- **Пароль**: Triu546r!)

## Функционал

- ✅ Авторизация
- ✅ CRUD операции для новостей
- ✅ Хранение данных в localStorage
- ✅ Адаптивный дизайн

## Структура

```
admin/
├── src/
│   ├── contexts/       # Контексты (Auth)
│   ├── pages/          # Страницы
│   │   ├── LoginPage/
│   │   └── DashboardPage/
│   ├── styles/         # Глобальные стили
│   └── App.tsx
├── package.json
└── vite.config.ts
```