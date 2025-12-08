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
import { Elysia } from 'elysia'
import { AuthService } from './service'
import { AuthModel } from './model'

export const auth = new Elysia({ prefix: '/auth' })
  .post('/sign-in', async ({ body, cookie }) => {
    const response = await AuthService.signIn(body)
    
    // Устанавливаем сессионную cookie
    cookie.session.set({
      value: response.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 дней
    })
    
    return response
  }, {
    body: AuthModel.signInBody,
    response: {
      200: AuthModel.signInResponse,
      400: AuthModel.signInInvalid
    }
  })

// modules/auth/service.ts - Service
import { eq } from 'drizzle-orm'
import { db, userTable } from '../../db'
import type { AuthModel } from './model'

export abstract class AuthService {
  static async signIn({ username, password }: AuthModel.signInBody) {
    // Бизнес-логика здесь
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.login, username))
      .limit(1)
    // ...
  }
}

// modules/auth/model.ts - Model
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

## Разработка

Для запуска сервера разработки выполните:
```bash
bun run dev
```

Откройте http://localhost:3000/ в браузере, чтобы увидеть результат.

### Миграции базы данных

Генерация миграций из схем Drizzle:
```bash
bun run db:generate
```

Применение миграций к базе данных:
```bash
bun run db:migrate
```