// Таблица для отслеживания выполненных миграций
// Используется системой миграций для предотвращения повторного выполнения

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const migrationTable = pgTable("_migrations", {
  // Уникальное название миграции (например, "001-add-bids-indexes")
  name: text("name").primaryKey(),
  
  // Дата и время выполнения миграции
  executedAt: timestamp("executed_at", { mode: "date" }).notNull().defaultNow(),
});

export type Migration = typeof migrationTable.$inferSelect;
export type NewMigration = typeof migrationTable.$inferInsert;

