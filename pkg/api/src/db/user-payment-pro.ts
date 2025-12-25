// Модель дополнительных лимитов пользователя для тарифа Pro+ в Drizzle ORM (PostgreSQL)

import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { upLimitTable } from "./up-limit";
import { userTable } from "./user";

export const userPaymentProTable = pgTable("user_payment_pro", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  upLimitId: integer("up_limit_id")
    .notNull()
    .references(() => upLimitTable.id),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

// Тип строки таблицы для использования в коде приложения
export type UserPaymentPro = typeof userPaymentProTable.$inferSelect;

// Тип для вставки новой записи (например, в сервисах)
export type NewUserPaymentPro = typeof userPaymentProTable.$inferInsert;

