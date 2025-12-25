// Модель платежа пользователя в Drizzle ORM (PostgreSQL)

import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { paymentTable } from "./payment";
import { planTable } from "./plan";
import { userTable } from "./user";

export const userPaymentTable = pgTable("user_payment", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  planId: integer("plan_id")
    .notNull()
    .references(() => planTable.id),
  paymentId: integer("payment_id")
    .references(() => paymentTable.id), // Связь с успешным платежом
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  finalDayAt: timestamp("final_day_at", { withTimezone: false })
    .notNull()
    .default(
      sql`(CURRENT_DATE + INTERVAL '1 month' + TIME '23:59:00')::timestamp`,
    ),
  limit: integer("limit").notNull(), // Информация из plan.bid_month_limit
  currentLimit: integer("current_limit").notNull().default(0),
  extended: boolean("extended").notNull().default(true),
  month: integer("month").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  // Поля для отсроченных планов
  isPaid: boolean("is_paid").notNull().default(false), // Оплачен ли план (true - оплата сейчас, false - оплата в день начала)
  startsAt: timestamp("starts_at", { withTimezone: false }), // Когда план начнет действовать (null - сразу, иначе - дата начала)
  scheduledPlanId: integer("scheduled_plan_id")
    .references(() => planTable.id), // ID плана, который будет применен (для отсроченных планов)
  // Поля для отслеживания попыток списания
  paymentAttempts: integer("payment_attempts").notNull().default(0), // Количество попыток списания
  lastPaymentAttemptAt: timestamp("last_payment_attempt_at", { withTimezone: false }), // Время последней попытки
  maxPaymentAttempts: integer("max_payment_attempts").notNull().default(7), // Максимум попыток (по умолчанию 7 дней)
});

// Тип строки таблицы для использования в коде приложения
export type UserPayment = typeof userPaymentTable.$inferSelect;

// Тип для вставки новой записи (например, в сервисах)
export type NewUserPayment = typeof userPaymentTable.$inferInsert;
