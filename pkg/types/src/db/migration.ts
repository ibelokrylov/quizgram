import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const migrationTable = pgTable('_migrations', {
  name: text('name').primaryKey(),
  executedAt: timestamp('executed_at', { mode: 'date' }).notNull().defaultNow(),
});

export const Migration = createSelectSchema(migrationTable);
export type Migration = typeof Migration.static;

export const NewMigration = createInsertSchema(migrationTable);
export type NewMigration = typeof NewMigration.static;
