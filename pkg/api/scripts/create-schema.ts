// Скрипт для создания схемы public в PostgreSQL
// Используется перед миграциями, если схема не существует

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

async function createSchema() {
  const sql = postgres(connectionString);

  try {
    // Создаем схему public, если она не существует
    await sql`CREATE SCHEMA IF NOT EXISTS public`;

    // Предоставляем права на схему
    await sql`GRANT ALL ON SCHEMA public TO postgres`;
    await sql`GRANT ALL ON SCHEMA public TO public`;

    console.log('✅ Схема public успешно создана');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании схемы public:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createSchema();
