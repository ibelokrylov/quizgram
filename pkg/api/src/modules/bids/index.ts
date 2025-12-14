import Elysia, { t } from "elysia";
import { eq } from "drizzle-orm";
import type { User } from "../../db";
import { db, planTable } from "../../db";
import { logger } from "../../lib/logger";
import { AuthService } from "../auth/service";
import {
  BidsModel,
  bidsListFilters,
  bidsListResponse,
  updateBidStatus,
  bidDetails
} from "./model";
import { BidsService } from "./service";

export const bids = new Elysia({ prefix: "/bids" })
  .state("user", null as User | null)
  .guard(
    {
      async beforeHandle(ctx) {
        if (!ctx.cookie.token.value) {
          ctx.set.status = 401;
          return { message: "Unauthorized" };
        } else {
          ctx.store.user = await AuthService.getUserFromToken(
            ctx.cookie.token.value.toString(),
          );
        }
      },
    },
    (app) =>
      app
        // GET /bids - получение списка заявок
        .get("/", async (ctx) => {
          const user = ctx.store.user;

          if (!user) {
            ctx.set.status = 401;
            return { message: "failed", error: "Unauthorized" };
          }

          try {
            const { query } = ctx;
            
            // Получаем план пользователя по planId с лимитом заявок из базы данных
            const plans = await db
              .select({ 
                name: planTable.name,
                bidMonthLimit: planTable.bidMonthLimit
              })
              .from(planTable)
              .where(eq(planTable.id, user.planId))
              .limit(1);
            
            const plan = plans[0];
            // Если план не найден, используем значения по умолчанию для FREE плана
            const bidMonthLimit = plan?.bidMonthLimit ?? 10;
            const planName = plan?.name ?? "FREE";
            
            // Для FREE тарифа запрещаем запрос незавершенных заявок (isFull=false)
            if (planName === "FREE" && query.isFull === false) {
              ctx.set.status = 403;
              const response: BidsModel.getBidsErrorResponse = {
                message: "failed",
                error: "Access denied: FREE plan users can only view completed bids (isFull=true)",
              };
              return response;
            }
            
            const result = await BidsService.getBidsList(
              user.id,
              query,
              user.createdAt,
              bidMonthLimit,
              planName
            );

            return {
              message: "success",
              data: result
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
          const user = ctx.store.user;

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
          const user = ctx.store.user;

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
  );