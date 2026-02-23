import type { MigrationFile } from './types';

export const migration: MigrationFile = {
  name: '008-remove-crypto-pay-and-update-users',
  description: 'Удаляет логику Crypto Pay и переводит всех пользователей с платных планов на FREE',
  async up(sql) {
    // Обновляем всех пользователей с платными планов (planId != 1) на FREE план (id=1)
    await sql`
      UPDATE "user" 
      SET plan_id = 1, 
          updated_at = CURRENT_TIMESTAMP
      WHERE plan_id != 1 AND deleted_at IS NULL;
    `;

    // Деактивируем все активные user_payment для платных планов
    await sql`
      UPDATE user_payment 
      SET is_active = false 
      WHERE plan_id != 1 AND is_active = true;
    `;

    // Обновляем все платежи со статусом 'paid' и методом 'crypto_pay' на 'expired'
    // Это нужно для того, чтобы эти платежи больше не считались активными
    await sql`
      UPDATE payment 
      SET status = 'expired',
          updated_at = CURRENT_TIMESTAMP
      WHERE method::text = 'crypto_pay' AND status = 'paid';
    `;
  },
};
