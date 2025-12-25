# Система миграций

Эта директория содержит систему миграций для управления изменениями в базе данных.

## 📋 Как это работает

1. **Таблица отслеживания**: В БД создается таблица `_migrations`, которая хранит список выполненных миграций
2. **Автоматическая проверка**: При запуске `db:migrate` система проверяет, какие миграции еще не выполнены
3. **Безопасное выполнение**: Каждая миграция выполняется только один раз
4. **Интеграция с db:push**: Команда `bun run db:push` автоматически запускает миграции перед синхронизацией схемы

## 🚀 Команды

```bash
# Выполнить все новые миграции
bun run db:migrate

# Показать статус всех миграций
bun run db:migrate:status

# Применить миграции и обновить схему (рекомендуется)
bun run db:push
```

## 📝 Создание новой миграции

### Шаг 1: Создай файл миграции

Создай новый файл в этой директории с именем `00X-описание.ts`:

```typescript
// src/migrations/004-add-user-avatar.ts
import type { MigrationFile } from "./types";

export const migration: MigrationFile = {
  name: "004-add-user-avatar",
  description: "Добавление поля avatar в таблицу user",

  async up(sql) {
    // Добавление нового поля
    await sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS avatar TEXT
    `;

    // Создание индекса (если нужно)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_avatar 
      ON "user"(avatar)
    `;
  },
};
```

### Шаг 2: Добавь миграцию в индексный файл

Отредактируй `src/migrations/index.ts`:

```typescript
import { migration as migration004 } from "./004-add-user-avatar";

export const migrations: MigrationFile[] = [
  migration001,
  migration002,
  migration003,
  migration004, // Добавь сюда
];
```

### Шаг 3: Примени миграцию

```bash
bun run db:migrate
```

## 📚 Существующие миграции

- **001-add-bids-indexes** - Индексы для оптимизации запросов к quiz_bid
- **002-add-user-payment-is-active** - Поле is_active для истории платежей
- **003-fix-user-payment-final-day** - Исправление расчета finalDayAt

## ⚠️ Важные правила

1. **НЕ изменяй уже выполненные миграции** - создавай новые миграции для исправлений
2. **Используй уникальные имена** - формат `XXX-описание` где XXX - последовательный номер
3. **Добавляй описание** - поле `description` должно четко объяснять, что делает миграция
4. **Проверяй через MCP** - после выполнения миграции проверь изменения в БД
5. **Используй IF NOT EXISTS/IF EXISTS** - для безопасного выполнения SQL команд

## 🔍 Проверка статуса

Чтобы увидеть, какие миграции выполнены:

```bash
bun run db:migrate:status
```

Вывод:
```
📋 Статус миграций:

✅ 001-add-bids-indexes (выполнена 24.12.2025, 19:43:05)
   Добавление индексов для оптимизации запросов к quiz_bid

✅ 002-add-user-payment-is-active (выполнена 24.12.2025, 19:43:05)
   Добавление поля is_active в таблицу user_payment для хранения истории

⏳ 004-add-user-avatar
   Добавление поля avatar в таблицу user
```

## 🛠️ Типы и структура

### MigrationFile

```typescript
interface MigrationFile {
  name: string;              // Уникальное имя миграции
  description: string;       // Описание того, что делает миграция
  up: (sql: postgres.Sql) => Promise<void>; // Функция выполнения
}
```

### Доступные возможности в `up()`

В функции `up()` доступен объект `sql` из библиотеки `postgres.js`:

```typescript
async up(sql) {
  // Выполнение SQL запроса
  await sql`SELECT * FROM users`;
  
  // Параметризованные запросы
  const userId = 123;
  await sql`SELECT * FROM users WHERE id = ${userId}`;
  
  // Транзакции
  await sql.begin(async (sql) => {
    await sql`UPDATE users SET name = 'New' WHERE id = 1`;
    await sql`UPDATE posts SET title = 'New' WHERE user_id = 1`;
  });
}
```

## 🔗 Связанные файлы

- `src/db/migration.ts` - Схема таблицы `_migrations`
- `src/migrations/types.ts` - TypeScript типы
- `src/migrations/runner.ts` - Логика выполнения миграций
- `scripts/migrate.ts` - CLI команда для запуска

