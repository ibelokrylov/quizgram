// Модель файлов квиза для публичных ответов в Drizzle ORM (PostgreSQL)

import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { quizTable } from '.';

export const quizFileTable = pgTable('quiz_file', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizTable.id),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileKey: varchar('file_key', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  sessionKey: varchar('session_key', { length: 36 }).notNull(), // для связи с ответами пользователя
});

// Тип строки таблицы QuizFile
export type QuizFile = typeof quizFileTable.$inferSelect;

// Тип для вставки новой записи QuizFile
export type NewQuizFile = typeof quizFileTable.$inferInsert;
