import { boolean, integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { UserTable } from './user';

export const userNotificationTable = pgTable('user_notification', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => UserTable.id),
  telegram: boolean('telegram').notNull().default(false),
  email: boolean('email').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const UserNotification = createSelectSchema(userNotificationTable);
export type UserNotification = typeof UserNotification.static;

export const NewUserNotification = createInsertSchema(userNotificationTable);
export type NewUserNotification = typeof NewUserNotification.static;
