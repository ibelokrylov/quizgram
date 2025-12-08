import { sql } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { quizTable } from '.';

export const quizBidUserInfoTable = pgTable("quiz_bid_user_info", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizTable.id),
  key: varchar("key", { length: 36 }).notNull().unique().default(sql`gen_random_uuid()::text`),
  data: jsonb("data").notNull(),
})

export type QuizBidUserInfo = typeof quizBidUserInfoTable.$inferSelect;
export type NewQuizBidUserInfo = typeof quizBidUserInfoTable.$inferInsert;

