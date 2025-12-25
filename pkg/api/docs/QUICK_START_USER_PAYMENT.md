# Быстрый старт: обновление логики тарифов

## Что изменилось?

✅ Теперь при переключении тарифа:
- Старая запись становится `isActive = false`
- Создаётся новая запись с `isActive = true`
- Для платных тарифов учитываются уже собранные ставки

## Шаги для применения изменений

### 1. Применить миграцию БД

```bash
cd pkg/api
bun run db:add-user-payment-is-active
```

### 2. Перезапустить API сервер

Изменения в коде уже внесены, просто перезапустите сервер:

```bash
cd pkg/api
bun run dev
```

### 3. Проверить работу

Перейдите на страницу `/app/payment` и попробуйте переключить тариф.

## Что происходит при переключении тарифа?

### Для бесплатного тарифа (FREE)
```
1. Старые записи user_payment → isActive = false
2. Создаётся новая запись с currentLimit = 0
```

### Для платного тарифа (BASE)
```
1. Старые записи user_payment → isActive = false
2. Подсчитываются ставки (isFull=true, isEqualPaymentLimit=false) по активным квизам
3. Создаётся новая запись с currentLimit = количество_ставок
4. Все учтённые ставки помечаются isEqualPaymentLimit = true
```

## Проверка в БД

### Посмотреть историю тарифов пользователя

```sql
SELECT id, user_id, plan_id, created_at, limit, current_limit, is_active
FROM user_payment
WHERE user_id = 123
ORDER BY created_at DESC;
```

### Посмотреть активный тариф пользователя

```sql
SELECT id, user_id, plan_id, limit, current_limit
FROM user_payment
WHERE user_id = 123 AND is_active = true;
```

## Устранение проблем

### Проблема: миграция не применилась

```bash
# Проверьте подключение к БД
psql $DATABASE_URL -c "SELECT version();"

# Применить миграцию вручную
psql $DATABASE_URL -f scripts/add-user-payment-is-active.sql
```

### Проблема: у пользователя несколько активных записей

```sql
-- Оставить только последнюю активной
UPDATE user_payment
SET is_active = false
WHERE user_id = 123
  AND is_active = true
  AND id != (
    SELECT id FROM user_payment
    WHERE user_id = 123 AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  );
```

## Дополнительная информация

Подробная документация: [USER_PAYMENT_MIGRATION.md](./USER_PAYMENT_MIGRATION.md)

