// Модель пользователя в Drizzle ORM (PostgreSQL)

import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 36 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  login: varchar("login", { length: 100 }).notNull().unique(),
  isVerification: boolean("is_verification").notNull().default(false),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 250 }),
  planId: integer("plan_id").notNull().default(1),
  referralId: integer("referral_id"),
  quizCount: integer("quiz_count").notNull().default(0),
  paymentDateEnd: timestamp("payment_date_end", { withTimezone: false }),
  language: varchar("language", { length: 2 }).default("en"),
  integrationKey: varchar("integration_key", { length: 36 })
    .notNull()
    .default(sql`gen_random_uuid()::text`),
  telegramId: varchar("telegram_id", { length: 50 }),
});

// Тип строки пользователя (для выборок)
export type User = typeof userTable.$inferSelect;

// Тип для вставки нового пользователя
export type NewUser = typeof userTable.$inferInsert;


