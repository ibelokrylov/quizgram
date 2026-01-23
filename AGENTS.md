# AGENTS.md — правила для агентных ассистентов (Quizgram)

> Проект: Bun + TypeScript, монорепозиторий с пакетами `pkg/api` (backend), `pkg/app` (web), `pkg/tg-quiz` (Telegram Mini App).

## 0) Язык и стиль ответов
- Отвечай **на русском языке**, кратко и по делу.
- Сообщения об ошибках/логи в коде — **на русском** (имена переменных/функций на английском).
- Не вставляй большие фрагменты кода в ответ (только дифф/минимальные куски).

## 1) Базовые ограничения
- **Только Bun**: `bun install`, `bun run <script>`, `bun test`. Не предлагай `npm`, `yarn`, `pnpm`.
- Не запускай dev-серверы без явного запроса (обычно уже подняты на портах 5173/5174).
- Не меняй конфиги/версии линтинга «ради чистоты» без просьбы.
- Не выполняй разрушительные команды (`rm -rf`, `git reset --hard`, force-push) без запроса.
- **Тесты пишутся только для pkg/api**. Запрещено удалять тесты или подгонять их под ответы.

## 2) Коммиты
- Делай `git commit` **только по явному запросу**.
- Сообщение: `[feat] ...`, `[fix] ...`, `[update] ...` — кратко, в стиле репозитория.
- `git push --no-verify` не предлагай — хуки обязательны.

## 3) Команды (build/lint/test)

### Установка зависимостей
- `bun install` (из корня)

### pkg/api (Backend: Bun + Elysia + Drizzle + PostgreSQL)
- **Линт**: `cd pkg/api && bun run lint` (oxlint)
- **Тесты**:
  - Все: `cd pkg/api && bun run test`
  - Один файл: `cd pkg/api && bun test src/path/to/test.test.ts`
  - По имени: `cd pkg/api && bun test -t "часть названия"`
- **БД**:
  - `cd pkg/api && bun run db:push` — миграции + схема
  - `cd pkg/api && bun run db:migrate` — выполнить миграции
  - `cd pkg/api && bun run db:migrate:status` — статус миграций

### pkg/app (Web: React + Vite)
- **Линт**: `cd pkg/app && bun run lint` (oxlint + oxfmt)
- **Сборка**: `cd pkg/app && bun run build`

### pkg/tg-quiz (Telegram Mini App)
- **Линт**: `cd pkg/tg-quiz && bun run lint` (oxlint + oxfmt)
- **Сборка**: `cd pkg/tg-quiz && bun run build`

## 4) Когда запускать тесты/линтеры
- По умолчанию **не запускай** автоматически — сначала перечисли команды, попроси подтверждение.
- Исключение: пользователь прямо попросил «прогони тесты/линт».

## 5) TypeScript и типы
- Строгая типизация, избегай `any`.
- **Предпочитай `satisfies` вместо `as`** для type assertions.
  - Исключения: `catch (e)`, namespace imports, SQL алиасы, FormData/body в Elysia.
- Frontend: runtime-валидация через **Zod** (схемы → `z.infer`).
- Backend: валидация через **Elysia.t** (модели в `model.ts`).

## 6) Импорты и структура

### Frontend (`pkg/app`)
- Алиас `@/` для импортов из `src/`.
- Типы импортируй как `import type { ... }`.
- Предпочитай именованные экспорты, без default export.
- UI-компоненты: `src/components/ui/`, feature-компоненты: `src/components/`.
- Роуты: `src/routes/*` через TanStack Router (`createFileRoute`).

### Backend (`pkg/api`)
- Feature-based: `src/modules/{feature}/{index,service,model}.ts`.
- `index.ts` (controller): роутинг, cookies, HTTP-коды, валидация.
- `service.ts`: бизнес-логика, Drizzle-запросы (без Elysia Context).
- `model.ts`: схемы Elysia.t и типы (`typeof schema.static`).

## 7) Ошибки и логирование
- **Backend**: не используй `console.*`. Используй `logger` из `src/lib/logger`.
  - `logger.error('Сообщение', error, { context })`
  - Сообщения об ошибках на русском.
- **Frontend**: для уведомлений используй `toast.error()` (sonner).

## 8) React компоненты
- Компоненты должны принимать `className` и объединять через `cn()` из `@/lib/utils`.
- Условный рендеринг: предпочитай тернарный оператор с явным `null` вместо `&&`.
  - `{condition ? <Component /> : null}` (не `{condition && <Component />}`).
- i18n: не хардкодь строки, используй `useTranslation()` и `t()`. Ключи в `src/locales/*/common.json`.

## 9) Telegram Mini App (`pkg/tg-quiz`)
- Обязательная инициализация SDK в `main.tsx`:
  ```typescript
  import { init, backButton } from '@telegram-apps/sdk-react';
  init(); backButton.mount();
  ```
- Используй компоненты `@telegram-apps/telegram-ui`, импортируй стили.
- Навигация через `backButton` из SDK.

## 10) Elysia и База данных
- Не передавай целиком `ctx` в сервис; передавай только нужные данные.
- Используй `ctx.store` через `.state()` + `.guard()` для user/session.
- Сервисы: `abstract class` со `static` методами без состояния.
- Drizzle ORM (без raw SQL), миграции через `src/migrations/`.
- Файлы: **никогда не хранить** в БД/на сервере. Загрузка в S3 → в БД только метаданные/URL.

## 11) Перед коммитом (проверочный список)
- `cd pkg/api && bun run lint`
- `cd pkg/app && bun run lint && bun run build`
- `cd pkg/tg-quiz && bun run lint && bun run build`
- `cd pkg/api && bun run test`
