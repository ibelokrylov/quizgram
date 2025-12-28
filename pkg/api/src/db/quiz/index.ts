// Модели квиза и связанных сущностей в Drizzle ORM (PostgreSQL)

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { userTable } from "../user";

// Перечисление типов вопросов квиза (аналог QuizQuestionType в GORM)
export const quizQuestionTypeEnum = pgEnum("quiz_question_type", [
  "answer_option",
  "variant_image",
  "variant_image_text",
  "emoji",
  "input",
  "select",
  "date",
  "slide",
  "file",
  "page",
  "rating",
  "question_group",
]);

// Основная таблица квиза (аналог модели Quiz в GORM)
export const quizTable = pgTable("quiz", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 36 }).notNull().unique(),
  userId: integer("user_id").notNull().references(() => userTable.id),
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  isActive: boolean("is_active").notNull().default(true),
  name: varchar("name", { length: 255 })
    .notNull()
    .default("Новый квиз"),
  isShowLogo: boolean("is_show_logo").notNull().default(true),

  startPage: jsonb("start_page"),
  questionTitle: varchar("question_title", { length: 255 }).default(
    "Заголовок страницы",
  ),
});

// Таблица контактного блока квиза (аналог QuizContact)
export const quizContactTable = pgTable("quiz_contact", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizTable.id),
  uid: varchar("uid", { length: 36 }).notNull().unique(),
  title: varchar("title", { length: 100 }),
  description: varchar("description", { length: 255 }),
  form: jsonb("form"),
  background: varchar("background", { length: 255 }),
});

export const quizThxPageTable = pgTable("quiz_thx_page", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizTable.id),
  uid: varchar("uid", { length: 36 }).unique(),
  title: varchar("title", { length: 100 })
    .notNull()
    .default("Спасибо, [name]!"),

  description: varchar("description", { length: 255 })
    .notNull()
    .default("Здесь может быть любой текст"),
  buttons: jsonb("buttons"),
  social: jsonb("social"),
});

export const quizQuestionTable = pgTable("quiz_question", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizTable.id),
  type: quizQuestionTypeEnum("type"),
  uid: varchar("uid", { length: 36 }).notNull().unique(),
  order: integer("order").notNull(),
  content: jsonb("content").default({}),
});

// Типы строк таблиц и типов для вставки
export type Quiz = typeof quizTable.$inferSelect;
export type NewQuiz = typeof quizTable.$inferInsert;

export type QuizContact = typeof quizContactTable.$inferSelect;
export type NewQuizContact = typeof quizContactTable.$inferInsert;

export type QuizThxPage = typeof quizThxPageTable.$inferSelect;
export type NewQuizThxPage = typeof quizThxPageTable.$inferInsert;

export type QuizQuestion = typeof quizQuestionTable.$inferSelect;
export type NewQuizQuestion = typeof quizQuestionTable.$inferInsert;

// Экспортируем quizBidTable
export * from "./bid";
// Экспортируем quizFileTable
export * from "./file";
