// Модель файлов квиза для публичных ответов в Drizzle ORM (PostgreSQL)

import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-typebox';
import { quizTable } from './quiz';

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

export const QuizFile = createInsertSchema(quizFileTable);
export type QuizFile = typeof QuizFile.static;
export const NewQuizFile = createInsertSchema(quizFileTable);
export type NewQuizFile = typeof NewQuizFile.static;
