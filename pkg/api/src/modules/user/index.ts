// Контроллер пользователя — обрабатывает HTTP-запросы

import { Elysia, t } from "elysia";
import type { User } from "../../db";
import {
  FileType,
  validateFileTypeAndSize,
} from "../../helpers/file.helper";
import { logger } from "../../lib/logger";
import { FFmpegService } from "../../services/ffmpeg.service";
import { FileService } from "../../services/file.service";
import { AuthService } from '../auth/service';
import { UserModel } from "./model";
import { UserService } from "./service";

export const user = new Elysia({ prefix: "/user" })
  .state('user', null as User | null)
  .guard(
    {
      async beforeHandle(ctx) {
        if (!ctx.cookie.token.value) {
          ctx.set.status = 401;
          return { message: "Unauthorized" };
        } else {
          ctx.store.user = await AuthService.getUserFromToken(ctx.cookie.token.value.toString());
        }
      },
    },
    (app) =>
      app
        .get(
          "/",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            try {
              // Используем данные пользователя из middleware, так как он уже загружен из БД
              // Это избегает повторного запроса и возможных проблем с синхронизацией
              const response: UserModel.sessionProfileSuccessResponse = {
                message: "ok",
                data: {
                  uid: user.uid,
                  login: user.login,
                  name: user.name ?? undefined,
                  planId: user.planId,
                  referralId: user.referralId ?? undefined,
                  isVerification: user.isVerification,
                  language: user.language ?? undefined,
                  createdAt: user.createdAt,
                  updatedAt: user.updatedAt,
                  telegramId: user.telegramId ?? undefined,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при получении профиля пользователя",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              throw error;
            }
          },
          {
            response: {
              200: UserModel.sessionProfileSuccessResponse,
              400: UserModel.sessionProfileErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .get(
          "/plan",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            try {
              const plan = await UserService.getUserPlan(user.id);

              const response: UserModel.getUserPlanSuccessResponse = {
                message: "ok",
                data: {
                  id: plan.id,
                  name: plan.name,
                  price: plan.price,
                  bidMonthLimit: plan.bidMonthLimit,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при получении плана пользователя",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              ctx.set.status = 400;
              const response: UserModel.getUserPlanErrorResponse = {
                message: "get-user-plan@error",
                error: error instanceof Error ? error.message : "Unknown error",
              };
              return response;
            }
          },
          {
            response: {
              200: UserModel.getUserPlanSuccessResponse,
              400: UserModel.getUserPlanErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .get(
          "/plans",
          async (ctx) => {
            try {
              const plans = await UserService.getAllPlans();

              const response: UserModel.getAllPlansSuccessResponse = {
                message: "ok",
                data: plans.map((plan) => ({
                  id: plan.id,
                  name: plan.name,
                  price: plan.price,
                  bidMonthLimit: plan.bidMonthLimit,
                })),
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при получении всех планов",
                error instanceof Error ? error : new Error(String(error)),
              );
              ctx.set.status = 400;
              return {
                message: "get-all-plans@error",
                error: error instanceof Error ? error.message : "Unknown error",
              };
            }
          },
          {
            response: {
              200: UserModel.getAllPlansSuccessResponse,
              400: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
            },
          },
        )
        .post(
          "/verification-email",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            const { body, set } = ctx;
            try {
              await UserService.verifyEmail(user, body.code);

              const response: UserModel.verificationEmailSuccessResponse = {
                message: "Email verified successfully",
              };

              return response;
            } catch (error) {
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              let message = "verification-email@failed";
              if (
                error instanceof Error &&
                error.message.includes("parse-error")
              ) {
                message = "verification-email@parse-error";
              } else if (
                error instanceof Error &&
                error.message.includes("validation-error")
              ) {
                message = "verification-email@validation-error";
              } else if (
                error instanceof Error &&
                error.name === "VerificationError"
              ) {
                message = "verification-email@failed";
              }

              const response: UserModel.verificationEmailErrorResponse = {
                message,
                errors: errorMessage,
              };

              return response;
            }
          },
          {
            body: UserModel.verificationEmailBody,
            response: {
              200: UserModel.verificationEmailSuccessResponse,
              400: UserModel.verificationEmailErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .get(
          "/resend-verification",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            const { set } = ctx;
            try {
              await UserService.resendVerificationCode(user);

              const response: UserModel.resendVerificationSuccessResponse = {
                message: "Verification code sent successfully",
              };

              return response;
            } catch (error) {
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              let message = "resend-verification@failed";
              if (
                error instanceof Error &&
                error.name === "RateLimitError"
              ) {
                message = "resend-verification@failed";
              }

              const response: UserModel.resendVerificationErrorResponse = {
                message,
                error: errorMessage,
              };

              return response;
            }
          },
          {
            response: {
              200: UserModel.resendVerificationSuccessResponse,
              400: UserModel.resendVerificationErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .post(
          "/upload-file",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }

            // Проверяем, что email подтвержден
            if (!user.isVerification) {
              ctx.set.status = 403;
              const response: UserModel.uploadFileErrorResponse = {
                message: "upload-file@email-not-confirmed",
                error: "Email is not confirmed",
              };
              return response;
            }

            const { set, query } = ctx;
            try {
              // Парсим параметр размера из query (формат: 300x312)
              let resizeOptions: { width: number; height: number } | null = null;
              if (query?.size && typeof query.size === "string") {
                const sizeMatch = query.size.match(/^(\d+)x(\d+)$/);
                if (sizeMatch) {
                  const width = parseInt(sizeMatch[1], 10);
                  const height = parseInt(sizeMatch[2], 10);
                  if (width > 0 && height > 0) {
                    resizeOptions = { width, height };
                  }
                }
              }

              // В Elysia файлы приходят через body при использовании multipart/form-data
              // Получаем файл из body
              let file: File | Blob | null = null;
              let fileName = "file";
              let contentType = "application/octet-stream";

              // Проверяем разные способы получения файла
              if (ctx.body instanceof FormData) {
                const formFile = ctx.body.get("file");
                if (formFile instanceof File) {
                  file = formFile;
                  fileName = formFile.name;
                  contentType = formFile.type || contentType;
                } else if (formFile && typeof formFile === "object" && "size" in formFile) {
                  file = formFile as Blob;
                }
              } else if (ctx.body && typeof ctx.body === "object" && "file" in ctx.body) {
                const bodyFile = (ctx.body as any).file;
                if (bodyFile instanceof File) {
                  file = bodyFile;
                  fileName = bodyFile.name;
                  contentType = bodyFile.type || contentType;
                } else if (bodyFile && bodyFile instanceof Blob) {
                  file = bodyFile;
                }
              }

              // Проверяем наличие файла
              if (!file) {
                set.status = 400;
                const response: UserModel.uploadFileErrorResponse = {
                  message: "upload-file@file-not-found",
                };
                return response;
              }

              let fileSize = file.size;

              // Валидация типа и размера файла
              const validation = validateFileTypeAndSize(contentType, fileSize);
              if (validation.error) {
                set.status = 400;
                const response: UserModel.uploadFileErrorResponse = {
                  message: "upload-file@validation-error",
                  error: validation.error.message,
                };
                return response;
              }

              // Проверяем, что для видео planId не равен 1 (админы имеют доступ)
              if (validation.fileType === FileType.Video && user.planId === 1 && !user.isAdmin) {
                set.status = 403;
                const response: UserModel.uploadFileErrorResponse = {
                  message: "upload-file@plan-restriction",
                  error: "Video upload is not available for your plan",
                };
                return response;
              }

              // Если это изображение и указан размер, изменяем размер
              if (validation.fileType === FileType.Image && resizeOptions) {
                try {
                  logger.info("Изменение размера изображения", {
                    fileName,
                    width: resizeOptions.width,
                    height: resizeOptions.height,
                  });

                  const resizedBuffer = await FFmpegService.resizeImage(
                    file,
                    resizeOptions,
                  );

                  // Создаём новый Blob из обработанного изображения
                  file = new Blob([new Uint8Array(resizedBuffer)], { type: contentType });
                  fileSize = resizedBuffer.length;

                  logger.info("Размер изображения успешно изменён", {
                    fileName,
                    originalSize: file.size,
                    newSize: fileSize,
                  });
                } catch (error) {
                  logger.error(
                    "Ошибка при изменении размера изображения",
                    error instanceof Error ? error : new Error(String(error)),
                    { fileName, resizeOptions },
                  );
                  set.status = 400;
                  const response: UserModel.uploadFileErrorResponse = {
                    message: "upload-file@resize-error",
                    error: error instanceof Error ? error.message : "Failed to resize image",
                  };
                  return response;
                }
              }

              // Загружаем файл через FileService
              const uploadResult = await FileService.uploadFile(
                file,
                contentType,
                fileName,
                fileSize,
                user.id,
              );

              const response: UserModel.uploadFileSuccessResponse = {
                message: "File uploaded successfully",
                data: {
                  fileName: uploadResult.fileName,
                  fileKey: uploadResult.fileKey,
                  fileURL: uploadResult.fileURL,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при загрузке файла",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              let message = "upload-file@error";
              if (error instanceof Error && error.message.includes("parse-error")) {
                message = "upload-file@parse-error";
              }
              const response: UserModel.uploadFileErrorResponse = {
                message,
                error: errorMessage,
              };
              return response;
            }
          },
          {
            // Убираем валидацию body для multipart/form-data
            // Elysia автоматически обрабатывает multipart данные
            query: UserModel.uploadFileQuery,
            response: {
              200: UserModel.uploadFileSuccessResponse,
              400: UserModel.uploadFileErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
            parser: 'multipart/form-data',
          },
        )
        .delete(
          "/delete-file",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            const { body, set } = ctx;
            try {
              await FileService.deleteFile(body.file_url, user.id);

              const response: UserModel.deleteFileSuccessResponse = {
                message: "ok",
              };

              return response;
            } catch (error) {
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              let message = "delete-file@error";
              if (
                error instanceof Error &&
                error.message.includes("parse-error")
              ) {
                message = "delete-file@parse-error";
              } else if (
                error instanceof Error &&
                error.message.includes("validation-error")
              ) {
                message = "delete-file@validation-error";
              }

              const response: UserModel.deleteFileErrorResponse = {
                message,
                error: errorMessage,
              };

              return response;
            }
          },
          {
            body: UserModel.deleteFileBody,
            response: {
              200: UserModel.deleteFileSuccessResponse,
              400: UserModel.deleteFileErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .put(
          "/language",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            const { body, set } = ctx;
            try {
              await UserService.updateLanguage(user.id, body.language);

              const response: UserModel.updateLanguageSuccessResponse = {
                message: "ok",
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при обновлении языка пользователя",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, language: body.language },
              );
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              const response: UserModel.updateLanguageErrorResponse = {
                message: "update-language@error",
                error: errorMessage,
              };

              return response;
            }
          },
          {
            body: UserModel.updateLanguageBody,
            response: {
              200: UserModel.updateLanguageSuccessResponse,
              400: UserModel.updateLanguageErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .get(
          "/notification",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            try {
              const notification = await UserService.getNotificationSettings(
                user.id,
              );

              const response: UserModel.getNotificationSuccessResponse = {
                message: "ok",
                data: {
                  telegram: notification.telegram,
                  email: notification.email,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при получении настроек уведомлений",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              ctx.set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              const response: UserModel.getNotificationErrorResponse = {
                message: "get-notification@error",
                error: errorMessage,
              };

              return response;
            }
          },
          {
            response: {
              200: UserModel.getNotificationSuccessResponse,
              400: UserModel.getNotificationErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .put(
          "/notification",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }
            const { body, set } = ctx;
            try {
              const updated = await UserService.updateNotificationSettings(
                user.id,
                {
                  telegram: body.telegram,
                  email: body.email,
                },
              );

              const response: UserModel.updateNotificationSuccessResponse = {
                message: "ok",
                data: {
                  telegram: updated.telegram,
                  email: updated.email,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при обновлении настроек уведомлений",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              const response: UserModel.updateNotificationErrorResponse = {
                message: "update-notification@error",
                error: errorMessage,
              };

              return response;
            }
          },
          {
            body: UserModel.updateNotificationBody,
            response: {
              200: UserModel.updateNotificationSuccessResponse,
              400: UserModel.updateNotificationErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        ),
  );
