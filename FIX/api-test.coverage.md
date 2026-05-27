# Покрытие тестами `pkg/api`

> Сгенерировано: 2026-05-17  
> Всего тестовых файлов: 7  
> Исходных файлов (`.ts` в `src/`): 71

---

## Существующие тесты

| # | Файл теста | Что покрыто |
|---|-----------|-------------|
| 1 | `test/scheduler-payments.test.ts` | `SchedulerService.processPayments()` — напоминания, перевод на FREE, активация отсроченных планов, множественные пользователи, удалённые пользователи, FREE-план |
| 2 | `test/payment-service.test.ts` | `PaymentService` — `getUpLimits`, `getPaymentStatus`, `verifyUnitpaySignature`, `handleUnitpayCheck`, `handleUnitpayPay`, `handleUnitpayError`, `createPayment`, `activateScheduledPlan` |
| 3 | `test/payment-plan-update.test.ts` | `PaymentService.updateUserPlan()` — FREE→BASE, BASE→PRO_PLUS, отсроченное понижение, `payNow`, `upLimit`, множественные обновления |
| 4 | `test/is-admin.test.ts` | `BidsService.getBidsList`, `BidsService.getBidsForExport` — фильтрация по `isAdmin`, видимость `info`, включение админов в scheduler-выборку |
| 5 | `test/backup-db.service.test.ts` | `BackupDbService.backupDatabase()` — pg_dump, gzip, загрузка в S3, ошибки подключения |
| 6 | `test/backup-log.service.test.ts` | `BackupLogService.backupLogFile()`, `backupYesterdayLog()` — бэкап существующих/несуществующих логов, пути в S3 |
| 7 | `test/s3.service.test.ts` | `S3Service` — `uploadFile` (Buffer/Blob/Uint8Array), `getFile`, `getPresignedURL`, `deleteFile`, полный жизненный цикл |

---

## Непокрытые области

### 1. Модули (Feature-based) — контроллеры + сервисы + модели

#### 1.1 `modules/auth/`
- `auth/index.ts` — роуты: регистрация, логин, OAuth, выход, сброс пароля, верификация email, refresh токенов
- `auth/service.ts` — бизнес-логика аутентификации, хеширование паролей, работа с токенами
- `auth/model.ts` — схемы валидации Elysia.t

#### 1.2 `modules/user/`
- `user/index.ts` — роуты: получение/обновление профиля, удаление аккаунта, настройки, аватар
- `user/service.ts` — CRUD пользователей, обновление данных, загрузка аватара
- `user/model.ts` — схемы валидации

#### 1.3 `modules/quiz/`
- `quiz/index.ts` — роуты: создание, обновление, удаление квизов, управление вопросами, логика прохождения, публичные квизы
- `quiz/service.ts` — бизнес-логика квизов, вопросы, варианты ответов, результаты
- `quiz/model.ts` — схемы валидации

#### 1.4 `modules/bids/` (частично покрыт через `is-admin.test.ts`)
- `bids/index.ts` — роуты: создание заявки, обновление, удаление, получение деталей, экспорт
- `bids/service.ts` — остальные методы кроме `getBidsList`/`getBidsForExport`: создание заявки, валидация, обновление статуса, удаление
- `bids/model.ts` — схемы валидации

#### 1.5 `modules/statistics/`
- `statistics/index.ts` — роуты: статистика по квизам, заявкам, пользователям, дашборд
- `statistics/service.ts` — агрегации, подсчёты, графики
- `statistics/model.ts` — схемы валидации

#### 1.6 `modules/public/`
- `public/index.ts` — роуты: публичные API (просмотр квизов без авторизации, публичные заявки, webhook'и)
- `public/service.ts` — бизнес-логика публичного доступа
- `public/models.ts` — схемы валидации

#### 1.7 `modules/admin/`
- `admin/index.ts` — роуты: админ-панель, управление пользователями, модерация, управление планами, force-операции
- `admin/service.ts` — админ-логика: блокировка пользователей, назначение ролей, управление контентом

#### 1.8 `modules/scheduler/` (частично покрыт)
- `scheduler/index.ts` — cron-роуты (в dev через setInterval)
- `scheduler/service.ts` — `processIncompleteBids()` (обработка незавершённых заявок), `newsletterSend()` (рассылка) — **не покрыты**

#### 1.9 `modules/telegram/`
- `telegram/index.ts` — webhook'и для Telegram ботов, обработка входящих сообщений, команды

#### 1.10 `modules/payment/` (частично покрыт)
- `payment/index.ts` — роуты: создание платежа, callback'и UnitPay, получение статуса, история платежей — **не покрыты**

---

### 2. Сервисы (`src/services/`)

| Файл | Назначение | Покрытие |
|------|-----------|----------|
| `session.service.ts` | Управление сессиями, JWT, refresh токены | ❌ Нет |
| `mail.service.ts` | Отправка email (напоминания, уведомления) | ❌ Нет (только моки в других тестах) |
| `newsletter.service.ts` | Рассылки, подписки, отписки | ❌ Нет |
| `code.service.ts` | Генерация/проверка верификационных кодов | ❌ Нет |
| `plan.service.ts` | Инициализация тарифных планов (`scanPlanAndCreate`) | ❌ Нет |
| `ffmpeg.service.ts` | Обработка видео/аудио (конвертация, склейка) | ❌ Нет |
| `file.service.ts` | Загрузка, валидация, обработка файлов | ❌ Нет |
| `ip-location.service.ts` | Определение геолокации по IP | ❌ Нет |
| `export.service.ts` | Экспорт данных (CSV, XLSX) | ❌ Нет |
| `telegram.service.ts` | Отправка сообщений через Telegram API | ❌ Нет |
| `quiz-file.service.ts` | Работа с файлами квизов (вложения, изображения) | ❌ Нет |
| `quiz-bot.service.ts` | Логика Telegram-бота для квизов | ❌ Нет |
| `crm-bot.service.ts` | CRM-бот для обработки заявок | ❌ Нет |
| `base-telegram-bot.service.ts` | Базовый абстрактный класс для ботов | ❌ Нет |

---

### 3. Библиотеки и утилиты (`src/lib/`, `src/helpers/`)

| Файл | Назначение | Покрытие |
|------|-----------|----------|
| `lib/logger.ts` | Структурированное логирование (pino-like) | ❌ Нет |
| `lib/db-check.ts` | Проверка подключения к PostgreSQL при старте | ❌ Нет |
| `lib/env-check.ts` | Валидация обязательных env-переменных | ❌ Нет |
| `lib/date-utils.ts` | Хелперы для работы с датами и таймзонами | ❌ Нет |
| `helpers/file.helper.ts` | Утилиты для работы с файлами (размер, расширение) | ❌ Нет |

---

### 4. База данных (`src/db/`)

| Файл/Группа | Назначение | Покрытие |
|-------------|-----------|----------|
| `db/index.ts` | Инициализация Drizzle ORM, определение всех таблиц | ❌ Нет |
| `db/quiz/*.ts` | Схемы таблиц квизов, вопросов, файлов, заявок | ❌ Нет |
| `db/user-*.ts` | Схемы: платежи, уведомления, файлы пользователей | ❌ Нет |
| `db/plan.ts`, `payment.ts`, `up-limit.ts`, `code.ts`, `newsletter.ts`, `mail.ts`, `migration.ts` | Остальные схемы | ❌ Нет |
| `db/helper/index.ts` | Хелперы для построения Drizzle-запросов | ❌ Нет |

---

### 5. Инфраструктура и точки входа

| Файл | Назначение | Покрытие |
|------|-----------|----------|
| `src/index.ts` | Инициализация Elysia, CORS, HTTPS, cron-jobs/setInterval, graceful shutdown, подключение модулей | ❌ Нет |
| `src/migrations/*.ts` (8 миграций) | Миграции БД: индексы, колонки, исправления данных | ❌ Нет |
| `src/migrations/runner.ts` | Запуск миграций | ❌ Нет |

---

### 6. Типы

| Файл | Назначение | Покрытие |
|------|-----------|----------|
| `src/type/bot.type.ts` | Типы для Telegram-ботов | ❌ Нет |
| `src/type/error.type.ts` | Кастомные типы ошибок | ❌ Нет |

---

## Сводка по покрытию

| Категория | Покрыто | Не покрыто | Процент (приблизительно) |
|-----------|---------|------------|--------------------------|
| Сервисы бизнес-логики (service.ts) | 4 из 20 | 16 | ~20 % |
| Контроллеры / роуты (index.ts модулей) | 0 из 10 | 10 | 0 % |
| Вспомогательные сервисы (`src/services/`) | 3 из 17 | 14 | ~18 % |
| БД-слой и схемы | 0 | все | 0 % |
| Lib / helpers / types | 0 | все | 0 % |
| Инфраструктура (`index.ts`, миграции) | 0 | все | 0 % |

### Рекомендуемый приоритет для покрытия

1. **Высокий**: `auth/service.ts`, `auth/index.ts` — критичная безопасность
2. **Высокий**: `user/service.ts`, `user/index.ts` — базовый CRUD пользователей
3. **Высокий**: `quiz/service.ts`, `quiz/index.ts` — основная бизнес-логика продукта
4. **Средний**: `bids/service.ts` (остальные методы), `bids/index.ts` — core-фича
5. **Средний**: `admin/service.ts`, `admin/index.ts` — админ-операции
6. **Средний**: `modules/payment/index.ts` — роуты платежей
7. **Низкий**: `statistics`, `public`, `telegram` — вспомогательные модули
8. **Низкий**: `src/services/*` — утилитарные сервисы
9. **Низкий**: `lib/*`, `helpers/*`, `db/*` — инфраструктурный код
