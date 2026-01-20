# Оптимизация бандлов Frontend

## Текущее состояние

При сборке два чанка превышают лимит 500 KB:

- `index-JjoHVSAs.js` — **605 KB** (gzip: 182 KB)
- `route-DpFnw0Sr.js` — **418 KB** (gzip: 116 KB)

---

## Рекомендации

### 1. Дублирование библиотек иконок

**Проблема:** Используются 3 библиотеки иконок одновременно:

- `@tabler/icons-react`
- `lucide-react`
- `react-icons`

**Решение:** Выбрать одну библиотеку и мигрировать на неё. Рекомендация — `lucide-react` (лёгкая, хороший tree-shaking).

**Ожидаемый эффект:** -50-150 KB

---

### 2. Lazy loading для recharts

**Проблема:** `recharts` (~300 KB) загружается в основной бандл.

**Решение:** Использовать dynamic import для компонентов с графиками:

```tsx
const RechartsComponent = lazy(() => import("./components/Charts"));
```

**Ожидаемый эффект:** -100-150 KB из основного бандла

---

### 3. Оптимизация framer-motion

**Проблема:** `framer-motion` тяжёлая библиотека (~100 KB).

**Варианты:**

1. Использовать `framer-motion/m` (облегчённая версия) где не нужны сложные анимации
2. Заменить простые анимации на CSS transitions
3. Dynamic import для страниц с анимациями

**Ожидаемый эффект:** -30-80 KB

---

### 4. Manual chunks в Vite

**Решение:** Добавить в `vite.config.ts`:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-router': ['@tanstack/react-router', '@tanstack/react-query'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', /* ... */],
        'vendor-charts': ['recharts'],
        'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers', '@dnd-kit/utilities'],
      }
    }
  }
}
```

**Ожидаемый эффект:** Лучшее кеширование, параллельная загрузка

---

### 5. Анализ бандла

**Инструмент:** Добавить `rollup-plugin-visualizer` для детального анализа:

```bash
bun add -D rollup-plugin-visualizer
```

```ts
// vite.config.ts
import { visualizer } from "rollup-plugin-visualizer";

plugins: [
  visualizer({
    filename: "dist/stats.html",
    open: true,
    gzipSize: true,
  }),
];
```

---

### 6. Проверить tree-shaking иконок

**Проблема:** Импорты вида `import { Icon } from '@tabler/icons-react'` могут не tree-shake корректно.

**Решение:** Использовать прямые импорты:

```tsx
// Плохо
import { IconHome, IconUser } from "@tabler/icons-react";

// Хорошо
import IconHome from "@tabler/icons-react/dist/esm/icons/IconHome";
```

---

### 7. Оптимизация @dnd-kit

**Проблема:** 4 пакета dnd-kit загружаются даже если drag-and-drop используется только на одной странице.

**Решение:** Dynamic import для компонентов с drag-and-drop функциональностью.

---

### 8. Удалить devtools в production

**Проверить:** Убедиться что `@tanstack/react-router-devtools` не попадает в production бандл.

```ts
// Только для development
if (import.meta.env.DEV) {
  import("@tanstack/react-router-devtools");
}
```

---

## Приоритеты

| #   | Задача                     | Сложность | Эффект  |
| --- | -------------------------- | --------- | ------- |
| 1   | Убрать дублирование иконок | Средняя   | Высокий |
| 2   | Lazy load recharts         | Низкая    | Высокий |
| 3   | Manual chunks              | Низкая    | Средний |
| 4   | Анализ с visualizer        | Низкая    | —       |
| 5   | Оптимизация framer-motion  | Средняя   | Средний |
| 6   | Lazy load dnd-kit          | Низкая    | Средний |

---

## Цель

Уменьшить размер основного бандла до < 500 KB (желательно < 300 KB).
