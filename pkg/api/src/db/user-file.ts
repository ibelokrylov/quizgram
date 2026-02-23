// Модель пользовательских файлов (UserFile) в Drizzle ORM (PostgreSQL)

import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const userFileTable = pgTable('user_file', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileKey: varchar('file_key', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 255 }).notNull(),
});

// Тип строки таблицы UserFile
export type UserFile = typeof userFileTable.$inferSelect;

// Тип для вставки новой записи UserFile
export type NewUserFile = typeof userFileTable.$inferInsert;
