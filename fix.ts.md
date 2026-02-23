# TypeScript Type Fixes

Список всех мест, где нужно исправить использование `any`, `unknown`, `never` и `as`.

## Приоритеты

1. **Критично** - `any` типы в бизнес-логике
2. **Важно** - `unknown` и необоснованные `as`
3. **Низкий** - `as` в допустимых случаях (namespace imports, catch blocks)

---

## 1. `any` - КРИТИЧНО (должны быть заменены на конкретные типы)

### pkg/api

#### scripts/mock-quiz-bids.ts

- **Строка 46**: `function generateAnswerForQuestion(question: any): any`
  - Заменить на типы из Quiz entities
- **Строка 109**: `subQuestions.map((subQ: any) => ...`
  - Типизировать как `QuizQuestion[]`
- **Строка 127**: `function generateContacts(contactsForm: any[] | null, ...)`
  - Типизировать как `ContactForm[] | null`
- **Строки 191, 192, 276, 277, 316, 317, 361**: Параметры `questions: any[]` и `contactsForm: any[] | null`
  - Использовать типы из Quiz/Bid entities
- **Строка 511**: `contacts[0].form as any[]`
  - Убрать `as any[]`, типизировать правильно

#### src/index.ts

- **Строка 27**: `let appInstance: any = null;`
  - Типизировать как `Elysia | null`

#### src/lib/logger.ts

- **Строка 124**: `debug(message: string, data?: any, traceId?: string)`
  - Заменить `any` на `Record<string, unknown>` или конкретный тип
- **Строка 136**: `error(message: string, error?: any, data?: Record<string, any>, ...)`
  - `error?: any` → `error?: Error | unknown`
  - `Record<string, any>` → `Record<string, unknown>`

#### src/modules/statistics/service.ts

- **Строка 399**: `const info = bid.info as any;`
  - Создать интерфейс `BidInfo` с полем `dropoutQuestionUid`
- **Строка 405**: `questions.find((q: any) => ...)`
  - Типизировать как `QuizQuestion[]`

#### src/modules/scheduler/service.ts

- **Строка 193**: `private static analyzeBidDropout(answer: any, questions: any): any | null`
  - Типизировать все параметры и возвращаемое значение

#### src/modules/public/service.ts

- **Строка 255**: `const initialAnswer: any[] = [];`
  - Типизировать как `StoredAnswerArray`
- **Строка 517**: `(ans: any) => ans.question_uid === body.question_uid`
  - Типизировать элемент массива
- **Строка 520**: `let updatedAnswers: any[];`
  - Типизировать как `StoredAnswerArray`

#### src/modules/quiz/service.ts

- **Строки 270-274**: Типы в объекте возврата
  ```typescript
  startPage?: any;
  question?: any;
  contact?: any;
  thxPage?: any;
  ```

  - Использовать типы из Quiz entity

#### src/modules/user/index.ts

- **Строка 321**: `const bodyFile = (ctx.body as any).file;`
  - Создать интерфейс для body с полем `file`

#### src/services/ip-location.service.ts

- **Строка 18**: `static getClientIp(request: Request, server?: any): string | null`
  - Типизировать `server` (вероятно `Server` из Bun)
- **Строка 201**: `static async getLocationFromRequest(request: Request, server?: any)`
  - Типизировать `server`

#### src/services/export.service.ts

- **Строка 16**: `info?: any | null;`
  - Создать интерфейс для `info`
- **Строка 47**: `const escapeCSV = (value: any): string`
  - `value: unknown`

#### src/services/telegram.service.ts

- **Строка 163**: `static extractInitData(headers: Record<string, string>, body?: any): string`
  - Типизировать `body`

### pkg/app

#### src/routeTree.gen.ts

- **Строки 41-157**: Множество `} as any)`
  - **АВТОГЕНЕРИРОВАННЫЙ ФАЙЛ** - пропустить или настроить генератор типов

#### src/entities/Bid/bid.type.ts

- **Строки 19, 60-65**: Поля с типом `any`
  ```typescript
  info?: any | null;
  data: any;
  questions?: any | null;
  contactsForm?: any[] | null;
  userInfo?: any | null;
  ```

  - Создать конкретные интерфейсы для каждого поля

#### src/entities/Bid/useBids.tsx

- **Строки 100, 105, 107, 137, 142, 144**: Колбэки с `(oldData: any)`, `(page: any)`, `(bid: any)`
  - Типизировать через generics TanStack Query

#### src/hooks/useTelegramAuth.ts

- **Строки 91, 153**: `catch (err: any)`
  - **ДОПУСТИМО** - в catch блоках можно оставить `any` или заменить на `unknown`

#### src/entities/User/useUser.tsx

- **Строка 24**: `catch (err: any)`
  - **ДОПУСТИМО** - в catch блоках

#### src/pages/TelegramAuth/\*.tsx

- **Строки 40, 64, 90**: `catch (err: any)` в EmailInput.tsx, EmailVerification.tsx
  - **ДОПУСТИМО** - в catch блоках

#### src/pages/ForgotPassword.tsx

- **Строка 115**: `catch (err: any)`
  - **ДОПУСТИМО**

#### src/components/otp-form.tsx

- **Строки 57, 78, 90, 108**: `catch (err: any)`
  - **ДОПУСТИМО**

#### src/components/signup-form.tsx

- **Строка 105**: `catch (err: any)`
  - **ДОПУСТИМО**

#### src/components/bid-report/BidsReportPage.tsx

- **Строки 175, 206, 219**: `prev as any`, деструктуризация поисковых параметров
  - Типизировать через TanStack Router search params

#### src/components/bid-report/BidDetailsDrawer/ui/\*.tsx

- **AnswerRenderer.tsx (13, 24, 37, 51, 55)**: Параметры `answer: any`, `question?: any`
  - Создать интерфейс `Answer` и `Question`
- **JsonAnswer.tsx (1)**: `answer: any`
  - Типизировать
- **FileAnswerNew.tsx (1)**: `answer: { files: any[]; answer: any }`
  - Типизировать `files` и `answer`
- **TelegramUserSection.tsx (5)**: `userInfo: any`
  - Создать интерфейс `TelegramUser`
- **AnswerSection.tsx (7, 15, 40)**: `answer: { files: []; answer: any }`, `content: any`, `question: any`
  - Типизировать все

#### src/lib/http/index.ts

- **Строка 32**: `(error as any).requiresRegistration = true;`
  - Создать кастомный класс ошибки с полем `requiresRegistration`

#### src/routes/telegram-auth.tsx

- **Строка 147**: `navigate({ to: savedTarget as any });`
  - Исправить типизацию TanStack Router

#### src/routes/\_\_root.tsx

- **Строка 52**: `navigate({ to: decodedPath as any });`
  - Исправить типизацию TanStack Router

### pkg/tg-quiz

#### src/App.context.provider.tsx

- **Строка 163**: `(item: any) =>`
  - Типизировать через Quiz types
- **Строка 169**: `(a: any) =>`
  - Типизировать
- **Строка 202**: `const answerArray = answerValue as any[];`
  - Заменить на конкретный тип ответа

---

## 2. `unknown` - ВАЖНО (заменить на конкретные типы где возможно)

### pkg/api

#### src/modules/bids/service.ts

- **Строки 27, 38-43**: Поля с типом `unknown`
  ```typescript
  info: unknown | null;
  data: unknown;
  questions: unknown;
  contacts: unknown;
  contactsForm: unknown;
  userInfo: unknown;
  ```

  - Создать интерфейсы для каждого поля

#### src/modules/bids/service.ts (SQL casts)

- **Строки 192, 209, 245, 380, 433, 531, 612**: `as unknown as Type`
  - **ДОПУСТИМО** - SQL результаты через Drizzle ORM

#### src/modules/public/service.ts

- **Строки 32, 38**: `{ type: string; [key: string]: unknown }`
  - Создать конкретные типы для answers
- **Строки 513, 691**: `(existingRecord.answer as unknown as StoredAnswerArray)`
  - **ДОПУСТИМО** - SQL алиасы

#### src/modules/quiz/service.ts

- **Строки 249, 253**: `(tx as unknown as typeof database)`
  - **ДОПУСТИМО** - SQL транзакции

#### src/services/session.service.ts

- **Строки 38, 58, 83, 117**: `as unknown as Record<string, unknown>`, `as unknown as JWTPayload<T>`
  - **ДОПУСТИМО** - JWT payload

#### src/services/mail.service.ts

- **Строка 136**: `const smtpError = error as unknown;`
  - Заменить на `unknown` или конкретный тип ошибки SMTP

#### scripts/recalculate-quiz-stats.ts

- **Строка 46**: `(statsResult as unknown as Array<{...}>)`
  - **ДОПУСТИМО** - SQL результаты

#### scripts/mock-quiz-bids.ts

- **Строка 402**: `(statsResult as unknown as Array<{...}>)`
  - **ДОПУСТИМО** - SQL результаты

### pkg/app

#### src/types/telegram-webapp.d.ts

- **Строки 81-82**: `onEvent(eventType: string, eventHandler: (event: unknown) => void)`
  - **ДОПУСТИМО** - события Telegram WebApp

#### src/pages/EditQuiz/index.tsx

- **Строка 177**: `(response.data || response) as unknown as QuizUpdateResponse`
  - Убрать `as unknown as`, использовать только `as QuizUpdateResponse` или `satisfies`

#### src/components/ui/chart.tsx

- **Строка 292**: `function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string)`
  - **ДОПУСТИМО** - generic payload от Recharts

#### src/app/db/index-db.ts

- **Строка 47**: `export async function set(key: string, value: unknown): Promise<void>`
  - **ДОПУСТИМО** - IndexedDB generic storage
- **Строка 93**: `const parsedValue = JSON.parse(result.value) as T;`
  - **ДОПУСТИМО** - JSON.parse с generic

### pkg/tg-quiz

#### src/App.context.tsx

- **Строка 7**: `startPage: unknown;`
  - Заменить на `QuizStartPage`

#### src/ContentLayout.tsx

- **Строка 25**: `const handleContentSafeAreaChanged = (event: unknown) => {`
  - **ДОПУСТИМО** - Telegram event

#### src/lib/telegram-webapp.ts

- **Строка 86**: `params[key] = (initData as unknown as Record<string, unknown>)[key];`
  - **ДОПУСТИМО** - dynamic Telegram data

#### src/ui/QuestionPage/index.tsx

- **Строка 101**: `answer: unknown;`
  - Заменить на конкретный тип ответа

#### src/types/telegram-webapp.d.ts

- **Строки 81-82**: `onEvent(eventType: string, eventHandler: (event: unknown) => void)`
  - **ДОПУСТИМО** - события Telegram WebApp

---

## 3. `never` - ПРОВЕРИТЬ

### pkg/app/src/components/ui/chart.tsx

- **Строки 14-15**:
  ```typescript
  | { color?: string; theme?: never }
  | { color?: never; theme: Record<keyof typeof THEMES, string> }
  ```

  - **ДОПУСТИМО** - discriminated union для взаимоисключающих свойств

### pkg/app/src/components/otp-form.tsx

- Использование `never` не найдено в grep результатах

### pkg/app/src/lib/http/index.ts

- Использование `never` не найдено в grep результатах

---

## 4. `as` - ЗАМЕНИТЬ НА `satisfies` ГДЕ ВОЗМОЖНО

### Допустимые случаи (оставить `as`)

#### Namespace imports (ДОПУСТИМО)

```typescript
import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as DateUtils from '../../lib/date-utils';
// ... все остальные namespace imports в ui компонентах
```

#### catch blocks (ДОПУСТИМО)

```typescript
catch (err: any) { ... }
// или
} catch (error) {
  logger.error("message", error as Error, ...);
}
```

#### SQL результаты через Drizzle (ДОПУСТИМО)

```typescript
const result = sqlResult as unknown as SpecificType;
```

### Требуют замены на `satisfies` или исправления типов

#### pkg/tg-quiz

##### src/lib/telegram-webapp.ts

- **Строка 163**: `return result as InitDataUnsafe;`
  - Заменить на `satisfies InitDataUnsafe`

##### src/lib/media-preloader.ts

- **Строка 20**: `const startPage = quiz.startPage as QuizStartPageStandard;`
  - Использовать type guard или discriminated union
- **Строки 36, 51, 59, 85**: Type assertions для вопросов
  - Создать type guards или использовать discriminated unions

##### src/ui компоненты (множество файлов)

- Паттерн: `const question = questions[current] as QuizQuestionType;`
  - Создать type guard функцию `isQuizQuestionType(question): question is QuizQuestionType`
  - Или использовать discriminated union по полю `type`

#### pkg/app

##### src/pages/EditQuiz/index.tsx

- **Строки 103, 124, 145, 177**: `setQuiz({ ...quiz, ... } as Quiz)`
  - Исправить типы чтобы не требовался `as`, или использовать `satisfies`

##### src/pages/EditQuiz/ui/\*.tsx (множество файлов)

- Паттерн: `const content = question?.content as QuizQuestionType;`
  - Использовать type guards или discriminated unions
- Паттерн: `setQuiz({ ...quiz, ... } as Quiz)`
  - Исправить типы

##### src/components/dwonload-drawer/ui/resize-img.tsx

- **Строка 319**: `setMode(value as ResizeMode)`
  - Добавить runtime валидацию или использовать `satisfies`

##### src/components/ui/sonner.tsx

- **Строка 16**: `theme={theme as ToasterProps["theme"]}`
  - Исправить типизацию `theme`

##### src/routes/telegram-auth.tsx, \_\_root.tsx

- **Строки 147, 52**: `navigate({ to: ... as any })`
  - Исправить типизацию TanStack Router

##### src/app/db/index-db.ts

- **Строка 28**: `const db = (event.target as IDBOpenDBRequest).result;`
  - **ДОПУСТИМО** - DOM events
- **Строка 93**: `const parsedValue = JSON.parse(result.value) as T;`
  - **ДОПУСТИМО** - JSON.parse с generic

##### src/components/bid-report/BidInfoDrawer.tsx

- **Строка 94**: `const info = bidDetails.info as DropoutInfo;`
  - Создать type guard `isDropoutInfo(info): info is DropoutInfo`

##### src/pages/EditQuiz/ui/QuestionPage/ui/EmptyQuestion.tsx

- **Строки 27, 39**: `onClick={() => updateTypeQuestion(type.type as QuizQuestionType)}`
  - Исправить типизацию `type.type`

#### pkg/api

##### src/modules/statistics/index.ts

- **Строка 11**: `.state("user", null as User | null)`
  - **ДОПУСТИМО** - Elysia state
- **Строка 25**: `ctx.store.user = (user || null) as User | null;`
  - Исправить типизацию, чтобы не требовался `as`

##### src/services/quiz-file.service.ts

- **Строка 107**: `error as Error,`
  - **ДОПУСТИМО** - в logger.error

##### src/modules/scheduler/service.ts

- **Строка 159**: `logger.error("...", error as Error, ...)`
  - **ДОПУСТИМО** - в logger.error
- **Строка 179**: `error as Error,`
  - **ДОПУСТИМО**

##### src/services/export.service.ts

- **Строки 129, 239**: `logger.error("...", error as Error, ...)`
  - **ДОПУСТИМО**

##### src/index.ts

- **Строки 148, 170, 207, 237, 268**: `error as Error,`
  - **ДОПУСТИМО** - в logger.error

---

## План исправлений по приоритетам

### Этап 1: Критичные `any` в API (бизнес-логика)

1. **src/lib/logger.ts** - исправить типы параметров
2. **src/modules/bids/service.ts** - создать интерфейсы для `BidDetail`, `BidListItem`
3. **src/modules/public/service.ts** - типизировать answers
4. **src/modules/quiz/service.ts** - типизировать возвращаемые данные
5. **src/modules/scheduler/service.ts** - типизировать `analyzeBidDropout`
6. **src/modules/statistics/service.ts** - создать интерфейс `BidInfo`

### Этап 2: `any` в Frontend entities

7. **src/entities/Bid/bid.type.ts** - создать интерфейсы для всех полей
8. **src/entities/Bid/useBids.tsx** - типизировать TanStack Query колбэки
9. **src/components/bid-report/** - типизировать все `answer` и `question`

### Этап 3: `unknown` → конкретные типы

10. **src/modules/bids/service.ts (API)** - конкретные типы для `info`, `data`, etc.
11. **src/App.context.tsx (tg-quiz)** - типизировать `startPage`
12. **src/ui/QuestionPage/index.tsx (tg-quiz)** - типизировать `answer`

### Этап 4: Замена `as` на `satisfies` или type guards

13. **Создать type guards** для Quiz questions (discriminated unions)
14. **Исправить setQuiz** в EditQuiz компонентах
15. **TanStack Router** - исправить типизацию `navigate`

### Этап 5: Scripts и тесты

16. **scripts/mock-quiz-bids.ts** - типизировать все функции
17. **test/** - типизировать тестовые данные

---

## Исключения (НЕ требуют исправления)

1. **namespace imports** (`import * as React`)
2. **catch blocks** (`catch (err: any)` или `error as Error` в logger)
3. **SQL результаты** Drizzle ORM (`as unknown as Type`)
4. **Автогенерированные файлы** (routeTree.gen.ts)
5. **DOM events** (`event.target as HTMLElement`)
6. **JSON.parse** с generics (`JSON.parse(...) as T`)
7. **Telegram WebApp events** (`event: unknown`)
8. **UI библиотеки** (shadcn/ui components - уже типизированы библиотекой)

---

## Метрики

- **any**: ~80+ использований (исключая автоген файлы)
- **unknown**: ~40+ использований (половина - допустимые случаи)
- **never**: 2 использования (оба допустимые)
- **as**: ~150+ использований (большинство - namespace imports, многие требуют исправления)

**Оценка работы**: ~2-3 дня полной типизации
