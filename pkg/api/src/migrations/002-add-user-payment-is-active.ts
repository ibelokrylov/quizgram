// Миграция: Добавление поля is_active в таблицу user_payment
// Дата создания: 2024
// Описание: Переход на новую схему хранения истории платежей

import type { MigrationFile } from './types';

export const migration: MigrationFile = {
  name: '002-add-user-payment-is-active',
  description: 'Добавление поля is_active в таблицу user_payment для хранения истории',

  async up(sql) {
    // Добавляем поле is_active
    await sql`
      ALTER TABLE user_payment 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    `;

    // Создаём индекс для оптимизации запросов
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_payment_is_active 
      ON user_payment(user_id, is_active) 
      WHERE is_active = true
    `;

    // Удаляем старый unique constraint на user_id
    await sql`
      ALTER TABLE user_payment 
      DROP CONSTRAINT IF EXISTS user_payment_user_id_unique
    `;
  },
};
