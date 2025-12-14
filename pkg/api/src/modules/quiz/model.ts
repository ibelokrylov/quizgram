// Модели валидации и типы для модуля квиза

import { t } from "elysia";

export namespace QuizModel {
  // Описание квиза в ответе
  export const quiz = t.Object({
    uid: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    isActive: t.Boolean(),
    name: t.String(),
    startPage: t.Optional(t.Any()),
    questionTitle: t.Optional(t.String()),
    question: t.Optional(t.Array(t.Any())),
    contact: t.Optional(t.Array(t.Any())),
    thxPage: t.Optional(t.Any()),
  });

  // Успешный ответ при получении квиза
  export const quizEditorSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: quiz,
  });

  export type quizEditorSuccessResponse =
    typeof quizEditorSuccessResponse.static;

  // Ответ при ошибке получения квиза
  export const quizEditorErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Not find user" или "not find"
  });

  export type quizEditorErrorResponse = typeof quizEditorErrorResponse.static;

  // Тело запроса для обновления имени квиза
  export const updateQuizNameBody = t.Object({
    name: t.String({
      minLength: 1,
      maxLength: 255,
    }),
  });

  export type updateQuizNameBody = typeof updateQuizNameBody.static;

  // Успешный ответ при обновлении имени квиза
  export const updateQuizNameSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type updateQuizNameSuccessResponse =
    typeof updateQuizNameSuccessResponse.static;

  // Ответ при ошибке обновления имени квиза
  export const updateQuizNameErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Unauthorized", "Not updated" или ошибка валидации
  });

  export type updateQuizNameErrorResponse =
    typeof updateQuizNameErrorResponse.static;

  // Описание квиза для dashboard (упрощенная версия)
  export const quizDashboard = t.Object({
    uid: t.String(),
    name: t.String(),
    opened: t.Number(),
    full: t.Number(),
    openedUnique: t.Number(),
    isActive: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  // Успешный ответ при получении dashboard
  export const dashboardSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      quizzes: t.Array(quizDashboard),
      count: t.Number(),
    }),
  });

  export type dashboardSuccessResponse =
    typeof dashboardSuccessResponse.static;

  // Ответ при ошибке получения dashboard
  export const dashboardErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Unauthorized" или "Not found"
  });

  export type dashboardErrorResponse = typeof dashboardErrorResponse.static;

  // Успешный ответ при удалении квиза
  export const deleteQuizSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type deleteQuizSuccessResponse =
    typeof deleteQuizSuccessResponse.static;

  // Ответ при ошибке удаления квиза
  export const deleteQuizErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Not find user" или "not find"
  });

  export type deleteQuizErrorResponse = typeof deleteQuizErrorResponse.static;

  // Тело запроса для обновления квиза
  export const updateQuizBody = t.Object({
    startPage: t.Optional(t.Any()),
    questionTitle: t.Optional(t.String()),
    question: t.Optional(t.Any()),
    contact: t.Optional(t.Any()),
    thxPage: t.Optional(t.Any()),
  });

  export type updateQuizBody = typeof updateQuizBody.static;

  // Успешный ответ при обновлении квиза
  export const updateQuizSuccessResponse = t.Object({
    ok: t.Array(t.String()),
    errors: t.Array(t.String()),
  });

  export type updateQuizSuccessResponse =
    typeof updateQuizSuccessResponse.static;

  // Ответ при ошибке обновления квиза
  export const updateQuizErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Unauthorized" или ошибка валидации
  });

  export type updateQuizErrorResponse = typeof updateQuizErrorResponse.static;

  // Успешный ответ при изменении статуса активности квиза
  export const changeActiveSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Boolean(), // Новое значение isActive
  });

  export type changeActiveSuccessResponse =
    typeof changeActiveSuccessResponse.static;

  // Ответ при ошибке изменения статуса активности квиза
  export const changeActiveErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Unauthorized" или "Not updated status"
  });

  export type changeActiveErrorResponse =
    typeof changeActiveErrorResponse.static;

  // Успешный ответ при создании квиза
  export const createQuizSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      uid: t.String(),
    }),
  });
  export type createQuizSuccessResponse = typeof createQuizSuccessResponse.static;

  // Успешный ответ при получении UUID квизов
  export const quizUuidsSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      uuids: t.Array(t.Object({
        uid: t.String(),
        name: t.String(),
      })),
    }),
  });
  export type quizUuidsSuccessResponse = typeof quizUuidsSuccessResponse.static;

  // Ответ при ошибке получения UUID квизов
  export const quizUuidsErrorResponse = t.Object({
    message: t.String(), // "failed"
    error: t.String(), // "Unauthorized" или другая ошибка
  });
  export type quizUuidsErrorResponse = typeof quizUuidsErrorResponse.static;
}
