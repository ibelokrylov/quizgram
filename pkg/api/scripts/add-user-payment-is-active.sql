-- Миграция для добавления поля is_active в таблицу user_payment
-- Выполнить: bun run db:add-user-payment-is-active
-- или напрямую через psql: psql $DATABASE_URL -f scripts/add-user-payment-is-active.sql

-- Добавляем поле is_active со значением по умолчанию true
ALTER TABLE user_payment 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Создаём индекс для оптимизации запросов по is_active
CREATE INDEX IF NOT EXISTS idx_user_payment_is_active 
ON user_payment(user_id, is_active) 
WHERE is_active = true;

-- Удаляем старый unique constraint на user_id, т.к. теперь у пользователя может быть несколько записей
ALTER TABLE user_payment 
DROP CONSTRAINT IF EXISTS user_payment_user_id_unique;

-- Комментарий: теперь у пользователя может быть несколько записей user_payment в истории
-- но только одна из них должна быть активной (is_active = true)

