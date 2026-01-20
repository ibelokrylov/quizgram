# AGENTS.md — правила для агентных ассистентов (Quizgram)

> Этот файл задаёт «как работать» в монорепозитории Quizgram.
> Проект: Bun + TypeScript, пакеты: `pkg/api`, `pkg/app`, `pkg/tg-quiz`.

## 0) Язык и стиль ответов
- Отвечай **на русском языке**.
- Коротко и по делу, без рассуждений «как думал».
- Большие фрагменты кода в ответ не вставляй (только дифф/минимальные куски при необходимости).
- Текст ошибок/логов в коде — **на русском** (имена переменных/функций остаются на английском).

## 1) Базовые ограничения и безопасность
- **Только Bun**: `bun install`, `bun run <script>`, `bun test`.
- Не предлагай `npm`, `yarn`, `pnpm`, `node`.
- **Запрещено запускать dev-серверы** (`bun run dev`, `vite dev` и т.п.) без явного запроса пользователя.
  - В окружении обычно уже подняты приложения на портах **5173/5174**.
- Не меняй конфиги/версии линтинга/форматирования «ради чистоты» без просьбы.
- Не выполняй потенциально разрушительные команды (`rm -rf`, `git reset --hard`, force-push) без явного запроса.
- **Тесты пишутся только для pkg/api** (backend).
- **Запрещено удалять тесты или подгонять их под ответы** для прохождения.

## 2) Коммиты и PR
- Делай `git commit` **только по явному запросу** пользователя.
- Сообщение коммита: кратко, в стиле репозитория. Если стиля нет — используй:
  - `[feat] ...` / `[fix] ...` / `[update] ...`
- `git push --no-verify` не предлагай как «нормальный» путь: хуки обязательны.

## 3) Важные источники правил (Cursor)
В репозитории есть правила Cursor — их нужно учитывать:

**Общие правила:**
- `.cursor/rules/README.mdc` — обзор всех правил проекта
- `.cursor/rules/language.mdc` — правила русского языка
- `.cursor/rules/bun.mdc` — правила работы с Bun runtime
- `.cursor/rules/typescript.mdc` — TypeScript: satisfies vs as
- `.cursor/rules/project-structure.mdc` — структура монорепозитория
- `.cursor/rules/testing.mdc` — правила тестирования с Bun
- `.cursor/rules/react.mdc` — React компоненты

**Backend API (`pkg/api/.cursor/rules/`):**
- `project-bapi.mdc` — полные правила для backend API
- `files.mdc` — правила работы с файлами (S3)

**Frontend App (`pkg/app/.cursor/rules/`):**
- `architecture.mdc` — архитектура и структура проекта
- `api.mdc` — API вызовы и HTTP паттерны
- `components.mdc` — паттерны React компонентов
- `entities.mdc` — доменные сущности с Zod
- `routing.mdc` — маршрутизация с TanStack Router
- `styling.mdc` — форматирование и стилизация
- `i18n.mdc` — интернационализация

**Telegram Mini App (`pkg/tg-quiz/.cursor/rules/`):**
- `telegram.mdc` — правила разработки Telegram Mini App

## 4) Команды (build/lint/test)

### Установка зависимостей (корень)
- `bun install`

### pkg/api (Backend API: Bun + Elysia + Drizzle + PostgreSQL)
- **Линт**: `cd pkg/api && bun run lint` (oxlint)
- **Тесты (только для pkg/api)**:
  - Полный прогон тестов: `cd pkg/api && bun run test`
  - Запуск одного файла: `cd pkg/api && bun test src/path/to/something.test.ts`
  - Запуск одного теста по имени: `cd pkg/api && bun test -t "часть названия теста"`
- Работа с БД:
  - Применение изменений: `cd pkg/api && bun run db:push` (миграции + схема)
  - Выполнение миграций: `cd pkg/api && bun run db:migrate`
  - Статус миграций: `cd pkg/api && bun run db:migrate:status`

## 5) Важно о тестах
- **Тесты пишутся только для pkg/api** (backend).
- **Запрещено удалять тесты или подгонять их под ответы** для прохождения.
- Если тест не проходит — исправь код или добавь новый тест, но не удаляй существующий.

## 6) Когда запускать тесты/линтеры
- По умолчанию **не запускай** тесты/линтеры автоматически: сначала перечисли команды и попроси подтверждение.
- Исключение: если пользователь прямо попросил «прогони тесты/линт».

## 7) TypeScript: типы, безопасность, стиль
- Строгая типизация, избегай `any`.
- **Предпочитай `satisfies` вместо `as`** для type assertions.
  - Исключения: `catch (e)`, namespace imports, SQL алиасы, FormData/body в Elysia.
- Для фронтенда: runtime-валидация через **Zod** (схемы → `z.infer`).
- Для бэкенда: валидация через **Elysia.t** (модели в `model.ts`).

## 8) Импорты и организация модулей
### Frontend (`pkg/app`):
- Используй алиас `@/` для импортов из `src/`.
- Типы импортируй как `import type { ... } from '...'`.
- Предпочитай именованные экспорты, без default export.
- Component structure: UI-base в `src/components/ui/`, feature components в `src/components/`.

### Backend (`pkg/api`):
- Следуй feature-based структуре: `src/modules/{feature}/{index,service,model}.ts`.
- Service не должен зависеть от Elysia Context.
- Controller (index.ts): роутинг, cookies, HTTP-коды, валидация.
- Service (service.ts): бизнес-логика, Drizzle-запросы.
- Model (model.ts): схемы Elysia.t и типы (`typeof schema.static`).

## 9) Ошибки, логирование, сообщения
- Backend:
  - **Не используй `console.*`**. Используй `logger` из `src/lib/logger`.
  - `logger.error('Сообщение', error, { context })` — для ошибок.
  - Возвращай понятные сообщения об ошибках **на русском**.
- Frontend:
  - Для уведомлений об ошибках используй `toast.error()` (sonner), как в `pkg/app/.cursor/rules/api.mdc`.

## 10) Правила для Backend API (Elysia + Drizzle)
### Структура модулей
- Строго разделяй слои:
  - `index.ts` (controller): роутинг, cookies, HTTP-коды, валидация.
  - `service.ts`: бизнес-логика, Drizzle-запросы.
  - `model.ts`: схемы Elysia.t и типы (`typeof schema.static`).

### Elysia Context
- Не передавай целиком `ctx` в сервис; передавай только нужные данные.
- Для user/session данных используй `ctx.store` через `.state()` + `.guard()`.
- Используй `abstract class` со `static` методами для сервисов без состояния.

### База данных
- Используй **Drizzle ORM** (без raw SQL, если не требуется).
- Изменения схемы — через миграции в `src/migrations/`.
- Применение изменений: `bun run db:push` (миграции + схема).

### Файлы (S3)
- Файлы **никогда не хранить** в БД/на сервере.
- Всегда: загрузка в S3 → сохранение в БД только метаданных/URL.
- Правило и примеры: `pkg/api/.cursor/rules/files.mdc`.

### Линт/форматирование
- `cd pkg/api && bun run lint` (oxlint).
- Run `bun run lint` before committing.

## 11) Правила для Frontend App (React + TanStack Router)
### Роуты
- Роуты: `src/routes/*` через `createFileRoute` (TanStack Router).
- Root route: `__root.tsx` (QueryClientProvider + ContextHole).
- Index route: `index.tsx` (путь `/`).
- Dynamic routes: `$param.tsx` (параметры маршрута).

### Компоненты
- UI-база: `src/components/ui/` (shadcn/ui New York style).
- Feature components: `src/components/`.
- Page components: `src/pages/` (thin wrappers).
- Компоненты должны принимать `className` и объединять через `cn()` из `@/lib/utils`.
- Предпочитай именованные экспорты, без default export.
- Условный рендеринг: предпочитай тернарный оператор с явным `null` вместо `&&` (см. `.cursor/rules/react.mdc`).

### i18n
- Не хардкодь пользовательские строки; используй `useTranslation()` и `t()`.
- Ключи должны существовать в `src/locales/en/common.json` и `src/locales/ru/common.json`.

### Линт/форматирование
- `cd pkg/app && bun run lint` (Biome + auto-fix).
- Биome: tabs indentation, single quotes.
- Run `bun run lint` before committing.

### Сборка
- `cd pkg/app && bun run build` — production build.

## 12) Правила для Telegram Mini App (`pkg/tg-quiz`)
### Инициализация SDK
- Обязательная инициализация SDK в `main.tsx`:
  ```typescript
  import { init, backButton } from '@telegram-apps/sdk-react';
  init(); // Инициализация SDK
  backButton.mount(); // Монтирование кнопки "Назад"
  ```

### Использование компонентов SDK
- Используй компоненты `@telegram-apps/telegram-ui` для нативного вида Telegram.
- Оборачивай приложение в `<AppRoot>` для правильной работы UI.
- Импортируй стили: `import '@telegram-apps/telegram-ui/dist/styles.css'`.

### React Hooks из SDK
- `useLaunchParams()` — параметры запуска приложения.
- `useSignal()` — реактивная работа с сигналами SDK.
- `useRawInitData()` — init data в исходном формате.

### Навигация
- Навигация через `backButton` из SDK.

### Линт/форматирование
- `cd pkg/tg-quiz && bun run lint` (Biome + auto-fix).
- Run `bun run lint` before committing.

### Сборка
- `cd pkg/tg-quiz && bun run build` — production build.

## 13) «Перед коммитом» (только список команд)
- `cd pkg/api && bun run lint`
- `cd pkg/app && bun run lint`
- `cd pkg/app && bun run build`
- `cd pkg/tg-quiz && bun run lint`
- `cd pkg/tg-quiz && bun run build`
- `cd pkg/api && bun run test`
