# Система миграций базы данных

## 🎯 Быстрый старт

```bash
# Применить все изменения (миграции + схема)
bun run db:push

# Только миграции
bun run db:migrate

# Статус миграций
bun run db:migrate:status
```

## 📖 Что это?

Система автоматического управления миграциями базы данных с отслеживанием выполненных изменений.

### Основные возможности

- ✅ Автоматическое отслеживание выполненных миграций
- ✅ Защита от повторного выполнения
- ✅ Интеграция с `db:push` - миграции выполняются автоматически
- ✅ Простое создание новых миграций
- ✅ Проверка статуса всех миграций

## 🔧 Workflow

### 1. Изменение схемы Drizzle

Измени файлы в `src/db/*.ts`:

```typescript
// src/db/user.ts
export const userTable = pgTable("user", {
  id: serial("id").primaryKey(),
  login: text("login").notNull(),
  avatar: text("avatar"), // Новое поле
});
```

### 2. Создание миграции (если нужно)

Если нужны дополнительные изменения (индексы, миграция данных):

```bash
# Создай файл src/migrations/004-название.ts
```

```typescript
import type { MigrationFile } from "./types";

export const migration: MigrationFile = {
  name: "004-название",
  description: "Описание изменения",
  async up(sql) {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_avatar 
      ON "user"(avatar)
    `;
  },
};
```

Добавь в `src/migrations/index.ts`:

```typescript
import { migration as migration004 } from "./004-название";

export const migrations: MigrationFile[] = [
  migration001,
  migration002,
  migration003,
  migration004, // Добавь здесь
];
```

### 3. Применение изменений

```bash
# Одна команда для всего
bun run db:push
```

Эта команда:
1. Выполнит все новые миграции
2. Синхронизирует схему Drizzle с PostgreSQL

### 4. Проверка

```bash
# Проверь статус
bun run db:migrate:status

# Проверь БД через MCP (в Cursor)
```

## 📁 Структура

```
pkg/api/
├── src/
│   ├── db/
│   │   ├── migration.ts          # Таблица _migrations
│   │   └── ...                   # Схемы Drizzle
│   └── migrations/
│       ├── 001-add-bids-indexes.ts
│       ├── 002-add-user-payment-is-active.ts
│       ├── 003-fix-user-payment-final-day.ts
│       ├── index.ts              # Список всех миграций
│       ├── runner.ts             # Логика выполнения
│       ├── types.ts              # TypeScript типы
│       └── README.md             # Подробная документация
└── scripts/
    └── migrate.ts                # CLI команда
```

## 📋 Существующие миграции

| № | Название | Описание |
|---|----------|----------|
| 001 | add-bids-indexes | Индексы для оптимизации quiz_bid |
| 002 | add-user-payment-is-active | Поле is_active для истории платежей |
| 003 | fix-user-payment-final-day | Исправление расчета finalDayAt |

## ⚠️ Важные правила

1. **НЕ изменяй выполненные миграции** - создавай новые для исправлений
2. **Всегда используй `bun run db:push`** - не применяй изменения вручную
3. **Проверяй через MCP** - убедись, что изменения применены корректно
4. **Добавляй описания** - понятные имена и описания миграций

## 🔍 Таблица _migrations

В БД автоматически создается таблица для отслеживания:

```sql
CREATE TABLE _migrations (
  name TEXT PRIMARY KEY,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Пример данных:

```sql
SELECT * FROM _migrations ORDER BY executed_at;
```

| name | executed_at |
|------|-------------|
| 001-add-bids-indexes | 2025-12-24 19:43:05 |
| 002-add-user-payment-is-active | 2025-12-24 19:43:05 |
| 003-fix-user-payment-final-day | 2025-12-24 19:43:05 |

## 🚨 Troubleshooting

### Миграция не выполняется

```bash
# Проверь статус
bun run db:migrate:status

# Проверь БД через MCP
```

### Нужно откатить миграцию

Создай новую миграцию с откатом изменений:

```typescript
export const migration: MigrationFile = {
  name: "005-rollback-something",
  description: "Откат изменений из миграции 004",
  async up(sql) {
    await sql`
      DROP INDEX IF EXISTS idx_user_avatar;
      ALTER TABLE "user" DROP COLUMN IF EXISTS avatar;
    `;
  },
};
```

## 📚 Дополнительная информация

- [Подробная документация миграций](../src/migrations/README.md)
- [Cursor Rules для проекта](../.cursor/rules/project-bapi.mdc)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)

