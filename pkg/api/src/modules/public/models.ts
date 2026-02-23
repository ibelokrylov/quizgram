import { Static, t } from 'elysia';

export const bodyAnswer = t.Object({
  answer: t.String(),
  question_uid: t.String(),
  key: t.String(),
  files: t.Optional(t.Union([t.Files(), t.File()])),
});
export type BodyAnswer = Static<typeof bodyAnswer>;

export const AnswerVariant = t.String();
export type AnswerVariant = Static<typeof AnswerVariant>;

export const AnswerVariantImage = t.Object({
  value: t.String(),
  url: t.String(),
});
export type AnswerVariantImage = Static<typeof AnswerVariantImage>;

export const AnswerVariantAndImage = t.Object({
  value: t.String(),
  url: t.String(),
});
export type AnswerVariantAndImage = Static<typeof AnswerVariantAndImage>;

export const AnswerTextFields = t.String();
export type AnswerTextFields = Static<typeof AnswerTextFields>;

export const AnswerList = t.String();
export type AnswerList = Static<typeof AnswerList>;

export const AnswerCalendar = t.Union([t.Date(), t.String()]);
export type AnswerCalendar = Static<typeof AnswerCalendar>;

export const AnswerSlider = t.Number();
export type AnswerSlider = Static<typeof AnswerSlider>;

export const AnswerFiles = t.Array(
  t.Object({
    __fileIndex: t.Number(),
    fileName: t.String(),
  })
);
export type AnswerFiles = Static<typeof AnswerFiles>;

export const AnswerPages = t.Object({
  type: t.String(),
  uid: t.String(),
  order: t.Number(),
  content: t.Any(),
});
export type AnswerPages = Static<typeof AnswerPages>;

export const AnswerRating = t.Number();
export type AnswerRating = Static<typeof AnswerRating>;

export const AnswerGroup = t.Array(
  t.Object({
    question_uid: t.String(),
    answer: t.Union([
      AnswerVariant,
      AnswerVariantImage,
      AnswerVariantAndImage,
      AnswerTextFields,
      AnswerList,
      AnswerCalendar,
      AnswerSlider,
      AnswerFiles,
      AnswerPages,
      AnswerRating,
    ]),
  })
);
export type AnswerGroup = Static<typeof AnswerGroup>;

export const Answer = t.Union([
  t.Union([
    AnswerVariant,
    AnswerVariantImage,
    AnswerVariantAndImage,
    AnswerTextFields,
    AnswerList,
    AnswerCalendar,
    AnswerSlider,
    AnswerFiles,
    AnswerPages,
    AnswerRating,
    AnswerGroup,
  ]),
]);
export type Answer = Static<typeof Answer>;

export const publicQuiz = t.Object({
  uid: t.String(),
  name: t.String(),
  isShowLogo: t.Optional(t.Boolean()),
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
    // В ответах может приходить произвольный объект (например { value, url } для variant_image)
    t.Record(t.String(), t.Any()),
    t.Array(t.Any()),
  ]),
  question: t.Optional(
    t.Union([
      t.String(),
      t.Object({
        uid: t.String(),
        type: t.Optional(t.String()),
        order: t.Optional(t.Number()),
        content: t.Optional(t.Any()),
      }),
    ])
  ),
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
  question: t.Optional(
    t.Union([
      t.String(),
      t.Object({
        uid: t.String(),
        type: t.Optional(t.String()),
        order: t.Optional(t.Number()),
        content: t.Optional(t.Any()),
      }),
    ])
  ),
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
  form: t.Optional(t.Array(t.Any())), // Массив полей формы (опционально, форма уже сохранена в contactsForm)
  key: t.Optional(t.String()), // UUID ключ для сохранения ответов
});

export type QuizContacts = typeof quizContacts.static;
