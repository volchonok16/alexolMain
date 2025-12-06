# Рефакторинг UI компонентов

## Что было изменено

### Удалено
- ❌ 48 устаревших компонентов из `shared/ui/`
- ❌ Зависимости: `@radix-ui`, `class-variance-authority`
- ❌ Tailwind CSS классы
- ❌ Сложные утилиты (`cn`, `cva`)

### Создано
- ✅ **Button** - современная кнопка с 3 вариантами
- ✅ **Input** - поле ввода с label и error
- ✅ **Card** - карточка с подкомпонентами
- ✅ **IconCard** - карточка с иконкой для контактов

## Новая структура

```
src/shared/ui/
├── Button/
│   ├── Button.tsx
│   ├── Button.scss
│   └── index.ts
├── Input/
│   ├── Input.tsx
│   ├── Input.scss
│   └── index.ts
├── Card/
│   ├── Card.tsx
│   ├── Card.scss
│   └── index.ts
├── IconCard/
│   ├── IconCard.tsx
│   ├── IconCard.scss
│   └── index.ts
├── index.ts
└── README.md
```

## Преимущества

### Было (старый подход)
```tsx
// Сложные зависимости
import { cva } from "class-variance-authority";
import { cn } from "./utils";

// Длинные Tailwind классы
className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
```

### Стало (современный подход)
```tsx
// Чистый TypeScript
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
}

// BEM классы
className="button button--primary"
```

## Стиль кода

### Компоненты
- ✅ Стрелочные функции
- ✅ TypeScript интерфейсы
- ✅ Деструктуризация props
- ✅ Минимальная логика

### Стили
- ✅ SCSS с BEM
- ✅ CSS переменные
- ✅ Вложенность для элементов
- ✅ Модификаторы через `&--`

### Пример
```tsx
export const Button = ({ variant = "primary", children }: ButtonProps) => {
  const classes = ["button", `button--${variant}`].join(" ");
  return <button className={classes}>{children}</button>;
};
```

```scss
.button {
  padding: 0.75rem 1.5rem;
  
  &--primary {
    background: linear-gradient(to right, $color-primary, $color-secondary);
  }
  
  &--secondary {
    background: transparent;
  }
}
```

## Миграция

Для использования новых компонентов:

```tsx
// Старый импорт (удалить)
import { Button } from "@/components/ui/button";

// Новый импорт
import { Button } from "@/shared/ui";

// Использование
<Button variant="primary" size="large">
  Текст кнопки
</Button>
```
