import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { UserTable } from './user';
import { planTable } from './plan';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'underpaid',
  'expired',
  'failed',
]);

export const paymentMethodEnum = pgEnum('payment_method', ['card', 'bank_transfer']);
export const paymentProviderEnum = pgEnum('payment_provider', ['unitpay']);

export const paymentTable = pgTable('payment', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => UserTable.id),
  planId: integer('plan_id')
    .notNull()
    .references(() => planTable.id),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USDT'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  method: paymentMethodEnum('method').notNull().default('card'),
  provider: paymentProviderEnum('provider').notNull().default('unitpay'),
  invoiceId: text('invoice_id'),
  invoiceUrl: text('invoice_url'),
  trackId: text('track_id'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const Payment = createSelectSchema(paymentTable);
export type Payment = typeof Payment.static;

export const NewPayment = createInsertSchema(paymentTable);
export type NewPayment = typeof NewPayment.static;
