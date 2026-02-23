# BAPI

Backend API проект, построенный на современных технологиях.

## Технологии

Этот проект использует следующие технологии:

### [Bun](https://bun.com/docs)

Быстрый JavaScript runtime, bundler и менеджер пакетов. Bun обеспечивает высокую производительность и современный инструментарий для разработки.

**Документация:** https://bun.com/docs

### [Elysia](https://elysiajs.com/table-of-content.html)

Быстрый и дружелюбный веб-фреймворк для Bun. Elysia предоставляет элегантный API для создания REST API и веб-приложений.

**Документация:** https://elysiajs.com/table-of-content.html

### [Drizzle ORM](https://orm.drizzle.team/docs/overview) (PostgreSQL)

Легковесная и производительная ORM для TypeScript. Используется для работы с PostgreSQL базой данных.

**Документация:** https://orm.drizzle.team/docs/overview

## Начало работы

### Установка зависимостей

```bash
bun install
```

## Структура проекта

Проект следует принципам **feature-based folder structure** от Elysia, где каждый функциональный модуль имеет свою папку с контроллером, сервисом и моделями.

### Структура папок

```
src/
├── db/                    # Схемы базы данных (Drizzle ORM)
│   ├── index.ts          # Подключение к БД и экспорт всех таблиц
│   ├── user.ts           # Схема таблицы пользователей
│   ├── plan.ts           # Схема таблицы тарифных планов
│   ├── code.ts           # Схема таблицы кодов
│   ├── quiz.ts           # Схемы таблиц квизов
│   └── user-file.ts      # Схема таблицы файлов пользователей
│
├── modules/              # Функциональные модули приложения
│   └── {feature}/        # Каждый модуль содержит:
│       ├── index.ts      # Elysia controller (роуты и валидация запросов)
│       ├── service.ts    # Бизнес-логика (отделена от HTTP)
│       └── model.ts      # Модели валидации (Elysia.t) и типы
│
├── utils/                # Утилиты и вспомогательные функции
│   └── ...
│
└── index.ts             # Точка входа приложения
```

### Принципы организации кода

Проект следует рекомендациям [Elysia Best Practices](https://elysiajs.com/essential/best-practice.html#folder-structure):

#### 1. **Controller (index.ts)**

- Обрабатывает HTTP-запросы: роутинг, валидация запросов, работа с cookies
- Использует Elysia instance как контроллер (не класс, привязанный к Context)
- Извлекает нужные данные из контекста и передаёт их в сервис

#### 2. **Service (service.ts)**

- Содержит бизнес-логику, отделённую от HTTP-слоя
- Использует `abstract class` со `static` методами, если не нужно хранить состояние
- Не зависит от Elysia Context, что упрощает тестирование и переиспользование

#### 3. **Model (model.ts)**

- Определяет структуру данных и валидацию через Elysia.t
- Использует `typeof model.static` для получения TypeScript типов
- Группирует связанные модели в namespace

#### 4. **Database (db/)**

- Схемы Drizzle ORM для работы с PostgreSQL
- Экспортируются все таблицы из `db/index.ts`
- Используются в сервисах для работы с данными

### Пример структуры модуля

```typescript
// modules/auth/index.ts - Controller
import { Elysia } from 'elysia';
import { AuthService } from './service';
import { AuthModel } from './model';

export const auth = new Elysia({ prefix: '/auth' }).post(
  '/sign-in',
  async ({ body, cookie }) => {
    const response = await AuthService.signIn(body);

    // Устанавливаем сессионную cookie
    cookie.session.set({
      value: response.token,
      httpOnly: true,
      secure: process.env.ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 дней
    });

    return response;
  },
  {
    body: AuthModel.signInBody,
    response: {
      200: AuthModel.signInResponse,
      400: AuthModel.signInInvalid,
    },
  }
);

// modules/auth/service.ts - Service
import { eq } from 'drizzle-orm';
import { db, userTable } from '../../db';
import type { AuthModel } from './model';

export abstract class AuthService {
  static async signIn({ username, password }: AuthModel.signInBody) {
    // Бизнес-логика здесь
    const users = await db.select().from(userTable).where(eq(userTable.login, username)).limit(1);
    // ...
  }
}

// modules/auth/model.ts - Model
import { t } from 'elysia';

export namespace AuthModel {
  export const signInBody = t.Object({
    username: t.String(),
    password: t.String(),
  });

  export type signInBody = typeof signInBody.static;

  export const signInResponse = t.Object({
    username: t.String(),
    token: t.String(),
  });

  export type signInResponse = typeof signInResponse.static;
}
```

## Разработка

Для запуска сервера разработки выполните:

```bash
bun run dev
```

Откройте http://localhost:3000/ в браузере, чтобы увидеть результат.

---

## Миграции базы данных

### ✅ Система миграций

Создана полноценная система управления миграциями базы данных с автоматическим отслеживанием выполненных изменений.

#### Основные возможности

1. **Автоматическое отслеживание** - таблица `_migrations` в БД хранит список выполненных миграций
2. **Защита от повторного выполнения** - каждая миграция выполняется только один раз
3. **Интеграция с db:push** - команда `bun run db:push` теперь автоматически запускает миграции
4. **Простое создание новых миграций** - четкая структура и шаблоны
5. **Проверка статуса** - команда `bun run db:migrate:status` показывает все миграции

### Применение всех изменений (рекомендуется)

```bash
bun run db:push
```

Эта команда:

1. Выполнит все новые миграции (`db:migrate`)
2. Синхронизирует схему Drizzle с PostgreSQL (`drizzle-kit push`)

### Только миграции

```bash
# Выполнить pending миграции
bun run db:migrate

# Проверить статус
bun run db:migrate:status
```

### Создание новой миграции

1. Создай файл `src/migrations/00X-название.ts`:

```typescript
import type { MigrationFile } from './types';

export const migration: MigrationFile = {
  name: '004-add-user-avatar',
  description: 'Добавление поля avatar в таблицу user',
  async up(sql) {
    await sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS avatar TEXT
    `;
  },
};
```

2. Добавь в `src/migrations/index.ts`:

```typescript
import { migration as migration004 } from './004-add-user-avatar';

export const migrations: MigrationFile[] = [
  migration001,
  migration002,
  migration003,
  migration004, // Добавь здесь
];
```

3. Примени:

```bash
bun run db:push
```

### Текущий статус миграций

В БД созданы и выполнены 3 миграции:

| №   | Название                   | Описание                         | Статус       |
| --- | -------------------------- | -------------------------------- | ------------ |
| 001 | add-bids-indexes           | Индексы для оптимизации quiz_bid | ✅ Выполнена |
| 002 | add-user-payment-is-active | Поле is_active для истории       | ✅ Выполнена |
| 003 | fix-user-payment-final-day | Исправление finalDayAt           | ✅ Выполнена |

### Технические детали

#### Таблица \_migrations

```sql
CREATE TABLE _migrations (
  name TEXT PRIMARY KEY,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Workflow

1. Runner проверяет существование таблицы `_migrations`
2. Получает список выполненных миграций из БД
3. Фильтрует pending миграции (которых нет в \_migrations)
4. Выполняет каждую pending миграцию
5. Записывает выполненную миграцию в \_migrations
6. При ошибке - останавливается и выводит детали

#### Интеграция с db:push

В `package.json`:

```json
{
  "scripts": {
    "db:push": "bun run db:migrate && drizzle-kit push"
  }
}
```

### ⚠️ Важные правила

1. **НЕ изменяй выполненные миграции** - создавай новые для исправлений
2. **Всегда используй `bun run db:push`** - не применяй изменения вручную
3. **Проверяй через MCP** - убедись, что изменения применены
4. **Добавляй описания** - понятные имена и описания миграций
5. **Используй IF NOT EXISTS/IF EXISTS** - для безопасного выполнения SQL

**Все старые команды (`db:add-bids-indexes`, etc.) теперь устарели и заменены на `db:migrate`!**

---

## История изменений

### Обновление логики тарифов пользователей (2025-12-24)

#### 🎯 Цель изменений

Реализовать систему истории тарифов с учётом уже собранных ставок при переключении на платный тариф.

#### 📝 Что изменилось

##### 1. Схема БД (`src/db/user-payment.ts`)

**Изменения:**

- ✅ Добавлено поле `isActive` (boolean, default: true)
- ✅ Убран `.unique()` constraint с `userId` (теперь у пользователя может быть несколько записей)

**Результат:**

```typescript
export const userPaymentTable = pgTable('user_payment', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => userTable.id),
  planId: integer('plan_id')
    .notNull()
    .references(() => planTable.id),
  // ... другие поля
  isActive: boolean('is_active').notNull().default(true), // ← НОВОЕ ПОЛЕ
});
```

##### 2. Логика переключения тарифов (`src/modules/payment/service.ts`)

**Новая логика в `updateUserPlan`:**

1. **Деактивация старых записей** - все старые записи `user_payment` становятся `isActive = false`
2. **Подсчёт ставок** (только для платных тарифов) - учитываются уже собранные ставки
3. **Создание новой записи** - создаётся новая запись с `isActive = true`

##### 3. Исправление finalDayAt

**Проблема:**

- Использовалось: **+30 дней**
- Ожидалось: **+1 месяц**

**Решение:**
Заменено `setDate(getDate() + 30)` на `setMonth(getMonth() + 1)` во всех местах:

- `src/modules/payment/service.ts` - при переключении тарифа
- `src/modules/auth/service.ts` - при регистрации пользователя
- `src/modules/scheduler/service.ts` - при продлении подписки
- `src/db/user-payment.ts` - default значение в схеме БД

#### 📊 Схема работы

```
БЫЛО (старая логика):
user_payment:
┌────┬─────────┬─────────┬───────────┬────────────┐
│ id │ user_id │ plan_id │   limit   │ currentLimit│
├────┼─────────┼─────────┼───────────┼────────────┤
│ 1  │   123   │    2    │    500    │     45     │ ← upsert по user_id
└────┴─────────┴─────────┴───────────┴────────────┘

СТАЛО (новая логика):
user_payment:
┌────┬─────────┬─────────┬───────────┬────────────┬───────────┐
│ id │ user_id │ plan_id │   limit   │ currentLimit│ is_active │
├────┼─────────┼─────────┼───────────┼────────────┼───────────┤
│ 1  │   123   │    1    │    100    │     0      │   false   │ ← история
│ 2  │   123   │    2    │    500    │    45      │   true    │ ← активная
└────┴─────────┴─────────┴───────────┴────────────┴───────────┘
```

#### 🔧 Дополнительные команды

**Посмотреть историю тарифов пользователя:**

```sql
SELECT id, user_id, plan_id, created_at, limit, current_limit, is_active
FROM user_payment
WHERE user_id = 123
ORDER BY created_at DESC;
```

**Посмотреть активный тариф:**

```sql
SELECT * FROM user_payment
WHERE user_id = 123 AND is_active = true;
```

---

## GitHub Actions Workflows

### Реструктуризация workflows (2025-12-16)

#### 🎯 Цель изменений

Разделить процесс CI/CD на два независимых стейджа:

1. **Build** - автоматическая проверка сборки всех пакетов
2. **Deploy** - мануальный деплой на production сервер

#### ✨ Новые workflows

##### `build.yml` - Автоматическая сборка пакетов

**Триггеры:**

- Автоматически при push в `main` (если изменены `pkg/**`)
- Автоматически при Pull Request в `main`
- Вручную через GitHub Actions UI

**Что делает:**

- Устанавливает Bun runtime
- Устанавливает все зависимости (`bun install`)
- Проверяет TypeScript типы для `pkg/api`
- Собирает `pkg/app` (React frontend)
- Собирает `pkg/tg-quiz` (Telegram Mini App)
- Проверяет наличие `dist/` директорий
- Загружает артефакты сборки (хранятся 7 дней)

**Зачем:**

- Быстрая проверка что код собирается без ошибок
- Раннее обнаружение проблем сборки
- Артефакты для отладки

##### `deploy.yml` - Деплой на сервер

**Изменения:**

- **Только мануальный запуск**
- Сборка происходит на сервере через Docker
- Перезапуск **только app, api, tg-quiz** (PostgreSQL не трогаем)

**Новые параметры:**

- `skip_git_pull` - Пропустить обновление кода (default: false)
- `skip_env_update` - Пропустить обновление .env файлов (default: false)

**Команда деплоя:**

```bash
docker compose up -d --build app api tg-quiz
```

**Зачем:**

- Больше контроля над деплоем
- Безопасность: PostgreSQL не перезапускается
- Гибкость: можно пропустить обновление кода или .env

#### 🔒 Безопасность

✅ **PostgreSQL защищён**

- Никогда не перезапускается в `deploy.yml`

✅ **Контроль деплоя**

- Деплой только вручную
- Параметры для пропуска шагов
- Показ логов после деплоя

✅ **Секреты**

- Все чувствительные данные в GitHub Secrets
- SSH через проверенные known_hosts
- Docker Hub через токен (не пароль)

#### 📊 Сравнение: Было vs Стало

| Аспект           | Было                | Стало                      |
| ---------------- | ------------------- | -------------------------- |
| **Сборка**       | В деплое            | Отдельный workflow         |
| **Деплой**       | Автоматически       | Только вручную             |
| **PostgreSQL**   | Мог перезапуститься | Никогда не перезапускается |
| **Контроль**     | Низкий              | Высокий                    |
| **Безопасность** | Средняя             | Высокая                    |
| **Гибкость**     | Низкая              | Высокая                    |

#### 🚀 Процесс деплоя

1. `git push main` → Build запускается автоматически
2. Проверяешь что сборка успешна
3. Запускаешь Deploy to Server вручную

**Если нужен быстрый деплой:**

```
Deploy to Server с параметром skip_git_pull: true
```

#### 🎉 Преимущества новой структуры

1. **Разделение ответственности**
   - Build проверяет код
   - Deploy деплоит на сервер

2. **Безопасность**
   - PostgreSQL защищён от случайного перезапуска
   - Деплой только вручную

3. **Гибкость**
   - Можно пропустить обновление кода
   - Можно пропустить обновление .env

4. **Прозрачность**
   - Артефакты сборки доступны 7 дней
   - Логи после каждого деплоя

5. **Скорость**
   - Build ~3-5 минут
   - Deploy ~3-5 минут
   - Можно запускать параллельно

---

## Дополнительная документация

- **Тесты**: [test/README.md](test/README.md) - Полная документация по тестам
- **Миграции (для разработчиков)**: [src/migrations/README.md](src/migrations/README.md)
- **Миграции (быстрый старт)**: [docs/MIGRATIONS.md](docs/MIGRATIONS.md)
- **GitHub Actions**: [.github/workflows/README.md](.github/workflows/README.md)
