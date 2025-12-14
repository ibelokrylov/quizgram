// Модели валидации и типы для модуля аутентификации
// Используем Elysia.t как единый источник правды для типов и валидации

import { t } from "elysia";

export namespace AuthModel {
  // Тело запроса для входа пользователя
  export const loginBody = t.Object({
    login: t.String({
      format: "email", // эквивалент validate:"email"
    }),
    password: t.String({
      minLength: 8,
      maxLength: 255,
    }),
    remember: t.Boolean({
      default: false,
    }),
  });

  export type loginBody = typeof loginBody.static;

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
  });

  // Успешный ответ при авторизации
  export const loginSuccessResponse = t.Object({
    message: t.String(), // например: "notification.user.authenticated"
    data: user,
  });

  export type loginSuccessResponse = typeof loginSuccessResponse.static;

  // Ответ при ошибке авторизации или валидации
  export const loginErrorResponse = t.Object({
    message: t.String(), // например: "notification.user.no-authenticated"
    error: t.Optional(t.String()),
  });

  export type loginErrorResponse = typeof loginErrorResponse.static;

  // Тело запроса для регистрации пользователя
  export const registrationBody = t.Object({
    login: t.String({
      format: "email", // эквивалент validate:"email"
    }),
    password: t.String({
      minLength: 8,
      maxLength: 255,
    }),
    remember: t.Boolean({
      default: false,
    }),
    name: t.Optional(t.String()),
    language: t.Optional(
      t.String({
        pattern: "^(en|ru)$",
        description: "Язык интерфейса: 'en' или 'ru'",
      }),
    ),
  });

  export type registrationBody = typeof registrationBody.static;

  // Успешный ответ при регистрации
  export const registrationSuccessResponse = t.Object({
    message: t.String(), // например: "notification.user.authenticated"
    data: user,
  });

  export type registrationSuccessResponse =
    typeof registrationSuccessResponse.static;

  // Ответ при ошибке регистрации или валидации
  export const registrationErrorResponse = t.Object({
    message: t.String(), // например: "registration@error"
    error: t.Optional(t.String()),
  });

  export type registrationErrorResponse =
    typeof registrationErrorResponse.static;

  // Тело запроса для восстановления пароля (начало процесса)
  export const forgotPasswordBody = t.Object({
    login: t.String({
      format: "email",
    }),
  });

  export type forgotPasswordBody = typeof forgotPasswordBody.static;

  // Успешный ответ при запросе восстановления пароля
  export const forgotPasswordSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type forgotPasswordSuccessResponse =
    typeof forgotPasswordSuccessResponse.static;

  // Тело запроса для проверки кода восстановления пароля (начало)
  export const verifyResetPasswordStartBody = t.Object({
    code: t.String({
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", // UUID формат
    }),
    email: t.String({
      format: "email",
    }),
  });

  export type verifyResetPasswordStartBody =
    typeof verifyResetPasswordStartBody.static;

  // Успешный ответ при проверке кода восстановления пароля
  export const verifyResetPasswordStartSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type verifyResetPasswordStartSuccessResponse =
    typeof verifyResetPasswordStartSuccessResponse.static;

  // Ответ при ошибке проверки кода восстановления пароля
  export const verifyResetPasswordStartErrorResponse = t.Object({
    message: t.String(), // "verify-reset-password@error"
    error: t.Optional(t.String()),
  });

  export type verifyResetPasswordStartErrorResponse =
    typeof verifyResetPasswordStartErrorResponse.static;

  // Тело запроса для завершения восстановления пароля
  export const forgotPasswordEndBody = t.Object({
    code: t.String({
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", // UUID формат
    }),
    email: t.String({
      format: "email",
    }),
    password: t.String({
      minLength: 8,
      maxLength: 255,
    }),
  });

  export type forgotPasswordEndBody = typeof forgotPasswordEndBody.static;

  // Успешный ответ при завершении восстановления пароля
  export const forgotPasswordEndSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type forgotPasswordEndSuccessResponse =
    typeof forgotPasswordEndSuccessResponse.static;

  // Ответ при ошибке завершения восстановления пароля
  export const forgotPasswordEndErrorResponse = t.Object({
    message: t.String(), // "verify-reset-password-end@error"
    error: t.Optional(t.String()),
  });

  export type forgotPasswordEndErrorResponse =
    typeof forgotPasswordEndErrorResponse.static;

  // Успешный ответ при выходе из системы
  export const logoutSuccessResponse = t.Object({
    message: t.String(), // "ok"
  });

  export type logoutSuccessResponse = typeof logoutSuccessResponse.static;
}


