import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const quizOpenTable = pgTable("quiz_open", {
  uid: varchar("uid", { length: 36 }).notNull().primaryKey(),
  quizUid: varchar("quiz_uid", { length: 36 }).notNull(),
  uniqueId: varchar("unique_id", { length: 36 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});