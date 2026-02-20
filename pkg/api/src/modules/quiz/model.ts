// Модели валидации и типы для модуля квиза

import { t } from 'elysia';
import { ErrorType } from '../../type/error.type';

export namespace QuizModel {
  // Описание квиза в ответе
  export const quiz = t.Object({
    uid: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    isActive: t.Boolean(),
    name: t.String(),
    isShowLogo: t.Optional(t.Boolean()),
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

  export type quizEditorSuccessResponse = typeof quizEditorSuccessResponse.static;

  // Ответ при ошибке получения квиза
  export const quizEditorErrorResponse = ErrorType;
  export type quizEditorErrorResponse = ErrorType;

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

  export type updateQuizNameSuccessResponse = typeof updateQuizNameSuccessResponse.static;

  // Ответ при ошибке обновления имени квиза
  export const updateQuizNameErrorResponse = ErrorType;
  export type updateQuizNameErrorResponse = ErrorType;

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

  export type dashboardSuccessResponse = typeof dashboardSuccessResponse.static;

  // Ответ при ошибке получения dashboard
  export const dashboardErrorResponse = ErrorType;
  export type dashboardErrorResponse = ErrorType;

  // Успешный ответ при удалении квиза
  export const deleteQuizSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type deleteQuizSuccessResponse = typeof deleteQuizSuccessResponse.static;

  // Ответ при ошибке удаления квиза
  export const deleteQuizErrorResponse = ErrorType;
  export type deleteQuizErrorResponse = ErrorType;

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

  export type updateQuizSuccessResponse = typeof updateQuizSuccessResponse.static;

  // Ответ при ошибке обновления квиза
  export const updateQuizErrorResponse = ErrorType;
  export type updateQuizErrorResponse = ErrorType;

  // Успешный ответ при изменении статуса активности квиза
  export const changeActiveSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Boolean(), // Новое значение isActive
  });

  export type changeActiveSuccessResponse = typeof changeActiveSuccessResponse.static;

  // Ответ при ошибке изменения статуса активности квиза
  export const changeActiveErrorResponse = ErrorType;
  export type changeActiveErrorResponse = ErrorType;

  // Успешный ответ при создании квиза
  export const createQuizSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      uid: t.String(),
    }),
  });
  export type createQuizSuccessResponse = typeof createQuizSuccessResponse.static;

  // Успешный ответ при получении фильтров квизов
  export const quizFiltersSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      filters: t.Array(
        t.Object({
          uid: t.String(),
          name: t.String(),
        }),
      ),
    }),
  });
  export type quizFiltersSuccessResponse = typeof quizFiltersSuccessResponse.static;

  // Ответ при ошибке получения фильтров квизов
  export const quizFiltersErrorResponse = ErrorType;
  export type quizFiltersErrorResponse = ErrorType;

  // Тело запроса для обновления is_show_logo
  export const updateQuizIsShowLogoBody = t.Object({
    isShowLogo: t.Boolean(),
  });

  export type updateQuizIsShowLogoBody = typeof updateQuizIsShowLogoBody.static;

  // Успешный ответ при обновлении is_show_logo
  export const updateQuizIsShowLogoSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Boolean(), // Новое значение isShowLogo
  });

  export type updateQuizIsShowLogoSuccessResponse = typeof updateQuizIsShowLogoSuccessResponse.static;

  // Ответ при ошибке обновления is_show_logo
  export const updateQuizIsShowLogoErrorResponse = ErrorType;
  export type updateQuizIsShowLogoErrorResponse = ErrorType;

  export const updateIsShared = t.Object({ isShared: t.Boolean() });
  export type UpdateIsShared = typeof updateIsShared.static;
}
