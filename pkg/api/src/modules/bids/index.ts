import Elysia, { t } from "elysia";
import { logger } from "../../lib/logger";
import { AuthService, type UserWithPlan } from "../auth/service";
import { ExportService } from "../../services/export.service";
import {
  BidsModel,
  bidsListFilters,
  bidsListResponse,
  bidsExportFilters,
  updateBidStatus,
  type BidsExportFilters
} from "./model";
import { BidsService } from "./service";

export const bids = new Elysia({ prefix: "/bids" })
  .state("user", null as UserWithPlan | null)
  .guard(
    {
      async beforeHandle(ctx) {
        if (!ctx.cookie.token.value) {
          ctx.set.status = 401;
          return { message: "failed", error: "Unauthorized" };
        } else {
          const user = await AuthService.getUserFromToken(
            ctx.cookie.token.value.toString(),
            true, // Подгружаем план пользователя
          );
          ctx.store.user = (user && 'plan' in user ? user : null) as UserWithPlan | null;
        }
      },
    },
    (app) =>
      app
        // GET /bids - получение списка заявок
        .get("/", async (ctx) => {
          const user: UserWithPlan | null = ctx.store.user;

          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          try {
            const { query } = ctx;

            // Используем план из пользователя (уже загружен через getUserFromToken)
            // Если план не найден, используем значения по умолчанию для FREE плана
            const bidMonthLimit = user.plan?.bidMonthLimit ?? 10;
            const planName = user.plan?.name ?? "FREE";

            // Для FREE тарифа запрещаем запрос незавершенных заявок (isFull=false)
            if (planName === "FREE" && query.isFull === false) {
              ctx.set.status = 403;
              const response: BidsModel.getBidsErrorResponse = {
                message: "failed",
                error: "error.freePlanBidsRestriction",
              };
              return response;
            }

            const result = await BidsService.getBidsList(
              user.id,
              query,
              user.createdAt,
              bidMonthLimit,
              planName,
              user.planId
            );

            // Для FREE плана убираем totalNotFull из ответа
            const responseData = planName === "FREE"
              ? {
                data: result.data,
                total: result.total,
                hasMore: result.hasMore,
                hasMoreBeyondLimit: result.hasMoreBeyondLimit,
                beyondLimitCount: result.beyondLimitCount,
                maxAvailableFull: result.maxAvailableFull,
                deletedInLimitFull: result.deletedInLimitFull,
              }
              : result;

            return {
              message: "success",
              data: responseData
            };
          } catch (error) {
            logger.error("Failed to get bids list", error as Error, { userId: user.id });

            ctx.set.status = 500;
            const response: BidsModel.getBidsErrorResponse = {
              message: "failed",
              error: "Internal server error",
            };
            return response;
          }
        }, {
          query: bidsListFilters,
          response: {
            200: bidsListResponse,
            401: BidsModel.getBidsErrorResponse,
            403: BidsModel.getBidsErrorResponse,
            500: BidsModel.getBidsErrorResponse,
          },
        })

        // PUT /bids/status - обновление статуса заявки
        .put("/status", async (ctx) => {
          const user: UserWithPlan | null = ctx.store.user;

          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          try {
            const { body } = ctx;
            await BidsService.updateBidStatus(user.id, body);

            return {
              message: "success",
              data: { success: true }
            };
          } catch (error) {
            logger.error("Failed to update bid status", error as Error, {
              userId: user.id,
              body: ctx.body
            });

            if (error instanceof Error && error.message === "Bid not found or access denied") {
              ctx.set.status = 404;
              const response: BidsModel.updateBidStatusErrorResponse = {
                message: "failed",
                error: "Bid not found or access denied",
              };
              return response;
            }

            ctx.set.status = 500;
            const response: BidsModel.updateBidStatusErrorResponse = {
              message: "failed",
              error: "Internal server error",
            };
            return response;
          }
        }, {
          body: updateBidStatus,
          response: {
            200: BidsModel.updateBidStatusSuccessResponse,
            401: BidsModel.updateBidStatusErrorResponse,
            404: BidsModel.updateBidStatusErrorResponse,
            500: BidsModel.updateBidStatusErrorResponse,
          },
        })

        // GET /bids/:key - получение информации по заявке по key (key из таблицы quiz_bid)
        .get("/:key", async (ctx) => {
          const user: UserWithPlan | null = ctx.store.user;

          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          try {
            const { params } = ctx;
            const result = await BidsService.getBidDetails(user.id, params.key);

            return {
              message: "success",
              data: result
            };
          } catch (error) {
            logger.error("Failed to get bid details", error as Error, {
              userId: user.id,
              key: ctx.params.key
            });

            if (error instanceof Error && error.message === "Bid not found or access denied") {
              ctx.set.status = 404;
              const response: BidsModel.getBidDetailsErrorResponse = {
                message: "failed",
                error: "Bid not found or access denied",
              };
              return response;
            }

            ctx.set.status = 500;
            const response: BidsModel.getBidDetailsErrorResponse = {
              message: "failed",
              error: "Internal server error",
            };
            return response;
          }
        }, {
          params: t.Object({
            key: t.String(),
          }),
          response: {
            200: BidsModel.getBidDetailsSuccessResponse,
            401: BidsModel.getBidDetailsErrorResponse,
            404: BidsModel.getBidDetailsErrorResponse,
            500: BidsModel.getBidDetailsErrorResponse,
          },
        })

        // DELETE /bids/:key - удаление заявки (soft delete)
        .delete("/:key", async (ctx) => {
          const user: UserWithPlan | null = ctx.store.user;

          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          try {
            const { params } = ctx;
            await BidsService.deleteBid(user.id, params.key);

            return {
              message: "success",
              data: { success: true }
            };
          } catch (error) {
            logger.error("Failed to delete bid", error as Error, {
              userId: user.id,
              key: ctx.params.key
            });

            if (error instanceof Error && error.message === "Bid not found or access denied") {
              ctx.set.status = 404;
              const response: BidsModel.deleteBidErrorResponse = {
                message: "failed",
                error: "Bid not found or access denied",
              };
              return response;
            }

            ctx.set.status = 500;
            const response: BidsModel.deleteBidErrorResponse = {
              message: "failed",
              error: "Internal server error",
            };
            return response;
          }
        }, {
          params: t.Object({
            key: t.String(),
          }),
          response: {
            200: BidsModel.deleteBidSuccessResponse,
            401: BidsModel.deleteBidErrorResponse,
            404: BidsModel.deleteBidErrorResponse,
            500: BidsModel.deleteBidErrorResponse,
          },
        })

        // GET /bids/export - экспорт заявок в CSV или Excel
        .get("/export", async (ctx) => {
          const user: UserWithPlan | null = ctx.store.user;

          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          // Проверяем, что пользователь не на FREE плане
          const planName = user.plan?.name ?? "FREE";
          if (planName === "FREE") {
            ctx.set.status = 403;
            return { message: "failed", error: "Export is not available for FREE plan" };
          }

          try {
            const { query } = ctx;
            const format = query.format as 'csv' | 'excel';

            if (!format || (format !== 'csv' && format !== 'excel')) {
              ctx.set.status = 400;
              return { message: "failed", error: "Invalid format. Use 'csv' or 'excel'" };
            }

            // Получаем фильтры без limit и offset
            // Преобразуем строковые значения в boolean (для isFull и isRead)
            const exportFilters: BidsExportFilters = {
              quiz_uid: query.quiz_uid,
              status: query.status,
              isFull: query.isFull === "true" 
                ? true 
                : query.isFull === "false" 
                  ? false 
                  : query.isFull === "all" || query.isFull === undefined
                    ? undefined
                    : query.isFull as boolean,
              isRead: query.isRead === "true"
                ? true
                : query.isRead === "false"
                  ? false
                  : query.isRead === undefined
                    ? undefined
                    : query.isRead as boolean,
            };

            // Получаем все заявки для экспорта
            const bids = await BidsService.getBidsForExport(
              user.id,
              exportFilters,
              user.planId
            );

            // Генерируем файл в зависимости от формата
            if (format === 'csv') {
              const csvContent = ExportService.generateCSV(bids);
              const fileName = `bids_report_${new Date().toISOString().split('T')[0]}.csv`;

              return new Response(csvContent, {
                headers: {
                  'Content-Type': 'text/csv; charset=utf-8',
                  'Content-Disposition': `attachment; filename="${fileName}"`,
                },
              });
            } else {
              const excelBuffer = await ExportService.generateExcel(bids);
              const fileName = `bids_report_${new Date().toISOString().split('T')[0]}.xlsx`;

              return new Response(excelBuffer as BodyInit, {
                headers: {
                  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'Content-Disposition': `attachment; filename="${fileName}"`,
                },
              });
            }
          } catch (error) {
            logger.error("Failed to export bids", error as Error, {
              userId: user.id,
              query: ctx.query,
            });

            ctx.set.status = 500;
            return { message: "failed", error: "Internal server error" };
          }
        }, {
          query: t.Object({
            format: t.Union([t.Literal('csv'), t.Literal('excel')]),
            quiz_uid: t.Optional(t.String()),
            status: t.Optional(t.String()),
            isFull: t.Optional(t.Union([t.Boolean(), t.String()])), // Принимаем boolean или string ("true"/"false"/"all")
            isRead: t.Optional(t.Union([t.Boolean(), t.String()])), // Принимаем boolean или string ("true"/"false")
          }),
        })
  );