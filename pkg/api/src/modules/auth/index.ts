// Контроллер аутентификации — обрабатывает HTTP-запросы
// Используем Elysia instance как контроллер согласно best practices:
// https://elysiajs.com/essential/best-practice.html#folder-structure

import { Elysia } from "elysia";
import { logger } from '../../lib/logger';
import { AuthModel } from "./model";
import { AuthService } from "./service";

export const auth = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, cookie, set }) => {
      try {
        // Оптимизация: проверяем наличие валидного токена в cookie
        // Если токен валиден - возвращаем пользователя без обращения к БД для проверки пароля
        const existingToken = cookie.token.value;
        if (existingToken) {
          const checkToken = await AuthService.getUserFromToken(existingToken.toString());
          if (checkToken) {
            set.status = 200;
            return {
              message: "notification.user.authenticated",
            };
          }
        }

        // Если токена нет или он невалиден - выполняем обычную логику логина
        const { user, token } = await AuthService.login(body);

        // Логика remember аналогична Go-коду:
        // if !dto.Remember => длинная сессия, else => короткая
        const longSession = !body.remember;
        const maxAge = longSession
          ? 30 * 24 * 60 * 60 * 12 // ~1 год в секундах
          : 2 * 60 * 60; // 2 часа

        // Устанавливаем cookie с токеном
        cookie.token.set({
          value: token,
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge,
          path: "/",
        });

        const response: AuthModel.loginSuccessResponse = {
          message: "notification.user.authenticated",
          data: {
            uid: user.uid,
            login: user.login,
            name: user.name ?? undefined,
            planId: user.planId,
            referralId: user.referralId ?? undefined,
            isVerification: user.isVerification,
            language: user.language ?? undefined,
            createdAt: user.createdAt ?? undefined,
            updatedAt: user.updatedAt ?? undefined,
          },
        };
        set.status = 200;
        return response;
      } catch (error) {
        set.status = 400;

        const message = "notification.user.no-authenticated";
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        const response: AuthModel.loginErrorResponse = {
          message,
          error: errorMessage,
        };

        return response;
      }
    },
    {
      // Валидация тела запроса через Elysia.t (TypeBox)
      // https://elysiajs.com/essential/validation.html#validation
      body: AuthModel.loginBody,
      response: {
        200: AuthModel.loginSuccessResponse,
        400: AuthModel.loginErrorResponse,
      },
    },
  )
  .post(
    "/registration",
    async ({ body, cookie, set }) => {
      try {
        const { user, token } = await AuthService.registration(body);

        // Логика remember аналогична Go-коду:
        // if !data.Remember => длинная сессия, else => короткая
        const longSession = !body.remember;
        const maxAge = longSession
          ? 30 * 24 * 60 * 60 * 12 // ~1 год в секундах
          : 2 * 60 * 60; // 2 часа

        // Устанавливаем cookie с токеном
        cookie.token.set({
          value: token,
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge,
          path: "/",
        });

        const response: AuthModel.registrationSuccessResponse = {
          message: "notification.user.authenticated",
          data: {
            uid: user.uid,
            login: user.login,
            name: user.name ?? undefined,
            planId: user.planId,
            referralId: user.referralId ?? undefined,
            isVerification: user.isVerification,
            language: user.language ?? undefined,
          },
        };

        return response;
      } catch (error) {
        set.status = 400;

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Определяем тип ошибки для сообщения
        let message = "registration@error";
        if (error instanceof Error && error.name === "RegistrationError") {
          message = "registration@error";
        } else if (
          error instanceof Error &&
          error.message.includes("body-parse")
        ) {
          message = "registration@error-body-parse";
        } else if (
          error instanceof Error &&
          error.message.includes("validate")
        ) {
          message = "registration@error-validate";
        }

        const response: AuthModel.registrationErrorResponse = {
          message,
          error: errorMessage,
        };

        return response;
      }
    },
    {
      body: AuthModel.registrationBody,
      response: {
        200: AuthModel.registrationSuccessResponse,
        400: AuthModel.registrationErrorResponse,
      },
    },
  )
  .post(
    "/forgot-password",
    async ({ body, set }) => {
      try {
        await AuthService.forgotPassword(body);
        const response: AuthModel.forgotPasswordSuccessResponse = {
          message: "ok",
        };
        return response;
      } catch (error) {
        // В Go коде всегда возвращается успех, даже при ошибке
        // Это сделано для безопасности (не раскрывать существование email)
        const response: AuthModel.forgotPasswordSuccessResponse = {
          message: "ok",
        };
        return response;
      }
    },
    {
      body: AuthModel.forgotPasswordBody,
      response: {
        200: AuthModel.forgotPasswordSuccessResponse,
      },
    },
  )
  .post(
    "/forgot-password/start",
    async ({ body, set }) => {
      try {
        await AuthService.startResetPassword(body);
        const response: AuthModel.verifyResetPasswordStartSuccessResponse = {
          message: "ok",
        };
        return response;
      } catch (error) {
        set.status = 400;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const response: AuthModel.verifyResetPasswordStartErrorResponse = {
          message: "verify-reset-password@error",
          error: errorMessage,
        };
        return response;
      }
    },
    {
      body: AuthModel.verifyResetPasswordStartBody,
      response: {
        200: AuthModel.verifyResetPasswordStartSuccessResponse,
        400: AuthModel.verifyResetPasswordStartErrorResponse,
      },
    },
  )
  .post(
    "/forgot-password/end",
    async ({ body, set }) => {
      try {
        await AuthService.endResetPassword(body);
        const response: AuthModel.forgotPasswordEndSuccessResponse = {
          message: "ok",
        };
        return response;
      } catch (error) {
        logger.error("Ошибка при сбросе пароля", error instanceof Error ? error : new Error(String(error)), { body });
        set.status = 400;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        let message = "verify-reset-password-end@error";
        if (
          error instanceof Error &&
          error.message.includes("body-parse")
        ) {
          message = "verify-reset-password-end@error-body";
        } else if (
          error instanceof Error &&
          error.message.includes("validate")
        ) {
          message = "verify-reset-password-end@error-validate";
        }
        const response: AuthModel.forgotPasswordEndErrorResponse = {
          message,
          error: errorMessage,
        };
        return response;
      }
    },
    {
      body: AuthModel.forgotPasswordEndBody,
      response: {
        200: AuthModel.forgotPasswordEndSuccessResponse,
        400: AuthModel.forgotPasswordEndErrorResponse,
      },
    },
  )
  .post(
    "/logout",
    async ({ cookie }) => {
      // Удаляем cookie с токеном, устанавливая его в пустое значение
      // с коротким сроком жизни (аналогично Go коду: Expires через 2 секунды)
      cookie.token.set({
        value: "",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 2, // 2 секунды
        path: "/",
      });

      const response: AuthModel.logoutSuccessResponse = {
        message: "ok",
      };

      return response;
    },
    {
      response: {
        200: AuthModel.logoutSuccessResponse,
      },
    },
  );
