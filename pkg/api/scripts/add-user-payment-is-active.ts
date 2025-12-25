// Скрипт для добавления поля is_active в таблицу user_payment
// Используется при переходе на новую схему хранения истории платежей

import postgres from "postgres";

const env = typeof Bun !== "undefined" ? Bun.env : process.env;
const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST = "localhost",
  POSTGRES_PORT = "5432",
  DATABASE_URL,
} = env;

// Формируем connection string
const connectionString =
  DATABASE_URL ??
  `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

async function addIsActiveField() {
  const sql = postgres(connectionString);

  try {
    console.log("Добавляю поле is_active в таблицу user_payment...");

    // Добавляем поле is_active
    await sql`
      ALTER TABLE user_payment 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    `;
    console.log("✅ Поле is_active добавлено");

    // Создаём индекс для оптимизации запросов
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_payment_is_active 
      ON user_payment(user_id, is_active) 
      WHERE is_active = true
    `;
    console.log("✅ Индекс idx_user_payment_is_active создан");

    // Удаляем старый unique constraint на user_id
    await sql`
      ALTER TABLE user_payment 
      DROP CONSTRAINT IF EXISTS user_payment_user_id_unique
    `;
    console.log("✅ Уникальное ограничение на user_id удалено");

    console.log("\n✅ Миграция успешно применена!");
    console.log(
      "ℹ️  Теперь у пользователя может быть несколько записей user_payment в истории",
    );
    console.log("ℹ️  Только одна из них должна быть активной (is_active = true)");
  } catch (error) {
    console.error("❌ Ошибка при применении миграции:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addIsActiveField();

