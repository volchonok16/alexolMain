# Admin Panel - Alexol Outsource

Панель администратора для управления контентом сайта.

## Установка

```bash
npm install
```

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