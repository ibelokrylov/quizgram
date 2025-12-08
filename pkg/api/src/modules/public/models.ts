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