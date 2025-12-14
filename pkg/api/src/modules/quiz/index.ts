// Контроллер для модуля квиза
// Используем Elysia instance как контроллер согласно best practices

import { Elysia, t } from "elysia";
import type { User } from "../../db";
import { logger } from "../../lib/logger";
import { AuthService } from "../auth/service";
import { QuizModel } from "./model";
import { QuizService } from "./service";

export const quiz = new Elysia({ prefix: "/quiz" })
  .state("user", null as User | null)
  .guard(
    {
      async beforeHandle(ctx) {
        if (!ctx.cookie.token.value) {
          ctx.set.status = 401;
          return { message: "Unauthorized" };
        } else {
          const user = await AuthService.getUserFromToken(
            ctx.cookie.token.value.toString(),
          );
          ctx.store.user = user;
        }
      },
    },
    (app) =>
      app
        .post("/", async (ctx) => {
          const user = ctx.store.user;
          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          if (!user.isVerification) {
            ctx.set.status = 403;
            return { message: "failed", error: "Forbidden" };
          }

          const quiz = await QuizService.createQuiz(user.id);
          const response: QuizModel.createQuizSuccessResponse = {
            message: "ok",
            data: {
              uid: quiz.uid,
            },
          };
          return response;
        }, {
          response: {
            200: QuizModel.createQuizSuccessResponse,
            400: t.Object({
              message: t.String(),
              error: t.String(),
            }),
            401: t.Object({
              message: t.String(),
              error: t.String(),
            }),
            403: t.Object({
              message: t.String(),
              error: t.String(),
            }),
          },
        })
        .get(
          "/dashboard",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.dashboardErrorResponse = {
                message: "failed",
                error: "Unauthorized",
              };
              return response;
            }

            const { query, set } = ctx;

            // Получаем параметры пагинации из query
            const parseLimit = parseInt(query.limit ?? "10", 10);
            const limit = parseLimit > 10 ? 10 : parseLimit;

            const parsePage = parseInt(query.page ?? "1", 10);
            const page = parsePage < 1 ? 1 : parsePage;
            const offset = (page - 1) * limit;

            try {
              const { quizzes } = await QuizService.getAllByDashboard(
                user.id,
                limit,
                offset,
              );

              const response: QuizModel.dashboardSuccessResponse = {
                message: "ok",
                data: {
                  quizzes: quizzes.map((quiz) => ({
                    uid: quiz.uid,
                    name: quiz.name ?? "Новый квиз",
                    opened: quiz.quiz_open?.opened ?? 0,
                    openedUnique: quiz.quiz_open?.openedUnique ?? 0,
                    full: quiz.quiz_open?.full ?? 0,
                    isActive: quiz.isActive ?? true,
                    createdAt: quiz.createdAt ?? new Date(),
                    updatedAt: quiz.updatedAt ?? new Date(),
                  })),
                  count: user.quizCount,
                },
              };

              return response;
            } catch (error) {
              console.log(error)
              logger.error(
                "Ошибка при получении дашборда квизов",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              set.status = 400;

              const response: QuizModel.dashboardErrorResponse = {
                message: "failed",
                error: "Not found",
              };

              return response;
            }
          },
          {
            query: t.Object({
              limit: t.Optional(t.String()),
              page: t.Optional(t.String()),
            }),
            response: {
              200: QuizModel.dashboardSuccessResponse,
              400: QuizModel.dashboardErrorResponse,
              401: t.Object({
                message: t.String(),
                error: t.String(),
              }),
            },
          },
        )
        .put(
          "/name/:uid",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.updateQuizNameErrorResponse = {
                message: "failed",
                error: "Unauthorized",
              };
              return response;
            }

            const { params, body, set } = ctx;
            const { uid } = params;

            // Проверка длины UID (должен быть UUID, т.е. 36 символов)
            if (uid.length !== 36) {
              set.status = 400;
              const response: QuizModel.updateQuizNameErrorResponse = {
                message: "failed",
                error: "Invalid UID",
              };
              return response;
            }

            try {
              await QuizService.updateQuizName(uid, user.id, body.name);

              const response: QuizModel.updateQuizNameSuccessResponse = {
                message: "ok",
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при обновлении имени квиза",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quizUid: uid },
              );
              set.status = 400;

              const response: QuizModel.updateQuizNameErrorResponse = {
                message: "failed",
                error: "Not updated",
              };

              return response;
            }
          },
          {
            params: t.Object({
              uid: t.String({
                minLength: 36,
                maxLength: 36,
              }),
            }),
            body: QuizModel.updateQuizNameBody,
            response: {
              200: QuizModel.updateQuizNameSuccessResponse,
              400: QuizModel.updateQuizNameErrorResponse,
              401: t.Object({
                message: t.String(),
                error: t.String(),
              }),
            },
          },
        )
        .delete(
          "/:uid",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.deleteQuizErrorResponse = {
                message: "failed",
                error: "Not find user",
              };
              return response;
            }

            const { params, set } = ctx;
            const { uid } = params;

            // Проверка длины UID (должен быть UUID, т.е. 36 символов)
            if (uid.length !== 36) {
              set.status = 400;
              const response: QuizModel.deleteQuizErrorResponse = {
                message: "failed",
                error: "not find",
              };
              return response;
            }

            try {
              await QuizService.deleteQuiz(uid, user.id);

              const response: QuizModel.deleteQuizSuccessResponse = {
                message: "ok",
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при удалении квиза",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quizUid: uid },
              );
              set.status = 400;

              const response: QuizModel.deleteQuizErrorResponse = {
                message: "failed",
                error: "not find",
              };

              return response;
            }
          },
          {
            params: t.Object({
              uid: t.String({
                minLength: 36,
                maxLength: 36,
              }),
            }),
            response: {
              200: QuizModel.deleteQuizSuccessResponse,
              400: QuizModel.deleteQuizErrorResponse,
              401: t.Object({
                message: t.String(),
                error: t.String(),
              }),
            },
          },
        )
        .put(
          "/:uid",
          async (ctx) => {
            logger.debug('ctx', ctx.params.uid);
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.updateQuizErrorResponse = {
                message: "failed",
                error: "Unauthorized",
              };
              return response;
            }

            const { params, body, set } = ctx;
            const { uid } = params;

            // Проверка длины UID (должен быть UUID, т.е. 36 символов)
            if (uid.length !== 36) {
              set.status = 400;
              const response: QuizModel.updateQuizErrorResponse = {
                message: "failed",
                error: "Invalid UID",
              };
              return response;
            }

            try {
              const [ok, errors] = await QuizService.updateQuiz(uid, user.id, body, user.planId);

              const response: QuizModel.updateQuizSuccessResponse = {
                ok: ok,
                errors: errors,
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при обновлении квиза",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quizUid: uid },
              );
              set.status = 400;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              const response: QuizModel.updateQuizErrorResponse = {
                message: "failed",
                error: errorMessage,
              };

              return response;
            }
          },
          {
            params: t.Object({
              uid: t.String({
                minLength: 36,
                maxLength: 36,
              }),
            }),
            body: QuizModel.updateQuizBody,
            response: {
              200: QuizModel.updateQuizSuccessResponse,
              400: QuizModel.updateQuizErrorResponse,
              401: t.Object({
                message: t.String(),
                error: t.String(),
              }),
            },
          },
        )
        .post(
          "/active/:uid",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.changeActiveErrorResponse = {
                message: "failed",
                error: "Unauthorized",
              };
              return response;
            }

            const { params, set } = ctx;
            const { uid } = params;

            // Проверка длины UID (должен быть UUID, т.е. 36 символов)
            if (uid.length !== 36) {
              set.status = 400;
              const response: QuizModel.changeActiveErrorResponse = {
                message: "failed",
                error: "Not updated status",
              };
              return response;
            }

            try {
              const newIsActive = await QuizService.updateQuizActive(
                uid,
                user.id,
              );

              const response: QuizModel.changeActiveSuccessResponse = {
                message: "ok",
                data: newIsActive,
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при изменении статуса активности квиза",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quizUid: uid },
              );
              set.status = 400;

              const response: QuizModel.changeActiveErrorResponse = {
                message: "failed",
                error: "Not updated status",
              };

              return response;
            }
          },
          {
            params: t.Object({
              uid: t.String({
                minLength: 36,
                maxLength: 36,
              }),
            }),
            response: {
              200: QuizModel.changeActiveSuccessResponse,
              400: QuizModel.changeActiveErrorResponse,
              401: t.Object({
                message: t.String(),
                error: t.String(),
              }),
            },
          },
        )
        .get(
          "/:uid",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.quizEditorErrorResponse = {
                message: "failed",
                error: "Not find user",
              };
              return response;
            }

            const { params, set } = ctx;
            const { uid } = params;

            try {
              const quizData = await QuizService.getQuizByUid(uid, user.id);
              if (!quizData) {
                set.status = 400;
                const response: QuizModel.quizEditorErrorResponse = {
                  message: "failed",
                  error: "not find",
                };
                return response;
              }


              const response: QuizModel.quizEditorSuccessResponse = {
                message: "ok",
                data: {
                  uid: quizData.quiz.uid,
                  createdAt: quizData.quiz.createdAt ?? new Date(),
                  updatedAt: quizData.quiz.updatedAt ?? new Date(),
                  isActive: quizData.quiz.isActive ?? false,
                  name: quizData.quiz.name ?? "Новый квиз",
                  startPage: quizData.quiz.startPage ?? undefined,
                  questionTitle: quizData.quiz.questionTitle ?? undefined,
                  question: quizData?.quiz_question ?? undefined,
                  contact: quizData?.quiz_contact ?? undefined,
                  thxPage: quizData?.quiz_thx_page ?? undefined,
                },
              };

              return response;
            } catch (error) {
              console.log(error)
              logger.error(
                "Ошибка при получении данных квиза",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quizUid: uid },
              );
              set.status = 400;

              const response: QuizModel.quizEditorErrorResponse = {
                message: "failed",
                error: "not find",
              };

              return response;
            }
          },
          {
            params: t.Object({
              uid: t.String({
                minLength: 36,
                maxLength: 36,
              }),
            }),
            response: {
              200: QuizModel.quizEditorSuccessResponse,
              400: QuizModel.quizEditorErrorResponse,
              401: t.Object({
                message: t.String(),
                error: t.String(),
              }),
            },
          },
        )
        .get(
          "/filters",
          async (ctx) => {
            const user = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              const response: QuizModel.quizFiltersErrorResponse = {
                message: "failed",
                error: "Unauthorized",
              };
              return response;
            }

            try {
              const filters = await QuizService.getQuizFilters(user.id);

              const response: QuizModel.quizFiltersSuccessResponse = {
                message: "ok",
                data: {
                  filters,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при получении фильтров квизов",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );
              ctx.set.status = 500;

              const response: QuizModel.quizFiltersErrorResponse = {
                message: "failed",
                error: "Internal server error",
              };

              return response;
            }
          },
          {
            response: {
              200: QuizModel.quizFiltersSuccessResponse,
              401: QuizModel.quizFiltersErrorResponse,
              500: QuizModel.quizFiltersErrorResponse,
            },
          },
        ),
  );
