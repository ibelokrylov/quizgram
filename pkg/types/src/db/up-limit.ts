import { integer, pgTable, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const upLimitTable = pgTable('up_limit', {
  id: serial('id').primaryKey(),
  bid: integer('bid').notNull().unique(),
  price: integer('price').notNull(),
});

export const UpLimit = createSelectSchema(upLimitTable);
export type UpLimit = typeof UpLimit.static;

export const NewUpLimit = createInsertSchema(upLimitTable);
export type NewUpLimit = typeof NewUpLimit.static;
