# Миграция проекта на новую архитектуру

## Что изменилось

### Старая структура
```
components/
├── ui/              # UI компоненты
├── Header.tsx
├── Footer.tsx
├── Hero.tsx
└── ...
```

### Новая структура
```
src/
├── pages/HomePage/
│   ├── components/  # Hero, About, Services и т.д.
│   └── index.tsx
├── shared/
│   ├── ui/          # UI kit
│   └── layouts/     # Header, Footer
└── ...
```

## Шаги миграции

### 1. Обновить импорты в проекте

Старые импорты:
```typescript
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
```

Новые импорты:
```typescript
import { Header } from "@/shared/layouts/Header";
import { Hero } from "@/pages/HomePage/components/Hero";
```

### 2. Настроить алиасы путей

В `tsconfig.json` или `vite.config.ts`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/pages": ["./src/pages"],
      "@/shared": ["./src/shared"],
      "@/api": ["./src/api"],
      "@/types": ["./src/types"]
    }
  }
}
```

### 3. Обновить точку входа

Изменить импорт в `main.tsx` или `index.tsx`:
```typescript
// Было
import App from "./App";

// Стало
import App from "./src/App";
```

### 4. Удалить старые файлы (опционально)

После проверки работоспособности можно удалить:
- `components/` (старая папка)
- Старый `App.tsx` в корне

## Преимущества новой структуры

- ✅ Четкое разделение ответственности
- ✅ Легче масштабировать проект
- ✅ Проще находить компоненты
- ✅ Изолированные модули страниц
- ✅ Переиспользуемые компоненты в shared/

## Следующие шаги

1. Добавить новые страницы в `src/pages/`
2. Создать API сервисы в `src/api/`
3. Добавить типы в `src/types/`
4. Настроить роутинг (React Router)
