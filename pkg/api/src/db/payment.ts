// Модель платежа в Drizzle ORM (PostgreSQL)

import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { UserTable } from 'pkg-types';
import { planTable } from './plan';

// Статус платежа
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', // Ожидает оплаты
  'paid', // Оплачен
  'underpaid', // Недостаточно средств
  'expired', // Истёк срок оплаты
  'failed', // Ошибка оплаты
]);

// Способ оплаты
export const paymentMethodEnum = pgEnum('payment_method', [
  // "crypto_pay", // Crypto Pay (Telegram) - удалено, больше не используется
  'card', // Банковская карта
  'bank_transfer', // Банковский перевод
]);
export const paymentProviderEnum = pgEnum('payment_provider', ['unitpay']);

export const paymentTable = pgTable('payment', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => UserTable.id),
  planId: integer('plan_id')
    .notNull()
    .references(() => planTable.id),
  amount: integer('amount').notNull(), // Сумма в минимальных единицах (для USDT - обычно 6 знаков после запятой)
  currency: text('currency').notNull().default('USDT'), // Валюта (USDT для криптовалютных платежей)
  status: paymentStatusEnum('status').notNull().default('pending'),
  method: paymentMethodEnum('method').notNull().default('card'),
  provider: paymentProviderEnum('provider').notNull().default('unitpay'),
  // Данные для поиска платежа в платёжной системе
  invoiceId: text('invoice_id'), // ID инвойса в Crypto Pay
  invoiceUrl: text('invoice_url'), // URL для оплаты
  trackId: text('track_id'), // Track ID для вебхука
  // Метаданные от платёжной системы
  metadata: text('metadata'), // JSON с дополнительными данными
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

// Тип строки таблицы для использования в коде приложения
export type Payment = typeof paymentTable.$inferSelect;

// Тип для вставки новой записи (например, в сервисах)
export type NewPayment = typeof paymentTable.$inferInsert;
