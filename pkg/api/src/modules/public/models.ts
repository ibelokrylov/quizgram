import { t } from "elysia";

export const publicQuiz = t.Object({
  uid: t.String(),
  name: t.String(),
  startPage: t.Optional(t.Any()),
  questionTitle: t.Optional(t.String()),
  question: t.Optional(t.Array(t.Any())),
  contact: t.Optional(t.Array(t.Any())),
  thxPage: t.Optional(t.Any()),
});

export type PublicQuiz = typeof publicQuiz.static;

// Базовый тип для ответа на вопрос (recursively handles nested structures)
const answerBase = t.Object({
  question_uid: t.String(),
  answer: t.Union([
    t.String(),
    t.Number(),
    t.Boolean(),
    t.Object({}),
    t.Array(t.Any()),
  ]),
  question: t.Optional(t.Union([
    t.String(),
    t.Object({
      type: t.String(),
      uid: t.String(),
      order: t.Optional(t.Number()),
      content: t.Optional(t.Any()),
    }),
  ])),
  key: t.Optional(t.String()), // UUID ключ для сохранения ответов
  final_question: t.Optional(t.Boolean()), // Является ли этот вопрос последним
  // quiz_all_question больше не используется в ответах - он сохраняется при получении квиза
});

// Модель для одного ответа на вопрос
export const quizAnswer = answerBase;

// Модель для массива ответов (для question_group)
export const quizAnswersArray = t.Array(answerBase);

// Модель для валидации FormData (загрузка файлов)
export const quizAnswerFormData = t.Object({
  answer: t.File(),
  question_uid: t.String(),
  question: t.Optional(t.Union([
    t.String(),
    t.Object({
      type: t.String(),
      uid: t.String(),
      order: t.Optional(t.Number()),
      content: t.Optional(t.Any()),
    }),
  ])),
  key: t.Optional(t.String()), // UUID ключ для сохранения ответов
  final_question: t.Optional(t.Boolean()), // Является ли этот вопрос последним
  // quiz_all_question больше не используется в ответах - он сохраняется при получении квиза
});

export type QuizAnswer = typeof quizAnswer.static;
export type QuizAnswersArray = typeof quizAnswersArray.static;
export type QuizAnswerFormData = typeof quizAnswerFormData.static;

// Модель для отправки контактных данных
export const quizContacts = t.Object({
  answers: t.Record(t.String(), t.String()), // Объект с ключами типа поля (name, email, phone) и значениями
  form: t.Array(t.Any()), // Массив полей формы
  key: t.Optional(t.String()), // UUID ключ для сохранения ответов
});

export type QuizContacts = typeof quizContacts.static;