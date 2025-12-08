import { boolean, integer, jsonb, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { quizTable } from '.';

export const quizBidTable = pgTable("quiz_bid", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizTable.id),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  data: jsonb("data").notNull(),
  isFull: boolean("is_full").notNull().default(false),
  hideLogo: boolean("hide_logo").notNull().default(false),
})

export type QuizBid = typeof quizBidTable.$inferSelect;
export type NewQuizBid = typeof quizBidTable.$inferInsert;