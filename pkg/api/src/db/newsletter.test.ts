import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const NewsletterTestTable = pgTable('newsletter_test', {
  id: serial('id').primaryKey(),
  telegramUserId: varchar('telegram_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});
