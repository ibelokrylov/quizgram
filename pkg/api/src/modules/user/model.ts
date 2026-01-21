// Модели валидации и типы для модуля пользователя

import { t } from "elysia";

export namespace UserModel {
  // Описание пользователя в ответе (без пароля)
  export const user = t.Object({
    uid: t.String(),
    login: t.String(),
    name: t.Optional(t.String()),
    planId: t.Number(),
    referralId: t.Optional(t.Number()),
    isVerification: t.Boolean(),
    language: t.Optional(t.String()),
    createdAt: t.Optional(t.Date()),
    updatedAt: t.Optional(t.Date()),
    telegramId: t.Optional(t.Nullable(t.String())),
    isAdmin: t.Optional(t.Boolean()),
  });

  // Успешный ответ при получении профиля пользователя
  export const sessionProfileSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: user,
  });

  export type sessionProfileSuccessResponse =
    typeof sessionProfileSuccessResponse.static;

  // Ответ при ошибке получения профиля
  export const sessionProfileErrorResponse = t.Object({
    message: t.String(), // "session-profile@error"
  });

  export type sessionProfileErrorResponse =
    typeof sessionProfileErrorResponse.static;

  // Тело запроса для верификации email
  export const verificationEmailBody = t.Object({
    code: t.String({
      pattern: "^\\d{6}$", // 6-значный цифровой код
      description: "Код должен содержать 6 цифр",
    }),
  });

  export type verificationEmailBody = typeof verificationEmailBody.static;

  // Успешный ответ при верификации email
  export const verificationEmailSuccessResponse = t.Object({
    message: t.String(), // "Email verified successfully"
  });

  export type verificationEmailSuccessResponse =
    typeof verificationEmailSuccessResponse.static;

  // Ответ при ошибке верификации email
  export const verificationEmailErrorResponse = t.Object({
    message: t.String(), // "verification-email@error" или другие варианты
    errors: t.Optional(t.Any()),
  });

  export type verificationEmailErrorResponse =
    typeof verificationEmailErrorResponse.static;

  // Успешный ответ при повторной отправке кода верификации
  export const resendVerificationSuccessResponse = t.Object({
    message: t.String(), // "Verification code sent successfully"
  });

  export type resendVerificationSuccessResponse =
    typeof resendVerificationSuccessResponse.static;

  // Ответ при ошибке повторной отправки кода верификации
  export const resendVerificationErrorResponse = t.Object({
    message: t.String(), // "resend-verification@error" или "resend-verification@failed"
    error: t.Optional(t.String()),
  });

  export type resendVerificationErrorResponse =
    typeof resendVerificationErrorResponse.static;

  // Успешный ответ при загрузке файла
  export const uploadFileSuccessResponse = t.Object({
    message: t.String(), // "File uploaded successfully"
    data: t.Object({
      fileName: t.String(),
      fileKey: t.String(),
      fileURL: t.String(),
    }),
  });

  export type uploadFileSuccessResponse =
    typeof uploadFileSuccessResponse.static;

  // Ответ при ошибке загрузки файла
  export const uploadFileErrorResponse = t.Object({
    message: t.String(), // "upload-file@error" или "upload-file@file-not-found"
    error: t.Optional(t.String()),
  });

  export type uploadFileErrorResponse = typeof uploadFileErrorResponse.static;

  // Тело запроса для удаления файла
  export const deleteFileBody = t.Object({
    file_url: t.String({
      format: "uri", // валидация URL
    }),
  });

  export type deleteFileBody = typeof deleteFileBody.static;

  // Успешный ответ при удалении файла
  export const deleteFileSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type deleteFileSuccessResponse =
    typeof deleteFileSuccessResponse.static;

  // Ответ при ошибке удаления файла
  export const deleteFileErrorResponse = t.Object({
    message: t.String(), // "delete-file@error" или другие варианты
    error: t.Optional(t.String()),
    errors: t.Optional(t.Any()),
  });

  export type deleteFileErrorResponse = typeof deleteFileErrorResponse.static;

  // Модель плана пользователя
  export const userPlan = t.Object({
    id: t.Number(),
    name: t.String(), // "FREE" или "BASE"
    price: t.Number(),
    bidMonthLimit: t.Number(),
    finalDayAt: t.Optional(t.String()), // Дата окончания подписки (ISO string)
  });

  export type userPlan = typeof userPlan.static;

  // Успешный ответ при получении плана пользователя
  export const getUserPlanSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: userPlan,
  });

  export type getUserPlanSuccessResponse =
    typeof getUserPlanSuccessResponse.static;

  // Ответ при ошибке получения плана
  export const getUserPlanErrorResponse = t.Object({
    message: t.String(), // "get-user-plan@error"
    error: t.Optional(t.String()),
  });

  export type getUserPlanErrorResponse =
    typeof getUserPlanErrorResponse.static;

  // Успешный ответ при получении всех планов
  export const getAllPlansSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Array(userPlan),
  });

  export type getAllPlansSuccessResponse =
    typeof getAllPlansSuccessResponse.static;

  // Query параметры для загрузки файла
  export const uploadFileQuery = t.Object({
    size: t.Optional(
      t.String({
        pattern: "^\\d+x\\d+$", // Формат: 300x312
        description: "Размер изображения в формате WIDTHxHEIGHT (например, 300x312)",
      }),
    ),
  });

  export type uploadFileQuery = typeof uploadFileQuery.static;

  // Тело запроса для обновления языка пользователя
  export const updateLanguageBody = t.Object({
    language: t.String({
      pattern: "^(en|ru)$",
      description: "Язык интерфейса: 'en' или 'ru'",
    }),
  });

  export type updateLanguageBody = typeof updateLanguageBody.static;

  // Успешный ответ при обновлении языка
  export const updateLanguageSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type updateLanguageSuccessResponse =
    typeof updateLanguageSuccessResponse.static;

  // Ответ при ошибке обновления языка
  export const updateLanguageErrorResponse = t.Object({
    message: t.String(), // "update-language@error"
    error: t.Optional(t.String()),
  });

  export type updateLanguageErrorResponse =
    typeof updateLanguageErrorResponse.static;

  // Модель настроек уведомлений
  export const userNotification = t.Object({
    telegram: t.Boolean(),
    email: t.Boolean(),
  });

  export type userNotification = typeof userNotification.static;

  // Успешный ответ при получении настроек уведомлений
  export const getNotificationSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: userNotification,
  });

  export type getNotificationSuccessResponse =
    typeof getNotificationSuccessResponse.static;

  // Ответ при ошибке получения настроек уведомлений
  export const getNotificationErrorResponse = t.Object({
    message: t.String(), // "get-notification@error"
    error: t.Optional(t.String()),
  });

  export type getNotificationErrorResponse =
    typeof getNotificationErrorResponse.static;

  // Тело запроса для обновления настроек уведомлений
  export const updateNotificationBody = t.Object({
    telegram: t.Optional(t.Boolean()),
    email: t.Optional(t.Boolean()),
  });

  export type updateNotificationBody = typeof updateNotificationBody.static;

  // Успешный ответ при обновлении настроек уведомлений
  export const updateNotificationSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: userNotification,
  });

  export type updateNotificationSuccessResponse =
    typeof updateNotificationSuccessResponse.static;

  // Ответ при ошибке обновления настроек уведомлений
  export const updateNotificationErrorResponse = t.Object({
    message: t.String(), // "update-notification@error"
    error: t.Optional(t.String()),
  });

  export type updateNotificationErrorResponse =
    typeof updateNotificationErrorResponse.static;
}
