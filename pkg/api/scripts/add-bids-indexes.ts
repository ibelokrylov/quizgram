// Скрипт для добавления индексов для оптимизации запросов к quiz_bid
// Используется для улучшения производительности запросов в модуле bids

import postgres from 'postgres';

const env = typeof Bun !== 'undefined' ? Bun.env : process.env;
const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST = 'localhost',
  POSTGRES_PORT = '5432',
  DATABASE_URL,
} = env;

// Формируем connection string
const connectionString =
  DATABASE_URL ??
  `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

async function addIndexes() {
  const sql = postgres(connectionString);

  try {
    console.log('Добавляю индексы для оптимизации запросов к quiz_bid...');

    // Индекс для основных фильтров запросов
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_user_filters 
      ON quiz_bid(quiz_id, is_full, is_read, status, deleted_at) 
      WHERE deleted_at IS NULL
    `;
    console.log('✅ Индекс idx_quiz_bid_user_filters создан');

    // Индекс для JOIN операций
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_quiz_id 
      ON quiz_bid(quiz_id) 
      WHERE deleted_at IS NULL
    `;
    console.log('✅ Индекс idx_quiz_bid_quiz_id создан');

    // Индекс для поиска по key
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_key 
      ON quiz_bid(key) 
      WHERE deleted_at IS NULL
    `;
    console.log('✅ Индекс idx_quiz_bid_key создан');

    // Индекс для сортировки по дате создания
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_created_at 
      ON quiz_bid(created_at DESC) 
      WHERE deleted_at IS NULL
    `;
    console.log('✅ Индекс idx_quiz_bid_created_at создан');

    // Составной индекс для фильтрации по is_full и is_equal_payment_limit
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_full_payment 
      ON quiz_bid(is_full, is_equal_payment_limit) 
      WHERE deleted_at IS NULL AND is_full = true
    `;
    console.log('✅ Индекс idx_quiz_bid_full_payment создан');

    // Индекс для quiz таблицы по user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_user_id 
      ON quiz(user_id)
    `;
    console.log('✅ Индекс idx_quiz_user_id создан');

    // Индекс для quiz таблицы по uid
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_uid 
      ON quiz(uid)
    `;
    console.log('✅ Индекс idx_quiz_uid создан');

    console.log('\n✅ Все индексы успешно добавлены!');
  } catch (error) {
    console.error('❌ Ошибка при добавлении индексов:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addIndexes();
