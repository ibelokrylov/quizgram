# План интеграции Telegram Mini App в pkg/app

## Цель

Интегрировать поддержку Telegram Mini App в основное приложение (pkg/app) для обработки deep links из Telegram и автоматической авторизации/регистрации пользователей через Telegram.

## Контекст

- В API отправляется сообщение с deep link: `https://t.me/Quiz_gramm_bot?startapp=L2FwcC9iaWQvcmVwb3J0P2xpbWl0PTEwJmlzRnVsbD10cnVlJmtleT1iMzQ1NTBlNy1jMzgxLTRiOWItYjNhMC0xM2NhZTkyZGRkZGQ`
- Параметр `startapp` содержит base64-encoded путь в приложении
- Нужно обработать этот параметр и направить пользователя на нужный URL
- Если пользователь не авторизован - зарегистрировать/авторизовать через Telegram

## Этапы реализации

### Этап 1: Установка и настройка Telegram SDK ✅

- [x] Добавить официальный скрипт Telegram в `index.html`: `<script src="https://telegram.org/js/telegram-web-app.js?59"></script>`
- [x] Скопировать типы для Telegram WebApp из `pkg/tg-quiz/src/types/telegram-webapp.d.ts` в `pkg/app/src/types/telegram-webapp.d.ts`
- [x] Создать файл `src/lib/telegram-sdk.ts` для инициализации SDK (аналогично `pkg/tg-quiz/src/init-telegram-sdk.tsx`)
- [x] Интегрировать инициализацию SDK в `src/main.tsx` (вызов `initTelegramSdk()`)
- [x] Добавить проверку наличия Telegram окружения (для dev режима - graceful degradation)

**Резюме выполненной работы:**

- Добавлен официальный скрипт Telegram WebApp в `index.html` (версия ?59)
- Скопированы типы TypeScript для Telegram WebApp API в `src/types/telegram-webapp.d.ts`
- Создан модуль `src/lib/telegram-sdk.ts` с функциями:
  - `getTelegramWebApp()` - получение экземпляра Telegram WebApp
  - `isTelegramAvailable()` - проверка доступности Telegram окружения
  - `initTelegramSdk()` - инициализация SDK (ready, expand, requestFullscreen)
- Интегрирована инициализация в `src/main.tsx` - вызывается при загрузке приложения
- Реализована graceful degradation - при отсутствии Telegram окружения приложение работает нормально без ошибок

### Этап 2: Обработка deep links (startapp параметр) ✅

- [x] Создать утилиту `src/lib/telegram-deep-link.ts` для парсинга параметра `startapp`
- [x] Реализовать функцию декодирования base64 пути из `startapp` (параметр передается в `window.Telegram.WebApp.initDataUnsafe.start_param`)
- [x] Также проверить URL параметр `tgWebAppStartParam` (GET параметр из URL)
- [x] **Важно**: Все операции только если `window.Telegram?.WebApp` доступен, иначе ничего не делать
- [x] Создать обработчик в `src/routes/__root.tsx` для перехвата deep links (только при наличии Telegram)
- [x] Сохранять целевой URL в sessionStorage/localStorage для редиректа после авторизации (только при наличии Telegram)
- [x] Обработать случай, когда пользователь открывает приложение через Telegram Mini App (проверка `window.Telegram?.WebApp` обязательна)

**Резюме выполненной работы:**

- Создан модуль `src/lib/telegram-deep-link.ts` с функциями:
  - `base64urlToBase64()` - преобразование base64url в base64 (замена - на +, \_ на /, добавление padding =)
  - `decodeStartAppParam()` - декодирование base64url строки в исходный путь (использует atob для декодирования)
  - `getStartAppParam()` - получение параметра startapp из двух источников:
    1. `window.Telegram.WebApp.initDataUnsafe.start_param` (приоритет)
    2. URL параметр `tgWebAppStartParam` (fallback)
  - `processTelegramDeepLink()` - основная функция обработки: декодирует startapp и сохраняет в sessionStorage
  - `getSavedDeepLinkTarget()` - получение сохраненного пути для редиректа
  - `clearSavedDeepLink()` - очистка сохраненного пути после использования
- Все функции проверяют наличие Telegram окружения через `isTelegramAvailable()` - если Telegram недоступен, возвращают null
- Интегрирована обработка в `src/routes/__root.tsx`:
  - При монтировании компонента вызывается `processTelegramDeepLink()`
  - Deep link декодируется и сохраняется в sessionStorage под ключом `telegram_deep_link_target`
  - Редирект не выполняется сразу - путь сохраняется для использования после авторизации
- Формат совместим с API: в API путь кодируется в base64, затем преобразуется в base64url (замена + на -, / на \_, удаление =). В frontend выполняется обратное преобразование.

### Этап 3: API endpoints для Telegram авторизации ✅

- [x] Создать endpoint `/v1/auth/telegram/login` в `pkg/api/src/modules/auth/index.ts`
  - Принимает `initData` от Telegram
  - Проверяет валидность данных через Telegram Bot API
  - Ищет пользователя по `telegramId`
  - Если найден - авторизует и возвращает токен
  - Если не найден - возвращает статус "registration_required"
- [x] Создать endpoint `/v1/auth/telegram/register` в `pkg/api/src/modules/auth/index.ts`
  - Принимает `initData` и `email`
  - Проверяет валидность данных через Telegram Bot API
  - Создает пользователя с `telegramId` из Telegram данных
  - Отправляет код верификации на email
  - Возвращает токен (пользователь авторизован, но email не подтвержден)
- [x] Добавить валидацию `initData` через Telegram Bot API
- [x] **Важно**: Использовать токен `BOT_CRM_TOKEN` для валидации (так как deep links идут через CRM-бота `@Quiz_gramm_bot`)
- [x] Обновить `pkg/api/src/services/telegram.service.ts`:
  - Изменить метод `getBotToken()` чтобы использовать `BOT_CRM_TOKEN` вместо `BOT_QUIZ_TOKEN`
  - Или создать отдельный метод `getCrmBotToken()` для валидации initData от CRM-бота
- [x] Обновить модели в `pkg/api/src/modules/auth/model.ts`:
  - `telegramLoginBody` - для логина через Telegram
  - `telegramRegisterBody` - для регистрации через Telegram

**Резюме выполненной работы:**

- Обновлен `pkg/api/src/services/telegram.service.ts`:
  - Добавлен метод `getCrmBotToken()` для получения токена CRM-бота (`BOT_CRM_TOKEN`)
  - Метод `validateInitData()` теперь использует `getCrmBotToken()` вместо `getBotToken()`
  - Старый метод `getBotToken()` помечен как deprecated
- Добавлены модели в `pkg/api/src/modules/auth/model.ts`:
  - `telegramLoginBody` - тело запроса для логина (initData)
  - `telegramLoginSuccessResponse` - успешный ответ при логине
  - `telegramLoginErrorResponse` - ответ при ошибке/необходимости регистрации (с полем `requiresRegistration`)
  - `telegramRegisterBody` - тело запроса для регистрации (initData, email, name, language, referralCode)
  - `telegramRegisterSuccessResponse` - успешный ответ при регистрации
  - `telegramRegisterErrorResponse` - ответ при ошибке регистрации
- Добавлены методы в `pkg/api/src/modules/auth/service.ts`:
  - `findByTelegramId()` - поиск пользователя по telegramId
  - `telegramLogin()` - авторизация через Telegram:
    - Валидирует initData через TelegramService
    - Ищет пользователя по telegramId
    - Возвращает null если пользователь не найден (требуется регистрация)
    - Генерирует токен сессии при успешной авторизации
  - `telegramRegister()` - регистрация через Telegram:
    - Валидирует initData через TelegramService
    - Проверяет существование email и telegramId
    - Создает пользователя с telegramId из Telegram данных
    - Формирует имя из данных Telegram (firstName + lastName)
    - Определяет язык из Telegram или payload
    - Генерирует случайный пароль (поле обязательное, но не используется)
    - Создает записи в user_payment и user_notification
    - Отправляет код верификации на email
    - Генерирует токен сессии
- Добавлены endpoints в `pkg/api/src/modules/auth/index.ts`:
  - `POST /v1/auth/telegram/login`:
    - Принимает `initData`
    - Вызывает `AuthService.telegramLogin()`
    - Если пользователь не найден - возвращает 404 с `requiresRegistration: true`
    - При успехе - устанавливает cookie с токеном (длинная сессия ~1 год)
    - Возвращает данные пользователя
  - `POST /v1/auth/telegram/register`:
    - Принимает `initData`, `email`, опционально `name`, `language`, `referralCode`
    - Вызывает `AuthService.telegramRegister()`
    - Устанавливает cookie с токеном (длинная сессия ~1 год)
    - Возвращает данные пользователя

### Этап 4: UI для регистрации через Telegram ✅

- [x] Создать страницу `src/routes/telegram-auth.tsx` для обработки Telegram авторизации
- [x] Создать компонент `src/pages/TelegramAuth/EmailInput.tsx`:
  - Форма ввода email
  - Валидация email через Zod
  - Отправка запроса на `/v1/auth/telegram/register`
  - Обработка ошибок (email уже занят и т.д.)
- [x] Создать компонент `src/pages/TelegramAuth/EmailVerification.tsx`:
  - Форма ввода кода верификации (6 цифр)
  - Использовать компонент `input-otp` (уже установлен)
  - Отправка запроса на `/v1/user/verification-email`
  - После успешной верификации - редирект на сохраненный URL
- [x] Добавить переводы в `src/locales/ru/common.json` и `src/locales/en/common.json`:
  - `telegram.auth.title`
  - `telegram.auth.email.input`
  - `telegram.auth.email.verification.title`
  - `telegram.auth.email.verification.code`
  - `telegram.auth.email.verification.resend`
  - И другие необходимые ключи

**Резюме выполненной работы:**

- Создана страница `src/routes/telegram-auth.tsx`:
  - Проверяет доступность Telegram окружения (редирект на главную если недоступно)
  - Если пользователь уже авторизован - проверяет deep link и редиректит
  - При монтировании пытается авторизовать через Telegram (`/v1/auth/telegram/login`)
  - Управляет состояниями: loading, email-input, email-verification, success
  - После успешной авторизации/верификации редиректит на сохраненный deep link или `/app`
- Создан компонент `src/pages/TelegramAuth/EmailInput.tsx`:
  - Форма ввода email с валидацией через Zod
  - Отправка запроса на `/v1/auth/telegram/register` с initData и email
  - Обработка ошибок с отображением сообщений
  - Поддержка отправки по Enter
  - Интеграция с toast для уведомлений
- Создан компонент `src/pages/TelegramAuth/EmailVerification.tsx`:
  - Форма ввода 6-значного кода через компонент `input-otp`
  - Автоматическая отправка при вводе 6 цифр
  - Отправка запроса на `/v1/user/verification-email`
  - Функция повторной отправки кода (`/v1/user/resend-verification`)
  - Инвалидация кэша пользователя после успешной верификации
  - Интеграция с toast для уведомлений
- Добавлены переводы в `src/locales/ru/common.json` и `src/locales/en/common.json`:
  - `telegram.auth.loading` - сообщение о загрузке
  - `telegram.auth.login.error` - ошибка авторизации
  - `telegram.auth.register.error` - ошибка регистрации
  - `telegram.auth.initData.missing` - отсутствие данных Telegram
  - `telegram.auth.success` - успешная авторизация
  - `telegram.auth.email.*` - все ключи для формы ввода email
  - `telegram.auth.verification.*` - все ключи для формы верификации

### Этап 5: Логика авторизации через Telegram ✅

- [x] Создать хук `src/hooks/useTelegramAuth.ts`:
  - Получение `initData` из `window.Telegram.WebApp.initData`
  - Получение данных пользователя из `window.Telegram.WebApp.initDataUnsafe.user`
  - Проверка наличия Telegram окружения через `window.Telegram?.WebApp`
  - Вызов API для авторизации/регистрации
  - Обновление AuthContext после успешной авторизации
- [x] Обновить `src/entities/User/auth.context.provider.tsx`:
  - Добавить логику проверки Telegram авторизации при загрузке (только если `window.Telegram?.WebApp` доступен)
  - Если пользователь открыл через Telegram Mini App - автоматически пытаться авторизовать
  - Если Telegram недоступен - пропускать эту логику
- [x] Обновить `src/routes/telegram-auth.tsx`:
  - При монтировании проверять наличие Telegram данных через `window.Telegram?.WebApp`
  - Если есть `initData` - пытаться авторизовать
  - Если пользователь не найден - показывать форму ввода email
  - Если пользователь найден - редиректить на сохраненный URL

**Резюме выполненной работы:**

- Создан хук `src/hooks/useTelegramAuth.ts`:
  - `getInitData()` - получение initData из Telegram WebApp
  - `getTelegramUser()` - получение данных пользователя из initDataUnsafe (только для UI)
  - `login()` - авторизация через Telegram:
    - Проверяет доступность Telegram и наличие initData
    - Вызывает `/v1/auth/telegram/login`
    - Возвращает результат с флагом `requiresVerification`
    - Обрабатывает случай `requiresRegistration`
  - `register()` - регистрация через Telegram:
    - Принимает email, опционально name и language
    - Вызывает `/v1/auth/telegram/register`
    - Возвращает результат с флагом `requiresVerification`
  - `loading` - состояние загрузки
  - `isTelegramAvailable` - проверка доступности Telegram
- Обновлен `src/entities/User/auth.context.provider.tsx`:
  - Добавлен useEffect для автоматической проверки Telegram авторизации при загрузке
  - Проверка выполняется только если Telegram доступен и пользователь еще не авторизован
  - При наличии initData автоматически пытается авторизовать через `telegramAuth.login()`
  - При успешной авторизации обновляет AuthContext
  - Если требуется регистрация - ничего не делает (пользователь будет перенаправлен на telegram-auth)
  - Использует cleanup функцию для предотвращения обновления состояния после размонтирования
- Обновлен `src/routes/telegram-auth.tsx`:
  - Использует хук `useTelegramAuth` вместо прямых вызовов API
  - `handleTelegramLogin()` теперь использует `telegramAuth.login()`
  - `handleEmailSubmit()` использует `telegramAuth.register()` с автоматическим извлечением name и language из Telegram данных
  - Упрощена логика обработки результатов
  - Удален локальный state `loading` - используется `telegramAuth.loading`

### Этап 6: Интеграция с существующей системой авторизации ✅

- [x] Обновить `src/entities/User/User.type.ts`:
  - Убедиться, что `telegramId` присутствует в типе
- [x] Обновить `src/lib/http.ts`:
  - Добавить обработку ошибок авторизации для Telegram
- [x] Обновить `src/routes/__root.tsx`:
  - Добавить проверку параметра `startapp` в URL (только если `window.Telegram?.WebApp` доступен)
  - Если есть Telegram и параметр `startapp` - сохранять целевой путь и редиректить на `/telegram-auth`
  - Если пользователь уже авторизован - сразу редиректить на целевой путь
  - Если Telegram недоступен - игнорировать параметр `startapp`

**Резюме выполненной работы:**

- Проверен `src/entities/User/User.type.ts`:
  - Поле `telegramId: z.string().nullable().optional()` уже присутствует в типе User
  - Никаких изменений не требуется
- Обновлен `src/lib/http/index.ts`:
  - Добавлена специальная обработка ошибок для Telegram авторизации
  - При статусе 404 и наличии `requiresRegistration` в ответе создается специальная ошибка с флагом `requiresRegistration`
  - Это позволяет корректно обрабатывать случай, когда пользователь не найден и требуется регистрация
- Обновлен `src/routes/__root.tsx`:
  - Добавлен импорт `AuthContext`, `getStartAppParam`, `isTelegramAvailable` и `useNavigate`
  - Добавлена логика обработки deep links:
    - Проверка доступности Telegram окружения
    - Получение параметра `startapp` через `getStartAppParam()`
    - Обработка deep link через `processTelegramDeepLink()` (сохранение целевого пути)
    - Если пользователь уже авторизован - сразу редирект на целевой путь
    - Если пользователь не авторизован - редирект на `/telegram-auth` (страница сама обработает авторизацию и затем редиректит на сохраненный путь)
    - Если Telegram недоступен - ничего не делаем (игнорируем параметр)
  - Логика интегрирована с AuthContext для проверки статуса авторизации

### Этап 7: Обработка навигации после авторизации ✅

- [x] После успешной авторизации/регистрации:
  - Проверять наличие сохраненного URL из deep link
  - Если есть - редиректить на этот URL
  - Если нет - редиректить на `/app/dashboard`
- [x] Очищать сохраненный URL после использования
- [x] Обрабатывать случаи невалидных deep links (показывать ошибку)

**Резюме выполненной работы:**

- Обновлена функция `processTelegramDeepLink()` в `src/lib/telegram-deep-link.ts`:
  - Добавлена валидация пути через `isValidDeepLinkPath()` перед сохранением
  - Если путь невалиден - возвращает null и не сохраняет его
- Добавлена функция `isValidDeepLinkPath()` в `src/lib/telegram-deep-link.ts`:
  - Проверяет, что путь начинается с `/`
  - Проверяет формат пути (только безопасные символы)
  - Проверяет, что путь начинается с одного из валидных маршрутов приложения (`/app`, `/app/dashboard`, `/app/bid`, и т.д.)
- Обновлена функция `handleSuccessRedirect()` в `src/routes/telegram-auth.tsx`:
  - Валидирует сохраненный путь перед редиректом
  - Если путь невалиден - показывает ошибку через toast и редиректит на `/app/dashboard`
  - Обрабатывает ошибки навигации (try-catch) - если навигация не удалась, показывает ошибку и редиректит на `/app/dashboard`
  - Если нет сохраненного deep link - редиректит на `/app/dashboard` (вместо `/app`)
  - Очищает сохраненный URL после использования через `clearSavedDeepLink()`
- Обновлен `src/routes/__root.tsx`:
  - Добавлена валидация deep link пути перед редиректом
  - Если путь невалиден - показывает ошибку через toast
  - Обрабатывает ошибки навигации с fallback на `/app/dashboard`
- Добавлены переводы:
  - `telegram.auth.deepLink.invalid` - сообщение об ошибке невалидного deep link (русский и английский)

### Этап 8: Тестирование и доработка

- [ ] Протестировать авторизацию существующего пользователя через Telegram
- [ ] Протестировать регистрацию нового пользователя через Telegram
- [ ] Протестировать ввод email и верификацию
- [ ] Протестировать обработку deep links
- [ ] Протестировать навигацию после авторизации
- [ ] Протестировать работу в обычном браузере (без Telegram)
- [x] Добавить обработку ошибок на всех этапах
- [x] Добавить loading состояния

**Резюме выполненных улучшений:**

1. **Обработка ошибок:**
   - Добавлена обработка ошибок в `telegram-auth.tsx` с try-catch блоками для всех асинхронных операций
   - Улучшена обработка ошибок в `processTelegramDeepLink()` с обёрткой в try-catch
   - Добавлена обработка ошибок в `__root.tsx` для обработки deep links
   - Добавлена обработка ошибок в `auth.context.provider.tsx` для автоматической авторизации
   - Все ошибки логируются в консоль и показываются пользователю через toast

2. **Loading состояния:**
   - Улучшен loading экран в `telegram-auth.tsx` с добавлением спиннера
   - Добавлена защита от повторных отправок в `EmailInput.tsx` (проверка `loading`)
   - Добавлена защита от повторных отправок в `EmailVerification.tsx` (проверка `loading` и `resendLoading`)
   - Все кнопки правильно отключаются во время загрузки через `disabled` и `loading` props
   - Input поля отключаются во время загрузки для предотвращения изменений

## Технические детали

### Telegram SDK

- Использовать официальный скрипт из документации: `https://telegram.org/js/telegram-web-app.js?59`
- Скрипт добавляется в `<head>` секцию `index.html`
- После загрузки скрипта доступен глобальный объект `window.Telegram.WebApp`
- Инициализация через `window.Telegram.WebApp.ready()` и `window.Telegram.WebApp.expand()`
- Получение данных:
  - `window.Telegram.WebApp.initData` - строка с подписанными данными (для отправки на сервер)
  - `window.Telegram.WebApp.initDataUnsafe.user` - объект с данными пользователя (для UI)
  - `window.Telegram.WebApp.initDataUnsafe.start_param` - параметр из deep link

### Валидация initData

- Использовать Telegram Bot API для валидации
- Нужен Bot Token из переменных окружения
- Использовать метод `validateWebAppData` или реализовать локально через crypto

### Структура initData

```
user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1234567890&hash=...
```

### API изменения

- Добавить поле `telegramId` в модель регистрации (опционально)
- При регистрации через Telegram - автоматически заполнять `telegramId`
- При авторизации через Telegram - искать по `telegramId`

### Безопасность

- Всегда валидировать `initData` на сервере
- Не доверять данным от клиента
- Использовать HTTPS для всех запросов
- Проверять срок действия `auth_date` (обычно 24 часа)

## Зависимости

### Новые зависимости для pkg/app

- Нет новых зависимостей - используется официальный скрипт Telegram из CDN

### Новые зависимости для pkg/api

- Возможно, библиотека для валидации Telegram WebApp данных (или реализовать через crypto)

## Файлы для создания/изменения

### pkg/app

- `src/lib/telegram-sdk.ts` (новый, аналогично `pkg/tg-quiz/src/init-telegram-sdk.tsx`)
- `src/lib/telegram-deep-link.ts` (новый)
- `src/types/telegram-webapp.d.ts` (новый, скопировать из `pkg/tg-quiz/src/types/telegram-webapp.d.ts`)
- `src/hooks/useTelegramAuth.ts` (новый)
- `src/routes/telegram-auth.tsx` (новый)
- `src/pages/TelegramAuth/EmailInput.tsx` (новый)
- `src/pages/TelegramAuth/EmailVerification.tsx` (новый)
- `index.html` (изменить - добавить скрипт Telegram)
- `src/main.tsx` (изменить)
- `src/routes/__root.tsx` (изменить)
- `src/entities/User/auth.context.provider.tsx` (изменить)
- `src/locales/ru/common.json` (изменить)
- `src/locales/en/common.json` (изменить)

### pkg/api

- `src/modules/auth/index.ts` (изменить)
- `src/modules/auth/service.ts` (изменить)
- `src/modules/auth/model.ts` (изменить)
- Возможно, новый сервис для валидации Telegram данных

## Примечания

- Интеграция должна работать как в Telegram Mini App, так и в обычном браузере (graceful degradation)
- При работе в обычном браузере - показывать стандартную форму логина
- Deep links должны обрабатываться корректно даже если пользователь уже авторизован
- Email верификация обязательна для регистрации через Telegram
