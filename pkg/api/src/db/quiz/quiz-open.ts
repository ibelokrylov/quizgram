import { bigint, pgTable, varchar } from 'drizzle-orm/pg-core';
import { quizTable } from '..';

export const quizOpenTable = pgTable("quiz_open", {
  quizUid: varchar("quiz_uid", { length: 36 }).notNull().primaryKey().references(() => quizTable.uid),
  opened: bigint("opened", { mode: "number" }).notNull().default(0),
  openedUnique: bigint("opened_unique", { mode: "number" }).notNull().default(0),
  full: bigint("full", { mode: "number" }).notNull().default(0),
});

export type QuizOpen = typeof quizOpenTable.$inferSelect;
export type NewQuizOpen = typeof quizOpenTable.$inferInsert;