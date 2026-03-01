import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { UserTable } from './user';
import { paymentTable } from './payment';
import { planTable } from './plan';

export const userPaymentTable = pgTable('user_payment', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => UserTable.id),
  planId: integer('plan_id')
    .notNull()
    .references(() => planTable.id),
  paymentId: integer('payment_id').references(() => paymentTable.id),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  finalDayAt: timestamp('final_day_at', { withTimezone: false })
    .notNull()
    .default(sql`(CURRENT_DATE + INTERVAL '1 month' + TIME '23:59:00')::timestamp`),
  limit: integer('limit').notNull(),
  currentLimit: integer('current_limit').notNull().default(0),
  extended: boolean('extended').notNull().default(true),
  month: integer('month').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  isPaid: boolean('is_paid').notNull().default(false),
  startsAt: timestamp('starts_at', { withTimezone: false }),
  scheduledPlanId: integer('scheduled_plan_id').references(() => planTable.id),
  paymentAttempts: integer('payment_attempts').notNull().default(0),
  lastPaymentAttemptAt: timestamp('last_payment_attempt_at', { withTimezone: false }),
  maxPaymentAttempts: integer('max_payment_attempts').notNull().default(7),
  cancelAutoRenew: boolean('cancel_auto_renew').notNull().default(false),
  subscriptionId: text('subscription_id'),
});

export const UserPayment = createSelectSchema(userPaymentTable);
export type UserPayment = typeof UserPayment.static;

export const NewUserPayment = createInsertSchema(userPaymentTable);
export type NewUserPayment = typeof NewUserPayment.static;
