# План работ по интеграции оплаты через UnitPay

## Этап 0 — Подготовка UI

### В `pkg/app/src/components/payment-method-drawer.tsx`

- [x] Добавить информацию о тарифе
  - [x] Название плана
  - [x] Цена
  - [x] Лимит заявок

- [x] Кнопка "Оплатить"
  - [x] Неактивна по умолчанию
  - [x] Становится активной только когда все галочки отмечены

- [x] Чекбокс: "Я принимаю условия пользовательского соглашения и политики конфиденциальности"
  - [x] Не проставлен автоматически
  - [x] Ссылки на документы (terms-of-service, privacy-policy)
  - [ ] Если ссылки не настроены — подсветить предупреждением "Документы отсутствуют"

- [x] Чекбокс: "Я согласен(на) на автоматическое списание {цена} ₽ один раз в месяц с привязанной банковской карты за услугу «Премиум-доступ»"
  - [x] Цена соответствует выбранному тарифу (с учётом upLimit для Pro+)
  - [x] Не проставлен автоматически
  - [x] Добавлена динамика названия услуги:
    - [x] Для PRO: "План PRO"
    - [x] Для PRO+: "План PRO+ с лимитом X заявок"

### В `pkg/app/src/pages/Payment/index.tsx`

- [x] Добавить кнопку отмены подписки
  - [x] Показывается только если у пользователя есть активный платный план
  - [x] При нажатии создаёт отложенный план FREE
  - [x] Показывает информацию о том, когда закончится платный функционал
  - [x] Запрашивает подтверждение через диалог

- [x] Добавить информацию о следующем списании
  - [x] Показывается только для активных платных планов
  - [x] Данные: `user_payment.finalDayAt`
  - [x] Формат: "Следующее списание: DD.MM.YYYY"
  - [x] Если есть отложенный план — "Будет переход на {имя плана} с DD.MM.YYYY"

---

## Этап 1 — Создание платежа

### Настройка переменных окружения

- [x] Добавить в `.env`:
  ```bash
  UNITPAY_PROJECT_ID=123
  UNITPAY_PROJECT_PUBLIC_KEY=123
  UNITPAY_SECRET_KEY=123
  ```

### Backend: Создать endpoint `POST /v1/payment/create`

- [x] В `pkg/api/src/modules/payment/index.ts`:
  - [x] Новый endpoint для создания платежа через UnitPay
  - [x] Проверка авторизации
  - [x] Валидация: `planId`, `upLimitId` (опционально)

- [x] В `pkg/api/src/modules/payment/service.ts`:
  - [x] Метод `createPayment(userId, planId, upLimitId)`
  - [x] Проверить существование плана
  - [x] Рассчитать итоговую цену (plan.price + upLimit.price)
  - [x] Подготовить параметры для UnitPay:
    - [x] `account` — userId
    - [x] `currency` — RUB
    - [x] `sum` — итоговая цена
    - [x] `project` — `UNITPAY_PROJECT_ID`
    - [x] `desc` — описание платежа
    - [x] `signature` — хеш по алгоритму UnitPay
  - [x] Создать запись в `payment` со статусом `pending`
  - [x] Сформировать URL для оплаты UnitPay
  - [x] Вернуть `paymentId` и `paymentUrl`

### Frontend: Обновить `payment-method-drawer.tsx`

- [x] Убрать блок "Что включено" с функциями
- [x] Добавить динамику в чекбокс автоматического списания:
  - [x] Для PRO: "План PRO"
  - [x] Для PRO+: "План PRO+ с лимитом X заявок"
- [x] При нажатии на "Оплатить":
  - [x] Показать индикатор загрузки
  - [x] Вызвать `POST /v1/payment/create`
  - [x] Сохранить `paymentId` в localStorage
  - [x] Редирект на `paymentUrl`

  ## Этап 2 — Перенаправление на оплату

- [x] В `payment-method-drawer.tsx`:
  - [x] После успешного создания платежа: `window.location.href = paymentUrl`

- [ ] Настроить redirect URL в личном кабинете UnitPay:
  - [ ] Success: `https://yourdomain.com/app/payment/success`
  - [ ] Failure: `https://yourdomain.com/app/payment/failure`

---

## Этап 3 — Страница ожидания и успешной оплаты

### Backend: Создать endpoint `GET /v1/payment/status/:paymentId`

- [x] В `pkg/api/src/modules/payment/index.ts`:
  - [x] Проверить авторизацию
  - [x] Проверить, что `payment.userId` == авторизованный пользователь
  - [x] Вернуть статус платежа

### Frontend: Обновить `pkg/app/src/pages/Payment/Success.tsx`

- [x] При монтировании компонента:
  - [x] Проверить localStorage на наличие `pendingPaymentId`
  - [x] Если нет — редирект на `/app/payment/failure`

- [x] Реализовать polling статуса:
  - [x] Каждые 15 секунд запрашивать `GET /v1/payment/status/{paymentId}`
  - [x] Проверять принадлежность платежа пользователю
  - [x] Показывать индикатор загрузки

- [x] Обработка статусов:
  - [x] `pending` — продолжить polling
  - [x] `paid` — показать сообщение об успехе, кнопка "Перейти в приложение"
  - [x] `failed` / `expired` / `underpaid` — редирект на `/app/payment/failure`

### Frontend: Обновить `pkg/app/src/pages/Payment/Failure.tsx`

- [ ] Добавить описание причины неудачи
  - [ ] "Платёж не найден"
  - [ ] "Срок оплаты истёк"
  - [ ] "Ошибка при обработке платежа"
  - [ ] "Недостаточно средств"

---

## Этап 4 — Webhook для обработки платежей

### Backend: Создать webhook endpoint `POST /v1/payment/unitpay-webhook`

- [x] В `pkg/api/src/modules/payment/index.ts`:
  - [x] Public endpoint (без авторизации)
  - [x] Проверять `signature` от UnitPay
  - [x] Обрабатывать события:
    - [x] `check` — проверка возможности оплаты (код 200)
    - [x] `pay` — успешная оплата (активировать план)
    - [x] `error` — ошибка оплаты (статус `failed`)
    - [ ] `refund` — возврат (откатить план)

### Backend: Обработка события `pay` в `PaymentService`

- [x] Метод `handlePaymentSuccess(paymentId, params)`:
  - [x] Найти запись `payment` по ID
  - [x] Проверить статус `pending` (избежать дублей)
  - [x] Обновить статус на `paid`
  - [x] Извлечь `planId`, `upLimitId` из метаданных
  - [x] Вызвать `updateUserPlan(userId, planId, paymentId, upLimitId)`
  - [x] Записать в лог

### Backend: Обработка события `error`

- [x] Метод `handlePaymentError(paymentId, reason)`:
  - [x] Найти запись `payment` по ID
  - [x] Обновить статус на `failed`
  - [x] Записать причину в `metadata`
  - [x] Записать в лог

---

## Дополнительные задачи

### Тестирование

- [ ] Тестовые карты UnitPay
- [ ] Успешная оплата
- [ ] Недостаточно средств
- [ ] Отмена оплаты
- [ ] Таймаут оплаты

### Безопасность

- [ ] Проверка подписи webhook
- [ ] Проверка принадлежности платежа пользователю
- [ ] Защита от CSRF для webhook
- [ ] Проверка всех входных данных

### Документация

- [ ] Обновить `payments.md` с новыми endpoint
- [ ] Добавить переменные окружения в README
