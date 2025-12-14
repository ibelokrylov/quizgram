# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Default to using Bun instead of Node.js.

- **Package Management**: Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- **Scripts**: Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- **Execution**: Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- **Testing**: Use `bun test` instead of `jest` or `vitest`
- **Building**: Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`

Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Project Structure

This is a monorepo with multiple packages:

- **`pkg/app`** - React 19 frontend application (main web app)
- **`pkg/api`** - Backend API using Elysia framework
- **`pkg/tg-quiz`** - Telegram Mini App

### Package-Specific Guidelines

Each package has its own `CLAUDE.md` file with specific guidelines:

#### pkg/app/CLAUDE.md
React 19 application with:
- TanStack Router for file-based routing
- TanStack Query for server state
- Tailwind CSS v4 with shadcn/ui
- Zod for validation
- i18next for internationalization

#### pkg/api/CLAUDE.md
Backend API with:
- Bun runtime with Elysia framework
- Drizzle ORM with PostgreSQL
- Feature-based module structure
- Strict TypeScript typing
- Custom logger utility

#### pkg/tg-quiz/CLAUDE.md
Telegram Mini App with:
- @telegram-apps/sdk-react v3.x
- @telegram-apps/telegram-ui components
- Runs inside Telegram WebView
- Native Telegram integration

## Quick Reference

### Common Commands (run from package directories):
```bash
bun install          # Install dependencies
bun run dev          # Start development server
bun run build        # Build project
bun run lint         # Run linter/formatter
bun test             # Run tests
```

### Key Architectural Patterns:
1. **Bun-first**: Always prefer Bun APIs over Node.js
2. **TypeScript**: Use strict typing throughout
3. **Feature-based**: Organize code by features, not file types
4. **Separation of concerns**: Keep business logic separate from UI/HTTP layers
5. **Validation**: Use Zod or Elysia.t for runtime validation

## Language Rules

### ВАЖНО: Русский язык по умолчанию

✅ **ВСЕ ответы, комментарии и документация должны быть на РУССКОМ языке**

**Правила**:
- Всегда отвечать пользователю на русском языке
- Все комментарии в коде писать на русском языке
- Сообщения об ошибках и логи - на русском
- Названия переменных и функций могут оставаться на английском (стандарт)
- API endpoints могут оставаться на английском (стандарт)

**Исключения**:
- Технические термины без устоявшегося перевода (например, "middleware", "endpoint", "service")
- Названия библиотек, фреймворков и технологий
- Цитаты из документации на английском языке

**Пример**:
```typescript
// ❌ Неправильно
// This function handles user authentication
export const authService = {
  async signIn() { ... }
}

// ✅ Правильно
// Этот сервис обрабатывает аутентификацию пользователя
export const authService = {
  async signIn() { ... }
}
```
- 3. Миграция:
    - SQL файл готов для применения через Drizzle или другой инструмент миграций
    - Обеспечивает обратную совместимость с существующими данными

очисти все миграции

добавь в правило api CLAUDE - что все изменения в бд вносятся путем bun run db:push (это автоматически применяет миграции)
- 3. Миграция:
    - SQL файл готов для применения через Drizzle или другой инструмент миграций
    - Обеспечивает обратную совместимость с существующими данными

очисти все миграции

добавь в правило api CLAUDE - что все изменения в бд вносятся путем bun run db:push (это автоматически применяет миграции)