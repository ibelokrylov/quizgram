// Сервис payment — бизнес-логика для обновления плана пользователя

import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  paymentTable,
  planTable,
  quizBidTable,
  quizTable,
  upLimitTable,
  userPaymentProTable,
  userPaymentTable,
  userTable,
  type NewPayment,
  type NewUserPayment,
  type NewUserPaymentPro,
  type Payment,
  type Plan,
  type UpLimit,
} from "../../db";
import { logger } from "../../lib/logger";
import { CryptoPayService } from "../../services/crypto-pay.service";

export abstract class PaymentService {
  /**
   * Получение списка up_limits для тарифа Pro+
   */
  static async getUpLimits(): Promise<UpLimit[]> {
    return await db.select().from(upLimitTable).orderBy(upLimitTable.bid);
  }

  /**
   * Создание платежа для плана
   * @param userId - ID пользователя
   * @param planId - ID плана
   * @param upLimitId - ID дополнительного лимита (для Pro+)
   * @param payNow - Оплата сейчас (true) или в день начала (false), по умолчанию true
   * @returns Созданный платеж с URL для оплаты
   */
  static async createPayment(
    userId: number,
    planId: number,
    upLimitId?: number,
    payNow: boolean = true,
  ): Promise<{ payment: Payment; invoiceUrl: string }> {
    // Проверяем, существует ли план
    const plans = await db
      .select()
      .from(planTable)
      .where(eq(planTable.id, planId))
      .limit(1);

    const plan = plans[0];

    if (!plan) {
      const error = new Error("Plan not found");
      error.name = "PlanNotFoundError";
      throw error;
    }

    // Если план бесплатный, сразу обновляем план
    if (plan.price === 0) {
      const updatedPlan = await this.updateUserPlan(
        userId,
        planId,
        null,
        undefined,
        payNow,
      );
      throw new Error("Free plan should be activated directly");
    }

    // Для Pro+ upLimitId опционален (если не указан, используется базовый лимит 200 заявок)
    let upLimit: UpLimit | null = null;
    if (plan.name === "PRO_PLUS" && upLimitId) {
      const upLimits = await db
        .select()
        .from(upLimitTable)
        .where(eq(upLimitTable.id, upLimitId))
        .limit(1);

      upLimit = upLimits[0] ?? null;

      if (!upLimit) {
        const error = new Error("UpLimit not found");
        error.name = "UpLimitNotFoundError";
        throw error;
      }
    }

    // Функция для получения отображаемого имени плана
    const getDisplayPlanName = (planName: string): string => {
      if (planName === "FREE") {
        return "Free";
      }
      if (planName === "BASE") {
        return "Pro";
      }
      if (planName === "PRO_PLUS") {
        return "Pro+";
      }
      return planName;
    };

    // Рассчитываем итоговую цену
    // Для Pro+: базовая цена + цена дополнительного лимита
    // Для других планов: только базовая цена
    // Все цены указаны в рублях (не в копейках)
    const totalPrice =
      plan.name === "PRO_PLUS" && upLimit
        ? plan.price + upLimit.price
        : plan.price;

    // Проверяем, находимся ли мы в dev-режиме
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const isDevelopment = env.ENV !== "production";

    // В dev-режиме пропускаем создание реального платежа и сразу обновляем план
    if (isDevelopment) {
      logger.info(
        "DEV-режим: обход оплаты, сразу обновляем план пользователя",
        {
          userId,
          planId: plan.id,
          planName: plan.name,
          upLimitId: upLimit?.id,
        },
      );

      // Создаём фиктивную запись о платеже для истории (со статусом "paid")
      const paymentData: NewPayment = {
        userId,
        planId: plan.id,
        amount: totalPrice,
        currency: "USDT",
        status: "paid", // В dev-режиме сразу помечаем как оплаченный
        method: "crypto_pay", // Используем crypto_pay, но помечаем в metadata как dev_bypass
        invoiceId: `dev-${Date.now()}`, // Фиктивный invoice ID
        invoiceUrl: "", // Нет URL для оплаты
        trackId: `dev-${userId}-${planId}-${Date.now()}`, // Фиктивный trackId
        metadata: JSON.stringify({
          dev_bypass: true,
          upLimitId: upLimit?.id,
          payNow,
        }),
      };

      const [payment] = await db
        .insert(paymentTable)
        .values(paymentData)
        .returning();

      // Обновляем план пользователя напрямую (связываем с фиктивным платежом)
      const updatedPlan = await this.updateUserPlan(
        userId,
        planId,
        payment.id,
        upLimit?.id,
        payNow,
      );

      // Если это Pro+ и есть upLimitId, создаём запись в user_payment_pro
      if (updatedPlan.name === "PRO_PLUS" && upLimit?.id) {
        const existingPro = await db
          .select()
          .from(userPaymentProTable)
          .where(
            and(
              eq(userPaymentProTable.userId, userId),
              eq(userPaymentProTable.upLimitId, upLimit.id),
            ),
          )
          .limit(1);

        if (existingPro.length === 0) {
          const userPaymentProData: NewUserPaymentPro = {
            userId,
            upLimitId: upLimit.id,
          };

          await db.insert(userPaymentProTable).values(userPaymentProData);

          logger.info("Создана запись user_payment_pro в dev-режиме", {
            userId,
            upLimitId: upLimit.id,
          });
        }
      }

      logger.info("План обновлён в dev-режиме (обход оплаты)", {
        paymentId: payment.id,
        userId,
        planId: plan.id,
        planName: updatedPlan.name,
        upLimitId: upLimit?.id,
      });

      // Возвращаем фиктивный URL (или пустую строку)
      return {
        payment,
        invoiceUrl: "", // В dev-режиме нет реального URL для оплаты
      };
    }

    // Production: создаём реальный платёж через Crypto Pay
    // Формируем описание платежа
    let description = `Оплата тарифа ${getDisplayPlanName(plan.name)}`;
    if (plan.name === "PRO_PLUS" && upLimit) {
      description += ` (+${upLimit.bid} заявок)`;
    }

    // Создаём инвойс в Crypto Pay
    // Используем фиатную валюту (RUB) с возможностью оплаты в USDT
    // totalPrice хранится в рублях
    const invoice = await CryptoPayService.createInvoice({
      amount: totalPrice, // Сумма в рублях (базовая + дополнительная для Pro+)
      currencyType: "fiat", // Используем фиатную валюту
      fiat: "RUB", // Рубли
      acceptedAssets: ["USDT"], // Можно оплатить в USDT
      description,
    });

    if (!invoice) {
      throw new Error("Не удалось создать инвойс: результат пустой");
    }

    // Создаём запись о платеже в БД
    const paymentData: NewPayment = {
      userId,
      planId: plan.id,
      amount: totalPrice, // Итоговая цена в рублях (базовая + дополнительная для Pro+)
      currency: "USDT",
      status: "pending",
      method: "crypto_pay",
      invoiceId: invoice.invoice_id.toString(),
      invoiceUrl: invoice.pay_url,
      trackId: invoice.hash, // Используем hash как trackId для поиска в webhook
      metadata: JSON.stringify({
        invoice_id: invoice.invoice_id,
        hash: invoice.hash,
        asset: invoice.asset,
        status: invoice.status,
        upLimitId: upLimit?.id, // Сохраняем upLimitId для Pro+
        payNow, // Сохраняем payNow для обработки при оплате
      }),
    };

    const [payment] = await db
      .insert(paymentTable)
      .values(paymentData)
      .returning();

    logger.info("Платёж создан", {
      paymentId: payment.id,
      userId,
      planId: plan.id,
      invoiceId: invoice.invoice_id,
    });

    return {
      payment,
      invoiceUrl: invoice.pay_url,
    };
  }

  /**
   * Обработка успешного платежа
   * @param paymentId - ID платежа
   * @returns Обновленный план пользователя
   */
  static async processSuccessfulPayment(paymentId: number): Promise<Plan> {
    // Получаем платеж
    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.id, paymentId))
      .limit(1);

    const payment = payments[0];

    if (!payment) {
      const error = new Error("Payment not found");
      error.name = "PaymentNotFoundError";
      throw error;
    }

    // Проверяем, что платеж ещё не обработан
    if (payment.status === "paid") {
      logger.warn("Платёж уже был обработан", { paymentId });
      // Получаем план для возврата
      const plans = await db
        .select()
        .from(planTable)
        .where(eq(planTable.id, payment.planId))
        .limit(1);
      return plans[0];
    }

    // Обновляем статус платежа
    await db
      .update(paymentTable)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(paymentTable.id, paymentId));

    logger.info("Статус платежа обновлён на 'paid'", { paymentId });

    // Извлекаем upLimitId и payNow из метаданных
    let upLimitId: number | undefined;
    let payNow: boolean = true; // По умолчанию оплата сейчас
    if (payment.metadata) {
      try {
        const metadata = JSON.parse(payment.metadata);
        upLimitId = metadata.upLimitId;
        payNow = metadata.payNow ?? true; // По умолчанию оплата сейчас
      } catch (error) {
        logger.warn("Не удалось распарсить метаданные платежа", {
          paymentId,
          metadata: payment.metadata,
        });
      }
    }

    // Обновляем план пользователя и связываем с платежом
    const plan = await this.updateUserPlan(
      payment.userId,
      payment.planId,
      paymentId,
      upLimitId,
      payNow,
    );

    // Если это Pro+ и есть upLimitId, создаём запись в user_payment_pro
    if (plan.name === "PRO_PLUS" && upLimitId) {
      const existingPro = await db
        .select()
        .from(userPaymentProTable)
        .where(
          and(
            eq(userPaymentProTable.userId, payment.userId),
            eq(userPaymentProTable.upLimitId, upLimitId),
          ),
        )
        .limit(1);

      if (existingPro.length === 0) {
        const userPaymentProData: NewUserPaymentPro = {
          userId: payment.userId,
          upLimitId,
        };

        await db.insert(userPaymentProTable).values(userPaymentProData);

        logger.info("Создана запись user_payment_pro", {
          userId: payment.userId,
          upLimitId,
        });
      }
    }

    logger.info("План пользователя обновлён после успешной оплаты", {
      userId: payment.userId,
      planId: payment.planId,
      paymentId,
      upLimitId,
    });

    return plan;
  }

  /**
   * Активация отсроченного плана
   * @param userPaymentId - ID записи user_payment отсроченного плана
   * @returns Активированный план
   */
  static async activateScheduledPlan(userPaymentId: number): Promise<Plan> {
    // Находим отсроченный план
    const scheduledPayments = await db
      .select({
        userPayment: userPaymentTable,
        plan: planTable,
      })
      .from(userPaymentTable)
      .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
      .where(eq(userPaymentTable.id, userPaymentId))
      .limit(1);

    if (scheduledPayments.length === 0) {
      const error = new Error("Scheduled payment not found");
      error.name = "ScheduledPaymentNotFoundError";
      throw error;
    }

    const { userPayment, plan } = scheduledPayments[0];

    // Деактивируем все старые активные записи user_payment для этого пользователя
    await db
      .update(userPaymentTable)
      .set({ isActive: false })
      .where(
        and(
          eq(userPaymentTable.userId, userPayment.userId),
          eq(userPaymentTable.isActive, true),
        ),
      );

    logger.info("Старые активные планы деактивированы", {
      userId: userPayment.userId,
      scheduledPlanId: plan.id,
    });

    // Активируем отсроченный план
    await db
      .update(userPaymentTable)
      .set({
        isActive: true,
        startsAt: null, // Очищаем дату начала, так как план активирован
      })
      .where(eq(userPaymentTable.id, userPaymentId));

    // Обновляем план пользователя
    await db
      .update(userTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userPayment.userId));

    logger.info("Отсроченный план активирован", {
      userId: userPayment.userId,
      planId: plan.id,
      planName: plan.name,
      userPaymentId,
    });

    return plan;
  }

  /**
   * Обновление плана пользователя
   * @param userId - ID пользователя
   * @param planId - ID нового плана
   * @param paymentId - ID успешного платежа (опционально)
   * @param upLimitId - ID дополнительного лимита для Pro+ (опционально)
   * @param payNow - Оплата сейчас (true) или в день начала (false), по умолчанию true
   * @returns Обновленный план
   */
  static async updateUserPlan(
    userId: number,
    planId: number,
    paymentId: number | null = null,
    upLimitId?: number,
    payNow: boolean = true,
  ): Promise<Plan> {
    // Проверяем, существует ли план
    const plans = await db
      .select()
      .from(planTable)
      .where(eq(planTable.id, planId))
      .limit(1);

    const plan = plans[0];

    if (!plan) {
      const error = new Error("Plan not found");
      error.name = "PlanNotFoundError";
      throw error;
    }

    // Проверяем текущий активный платный план пользователя
    const currentUserPayment = await db
      .select({
        userPayment: userPaymentTable,
        currentPlan: planTable,
      })
      .from(userPaymentTable)
      .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
      .where(
        and(
          eq(userPaymentTable.userId, userId),
          eq(userPaymentTable.isActive, true),
        ),
      )
      .limit(1);

    const hasActivePaidPlan =
      currentUserPayment.length > 0 &&
      currentUserPayment[0].currentPlan.price > 0;
    const currentPlan = currentUserPayment[0]?.currentPlan;
    const currentUserPaymentRecord = currentUserPayment[0]?.userPayment;
    const isDowngrade =
      hasActivePaidPlan && currentPlan && plan.price < currentPlan.price;
    const currentPlanEndsAt = currentUserPaymentRecord?.finalDayAt;
    const now = new Date();
    const shouldSchedule =
      isDowngrade && currentPlanEndsAt && currentPlanEndsAt > now;

    // Если это отсроченный план (понижение и текущий план еще не закончился)
    if (shouldSchedule) {
      // Не обновляем план пользователя сразу, создаем отсроченную запись
      logger.info("Создание отсроченного плана", {
        userId,
        currentPlanId: currentPlan.id,
        newPlanId: plan.id,
        startsAt: currentPlanEndsAt,
        payNow,
      });

      // Для Pro+ получаем дополнительный лимит
      let additionalLimit = 0;
      if (plan.name === "PRO_PLUS" && upLimitId) {
        const upLimits = await db
          .select()
          .from(upLimitTable)
          .where(eq(upLimitTable.id, upLimitId))
          .limit(1);

        if (upLimits.length > 0) {
          additionalLimit = upLimits[0].bid;
        }
      }

      // Итоговый лимит = базовый лимит плана + дополнительный лимит (для Pro+)
      const totalLimit = plan.bidMonthLimit + additionalLimit;

      // Вычисляем finalDayAt для нового плана: +1 месяц от даты начала + время 23:59:00
      const newFinalDayAt = new Date(currentPlanEndsAt);
      newFinalDayAt.setMonth(newFinalDayAt.getMonth() + 1);
      newFinalDayAt.setHours(23, 59, 0, 0);

      // Создаём отсроченную запись user_payment
      const scheduledUserPaymentData: NewUserPayment = {
        userId,
        planId: plan.id,
        paymentId, // Может быть null, если оплата в день начала
        limit: totalLimit,
        finalDayAt: newFinalDayAt,
        currentLimit: 0, // Будет подсчитан при активации
        extended: true,
        month: 1,
        isActive: false, // Не активна до даты начала
        isPaid: payNow, // Оплата сейчас или в день начала
        startsAt: currentPlanEndsAt, // Когда план начнет действовать
        scheduledPlanId: plan.id,
      };

      await db.insert(userPaymentTable).values(scheduledUserPaymentData);

      logger.info("Отсроченный план создан", {
        userId,
        planId: plan.id,
        planName: plan.name,
        startsAt: currentPlanEndsAt,
        isPaid: payNow,
      });

      // Возвращаем новый план (но он еще не активен)
      return plan;
    }

    // Если план применяется сразу (не понижение или текущий план закончился)
    // Обновляем план пользователя
    await db
      .update(userTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    // Создаём или обновляем запись в user_payment
    try {
      // 1. Деактивируем все старые записи user_payment для этого пользователя
      await db
        .update(userPaymentTable)
        .set({ isActive: false })
        .where(
          and(
            eq(userPaymentTable.userId, userId),
            eq(userPaymentTable.isActive, true),
          ),
        );

      logger.info("Старые записи user_payment деактивированы", { userId });

      // Вычисляем finalDayAt: +1 месяц от текущей даты + время 23:59:00
      const finalDayAt = new Date();
      finalDayAt.setMonth(finalDayAt.getMonth() + 1);
      finalDayAt.setHours(23, 59, 0, 0);

      // Для Pro+ получаем дополнительный лимит
      let additionalLimit = 0;
      if (plan.name === "PRO_PLUS" && upLimitId) {
        const upLimits = await db
          .select()
          .from(upLimitTable)
          .where(eq(upLimitTable.id, upLimitId))
          .limit(1);

        if (upLimits.length > 0) {
          additionalLimit = upLimits[0].bid;
        }
      }

      // Итоговый лимит = базовый лимит плана + дополнительный лимит (для Pro+)
      const totalLimit = plan.bidMonthLimit + additionalLimit;

      let currentLimit = 0;

      // 2. Если план платный, подсчитываем уже собранные ставки
      if (plan.price > 0) {
        // Находим все активные квизы пользователя
        const activeQuizzes = await db
          .select({ id: quizTable.id })
          .from(quizTable)
          .where(
            and(
              eq(quizTable.userId, userId),
              eq(quizTable.isActive, true),
              isNull(quizTable.deletedAt),
            ),
          );

        const quizIds = activeQuizzes.map((q) => q.id);

        if (quizIds.length > 0) {
          // Находим все ставки, которые:
          // - принадлежат активным квизам пользователя
          // - isFull = true
          // - isEqualPaymentLimit = false
          const bidsToUpdate = await db
            .select({
              bidId: quizBidTable.id,
              quizId: quizBidTable.quizId,
            })
            .from(quizBidTable)
            .innerJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
            .where(
              and(
                eq(quizTable.userId, userId),
                eq(quizTable.isActive, true),
                isNull(quizTable.deletedAt),
                eq(quizBidTable.isFull, true),
                eq(quizBidTable.isEqualPaymentLimit, false),
              ),
            );

          currentLimit = bidsToUpdate.length;

          logger.info("Найдено ставок для учёта в новом тарифе", {
            userId,
            count: currentLimit,
          });

          // 3. Обновляем все эти ставки: isEqualPaymentLimit = true
          if (bidsToUpdate.length > 0) {
            const bidIds = bidsToUpdate.map((b) => b.bidId);

            // Обновляем каждую ставку
            for (const bidId of bidIds) {
              await db
                .update(quizBidTable)
                .set({ isEqualPaymentLimit: true })
                .where(eq(quizBidTable.id, bidId));
            }

            logger.info("Ставки обновлены: isEqualPaymentLimit = true", {
              userId,
              bidCount: bidIds.length,
            });
          }
        }
      }

      // 4. Создаём новую активную запись user_payment
      const userPaymentData: NewUserPayment = {
        userId,
        planId: plan.id,
        paymentId, // Связываем с успешным платежом, если есть
        limit: totalLimit, // Итоговый лимит (базовый + дополнительный для Pro+)
        finalDayAt,
        currentLimit, // Устанавливаем подсчитанное значение
        extended: true,
        month: 1,
        isActive: true,
        isPaid: payNow, // Оплата сейчас или в день начала
        startsAt: null, // План применяется сразу
        scheduledPlanId: null, // Не отсроченный план
      };

      await db.insert(userPaymentTable).values(userPaymentData);

      logger.info("Новая запись user_payment создана", {
        userId,
        planId: plan.id,
        planName: plan.name,
        baseLimit: plan.bidMonthLimit,
        additionalLimit,
        totalLimit,
        currentLimit,
      });
    } catch (paymentError) {
      logger.error(
        "Ошибка при создании/обновлении user_payment при изменении плана",
        paymentError instanceof Error
          ? paymentError
          : new Error(String(paymentError)),
        { userId, planId: plan.id },
      );
      throw paymentError; // Прерываем выполнение, т.к. это критическая ошибка
    }

    logger.info("План пользователя успешно обновлен", {
      userId,
      planId: plan.id,
      planName: plan.name,
    });

    return plan;
  }
}
