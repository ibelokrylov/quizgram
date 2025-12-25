// Контроллер payment — обрабатывает HTTP-запросы для обновления плана пользователя

import { Elysia, t } from "elysia";
import { and, eq, or } from "drizzle-orm";
import type { User } from "../../db";
import { db, paymentTable } from "../../db";
import { logger } from "../../lib/logger";
import { AuthService } from "../auth/service";
import { PaymentModel } from "./model";
import { PaymentService } from "./service";

export const payment = new Elysia({ prefix: "/payment" })
  // Webhook для Crypto Pay (публичный endpoint, без авторизации)
  .post(
    "/webhook/crypto-pay",
    async (ctx) => {
      try {
        const body = ctx.body as PaymentModel.cryptoPayWebhookBody;

        // Проверяем тип обновления
        if (body.update_type !== "invoice_paid") {
          logger.debug("Получен webhook с типом, отличным от invoice_paid", {
            update_type: body.update_type,
          });
          return { ok: true };
        }

        const { invoice_id, hash, status } = body.payload;

        // Ищем платеж по invoiceId (основной способ) или trackId (hash) как fallback
        const payments = await db
          .select()
          .from(paymentTable)
          .where(
            or(
              invoice_id
                ? eq(paymentTable.invoiceId, invoice_id.toString())
                : undefined,
              hash ? eq(paymentTable.trackId, hash) : undefined,
            )!,
          )
          .limit(1);

        if (payments.length === 0) {
          logger.warn("Платёж не найден по trackId", {
            hash,
            invoice_id,
          });
          return { ok: true };
        }

        const payment = payments[0];

        // Проверяем статус
        if (status === "paid" && payment.status !== "paid") {
          // Обрабатываем успешный платёж
          await PaymentService.processSuccessfulPayment(payment.id);

          logger.info("Платёж успешно обработан через webhook", {
            paymentId: payment.id,
            invoiceId: invoice_id,
            hash,
          });
        } else if (status === "expired" && payment.status === "pending") {
          // Обновляем статус на expired
          await db
            .update(paymentTable)
            .set({
              status: "expired",
              updatedAt: new Date(),
            })
            .where(eq(paymentTable.id, payment.id));

          logger.info("Платёж истёк", {
            paymentId: payment.id,
            invoiceId: invoice_id,
          });
        }

        return { ok: true };
      } catch (error) {
        logger.error(
          "Ошибка при обработке webhook от Crypto Pay",
          error instanceof Error ? error : new Error(String(error)),
          { body: ctx.body },
        );
        // Возвращаем 200, чтобы Crypto Pay не повторял запрос
        return { ok: true };
      }
    },
    {
      body: PaymentModel.cryptoPayWebhookBody,
    },
  )
  // Защищённые endpoints (требуют авторизации)
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
          ctx.store.user = (user || null) as User | null;
        }
      },
    },
    (app) =>
      app
        // Получение списка up_limits для тарифа Pro+
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
              "Ошибка при получении up_limits",
              error instanceof Error ? error : new Error(String(error)),
            );
            ctx.set.status = 500;
            return {
              message: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
        // Создание платежа для плана
        .post(
          "/:planId/create",
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: "Unauthorized" };
            }

            try {
              const planId = Number(ctx.params.planId);

              if (isNaN(planId)) {
                ctx.set.status = 400;
                return {
                  message: "create-payment@error",
                  error: "Invalid plan ID",
                };
              }

              const body = ctx.body as PaymentModel.createPaymentProPlusBody | undefined;
              const upLimitId = body?.upLimitId;
              const payNow = body?.payNow ?? true; // По умолчанию оплата сейчас

              const { payment, invoiceUrl } = await PaymentService.createPayment(
                user.id,
                planId,
                upLimitId,
                payNow,
              );

              const response: PaymentModel.createPaymentSuccessResponse = {
                message: "ok",
                data: {
                  paymentId: payment.id,
                  invoiceUrl,
                },
              };

              return response;
            } catch (error) {
              logger.error(
                "Ошибка при создании платежа",
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, planId: ctx.params.planId },
              );

              ctx.set.status = 400;
              const response: PaymentModel.createPaymentErrorResponse = {
                message: "create-payment@error",
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
            body: t.Optional(PaymentModel.createPaymentProPlusBody),
            response: {
              200: PaymentModel.createPaymentSuccessResponse,
              400: PaymentModel.createPaymentErrorResponse,
              401: t.Object({
                message: t.String(),
              }),
            },
          },
        )
        // Старый endpoint для обновления плана (оставляем для обратной совместимости)
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
