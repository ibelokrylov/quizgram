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
    createdAt: t.Optional(t.Date()),
    updatedAt: t.Optional(t.Date()),
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
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", // UUID формат
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
}
