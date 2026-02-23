// Модель настроек уведомлений пользователя в Drizzle ORM (PostgreSQL)

import { boolean, integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { UserTable } from 'pkg-types';

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

// Тип строки настроек уведомлений (для выборок)
export type UserNotification = typeof userNotificationTable.$inferSelect;

// Тип для вставки новых настроек уведомлений
export type NewUserNotification = typeof userNotificationTable.$inferInsert;
