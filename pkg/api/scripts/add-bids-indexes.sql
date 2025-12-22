-- Миграция для добавления индексов для оптимизации запросов к quiz_bid
-- Выполнить: bun run scripts/execute-sql.ts add-bids-indexes.sql
-- или напрямую через psql: psql $DATABASE_URL -f scripts/add-bids-indexes.sql

-- Индекс для основных фильтров запросов (quiz_id, is_full, is_read, status, deleted_at)
-- Используется в WHERE условиях большинства запросов
CREATE INDEX IF NOT EXISTS idx_quiz_bid_user_filters 
ON quiz_bid(quiz_id, is_full, is_read, status, deleted_at) 
WHERE deleted_at IS NULL;

-- Индекс для JOIN операций с quiz таблицей
-- Ускоряет LEFT JOIN / INNER JOIN по quiz_id
CREATE INDEX IF NOT EXISTS idx_quiz_bid_quiz_id 
ON quiz_bid(quiz_id) 
WHERE deleted_at IS NULL;

-- Индекс для поиска по key (уникальный ключ заявки)
-- Используется в методах getBidDetails, updateBidStatus, deleteBid
CREATE INDEX IF NOT EXISTS idx_quiz_bid_key 
ON quiz_bid(key) 
WHERE deleted_at IS NULL;

-- Индекс для сортировки по дате создания (DESC)
-- Используется в ORDER BY b.created_at DESC
CREATE INDEX IF NOT EXISTS idx_quiz_bid_created_at 
ON quiz_bid(created_at DESC) 
WHERE deleted_at IS NULL;

-- Составной индекс для фильтрации по is_full и is_equal_payment_limit
-- Используется для подсчета доступных заявок с isFull = true AND isEqualPaymentLimit = true
CREATE INDEX IF NOT EXISTS idx_quiz_bid_full_payment 
ON quiz_bid(is_full, is_equal_payment_limit) 
WHERE deleted_at IS NULL AND is_full = true;

-- Индекс для quiz таблицы по user_id (для JOIN операций)
-- Ускоряет фильтрацию по владельцу квиза
CREATE INDEX IF NOT EXISTS idx_quiz_user_id 
ON quiz(user_id);

-- Индекс для quiz таблицы по uid (для фильтрации по quiz_uid)
CREATE INDEX IF NOT EXISTS idx_quiz_uid 
ON quiz(uid);

