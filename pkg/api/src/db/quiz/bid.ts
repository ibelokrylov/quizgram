import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { quizTable } from ".";

export const quizBidTable = pgTable("quiz_bid", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizTable.id),
  key: varchar("key", { length: 36 })
    .notNull()
    .unique()
    .default(sql`gen_random_uuid()::text`),
  answer: jsonb("answer").notNull(),
  questions: jsonb("questions"), // Вопросы квиза
  first: boolean("first").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("create"),
  isFull: boolean("is_full").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  info: jsonb("info").default(null), // Данные пользователя из Telegram после верификации
  initData: varchar("init_data", { length: 2048 }).default(""), // Telegram WebApp initData как строка
  userInfo: jsonb("user_info").default(null), // Данные пользователя из Telegram после верификации
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  ipLocation: jsonb("ip_location").default(null), // Геолокация по IP: { country, city, ip }
});

export type QuizBid = typeof quizBidTable.$inferSelect;
export type NewQuizBid = typeof quizBidTable.$inferInsert;
