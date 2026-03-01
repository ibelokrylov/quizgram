import { integer, jsonb, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-typebox';
import { quizTable } from './quiz';

// Перечисление типов вопросов квиза (аналог QuizQuestionType в GORM)
export const quizQuestionTypeEnum = pgEnum('quiz_question_type', [
  'answer_option',
  'variant_image',
  'variant_image_text',
  'emoji',
  'input',
  'select',
  'date',
  'slide',
  'file',
  'page',
  'rating',
  'question_group',
]);

export const quizQuestionTable = pgTable('quiz_question', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizTable.id),
  type: quizQuestionTypeEnum('type'),
  uid: varchar('uid', { length: 36 }).notNull().unique(),
  order: integer('order').notNull(),
  content: jsonb('content').default({}),
});

export const QuizQuestion = createInsertSchema(quizQuestionTable);
export type QuizQuestion = typeof QuizQuestion.static;

export const NewQuizQuestion = createInsertSchema(quizQuestionTable);
export type NewQuizQuestion = typeof NewQuizQuestion.static;
