import { integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { UserTable } from './user';
import { upLimitTable } from './up-limit';

export const userPaymentProTable = pgTable('user_payment_pro', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => UserTable.id),
  upLimitId: integer('up_limit_id')
    .notNull()
    .references(() => upLimitTable.id),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const UserPaymentPro = createSelectSchema(userPaymentProTable);
export type UserPaymentPro = typeof UserPaymentPro.static;

export const NewUserPaymentPro = createInsertSchema(userPaymentProTable);
export type NewUserPaymentPro = typeof NewUserPaymentPro.static;
