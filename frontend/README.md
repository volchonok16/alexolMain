# Alexol Outsource

Проект следует модульной архитектуре с использованием React, TypeScript и SCSS.

## Установка

```bash
npm install
```

## Запуск

```bash
npm run dev
```

## Сборка

```bash
npm run build
```

## Структура проекта

```
src/
├── pages/           # Страницы приложения
├── shared/          # Переиспользуемые компоненты
│   ├── ui/          # UI kit
│   ├── layouts/     # Header, Footer
│   ├── hooks/       # Общие хуки
│   └── contexts/    # React контексты
├── api/             # API сервисы
├── types/           # TypeScript типы
└── styles/          # Глобальные стили
```

## Технологии

- React 18
- TypeScript
- SCSS (BEM методология)
- Vite
- Framer Motion (анимации)
- TanStack Query (для будущих API запросов)

## Стайлгайд

- **SCSS** - все стили в .scss файлах
- **BEM** - методология именования классов
- **Стрелочные функции** - для всех компонентов
- **TypeScript strict mode** - включен
