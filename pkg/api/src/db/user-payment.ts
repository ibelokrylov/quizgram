// Модель платежа пользователя в Drizzle ORM (PostgreSQL)

import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { planTable } from "./plan";
import { userTable } from "./user";

export const userPaymentTable = pgTable("user_payment", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => userTable.id),
  planId: integer("plan_id")
    .notNull()
    .references(() => planTable.id),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  finalDayAt: timestamp("final_day_at", { withTimezone: false })
    .notNull()
    .default(
      sql`(CURRENT_DATE + INTERVAL '30 days' + TIME '23:59:00')::timestamp`,
    ),
  limit: integer("limit").notNull(), // Информация из plan.bid_month_limit
  currentLimit: integer("current_limit").notNull().default(0),
  extended: boolean("extended").notNull().default(true),
  month: integer("month").notNull().default(1),
});

// Тип строки таблицы для использования в коде приложения
export type UserPayment = typeof userPaymentTable.$inferSelect;

// Тип для вставки новой записи (например, в сервисах)
export type NewUserPayment = typeof userPaymentTable.$inferInsert;
