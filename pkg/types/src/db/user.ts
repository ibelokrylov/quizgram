import { boolean, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

export const UserTable = pgTable('user', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  login: varchar('login', { length: 100 }).notNull().unique(),
  isVerification: boolean('is_verification').notNull().default(false),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 250 }),
  planId: integer('plan_id').notNull().default(1),
  referralId: integer('referral_id'),
  referralCode: varchar('referral_code', { length: 20 }).unique(),
  quizCount: integer('quiz_count').notNull().default(0),
  language: varchar('language', { length: 2 }).default('en'),
  telegramId: varchar('telegram_id', { length: 50 }),
  isAdmin: boolean('is_admin').notNull().default(false),
});

// Тип для вставки нового пользователя
export const UserCreate = createInsertSchema(UserTable);
export type UserCreate = typeof UserCreate.static;

export const User = createSelectSchema(UserTable);
export type User = typeof User.static;

export const UserPublic = t.Omit(User, ['password', 'id']);
export type UserPublic = typeof UserPublic.static;
