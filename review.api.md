# Code Review: pkg/api

Дата: 2026-02-13 | Elysia 1.4.22 | Bun

---

## Критичные (MUST FIX)

### 1. Использование `any`, `unknown`, `as unknown as` — нарушение правила TypeScript

**Всего: ~30+ случаев**

| Файл | Строка | Проблема |
|------|--------|----------|
| `src/index.ts` | 27 | `let appInstance: any = null` |
| `src/lib/logger.ts` | 124, 136 | `data?: any`, `error?: any` в методах logger |
| `src/services/session.service.ts` | 38, 58, 83, 117 | `payload as unknown as Record<string, unknown>` — двойной каст JWT |
| `src/services/ip-location.service.ts` | 18, 201 | `server?: any` |
| `src/services/export.service.ts` | 16, 47 | `info?: any`, `escapeCSV(value: any)` |
| `src/services/telegram.service.ts` | 163 | `body?: any` |
| `src/services/mail.service.ts` | 136 | `error as unknown` |
| `src/modules/user/index.ts` | 321 | `(ctx.body as any).file` |
| `src/modules/statistics/service.ts` | 399, 405 | `bid.info as any`, `(q: any)` |
| `src/modules/public/service.ts` | 255, 517, 520, 657 | Множественные `any[]` |
| `src/modules/scheduler/service.ts` | 193 | `analyzeBidDropout(answer: any, questions: any): any` |
| `src/modules/quiz/service.ts` | 249, 253, 270-274 | `tx as unknown as typeof database`, `startPage?: any` и др. |
| `src/modules/bids/service.ts` | 192, 209, 245, 380, 433, 531, 612 | Множественные `as unknown as` для SQL результатов |

**Исправление:** определить конкретные интерфейсы для каждого случая. Для SQL — типизировать результаты raw-запросов через generics Drizzle.

---

### 2. `console.log/error/warn` в продакшн-коде

| Файл | Строка | Вызов |
|------|--------|-------|
| `src/modules/quiz/index.ts` | 115 | `console.log(error)` |
| `src/modules/quiz/index.ts` | 471 | `console.log(error)` |
| `src/modules/quiz/service.ts` | 376 | `console.log(err)` |
| `src/lib/logger.ts` | 109, 116, 118, 120, 179 | `console.error/warn/log` внутри самого логгера |

**Исправление:** заменить на `logger.error()`/`logger.debug()`. В логгере — сделать console-вывод опциональным через `ENV`.

---

### 3. Нет rate limiting на аутентификации

Эндпоинты `/auth/login`, `/auth/registration`, `/auth/forgot-password` не имеют ограничения по частоте запросов. Уязвимость к brute-force атакам.

**Исправление:** использовать `elysia-rate-limit` или реализовать через `onBeforeHandle`. Минимум: 5-10 попыток/минуту на IP для login.

---

### 4. `@ts-ignore` подавление ошибок

| Файл | Строка |
|------|--------|
| `src/services/ip-location.service.ts` | 71 |
| `src/modules/public/service.ts` | 63 |

**Исправление:** заменить на type guards или `@ts-expect-error` с пояснением.

---

## Важные (SHOULD FIX)

### 5. Нет глобального `onError` в Elysia

`src/index.ts` — нет `onError` хука. Каждый handler повторяет `try/catch` с ручным `set.status` и формированием ответа. При ошибке валидации (`VALIDATION` code) клиент получает сырое сообщение Elysia.

**Исправление:** добавить глобальный `onError` в корневой app:

```typescript
app.onError(({ code, error, set }) => {
  if (code === "VALIDATION") {
    set.status = 422;
    return { message: "validation_error", error: error.message };
  }
  if (code === "NOT_FOUND") {
    set.status = 404;
    return { message: "not_found" };
  }
  logger.error("Необработанная ошибка", error);
  set.status = 500;
  return { message: "internal_error" };
});
```

---

### 6. Дублирование проверки `if (!user)` внутри guard

Во всех модулях (`quiz`, `user`, `bids`, `payment`, `statistics`) каждый handler внутри `.guard()` повторно проверяет `if (!user) { set.status = 401; return ... }`, хотя guard уже обрабатывает авторизацию.

**Проблема:** guard не возвращает early return при `user === null` (только при отсутствии токена). Если токен есть, но невалиден — `getUserFromToken()` вернёт `null`, guard не прервётся, и нужна проверка в handler.

**Исправление:** добавить проверку `if (!user)` прямо в `beforeHandle`:

```typescript
async beforeHandle(ctx) {
  if (!ctx.cookie.token.value) {
    ctx.set.status = 401;
    return { message: "failed", error: "Unauthorized" };
  }
  const user = await AuthService.getUserFromToken(ctx.cookie.token.value.toString());
  if (!user) {
    ctx.set.status = 401;
    return { message: "failed", error: "Unauthorized" };
  }
  ctx.store.user = user;
}
```

Тогда внутри handlers `ctx.store.user` гарантированно не `null`.

---

### 7. Ручной парсинг файлов вместо `t.File()`

`src/modules/user/index.ts:306-329` — сложная логика извлечения файла из FormData/body с fallback-ами и `parser: 'multipart/form-data'`.

Elysia 1.4+ поддерживает `t.File()` и `t.Files()` с встроенной валидацией MIME и размера.

**Исправление:**

```typescript
.post("/upload-file", async ({ body }) => {
  const file = body.file; // уже File
  // ...
}, {
  body: t.Object({
    file: t.File({ maxSize: "50m" }),
  }),
})
```

---

### 8. Отсутствие response schemas на некоторых endpoints

| Файл | Строка | Endpoint |
|------|--------|----------|
| `src/modules/payment/index.ts` | 202-257 | `GET /status/:paymentId` — нет response |
| `src/modules/payment/index.ts` | 258-286 | `GET /up-limits` — нет response |
| `src/modules/bids/index.ts` | 260-353 | `GET /export` — нет response schema (возвращает Response напрямую) |

Без response schema нет валидации ответа и нет описания в OpenAPI.

---

### 9. Дублирование inline-схем ошибок

Повторяется во всех модулях:

```typescript
401: t.Object({ message: t.String(), error: t.String() })
```

**Исправление:** вынести в общую модель через `.model()` или в shared файл:

```typescript
// shared/error-models.ts
export const ErrorResponse = t.Object({ message: t.String(), error: t.Optional(t.String()) });
export const UnauthorizedResponse = t.Object({ message: t.String() });
```

---

### 10. `session.service.ts:7` — пустая строка как fallback для JWT_SECRET

```typescript
const JWT_SECRET = typeof Bun !== "undefined" ? Bun.env.JWT_SECRET : process.env.JWT_SECRET || "";
```

При отсутствии JWT_SECRET используется пустая строка. Хотя `getSecretKey()` бросит ошибку позже, лучше fail-fast.

**Исправление:** убрать `|| ""`, бросать ошибку при инициализации модуля.

---

### 11. Логирование чувствительных данных

| Файл | Строка | Что логируется |
|------|--------|----------------|
| `src/modules/payment/index.ts` | 22-25 | URL webhook-а с параметрами платежа |
| `src/services/mail.service.ts` | 125-128 | SMTP host, port, user |

**Исправление:** маскировать чувствительные параметры в логах.

---

### 12. Валидация query параметров вручную вместо TypeBox

`src/modules/quiz/index.ts:82-87`:

```typescript
const parseLimit = parseInt(query.limit ?? "10", 10);
const limit = parseLimit > 10 ? 10 : parseLimit;
```

**Исправление:** использовать `t.Numeric()` с `maximum`/`minimum`:

```typescript
query: t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10, default: 10 })),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
})
```

---

### 13. Hardcoded URL-ы в Telegram-ботах

| Файл | Строка | URL |
|------|--------|-----|
| `src/services/crm-bot.service.ts` | 74, 89 | `https://t.me/Quiz_gramm_bot?startapp=...` |
| `src/services/quiz-bot.service.ts` | 53, 59 | `https://t.me/Quiz_gram_bot?startapp=...`, `https://quizgram.site` |

**Исправление:** вынести в переменные окружения (`BOT_MAIN_URL`, `WEB_APP_URL`).

---

## Средние (NICE TO HAVE)

### 14. Нет `.derive()` или `.macro()` для авторизации

Каждый модуль дублирует `.state("user") + .guard({ beforeHandle })`. Elysia предоставляет `.derive()` и `.macro({ requireAuth })` для уменьшения бойлерплейта.

**Рекомендация:** создать общий auth-плагин:

```typescript
// shared/auth.plugin.ts
export const authPlugin = new Elysia({ name: "auth" })
  .derive(async ({ cookie }) => {
    const token = cookie.token.value;
    if (!token) return { currentUser: null };
    return { currentUser: await AuthService.getUserFromToken(token.toString()) };
  });
```

---

### 15. Дублирование cookie-логики в auth модуле

`src/modules/auth/index.ts` — логика установки cookie повторяется в `/login`, `/registration`, `/telegram/login`, `/telegram/register` (строки 39-46, 103-110, 304-311, 362-368). Одинаковый `maxAge`, `httpOnly`, `secure`, `sameSite`, `path`.

**Исправление:** вынести в хелпер `setAuthCookie(cookie, token, remember)`.

---

### 16. `src/modules/bids/service.ts` — нет валидации enum-значений status

```typescript
status: t.Optional(t.String())
```

Принимает произвольные строки. Должен быть enum: `"new" | "seen" | "processing" | "completed"`.

---

### 17. Кэш дашборда — TTL 5 секунд

`src/modules/quiz/service.ts:110` — `expires: Date.now() + 5 * 1000`. Слишком короткий TTL, кэш практически не работает.

**Рекомендация:** увеличить до 30-60 секунд.

---

### 18. Запрос без `.limit()` в `getQuizFilters`

`src/modules/quiz/service.ts:137-155` — `SELECT uid, name FROM quiz WHERE ...` без LIMIT. Может вернуть тысячи записей.

---

### 19. IP-валидация некорректна

`src/services/ip-location.service.ts:61`:

```typescript
/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
```

Пропускает невалидные IP вроде `999.999.999.999`. Нужна проверка октетов < 256.

---

### 20. UUID-валидация по длине вместо формата

`src/services/crm-bot.service.ts:113`: `if (text.length === 36)` — проверка длины, а не формата UUID. Пропустит любую строку длиной 36.

В `src/modules/quiz/index.ts` — аналогично: `uid.length !== 36`. Хотя TypeBox schema тоже проверяет только `minLength: 36, maxLength: 36`.

**Исправление:** использовать `t.String({ format: "uuid" })` или regex `^[0-9a-f]{8}-...`.

---

### 21. Бизнес-логика в контроллере

`src/modules/payment/index.ts:384-395` — запрос к БД напрямую из контроллера (поиск `finalDayAt` после отмены подписки). Нарушает паттерн: контроллер не должен обращаться к БД.

**Исправление:** перенести в `PaymentService.cancelSubscription()` — пусть возвращает `finalDayAt`.

---

### 22. Logger — async `writeLog` не awaited

`src/lib/logger.ts:125-137` — методы `debug/info/warn/error` вызывают `this.writeLog()` без `await`. При graceful shutdown последние логи могут быть потеряны.

**Рекомендация:** добавить метод `flush()` и вызывать его при shutdown.

---

### 23. Нет `onRequest` логирования

Нет middleware для логирования входящих запросов (method, path, duration). Полезно для мониторинга и отладки.

**Рекомендация:**

```typescript
app.onRequest(({ request }) => {
  logger.debug("Входящий запрос", { method: request.method, url: request.url });
});
```

---

### 24. Telegram JSON.parse без try-catch

`src/services/telegram.service.ts:130`:

```typescript
const user: TelegramUser = JSON.parse(decodeURIComponent(userStr));
```

Ошибка парсинга не обработана, приведёт к unhandled exception.

---

### 25. Непоследовательный soft delete

`src/modules/quiz/service.ts:343-356` — для вопросов квиза используется `db.delete()` (hard delete), в то время как квизы удаляются через `deletedAt` (soft delete).

---

## Итого

| Приоритет | Кол-во | Категории |
|-----------|--------|-----------|
| Критичные | 4 | `any`/`unknown` типы, `console.log`, rate limiting, `@ts-ignore` |
| Важные | 9 | Elysia паттерны, безопасность, валидация, дублирование |
| Средние | 12 | Архитектура, производительность, edge-cases |
