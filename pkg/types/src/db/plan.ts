import { integer, pgEnum, pgTable, serial, smallint } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const planNameEnum = pgEnum('plan_name', ['FREE', 'BASE', 'PRO_PLUS']);

export const planTable = pgTable('plan', {
  id: serial('id').primaryKey(),
  price: integer('price').notNull(),
  name: planNameEnum('name').notNull(),
  bidMonthLimit: smallint('bid_month_limit').notNull(),
});

export const Plan = createSelectSchema(planTable);
export type Plan = typeof Plan.static;

export const NewPlan = createInsertSchema(planTable);
export type NewPlan = typeof NewPlan.static;
