// Миграция: Исправление finalDayAt в user_payment
// Дата создания: 2024
// Описание: Использование +1 месяц вместо +30 дней

import type { MigrationFile } from "./types";

export const migration: MigrationFile = {
  name: "003-fix-user-payment-final-day",
  description: "Исправление расчета finalDayAt (использование +1 месяц вместо +30 дней)",

  async up(sql) {
    // Обновляем finalDayAt для всех активных записей
    await sql`
      UPDATE user_payment
      SET final_day_at = (
        DATE(created_at) + INTERVAL '1 month' + TIME '23:59:00'
      )::timestamp
      WHERE is_active = true
    `;

    // Обновляем default значение для будущих записей
    await sql`
      ALTER TABLE user_payment 
      ALTER COLUMN final_day_at 
      SET DEFAULT (CURRENT_DATE + INTERVAL '1 month' + TIME '23:59:00')::timestamp
    `;
  },
};

