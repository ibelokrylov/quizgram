// Скрипт для исправления finalDayAt в user_payment
// Проблема: использовалось +30 дней вместо +1 месяц

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

async function fixFinalDayAt() {
  const sql = postgres(connectionString);

  try {
    console.log('Исправление finalDayAt для всех активных записей user_payment...');

    // Получаем записи до обновления для логирования
    const beforeUpdate = await sql`
      SELECT id, user_id, created_at, final_day_at, is_active
      FROM user_payment
      WHERE is_active = true
      ORDER BY id
    `;

    console.log(`\nНайдено активных записей для обновления: ${beforeUpdate.length}`);

    if (beforeUpdate.length > 0) {
      console.log('\nЗаписи ДО обновления:');
      beforeUpdate.forEach((row) => {
        const createdAt = new Date(row.created_at);
        const oldFinalDay = new Date(row.final_day_at);
        const expectedFinalDay = new Date(createdAt);
        expectedFinalDay.setMonth(expectedFinalDay.getMonth() + 1);
        expectedFinalDay.setHours(23, 59, 0, 0);

        console.log(
          `  ID ${row.id}: created=${createdAt.toISOString().split('T')[0]} | ` +
            `old_final=${oldFinalDay.toISOString().split('T')[0]} | ` +
            `expected=${expectedFinalDay.toISOString().split('T')[0]}`
        );
      });
    }

    // Обновляем finalDayAt
    const updateResult = await sql`
      UPDATE user_payment
      SET final_day_at = (
        DATE(created_at) + INTERVAL '1 month' + TIME '23:59:00'
      )::timestamp
      WHERE is_active = true
    `;

    console.log(`\n✅ Обновлено записей: ${updateResult.count}`);

    // Получаем записи после обновления
    const afterUpdate = await sql`
      SELECT id, user_id, created_at, final_day_at, is_active
      FROM user_payment
      WHERE is_active = true
      ORDER BY id
    `;

    if (afterUpdate.length > 0) {
      console.log('\nЗаписи ПОСЛЕ обновления:');
      afterUpdate.forEach((row) => {
        const createdAt = new Date(row.created_at);
        const newFinalDay = new Date(row.final_day_at);

        console.log(
          `  ID ${row.id}: created=${createdAt.toISOString().split('T')[0]} | ` +
            `new_final=${newFinalDay.toISOString().split('T')[0]}`
        );
      });
    }

    // Обновляем default значение
    await sql`
      ALTER TABLE user_payment 
      ALTER COLUMN final_day_at 
      SET DEFAULT (CURRENT_DATE + INTERVAL '1 month' + TIME '23:59:00')::timestamp
    `;
    console.log('\n✅ Default значение для final_day_at обновлено на +1 месяц');

    console.log('\n✅ Миграция успешно применена!');
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixFinalDayAt();
