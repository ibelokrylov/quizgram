import { integer, pgEnum, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

export const mailType = pgEnum('email_type', [
  'reset_password',
  'payment',
  'payment_notification',
  'subscribe_send_info_payment_2_days',
]);

export const mailTable = pgTable('email', {
  id: serial('id').primaryKey(),
  type: mailType('type').notNull(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});
