import { bigint, pgTable, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-typebox';
import { quizTable } from './quiz';

export const quizOpenTable = pgTable('quiz_open', {
  quizUid: varchar('quiz_uid', { length: 36 })
    .notNull()
    .primaryKey()
    .references(() => quizTable.uid),
  opened: bigint('opened', { mode: 'number' }).notNull().default(0),
  openedUnique: bigint('opened_unique', { mode: 'number' }).notNull().default(0),
  full: bigint('full', { mode: 'number' }).notNull().default(0),
});

export const QuizOpen = createInsertSchema(quizOpenTable);
export type QuizOpen = typeof QuizOpen.static;
export const NewQuizOpen = createInsertSchema(quizOpenTable);
export type NewQuizOpen = typeof NewQuizOpen.static;
