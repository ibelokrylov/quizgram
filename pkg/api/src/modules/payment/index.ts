// Контроллер payment — обрабатывает HTTP-запросы для обновления плана пользователя

import { Elysia, t } from "elysia";
import type { User } from "../../db";
import { logger } from "../../lib/logger";
import { AuthService } from "../auth/service";
import { PaymentModel } from "./model";
import { PaymentService } from "./service";

export const payment = new Elysia({ prefix: "/payment" })
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
      app.post(
        "/:planId",
        async (ctx) => {
          const user = ctx.store.user;
          if (!user) {
            ctx.set.status = 401;
            return { message: "Unauthorized" };
          }

          try {
            const planId = Number(ctx.params.planId);

            if (isNaN(planId)) {
              ctx.set.status = 400;
              return {
                message: "update-plan@error",
                error: "Invalid plan ID",
              };
            }

            const plan = await PaymentService.updateUserPlan(user.id, planId);

            const response: PaymentModel.updatePlanSuccessResponse = {
              message: "ok",
              data: {
                planId: plan.id,
                planName: plan.name,
              },
            };

            return response;
          } catch (error) {
            logger.error(
              "Ошибка при обновлении плана пользователя",
              error instanceof Error ? error : new Error(String(error)),
              { userId: user.id, planId: ctx.params.planId },
            );

            ctx.set.status = 400;
            const response: PaymentModel.updatePlanErrorResponse = {
              message: "update-plan@error",
              error:
                error instanceof Error ? error.message : "Unknown error",
            };
            return response;
          }
        },
        {
          params: t.Object({
            planId: t.String(),
          }),
          response: {
            200: PaymentModel.updatePlanSuccessResponse,
            400: PaymentModel.updatePlanErrorResponse,
            401: t.Object({
              message: t.String(),
            }),
          },
        },
      ),
  );
