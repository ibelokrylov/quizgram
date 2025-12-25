-- Миграция для исправления finalDayAt в user_payment
-- Проблема: использовалось +30 дней вместо +1 месяц
-- Выполнить: bun run db:fix-user-payment-final-day

-- Обновляем finalDayAt для всех активных записей user_payment
-- Пересчитываем: createdAt + 1 месяц + время 23:59:00
UPDATE user_payment
SET final_day_at = (
  DATE(created_at) + INTERVAL '1 month' + TIME '23:59:00'
)::timestamp
WHERE is_active = true;

-- Также обновляем default значение для будущих записей (если это ещё не сделано)
-- Это изменение уже есть в схеме Drizzle, но на всякий случай выполняем через ALTER TABLE
ALTER TABLE user_payment 
ALTER COLUMN final_day_at 
SET DEFAULT (CURRENT_DATE + INTERVAL '1 month' + TIME '23:59:00')::timestamp;

-- Комментарий: теперь finalDayAt вычисляется как +1 месяц от created_at, а не +30 дней
-- Пример: created_at = 2025-12-24 → final_day_at = 2026-01-24 23:59:00

