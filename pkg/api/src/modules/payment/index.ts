import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db, type User, userPaymentTable } from "../../db";
import { logger } from "../../lib/logger";
import { AuthService } from "../auth/service";
import { PaymentModel } from "./model";
import { PaymentService } from "./service";

export const payment = new Elysia({ prefix: "/payment" })
  .state("user", null as User | null)
  // Публичный webhook endpoint (без авторизации) — должен быть доступен для UnitPay
  .post(
    "/unitpay-webhook",
    async (ctx) => {
      try {
        const params = ctx.body;
        const method = params.method;

        logger.info("UnitPay Webhook: Входящий запрос", {
          method,
          unitpayId: params.unitpayId,
          account: params.account,
          sum: params.sum,
          orderSum: params.orderSum,
        });

        if (method === "check") {
          return await PaymentService.handleUnitpayCheck(params);
        } else if (method === "pay") {
          return await PaymentService.handleUnitpayPay(params);
        } else if (method === "error") {
          return await PaymentService.handleUnitpayError(params);
        } else if (method === "refund") {
          return await PaymentService.handleUnitpayRefund(params);
        } else {
          logger.error("Unknown webhook method", { method });
          return { error: { message: "Unknown method" } };
        }
      } catch (error) {
        logger.error(
          "Webhook processing error",
          error instanceof Error ? error : new Error(String(error)),
        );
        return { error: { message: "Internal error" } };
      }
    },
    {
      body: t.Object({
        method: t.String(),
        params: t.Optional(t.Record(t.String(), t.Any())),
        signature: t.Optional(t.String()),
        unitpayId: t.Optional(t.Union([t.String(), t.Number()])),
        projectId: t.Optional(t.Union([t.String(), t.Number()])),
        account: t.Optional(t.String()),
        sum: t.Optional(t.Union([t.String(), t.Number()])),
        orderSum: t.Optional(t.Union([t.String(), t.Number()])),
        orderCurrency: t.Optional(t.String()),
        date: t.Optional(t.String()),
        payerSum: t.Optional(t.Union([t.String(), t.Number()])),
        payerCurrency: t.Optional(t.String()),
        profit: t.Optional(t.Union([t.String(), t.Number()])),
        paymentType: t.Optional(t.String()),
        errorMessage: t.Optional(t.String()),
        subscriptionId: t.Optional(t.Union([t.String(), t.Number()])),
      }),
      response: {
        200: t.Union([
          t.Object({ result: t.Object({ message: t.String() }) }),
          t.Object({ error: t.Object({ message: t.String() }) }),
        ]),
      },
    },
  )
  // Защищённые endpoints (требуют авторизации)
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
          ctx.store.user = (user || null) as User | null;
        }
      },
    },
    (app) =>
      app
        .post(
          "/create",
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }

            try {
              const body = ctx.body as {
                planId: number;
                upLimitId?: number;
              };

              const planId = Number(body.planId);
              const upLimitId = body.upLimitId
                ? Number(body.upLimitId)
                : undefined;

              logger.debug("Payment Controller: Запрос на создание платежа", {
                userId: user.id,
                planId,
                upLimitId,
              });

              if (isNaN(planId)) {
                logger.error("Payment Controller: Невалидный planId", {
                  userId: user.id,
                  planId: body.planId,
                });
                ctx.set.status = 400;
                return {
                  message: "create-payment@error",
                  error: "Invalid plan ID",
                };
              }

              const result = await PaymentService.createPayment(
                user.id,
                planId,
                upLimitId,
              );

              logger.info("Payment Controller: Платёж создан успешно", {
                userId: user.id,
                paymentId: result.paymentId,
                planId,
              });

              return {
                message: "ok",
                data: result,
              };
            } catch (error) {
              logger.error(
                "Error creating payment",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );

              ctx.set.status = 400;
              return {
                message: "create-payment@error",
                error:
                  error instanceof Error ? error.message : "Unknown error",
              };
            }
          },
          {
            body: t.Object({
              planId: t.Number(),
              upLimitId: t.Optional(t.Number()),
            }),
            response: {
              200: PaymentModel.createPaymentSuccessResponse,
              400: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        .get("/status/:paymentId", async (ctx) => {
          const user: User | null = ctx.store.user;
          if (!user) {
            ctx.set.status = 401;
            return { message: "Unauthorized" };
          }

          try {
            const paymentId = Number(ctx.params.paymentId);

            logger.debug("Payment Controller: Запрос статуса платежа", {
              userId: user.id,
              paymentId: ctx.params.paymentId,
            });

            if (isNaN(paymentId)) {
              logger.error("Payment Controller: Невалидный paymentId", {
                userId: user.id,
                paymentId: ctx.params.paymentId,
              });
              ctx.set.status = 400;
              return {
                message: "get-payment-status@error",
                error: "Invalid payment ID",
              };
            }

            const paymentStatus = await PaymentService.getPaymentStatus(
              paymentId,
              user.id,
            );

            logger.debug("Payment Controller: Статус платежа получен", {
              userId: user.id,
              paymentId,
              status: paymentStatus.status,
            });

            return {
              message: "ok",
              data: paymentStatus,
            };
          } catch (error) {
            logger.error(
              "Error getting payment status",
              error instanceof Error ? error : new Error(String(error)),
              { userId: user.id },
            );

            ctx.set.status = 404;
            return {
              message: "get-payment-status@error",
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
        .get("/up-limits", async (ctx) => {
          const user: User | null = ctx.store.user;
          if (!user) {
            ctx.set.status = 401;
            return { message: "Unauthorized" };
          }

          try {
            const upLimits = await PaymentService.getUpLimits();
            return {
              message: "ok",
              data: upLimits.map((ul) => ({
                id: ul.id,
                bid: ul.bid,
                price: ul.price,
              })),
            };
          } catch (error) {
            logger.error(
              "Error getting up_limits",
              error instanceof Error ? error : new Error(String(error)),
            );
            ctx.set.status = 500;
            return {
              message: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
        .post(
          "/:planId",
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }

            try {
              const planId = Number(ctx.params.planId);

              logger.debug("Payment Controller: Запрос на обновление плана", {
                userId: user.id,
                planId: ctx.params.planId,
                currentPlanId: user.planId,
              });

              if (isNaN(planId)) {
                logger.error("Payment Controller: Невалидный planId для обновления", {
                  userId: user.id,
                  planId: ctx.params.planId,
                });
                ctx.set.status = 400;
                return {
                  message: "update-plan@error",
                  error: "Invalid plan ID",
                };
              }

              const plan = await PaymentService.updateUserPlan(user.id, planId);

              logger.info("Payment Controller: План обновлён успешно", {
                userId: user.id,
                newPlanId: plan.id,
                newPlanName: plan.name,
              });

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
                "Error updating user plan",
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
        )
        .post(
          "/cancel-subscription",
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }

            try {
              logger.info("Payment Controller: Запрос на отмену подписки", {
                userId: user.id,
              });

              await PaymentService.cancelSubscription(user.id);

              logger.info("Payment Controller: Подписка отменена", {
                userId: user.id,
              });

              // Получаем finalDayAt из активной подписки
              const activePayments = await db
                .select({
                  finalDayAt: userPaymentTable.finalDayAt,
                })
                .from(userPaymentTable)
                .where(
                  and(
                    eq(userPaymentTable.userId, user.id),
                    eq(userPaymentTable.isActive, true),
                  ),
                )
                .limit(1);

              const finalDayAt = activePayments.length > 0
                ? activePayments[0].finalDayAt.toISOString()
                : new Date().toISOString();

              return {
                message: "ok",
                data: {
                  planId: user.planId,
                  planName: "Подписка будет отменена",
                  finalDayAt,
                },
              };
            } catch (error) {
              logger.error(
                "Error cancelling subscription",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id },
              );

              ctx.set.status = 400;
              const response: PaymentModel.cancelSubscriptionErrorResponse = {
                message: "cancel-subscription@error",
                error:
                  error instanceof Error ? error.message : "Unknown error",
              };
              return response;
            }
          },
          {
            response: {
              200: PaymentModel.cancelSubscriptionSuccessResponse,
              400: PaymentModel.cancelSubscriptionErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        ),
  );