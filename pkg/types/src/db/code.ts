import { boolean, integer, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const codeTypeEnum = pgEnum('code_type', [
  'reset_password',
  'change_email',
  'registration',
  'confirm_auth',
]);

export const codeTable = pgTable('code', {
  id: serial('id').primaryKey(),
  life: timestamp('life_time', { withTimezone: false }).notNull(),
  nextMailSendAvailable: timestamp('next_email_send_available', {
    withTimezone: false,
  }).notNull(),
  type: codeTypeEnum('type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  userId: integer('user_id').notNull(),
  value: varchar('value', { length: 250 }).notNull(),
});

export const Code = createSelectSchema(codeTable);
export type Code = typeof Code.static;

export const NewCode = createInsertSchema(codeTable);
export type NewCode = typeof NewCode.static;
