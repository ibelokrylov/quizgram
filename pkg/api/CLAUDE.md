# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Management**: This project uses **bun** as the package manager
- **Install dependencies**: `bun install` - Install project dependencies
- **Add dependency**: `bun add <package>` - Add new dependency
- **Add dev dependency**: `bun add -d <package>` - Add development dependency
- **Development**: `bun run dev` - Start development server
- **Build**: `bun run build` - Build the project
- **Format/Lint**: `bun run lint` - Run linter/formatter

## Architecture Overview

This is a modern TypeScript backend API using Bun runtime with Elysia framework and PostgreSQL database.

### Tech Stack
- **Bun** runtime (not Node.js) - Use Bun API for file operations, processes, etc.
- **Elysia** web framework for Bun
- **Drizzle ORM** for PostgreSQL database operations
- **TypeScript** with strict typing
- **PostgreSQL** as the database

### Directory Structure (Feature-Based)

```
src/
├── db/                    # Database schemas (Drizzle ORM)
│   ├── index.ts          # Database connection and exports
│   ├── user.ts           # User table schema
│   ├── plan.ts           # Plan table schema
│   ├── code.ts           # Code table schema
│   ├── quiz.ts           # Quiz table schemas
│   └── user-file.ts      # User file table schema
│
├── modules/              # Feature modules
│   └── {feature}/        # Each module contains:
│       ├── index.ts      # Elysia controller (routes, validation)
│       ├── service.ts    # Business logic (separate from HTTP)
│       └── model.ts      # Validation models and types
│
├── utils/                # Utilities and helpers
│   └── logger.ts         # Logger utility
│
└── index.ts             # Application entry point
```

## Key Patterns

### 1. Controller Pattern (index.ts)
- Use Elysia instance as controller (not Context-bound class)
- Handle HTTP concerns: routing, request validation, cookies
- Extract needed data from context and pass to service
- DO NOT pass entire Context to service, use destructuring

Example:
```typescript
export const auth = new Elysia({ prefix: '/auth' })
  .post('/sign-in', async ({ body, cookie }) => {
    const response = await AuthService.signIn(body)
    cookie.session.set({ value: response.token })
    return response
  }, {
    body: AuthModel.signInBody,
    response: { 200: AuthModel.signInResponse }
  })
```

### 2. Service Pattern (service.ts)
- Use `abstract class` with `static` methods for stateless services
- Contains business logic separated from HTTP layer
- NO dependency on Elysia Context (simplifies testing/reuse)
- Use Drizzle ORM for database operations

Example:
```typescript
import { eq } from 'drizzle-orm'
import { db, userTable } from '../../db'

export abstract class AuthService {
  static async signIn({ username, password }: AuthModel.signInBody) {
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.login, username))
      .limit(1)
    // business logic...
  }
}
```

### 3. Model Pattern (model.ts)
- Use Elysia.t for validation and typing
- Group models in namespace
- Use `typeof model.static` for TypeScript types
- DO NOT declare types separately from validation models

Example:
```typescript
import { t } from 'elysia'

export namespace AuthModel {
  export const signInBody = t.Object({
    username: t.String(),
    password: t.String(),
  })

  export type signInBody = typeof signInBody.static

  export const signInResponse = t.Object({
    username: t.String(),
    token: t.String(),
  })

  export type signInResponse = typeof signInResponse.static
}
```

### 4. Using Guard and State in Elysia

**State** - for storing data available across route handlers:
```typescript
export const user = new Elysia({ prefix: "/user" })
  .state('user', null as User | null)
  .guard({
    async beforeHandle(ctx) {
      if (!ctx.cookie.token.value) {
        ctx.set.status = 401;
        return { message: "Unauthorized" };
      } else {
        ctx.store.user = await AuthService.getUserFromToken(ctx.cookie.token.value.toString());
      }
    },
  }, (app) => app
    .get("/", async (ctx) => {
      const user = ctx.store.user; // Get from store
      if (!user) {
        ctx.set.status = 401;
        return { message: "Unauthorized" };
      }
      // Use user
    })
  )
```

**Getting data from context:**
```typescript
async (ctx) => {
  // Correct: get user from store
  const user = ctx.store.user;
  if (!user) {
    ctx.set.status = 401;
    return { message: "Unauthorized" };
  }

  // Correct: destructure only HTTP-specific data
  const { body, set, cookie } = ctx;

  // Use user and other data
}
```

### 5. Logging Pattern
**ALWAYS use `logger` from `../lib/logger` instead of console.log/error/warn**

Use appropriate logging level:
- `logger.debug()` - for debug information (execution details)
- `logger.info()` - for informational messages (successful operations)
- `logger.warn()` - for warnings (non-critical issues)
- `logger.error()` - for errors (critical issues, pass Error object)

Pass context as object in second/third parameter:
- For errors: `logger.error(message, error, data)`

## Rules

### DO:
✅ Use Bun API instead of Node.js API
✅ Use Elysia for creating API endpoints
✅ Use Drizzle ORM for database operations
✅ Use `bun run db:push` for all database schema changes
✅ Write TypeScript code with strict typing
✅ Organize code by feature-based structure (modules/{feature}/)
✅ Use Elysia instance as controller
✅ Separate Controller, Service and Model into different files
✅ Use Elysia.t for validation and typing
✅ Use `abstract class` with `static` methods for stateless services
✅ Extract data from context via destructuring before passing to service
✅ Use `logger` from `../lib/logger` for all logging operations
✅ Use `.state()` for declaring typed data storage
✅ Use `.guard()` with `beforeHandle` to set data in `ctx.store`
✅ Get data from `ctx.store` in route handlers (don't destructure from context)

### Database Schema Management

**ВАЖНО**: Все изменения в схеме БД должны вноситься через TypeScript schema-файлы и применяться командой:

```bash
bun run db:push
```

**Правила работы с базой данных**:
1. Изменяем schema-файлы в `src/db/*.ts`
2. Запускаем `bun run db:push` для применения изменений
3. НЕ создаем SQL миграции вручную
4. Drizzle Kit автоматически генерирует и применяет SQL
5. Команда безопасна (создает backup перед применением)

**Пример добавления поля**:
```typescript
// В src/db/quiz/user-info.ts
export const userInfoTable = pgTable("user_info", {
  id: serial("id").primaryKey(),
  // ... существующие поля
  newField: varchar("new_field", { length: 100 }), // Добавляем новое поле
});
```

После этого выполнить: `bun run db:push`

### AVOID:
❌ Don't use Node.js API (use Bun)
❌ Don't use npm/yarn (use bun)
❌ Don't use other ORM or raw SQL without necessity
❌ Don't use `any` without extreme necessity
❌ Don't mix languages in comments (use Russian)
❌ Don't create Context-bound controller class
❌ Don't pass entire Context to service
❌ Don't declare classes or interfaces as models (use Elysia.t)
❌ Don't declare types separately from validation models
❌ Don't bind services to HTTP layer or Elysia Context
❌ NEVER use `console.log/error/warn` - always use `logger` from `../lib/logger`
❌ DON'T destructure data from `ctx.store` directly in function parameters (use `ctx.store.property`)
❌ DON'T use type assertion to add data to context (use `.state()` and `ctx.store`)
❌ DON'T create SQL migration files manually - use `bun run db:push` instead