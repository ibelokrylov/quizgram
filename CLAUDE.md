# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quizgram - монорепозиторий для платформы создания и управления квизами с интеграцией Telegram. Состоит из трех основных пакетов:

- **pkg/api** - Backend API (Bun + Elysia + Drizzle ORM + PostgreSQL)
- **pkg/app** - Frontend веб-приложение (React 19 + TanStack Router + Tailwind v4)
- **pkg/tg-quiz** - Telegram Mini App (React + Telegram UI)

## Critical Rules

### Language
**Все ответы, комментарии и документация ТОЛЬКО на русском языке**. Код (переменные, функции) может быть на английском.

### Runtime
**Используй только Bun** вместо Node.js. Команды:
- `bun install` - установка зависимостей
- `bun run <script>` - запуск скриптов
- `bun test` - запуск тестов
- **ЗАПРЕЩЕНО запускать dev-серверы** (`bun run dev`, `vite`) - серверы уже запущены на портах 5173/5174

### TypeScript
- Используй `satisfies` вместо `as` для type assertions
- Строгая типизация везде (no `any`)
- Валидация: Zod для frontend, Elysia.t (TypeBox) для backend

## Commands

### Root Commands
```bash
bun install                          # Установка зависимостей для всех пакетов
git push                             # Автоматически запускает тесты API (husky pre-push hook)
git push --no-verify                 # Пропуск тестов (использовать осторожно!)
```

### API (pkg/api)
```bash
cd pkg/api

# Development
bun run dev                          # Запуск dev-сервера с hot reload
bun test                             # Запуск всех тестов + очистка тестовых данных
bun run test:cleanup                 # Очистка тестовых данных после тестов

# Database Management
bun run db:push                      # Применить изменения схемы в БД (drizzle-kit push)
bun run db:migrate                   # Запуск миграций
bun run db:migrate:status            # Статус миграций
bun run db:push:all                  # Push схемы + запуск миграций
bun run db:create-schema             # Создание начальной схемы БД

# Utilities
bun run mock:data                    # Генерация mock данных (quiz bids)
bun run recalculate:stats            # Пересчет статистики квизов
```

### Frontend App (pkg/app)
```bash
cd pkg/app

bun run dev                          # Запуск dev-сервера Vite (порт 5173)
bun run build                        # Production сборка (TypeScript + Vite)
bun run lint                         # Линтинг и форматирование (oxlint + oxfmt)
bun run preview                      # Preview production build
```

### Telegram Mini App (pkg/tg-quiz)
```bash
cd pkg/tg-quiz

bun run dev                          # Запуск dev-сервера Vite (порт 5174)
bun run build                        # Production сборка
bun run lint                         # Линтинг и форматирование
bun run preview                      # Preview production build
```

### Docker Commands
```bash
# Первый запуск всех сервисов
docker compose up -d

# Деплой приложений (без перезапуска PostgreSQL)
docker compose up -d --build api app tg-quiz

# Остановка всех сервисов
docker compose down

# Просмотр логов
docker compose logs -f api           # Логи API
docker compose logs -f app           # Логи App
docker compose logs -f postgres      # Логи PostgreSQL
```

## Architecture

### Backend API (pkg/api)

**Stack:** Bun + Elysia + Drizzle ORM + PostgreSQL

**Structure:**
```
src/
├── modules/              # 9 feature-based modules (MVC pattern)
│   ├── auth/            # Аутентификация (login, registration, Telegram auth)
│   ├── user/            # Управление профилем
│   ├── quiz/            # CRUD операции с квизами
│   ├── bids/            # Обработка ответов на квизы
│   ├── payment/         # Платежи и подписки
│   ├── statistics/      # Аналитика
│   ├── public/          # Публичный доступ к квизам
│   ├── scheduler/       # Фоновые задачи
│   └── telegram/        # Webhook для 3 Telegram ботов
├── services/            # 17 утилитарных сервисов
├── db/                  # Drizzle ORM схемы (15+ таблиц)
├── lib/                 # Core utilities (logger, env-check, db-check)
└── index.ts             # Entry point (Elysia app + cron jobs)
```

**Module Pattern (каждый модуль):**
- `index.ts` - HTTP routes и валидация (Elysia)
- `service.ts` - Бизнес-логика (abstract class со static методами)
- `model.ts` - Validation schemas (TypeBox для Elysia.t)

**Key Services:**
- `mail.service.ts` - Email рассылка (Nodemailer + SMTP)
- `s3.service.ts` - S3-совместимое хранилище (файлы, бэкапы)
- `backup-db.service.ts` - Автоматический бэкап PostgreSQL в S3 (pg_dump + gzip)
- `backup-log.service.ts` - Архивирование логов
- `session.service.ts` - JWT сессии (30 дней / 1 год / 2 часа)
- `telegram.service.ts` - Telegram bot API
- `crypto-pay.service.ts` - Крипто-платежи (Telegram Stars)
- `ffmpeg.service.ts` - Обработка видео/аудио

**Authentication:**
- JWT-based tokens в httpOnly secure cookies
- Методы: Email/Password, Telegram OAuth
- Token expiration: 30 дней (default), до 1 года (remember), 2 часа (short)

**Database:**
- PostgreSQL 16.1 с Drizzle ORM
- 15+ таблиц: user, plan, quiz, quiz_bid, payment, user_file и др.
- Relations API через `src/db/relations.ts`
- Connection pool: max 10 connections
- Drizzle Kit для миграций: `bun run db:push`

**Scheduler (Cron Jobs):**
- Development: `setInterval()` для надежности
- Production: Elysia cron plugin
- Tasks:
  - `processIncompleteBids` - каждую 1 минуту
  - `processPayments` - каждые 20 минут (00:00-02:00)
  - `backupLogs` - ежедневно в 23:59
  - `backupDatabase` - каждые 2 часа (pg_dump → S3)

**API Routes:**
```
GET  /                    # Health check
POST /v1/auth/*          # Аутентификация
POST /v1/user/*          # Управление пользователем
POST /v1/quiz/*          # Квизы
POST /v1/bids/*          # Заявки на квизы
POST /v1/payment/*       # Платежи
POST /v1/statistics/*    # Статистика
POST /v1/public/*        # Публичный доступ
POST /telegram/*         # Telegram webhooks (без /v1)
```

**Graceful Shutdown:**
- Останавливает cron jobs / intervals
- Отключает Telegram ботов
- Закрывает HTTP сервер
- Триггеры: SIGINT / SIGTERM

### Frontend App (pkg/app)

**Stack:** React 19 + TanStack Router + TanStack Query + Tailwind v4 + shadcn/ui

**Key Libraries:**
- TanStack Router - File-based routing
- TanStack Query - Server state management
- Zod - Runtime validation
- i18next - Интернационализация
- Radix UI + shadcn/ui - UI компоненты
- Tailwind CSS v4 - Стилизация

**Architecture:**
- Entity-based structure (по доменным сущностям)
- Feature-first организация компонентов
- Type-safe routing с TypeScript

### Telegram Mini App (pkg/tg-quiz)

**Stack:** React + @telegram-apps/sdk-react v3 + Telegram UI

**Features:**
- Работает внутри Telegram WebView
- Telegram-native UI компоненты
- Интеграция с Telegram API

## Database Schema (Key Tables)

**Core Tables:**
- `user` - Пользователи (email, password, plan_id, verified)
- `plan` - Тарифные планы (free, pro и др.)
- `quiz` - Квизы пользователей
- `quiz_question` - Вопросы квизов
- `quiz_bid` - Ответы на квизы (заявки)
- `quiz_contact` - Контактная информация квизов
- `payment` - Платежи
- `user_payment` / `user_payment_pro` - История платежей пользователей
- `user_file` - Загруженные файлы
- `code` - Коды верификации/сброса пароля
- `migration` - Tracking миграций

**Relations:**
- User → Plan (many-to-one)
- Quiz → User (many-to-one)
- QuizBid → Quiz (many-to-one)
- UserPayment → User (many-to-one)

## Docker Setup

**Services:**
- `postgres` - PostgreSQL 16.1 (Alpine) с оптимизированными настройками
- `api` - Backend API (host network mode, порт 5001)
- `app` - Frontend приложение (host network mode, порт 5173)
- `tg-quiz` - Telegram Mini App (host network mode, порт 5174)

**PostgreSQL Configuration:**
```yaml
max_connections: 50
shared_buffers: 1GB
effective_cache_size: 4GB
work_mem: 16MB
log_min_duration_statement: 200ms  # Slow query logging
idle_in_transaction_session_timeout: 10s
lock_timeout: 1s
statement_timeout: 60s
```

**Volumes:**
- `postgres-data` - Persistent PostgreSQL data
- `./logs/api` - API logs (bind mount на хост)

**Network:**
- API, App, TG-Quiz используют `host` network mode (прямой доступ к портам хоста)
- PostgreSQL в bridge network `quizgram-network`

## Environment Variables

**Required for API (.env / pkg/api/.env):**
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=quizgram
POSTGRES_USER=user
POSTGRES_PASSWORD=password

# Security
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# S3 Storage (AWS S3 or compatible)
S3_ACCESS_KEY=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
S3_URL=https://s3-endpoint.com  # Для S3-совместимых хранилищ

# Telegram Bots
BOT_QUIZ_TOKEN=your-bot-token
BOT_CRM_TOKEN=your-crm-bot-token
BOT_SUPPORT_TOKEN=your-support-bot-token

# Email (SMTP)
MAIL_USER=your-email@domain.com
MAIL_PASSWORD=your-password
MAIL_HOST=smtp.domain.com
MAIL_PORT=587

# Payment
CRYPTO_PAY_TOKEN=your-crypto-pay-token

# Server
PORT=5001
APP_URLS=http://localhost:5173,https://yourdomain.com
ENV=development  # или production

# Optional HTTPS
HTTPS_CERT=/path/to/cert.pem
HTTPS_KEY=/path/to/key.pem
HTTPS_PORT=5001
```

## Git Hooks (Husky)

**Pre-push Hook:**
- Автоматически запускает `bun test` в `pkg/api`
- Блокирует push при падении тестов
- Bypass: `git push --no-verify` (использовать осторожно!)

**Installation:**
- Hooks устанавливаются автоматически при `bun install` (скрипт `prepare`)

## Testing

**API Tests:**
```bash
cd pkg/api
bun test                    # Запуск всех тестов
bun test specific.test.ts   # Запуск конкретного теста
```

**Test Pattern (Bun Test):**
```typescript
import { test, expect } from "bun:test";

test("описание теста", async () => {
  const result = await someFunction();
  expect(result).toBe(expectedValue);
});
```

**Test Cleanup:**
- После тестов автоматически запускается `bun run test:cleanup`
- Скрипт очищает тестовые данные из БД

## Logging

**Logger Location:** `pkg/api/src/lib/logger.ts`

**Features:**
- File-based logging в `pkg/api/logs/`
- 30-дневная ротация логов
- Автоматический бэкап в S3 (ежедневно в 23:59)
- Levels: DEBUG, INFO, WARN, ERROR

**Usage:**
```typescript
import { logger } from "../lib/logger";

logger.info("Сообщение", { data: "context" });
logger.error("Ошибка", error, { context: "additional" });
logger.debug("Debug информация", { details: "..." });
```

## Backup System

**Database Backups:**
- Автоматический бэкап каждые 2 часа
- Method: `pg_dump` → gzip compression → S3 upload
- Service: `BackupDbService.backupDatabase()`
- Logs: Подробное логирование успеха/ошибок загрузки в S3

**Log Backups:**
- Ежедневный архив в 23:59
- Архивирование вчерашних логов в S3
- Service: `BackupLogService.backupYesterdayLog()`

## Common Patterns

### Service Pattern (Backend)
```typescript
export abstract class ServiceName {
  static async methodName(params: ParamsType): Promise<ReturnType> {
    // Бизнес-логика без side effects
    const result = await db.select()...;
    return result;
  }
}
```

### Controller Pattern (Backend)
```typescript
import { Elysia } from "elysia";
import { ServiceName } from "./service";
import { ModelName } from "./model";

export const moduleName = new Elysia({ prefix: "/path" })
  .post("/endpoint", async ({ body, cookie }) => {
    const result = await ServiceName.businessLogic(body);
    return result;
  }, {
    body: ModelName.requestSchema,
    response: { 200: ModelName.responseSchema }
  });
```

### Database Query Pattern (Drizzle)
```typescript
import { db } from "../db";
import { tableName } from "../db/table-name";
import { eq, and, or } from "drizzle-orm";

// Select with relations
const results = await db
  .select()
  .from(tableName)
  .where(eq(tableName.field, value))
  .leftJoin(otherTable, eq(tableName.id, otherTable.foreignKey))
  .limit(10);

// Insert
await db.insert(tableName).values({ field: value });

// Update
await db.update(tableName)
  .set({ field: newValue })
  .where(eq(tableName.id, id));

// Delete (soft delete если есть deleted_at)
await db.update(tableName)
  .set({ deleted_at: new Date() })
  .where(eq(tableName.id, id));
```

## Important Notes

### Database Operations
- **ВСЕГДА используй Drizzle ORM** для работы с БД (не raw SQL)
- После изменений схемы: `bun run db:push` для применения
- Проверяй подключение к БД через MCP перед операциями
- Используй soft delete (`deleted_at`) где возможно

### File Operations
- Предпочитай `Bun.file()` над `node:fs` API
- Для процессов используй `Bun.spawn()` (как в backup-db.service.ts)

### Error Handling
- Всегда логируй ошибки через `logger.error()`
- Используй try-catch в async функциях
- Возвращай понятные error messages на русском

### Security
- Никогда не логируй sensitive data (пароли, токены)
- Используй httpOnly secure cookies для JWT
- Валидируй все input через Elysia.t или Zod
- Проверяй права доступа на уровне routes

### Performance
- Connection pooling уже настроен (max 10 для PostgreSQL)
- Используй `limit()` в database queries
- Включен slow query logging (> 200ms)
- Statement timeout: 60 секунд

## Troubleshooting

### TypeScript Errors
```bash
cd pkg/api && bunx tsc --noEmit    # Проверка типов в API
cd pkg/app && bunx tsc --noEmit    # Проверка типов в App
```

### Database Connection Issues
- Проверь переменные окружения: `POSTGRES_*`
- Проверь что PostgreSQL запущен: `docker compose ps`
- Проверь healthcheck: `docker compose logs postgres`
- Проверь через MCP (Model Context Protocol)

### Docker Issues
```bash
docker compose down              # Остановить все
docker compose up -d postgres    # Запустить только БД
docker compose logs -f api       # Смотреть логи API в реальном времени
docker compose restart api       # Перезапустить API
```

### Test Failures
- Убедись что БД доступна
- Проверь что тестовые данные очищены: `bun run test:cleanup`
- Запусти тесты с verbose: `bun test --verbose`

## Additional Resources

**Package-specific Documentation:**
- `/pkg/app/.cursor/rules/` - Детальные правила для Frontend
- `/pkg/api/.cursor/rules/` - Детальные правила для Backend API
- `/pkg/tg-quiz/.cursor/rules/` - Детальные правила для Telegram Mini App

**Bun Documentation:**
- `node_modules/bun-types/docs/` - Официальная документация Bun API
