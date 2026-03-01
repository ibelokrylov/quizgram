import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

export const userFileTable = pgTable('user_file', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileKey: varchar('file_key', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 255 }).notNull(),
});

export const UserFile = createSelectSchema(userFileTable);
export type UserFile = typeof UserFile.static;

export const NewUserFile = createInsertSchema(userFileTable);
export type NewUserFile = typeof NewUserFile.static;
