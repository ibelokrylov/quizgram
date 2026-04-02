import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { quizTable } from "./quiz";

export const quizResultTable = pgTable("quiz_result", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 36 }).notNull().unique(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizTable.id),
  title: varchar("title", { length: 100 }),
  description: varchar("description", { length: 250 }),
  type: text("type").notNull().default("img"),
  url: text("url"),
  button: jsonb("buttons"),
});

export const QuizResult = createSelectSchema(quizResultTable);
export type QuizResult = typeof QuizResult.static;

export const QuizResultCreate = createInsertSchema(quizResultTable);
export type QuizResultCreate = typeof QuizResultCreate.static;
