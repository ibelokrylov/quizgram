// Модель тарифного плана в Drizzle ORM (PostgreSQL)

import { integer, pgEnum, pgTable, serial, smallint } from "drizzle-orm/pg-core";

// Перечисление допустимых имён тарифов
export const planNameEnum = pgEnum("plan_name", ["FREE", "BASE"]);

export const planTable = pgTable("plan", {
  id: serial("id").primaryKey(),
  price: integer("price").notNull(),
  name: planNameEnum("name").notNull(),
  bidMonthLimit: smallint("bid_month_limit").notNull(),
});

// Тип строки таблицы для использования в коде приложения
export type Plan = typeof planTable.$inferSelect;

// Тип для вставки новой записи (например, в сервисах)
export type NewPlan = typeof planTable.$inferInsert;


