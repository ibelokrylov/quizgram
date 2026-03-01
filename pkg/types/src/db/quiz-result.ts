import { integer, jsonb, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { quizTable } from './quiz';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const quizResultTable = pgTable('quiz_result', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizTable.id),
  content: jsonb('content'),
});

export const QuizResult = createSelectSchema(quizResultTable);
export type QuizResult = typeof QuizResult.static;

export const QuizResultCreate = createInsertSchema(quizResultTable);
export type QuizResultCreate = typeof QuizResultCreate.static;
