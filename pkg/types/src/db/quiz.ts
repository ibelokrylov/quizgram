import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { UserTable } from './user';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

// Основная таблица квиза (аналог модели Quiz в GORM)
export const quizTable = pgTable('quiz', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  userId: integer('user_id')
    .notNull()
    .references(() => UserTable.id),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  isActive: boolean('is_active').notNull().default(true),
  name: varchar('name', { length: 255 }).notNull().default('Новый квиз'),
  isShowLogo: boolean('is_show_logo').notNull().default(true),
  startPage: jsonb('start_page'),
  questionTitle: varchar('question_title', { length: 255 }).default('Заголовок страницы'),
  isShared: boolean().default(false),
  nodes: jsonb('nodes'),
  edges: jsonb('edges'),
});

// Типы строк таблиц и типов для вставки
export const Quiz = createSelectSchema(quizTable);
export type Quiz = typeof Quiz.static;

export const NewQuiz = createInsertSchema(quizTable);
export type NewQuiz = typeof NewQuiz.static;

export * from './quiz-bid';
export * from './quiz-file';
export * from './quiz-open';
export * from './quiz-result';
export * from './quiz-thx';
export * from './quiz-question';
export * from './quiz-contact';
