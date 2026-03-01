import { integer, jsonb, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { quizTable } from './quiz';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const quizThxPageTable = pgTable('quiz_thx_page', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizTable.id),
  uid: varchar('uid', { length: 36 }).unique(),
  title: varchar('title', { length: 100 }).notNull().default('Спасибо, [name]!'),

  description: varchar('description', { length: 255 })
    .notNull()
    .default('Здесь может быть любой текст'),
  buttons: jsonb('buttons'),
  social: jsonb('social'),
});

export const QuizThxPage = createSelectSchema(quizThxPageTable);
export type QuizThxPage = typeof QuizThxPage.static;

export const NewQuizThxPage = createInsertSchema(quizThxPageTable);
export type NewQuizThxPage = typeof NewQuizThxPage.static;
