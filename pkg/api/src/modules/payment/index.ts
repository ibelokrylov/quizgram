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
  // UnitPay отправляет GET запросы с параметрами в формате params[key]=value
  .get(
    "/unitpay-webhook",
    async (ctx) => {
      try {
        // UnitPay отправляет параметры в формате params[key]=value
        // Нужно вручную распарсить query string, так как Elysia может не парсить вложенные скобки
        const url = new URL(ctx.request.url);
        const searchParams = url.searchParams;

        logger.debug("UnitPay Webhook: Raw query string", {
          rawUrl: ctx.request.url,
          searchParamsEntries: Array.from(searchParams.entries()),
        });

        // Извлекаем method из корневого уровня
        const method = searchParams.get("method");

        // Извлекаем параметры из params[key] формата
        const params: Record<string, string> = { method: method || "" };
        for (const [key, value] of searchParams.entries()) {
          const match = key.match(/^params\[(.+)\]$/);
          if (match) {
            params[match[1]] = value;
          }
        }

        logger.info("UnitPay Webhook: Входящий запрос", {
          method,
          unitpayId: params.unitpayId,
          account: params.account,
          orderSum: params.orderSum,
          projectId: params.projectId,
          paymentType: params.paymentType,
          test: params.test,
          hasSignature: !!params.signature,
        });

        logger.debug("UnitPay Webhook: Все параметры", { params });

        if (!method) {
          logger.error("UnitPay Webhook: Отсутствует method", { params });
          return { error: { message: "Missing method" } };
        }

        let result: { result: { message: string } } | { error: { message: string } };

        if (method === "check") {
          logger.info("UnitPay Webhook: Обработка CHECK", { unitpayId: params.unitpayId });
          result = await PaymentService.handleUnitpayCheck(params);
        } else if (method === "pay") {
          logger.info("UnitPay Webhook: Обработка PAY", { unitpayId: params.unitpayId });
          result = await PaymentService.handleUnitpayPay(params);
        } else if (method === "error") {
          logger.info("UnitPay Webhook: Обработка ERROR", {
            unitpayId: params.unitpayId,
            errorMessage: params.errorMessage,
          });
          result = await PaymentService.handleUnitpayError(params);
        } else if (method === "preauth") {
          logger.info("UnitPay Webhook: Обработка PREAUTH", { unitpayId: params.unitpayId });
          // PREAUTH не требует действий, просто подтверждаем получение
          result = { result: { message: "Запрос успешно обработан" } };
        } else {
          logger.error("UnitPay Webhook: Неизвестный method", { method });
          return { error: { message: "Unknown method" } };
        }

        logger.info("UnitPay Webhook: Ответ", { method, result });
        return result;
      } catch (error) {
        logger.error(
          "UnitPay Webhook: Ошибка обработки",
          error instanceof Error ? error : new Error(String(error)),
        );
        return { error: { message: "Internal error" } };
      }
    },
    {
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