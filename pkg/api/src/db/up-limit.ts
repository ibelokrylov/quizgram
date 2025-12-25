// Модель дополнительных лимитов для тарифа Pro+ в Drizzle ORM (PostgreSQL)

import { integer, pgTable, serial } from "drizzle-orm/pg-core";

export const upLimitTable = pgTable("up_limit", {
  id: serial("id").primaryKey(),
  bid: integer("bid").notNull().unique(), // Количество дополнительных заявок (уникальное значение)
  price: integer("price").notNull(), // Цена в рублях (не в копейках)
});

// Тип строки таблицы для использования в коде приложения
export type UpLimit = typeof upLimitTable.$inferSelect;

// Тип для вставки новой записи (например, в сервисах)
export type NewUpLimit = typeof upLimitTable.$inferInsert;

