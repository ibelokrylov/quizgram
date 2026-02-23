// Модель кода (одноразовые/сервисные коды) в Drizzle ORM (PostgreSQL)

import { boolean, integer, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

// Перечисление типов кодов (аналог CodeType в GORM)
export const codeTypeEnum = pgEnum('code_type', [
  'reset_password',
  'change_email',
  'registration',
  'confirm_auth',
]);

export const codeTable = pgTable('code', {
  id: serial('id').primaryKey(),
  life: timestamp('life_time', { withTimezone: false }).notNull(),
  nextMailSendAvailable: timestamp('next_email_send_available', {
    withTimezone: false,
  }).notNull(),
  type: codeTypeEnum('type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  userId: integer('user_id').notNull(),
  value: varchar('value', { length: 250 }).notNull(),
});

// Тип строки таблицы Code
export type Code = typeof codeTable.$inferSelect;

// Тип для вставки новой записи Code
export type NewCode = typeof codeTable.$inferInsert;
