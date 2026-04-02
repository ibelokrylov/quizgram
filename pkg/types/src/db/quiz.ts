import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { UserTable } from './user';

// Основная таблица квиза (аналог модели Quiz в GORM)
export const quizTable = pgTable(
  'quiz',
  {
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
  },
  (table) => [
    index('idx_quiz_user_id').on(table.userId),
    index('idx_quiz_created_at').on(table.createdAt),
    index('idx_quiz_updated_at').on(table.updatedAt),
    index('idx_quiz_deleted_at').on(table.deletedAt),
    index('idx_quiz_is_active').on(table.isActive),
    index('idx_quiz_uid').on(table.uid),
  ]
);

// Типы строк таблиц и типов для вставки
export const Quiz = createSelectSchema(quizTable);
export type Quiz = typeof Quiz.static;

export const NewQuiz = createInsertSchema(quizTable);
export type NewQuiz = typeof NewQuiz.static;

export * from './quiz-bid';
export * from './quiz-contact';
export * from './quiz-file';
export * from './quiz-open';
export * from './quiz-question';
export * from './quiz-result';
export * from './quiz-thx';
