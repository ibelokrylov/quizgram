import type { MigrationFile } from './types';

export const migration: MigrationFile = {
  name: '004-add-payment-attempts',
  description:
    'Добавляет поля для отслеживания попыток списания платежей и расширяет enum payment_method',
  async up(sql) {
    // Добавляем новые значения в enum payment_method
    await sql`
      ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card';
    `;

    await sql`
      ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';
    `;

    // Добавляем поля для отслеживания попыток списания в user_payment
    await sql`
      ALTER TABLE user_payment 
      ADD COLUMN IF NOT EXISTS payment_attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_payment_attempt_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS max_payment_attempts INTEGER NOT NULL DEFAULT 7;
    `;
  },
};
