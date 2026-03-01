import { integer, jsonb, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { quizTable } from './quiz';
import { createSelectSchema, createInsertSchema } from 'drizzle-typebox';

// Таблица контактного блока квиза (аналог QuizContact)
export const quizContactTable = pgTable('quiz_contact', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizTable.id),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  title: varchar('title', { length: 100 }),
  description: varchar('description', { length: 255 }),
  form: jsonb('form'),
  background: varchar('background', { length: 255 }),
});

export const QuizContact = createSelectSchema(quizContactTable);
export type QuizContact = typeof QuizContact.static;

export const NewQuizContact = createInsertSchema(quizContactTable);
export type NewQuizContact = typeof NewQuizContact.static;
