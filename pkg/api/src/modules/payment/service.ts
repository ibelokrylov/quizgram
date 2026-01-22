// Сервис payment — бизнес-логика для обновления плана пользователя

import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  paymentTable,
  planTable,
  quizBidTable,
  quizTable,
  upLimitTable,
  userPaymentTable,
  userTable,
  type NewUserPayment,
  type Plan,
  type UpLimit,
} from "../../db";
import { logger } from "../../lib/logger";

export abstract class PaymentService {
  /**
   * Получение списка up_limits для тарифа Pro+
   */
  static async getUpLimits(): Promise<UpLimit[]> {
    logger.debug("Payment: Запрос списка up_limits");
    const upLimits = await db.select().from(upLimitTable).orderBy(upLimitTable.bid);
    logger.debug("Payment: Получено up_limits", { count: upLimits.length });
    return upLimits;
  }

  /**
   * Получение статуса платежа
   * @param paymentId - ID платежа
   * @param userId - ID пользователя (для проверки прав доступа)
   * @returns Статус платежа
   */
  static async getPaymentStatus(paymentId: number, userId: number) {
    logger.debug("Payment: Запрос статуса платежа", { paymentId, userId });

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.id, paymentId))
      .limit(1);

    if (payments.length === 0) {
      logger.error("Payment: Платёж не найден", { paymentId, userId });
      const error = new Error("Payment not found");
      error.name = "PaymentNotFoundError";
      throw error;
    }

    const payment = payments[0];

    if (payment.userId !== userId) {
      logger.error("Payment: Доступ запрещён - платёж принадлежит другому пользователю", {
        paymentId,
        requestedByUserId: userId,
        paymentOwnerId: payment.userId,
      });
      const error = new Error("Payment does not belong to user");
      error.name = "PaymentAccessDeniedError";
      throw error;
    }

    logger.debug("Payment: Статус платежа получен", {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    });

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Проверка подписи UnitPay webhook
   * Формула: sha256(method + "{up}" + sorted(params) + "{up}" + secretKey)
   * @param params - Параметры запроса webhook
   * @returns true, если подпись верная
   */
  static verifyUnitpaySignature(params: Record<string, any>): boolean {
    logger.debug("UnitPay: Проверка подписи webhook", {
      method: params.method,
      hasSignature: !!params.signature,
      unitpayId: params.unitpayId,
      paramsKeys: Object.keys(params),
    });

    const secretKey = process.env.UNITPAY_SECRET_KEY;
    if (!secretKey) {
      logger.error("UNITPAY_SECRET_KEY не настроен");
      return false;
    }

    const signature = params.signature;
    if (!signature) {
      logger.error("Отсутствует signature в запросе webhook", { params });
      return false;
    }

    const method = params.method;

    const paramKeys = Object.keys(params)
      .filter((key) => key !== "signature" && key !== "method")
      .sort();

    const sortedParamsValues = paramKeys.map((key) => params[key]);

    const signatureString = [method, ...sortedParamsValues, secretKey].join(
      "{up}",
    );

    const calculatedSignature = crypto
      .createHash("sha256")
      .update(signatureString)
      .digest("hex");

    logger.debug("UnitPay: Проверка подписи", {
      method,
      paramKeys,
      sortedParamsValues,
      signatureString,
      receivedSignature: signature,
      calculatedSignature,
      isValid: signature === calculatedSignature,
    });

    return signature === calculatedSignature;
  }

  /**
   * Обработка события 'check' от UnitPay
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayCheck(params: Record<string, any>) {
    logger.debug("UnitPay: Обработка события check", { params });

    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error("Неверная подпись webhook", { params });
      return { error: { message: "Неверная подпись" } };
    }

    const unitpayPaymentId = Number(params.unitpayId);
    const orderSum = Number(params.orderSum);

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.invoiceId, unitpayPaymentId.toString()))
      .limit(1);

    if (payments.length === 0) {
      logger.error("Платёж не найден", { unitpayPaymentId });
      return { error: { message: "Платёж не найден" } };
    }

    const payment = payments[0];

    if (payment.status !== "pending") {
      logger.error("Платёж не в статусе pending", { unitpayPaymentId, status: payment.status });
      return { error: { message: "Некорректный статус платежа" } };
    }

    if (Math.abs(payment.amount - orderSum) > 0.01) {
      logger.error("Несовпадение суммы", {
        unitpayPaymentId,
        expected: payment.amount,
        received: orderSum,
      });
      return { error: { message: "Несовпадение суммы" } };
    }

    logger.info("UnitPay: Check успешен", { unitpayPaymentId });

    return { result: { message: "Запрос успешно обработан" } };
  }

  /**
   * Обработка события 'pay' от UnitPay (успешная оплата)
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayPay(params: Record<string, any>) {
    logger.debug("UnitPay: Обработка события pay", { params });

    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error("Неверная подпись webhook", { params });
      return { error: { message: "Неверная подпись" } };
    }

    const unitpayPaymentId = Number(params.unitpayId);
    const _orderSum = Number(params.orderSum);
    const subscriptionId = params.subscriptionId ? String(params.subscriptionId) : null;

    logger.debug("UnitPay: Получен subscriptionId из webhook", {
      unitpayPaymentId,
      subscriptionId,
      hasSubscription: !!subscriptionId,
    });

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.invoiceId, unitpayPaymentId.toString()))
      .limit(1);

    if (payments.length === 0) {
      logger.error("Платёж не найден", { unitpayPaymentId });
      return { error: { message: "Платёж не найден" } };
    }

    const payment = payments[0];

    if (payment.status === "paid") {
      logger.info("Платёж уже оплачен", { unitpayPaymentId });
      return { result: { message: "Запрос успешно обработан" } };
    }

    try {
      await db
        .update(paymentTable)
        .set({ status: "paid" })
        .where(eq(paymentTable.id, payment.id));

      let metadata: {
        planId?: number;
        upLimitId?: number;
        isAutoRenewal?: boolean;
        originalUserPaymentId?: number;
      } = {};
      try {
        metadata = JSON.parse(payment.metadata || "{}");
      } catch (parseError) {
        logger.error("Ошибка парсинга metadata платежа", parseError, {
          unitpayPaymentId,
          metadata: payment.metadata,
        });
        return { error: { message: "Ошибка парсинга metadata" } };
      }
      const { planId, upLimitId, isAutoRenewal, originalUserPaymentId } = metadata;

      if (isAutoRenewal && originalUserPaymentId) {
        // Это автопродление подписки
        logger.info("UnitPay: Обработка автопродления подписки", {
          unitpayPaymentId,
          userId: payment.userId,
          planId,
          originalUserPaymentId,
        });

        await this.renewSubscription(
          payment.userId,
          originalUserPaymentId,
          payment.id,
          subscriptionId,
        );
      } else {
        // Обычный первичный платеж
        logger.info("UnitPay: Обработка первичного платежа", {
          unitpayPaymentId,
          userId: payment.userId,
          planId,
        });

        if (!planId) {
          logger.error("planId отсутствует в metadata", { unitpayPaymentId, metadata });
          return { error: { message: "planId отсутствует в metadata" } };
        }

        await this.updateUserPlan(
          payment.userId,
          planId,
          payment.id,
          upLimitId,
          true,
          subscriptionId,
        );
      }

      logger.info("UnitPay: Платёж успешно обработан", {
        unitpayPaymentId,
        paymentId: payment.id,
        userId: payment.userId,
        planId,
      });

      return { result: { message: "Запрос успешно обработан" } };
    } catch (error) {
      logger.error("Ошибка при обработке платежа", error, { unitpayPaymentId });
      return { error: { message: "Ошибка обработки платежа" } };
    }
  }

  /**
   * Обработка события 'error' от UnitPay
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayError(params: Record<string, any>) {
    logger.debug("UnitPay: Обработка события error", { params });

    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error("Неверная подпись webhook", { params });
      return { error: { message: "Неверная подпись" } };
    }

    const unitpayPaymentId = Number(params.unitpayId);

    try {
      await db
        .update(paymentTable)
        .set({ status: "failed" })
        .where(eq(paymentTable.invoiceId, unitpayPaymentId.toString()));

      logger.info("UnitPay: Статус платежа изменён на failed", {
        unitpayPaymentId,
      });

      return { result: { message: "Запрос успешно обработан" } };
    } catch (error) {
      logger.error("Ошибка при обновлении статуса платежа", error, {
        unitpayPaymentId,
      });
      return { error: { message: "Ошибка обновления статуса" } };
    }
  }

  /**
   * Обработка события 'refund' от UnitPay (возврат средств)
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayRefund(params: Record<string, any>) {
    logger.debug("UnitPay: Обработка события refund", { params });

    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error("Неверная подпись webhook (refund)", { params });
      return { error: { message: "Неверная подпись" } };
    }

    const unitpayPaymentId = Number(params.unitpayId);

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.invoiceId, unitpayPaymentId.toString()))
      .limit(1);

    if (payments.length === 0) {
      logger.error("Платёж для возврата не найден", { unitpayPaymentId });
      return { error: { message: "Платёж не найден" } };
    }

    const payment = payments[0];

    try {
      // Обновляем статус платежа на 'failed' (возврат = отмена)
      await db
        .update(paymentTable)
        .set({
          status: "failed",
          metadata: JSON.stringify({
            ...JSON.parse(payment.metadata || "{}"),
            refundedAt: new Date().toISOString(),
            refundReason: params.errorMessage || "Возврат средств",
          }),
        })
        .where(eq(paymentTable.id, payment.id));

      // Откатываем план пользователя на FREE
      const freePlans = await db
        .select()
        .from(planTable)
        .where(eq(planTable.name, "FREE"))
        .limit(1);

      if (freePlans.length > 0) {
        const freePlan = freePlans[0];

        // Деактивируем текущий активный план
        await db
          .update(userPaymentTable)
          .set({ isActive: false })
          .where(
            and(
              eq(userPaymentTable.userId, payment.userId),
              eq(userPaymentTable.isActive, true),
            ),
          );

        // Обновляем план пользователя на FREE
        await db
          .update(userTable)
          .set({
            planId: freePlan.id,
            updatedAt: new Date(),
          })
          .where(eq(userTable.id, payment.userId));

        logger.info("UnitPay: Возврат обработан, план откачен на FREE", {
          unitpayPaymentId,
          userId: payment.userId,
        });
      }

      return { result: { message: "Запрос успешно обработан" } };
    } catch (error) {
      logger.error("Ошибка при обработке возврата", error, { unitpayPaymentId });
      return { error: { message: "Ошибка обработки возврата" } };
    }
  }

  /**
   * Создание платежа через UnitPay
   * @param userId - ID пользователя
   * @param planId - ID плана
   * @param upLimitId - ID дополнительного лимита (опционально)
   * @returns { paymentId: number, paymentUrl: string }
   */
  static async createPayment(
    userId: number,
    planId: number,
    upLimitId?: number,
  ): Promise<{
    paymentId: number;
    paymentUrl: string;
    unitpayPaymentId?: number;
    plan?: {
      id: number;
      name: string;
      price: number;
      bidMonthLimit: number;
    };
    upLimit?: {
      id: number;
      bid: number;
      price: number;
    };
    totalAmount?: number;
  }> {
    logger.debug("UnitPay: Начало создания платежа", {
      userId,
      planId,
      upLimitId,
    });

    const projectId = process.env.UNITPAY_PROJECT_ID;
    const secretKey = process.env.UNITPAY_SECRET_KEY;

    logger.debug("UnitPay: Параметры окружения", {
      hasProjectId: !!projectId,
      hasSecretKey: !!secretKey,
      projectId,
    });

    if (!projectId || !secretKey) {
      const error = new Error("UNITPAY_PROJECT_ID или UNITPAY_SECRET_KEY не настроены");
      error.name = "UnitpayConfigError";
      throw error;
    }

    // Получаем email пользователя для UnitPay
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    const user = users[0];
    if (!user) {
      const error = new Error("User not found");
      error.name = "UserNotFoundError";
      throw error;
    }

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

    logger.debug("UnitPay: План найден", {
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      bidMonthLimit: plan.bidMonthLimit,
    });

    let totalAmount = plan.price;
    let additionalBid = 0;
    let upLimit = undefined;

    if (plan.name === "PRO_PLUS" && upLimitId) {
      const upLimits = await db
        .select()
        .from(upLimitTable)
        .where(eq(upLimitTable.id, upLimitId))
        .limit(1);

      if (upLimits.length > 0) {
        additionalBid = upLimits[0].bid;
        totalAmount += upLimits[0].price;
        upLimit = upLimits[0];
        logger.debug("UnitPay: Найден дополнительный лимит", {
          upLimitId,
          bid: upLimits[0].bid,
          price: upLimits[0].price,
        });
      }
    }

    logger.debug("UnitPay: Вычисление итоговой суммы", {
      basePrice: plan.price,
      additionalBid,
      additionalPrice: totalAmount - plan.price,
      totalAmount,
    });

    const description =
      additionalBid > 0
        ? `План ${plan.name} с лимитом ${plan.bidMonthLimit + additionalBid} заявок`
        : `План ${plan.name}`;

    const paymentData = {
      userId,
      planId,
      amount: totalAmount,
      currency: "RUB",
      status: "pending" as const,
      method: "card" as const,
      provider: "unitpay" as const,
      metadata: JSON.stringify({
        planName: plan.name,
        planId,
        upLimitId: upLimitId ?? null,
        additionalBid,
      }),
    };

    const newPayments = await db
      .insert(paymentTable)
      .values(paymentData)
      .returning();

    const newPayment = newPayments[0];
    const paymentId = newPayment.id;

    logger.debug("UnitPay: Запись создана в БД", {
      paymentId,
      paymentData,
    });

    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const isDevelopment = env.ENV === "development";

    let paymentUrl: string;
    let unitpayPaymentId: number | undefined;

    if (isDevelopment) {
      paymentUrl = `http://localhost:5173/app/payment/success?paymentId=${paymentId}`;
      logger.info("UnitPay: Режим разработки - ссылка на страницу success", {
        paymentUrl,
      });
    } else {
      const appUrl =
        process.env.APP_URL || "https://app.quizgram.com";
      const resultUrl = `${appUrl}/app/payment/success?paymentId=${paymentId}`;

      logger.debug("UnitPay: URL возврата", { resultUrl });

      const params = {
        method: "initPayment",
        "params[paymentType]": "card",
        "params[projectId]": projectId,
        "params[secretKey]": secretKey,
        "params[sum]": totalAmount.toString(),
        "params[account]": userId.toString(),
        "params[desc]": description,
        "params[currency]": "RUB",
        "params[resultUrl]": resultUrl,
        "params[customerEmail]": user.login,
        "params[subscription]": "true", // Рекуррентная подписка
      };

      logger.debug("UnitPay: Параметры запроса к API (с подпиской)", { params });

      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");

      const apiUrl = `https://unitpay.ru/api?${queryString}`;

      logger.debug("UnitPay: URL запроса к API", { apiUrl });

      const response = await fetch(apiUrl);
      const responseData = await response.json();

      logger.debug("UnitPay: Ответ от API", { responseData });

      if (responseData.error) {
        const error = new Error(responseData.error.message);
        error.name = "UnitpayApiError";
        throw error;
      }

      if (responseData.result?.type === "redirect") {
        unitpayPaymentId = responseData.result.paymentId;
        paymentUrl = responseData.result.redirectUrl;

        logger.info("UnitPay: Платёж создан через API", {
          paymentId,
          unitpayPaymentId,
          paymentUrl,
        });

        if (unitpayPaymentId !== undefined) {
          await db
            .update(paymentTable)
            .set({
              invoiceId: unitpayPaymentId.toString(),
              invoiceUrl: paymentUrl,
            })
            .where(eq(paymentTable.id, paymentId));
        }
      } else {
        const error = new Error(
          `Неожиданный тип ответа от UnitPay: ${responseData.result?.type}`
        );
        error.name = "UnitpayResponseTypeError";
        throw error;
      }
    }

    logger.info("Платёж создан через UnitPay", {
      paymentId,
      userId,
      planId,
      amount: totalAmount,
      paymentUrl,
      unitpayPaymentId,
      isDevelopment,
    });

    const result: {
      paymentId: number;
      paymentUrl: string;
      unitpayPaymentId?: number;
      plan?: {
        id: number;
        name: string;
        price: number;
        bidMonthLimit: number;
      };
      upLimit?: {
        id: number;
        bid: number;
        price: number;
      };
      totalAmount?: number;
    } = {
      paymentId,
      paymentUrl,
      unitpayPaymentId,
    };

    if (isDevelopment) {
      result.plan = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        bidMonthLimit: plan.bidMonthLimit,
      };

      if (upLimit) {
        result.upLimit = {
          id: upLimit.id,
          bid: upLimit.bid,
          price: upLimit.price,
        };
      }

      result.totalAmount = totalAmount;
    }

    return result;
  }

  /**
   * Списание средств по подписке через UnitPay API
   * @param userId - ID пользователя
   * @param planId - ID плана для продления
   * @param subscriptionId - ID подписки UnitPay
   * @param amount - Сумма списания
   * @param userPaymentId - ID записи user_payment
   * @returns true если списание инициировано, false если ошибка
   */
  static async chargeSubscription(
    userId: number,
    planId: number,
    subscriptionId: string,
    amount: number,
    userPaymentId: number,
  ): Promise<boolean> {
    logger.info("UnitPay: Попытка автосписания по подписке", {
      userId,
      planId,
      subscriptionId,
      amount,
      userPaymentId,
    });

    const projectId = process.env.UNITPAY_PROJECT_ID;
    const secretKey = process.env.UNITPAY_SECRET_KEY;

    if (!projectId || !secretKey) {
      logger.error("UnitPay: Не настроены учетные данные");
      return false;
    }

    try {
      // Получаем пользователя и план
      const users = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      const user = users[0];
      if (!user) {
        logger.error("UnitPay: Пользователь не найден", { userId });
        return false;
      }

      const plans = await db
        .select()
        .from(planTable)
        .where(eq(planTable.id, planId))
        .limit(1);

      const plan = plans[0];
      if (!plan) {
        logger.error("UnitPay: План не найден", { planId });
        return false;
      }

      const description = `Автопродление подписки ${plan.name}`;

      // Формируем параметры для UnitPay API
      const params = {
        method: "initPayment",
        "params[paymentType]": "card",
        "params[projectId]": projectId,
        "params[secretKey]": secretKey,
        "params[sum]": amount.toString(),
        "params[account]": userId.toString(),
        "params[desc]": description,
        "params[currency]": "RUB",
        "params[subscriptionId]": subscriptionId, // Ключевой параметр для автосписания
        "params[customerEmail]": user.login,
      };

      logger.debug("UnitPay: Параметры автосписания", { params });

      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");

      const apiUrl = `https://unitpay.ru/api?${queryString}`;
      const response = await fetch(apiUrl);
      const responseData = await response.json();

      logger.debug("UnitPay: Ответ на автосписание", { responseData });

      // Проверяем успешность
      if (responseData.error) {
        logger.error("UnitPay: Ошибка автосписания", {
          userId,
          subscriptionId,
          error: responseData.error,
        });

        // Обновляем счетчики попыток
        await db
          .update(userPaymentTable)
          .set({
            paymentAttempts: sql`${userPaymentTable.paymentAttempts} + 1`,
            lastPaymentAttemptAt: new Date(),
          })
          .where(eq(userPaymentTable.id, userPaymentId));

        return false;
      }

      // Проверяем результат
      if (responseData.result?.type === "redirect") {
        logger.info("UnitPay: Автосписание инициировано", {
          userId,
          subscriptionId,
          paymentId: responseData.result.paymentId,
        });

        // Создаем запись о платеже
        const paymentData = {
          userId,
          planId,
          amount,
          currency: "RUB",
          status: "pending" as const,
          method: "card" as const,
          provider: "unitpay" as const,
          invoiceId: responseData.result.paymentId?.toString(),
          metadata: JSON.stringify({
            planName: plan.name,
            planId,
            isAutoRenewal: true, // Флаг автопродления
            originalUserPaymentId: userPaymentId,
          }),
        };

        await db.insert(paymentTable).values(paymentData);

        // Обновляем счетчики
        await db
          .update(userPaymentTable)
          .set({
            paymentAttempts: sql`${userPaymentTable.paymentAttempts} + 1`,
            lastPaymentAttemptAt: new Date(),
          })
          .where(eq(userPaymentTable.id, userPaymentId));

        logger.info("UnitPay: Запись о платеже автопродления создана", {
          userId,
          planId,
        });

        return true; // Списание инициировано, продление будет в webhook
      }

      logger.error("UnitPay: Неожиданный тип ответа", {
        userId,
        subscriptionId,
        responseType: responseData.result?.type,
      });

      return false;
    } catch (error) {
      logger.error(
        "UnitPay: Исключение при автосписании",
        error instanceof Error ? error : new Error(String(error)),
        { userId, subscriptionId, amount }
      );

      // Обновляем счетчики даже при исключении
      try {
        await db
          .update(userPaymentTable)
          .set({
            paymentAttempts: sql`${userPaymentTable.paymentAttempts} + 1`,
            lastPaymentAttemptAt: new Date(),
          })
          .where(eq(userPaymentTable.id, userPaymentId));
      } catch (updateError) {
        logger.error(
          "UnitPay: Не удалось обновить счетчик",
          updateError instanceof Error ? updateError : new Error(String(updateError)),
          { userPaymentId }
        );
      }

      return false;
    }
  }

  /**
   * Обновление плана пользователя
   * @param userId - ID пользователя
   * @param planId - ID нового плана
   * @param paymentId - ID успешного платежа (опционально, не используется в новой логике)
   * @param upLimitId - ID дополнительного лимита для Pro+ (опционально)
   * @param payNow - Оплата сейчас (true) или в день начала (false), по умолчанию true (не используется в новой логике)
   * @returns Обновленный план
   */
  static async updateUserPlan(
    userId: number,
    planId: number,
    paymentId: number | null = null,
    upLimitId?: number,
    payNow: boolean = true,
    subscriptionId?: string | null,
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
        subscriptionId: subscriptionId || null, // ID подписки UnitPay
      };

      await db.insert(userPaymentTable).values(scheduledUserPaymentData);

      logger.info("Отсроченный план создан", {
        userId,
        planId: plan.id,
        planName: plan.name,
        startsAt: currentPlanEndsAt,
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
        subscriptionId: subscriptionId || null, // ID подписки UnitPay
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

  /**
   * Продление существующей подписки (автопродление)
   * @param userId - ID пользователя
   * @param userPaymentId - ID исходной записи user_payment
   * @param newPaymentId - ID нового платежа
   * @param newSubscriptionId - Новый subscriptionId (может быть null)
   */
  static async renewSubscription(
    userId: number,
    userPaymentId: number,
    newPaymentId: number,
    newSubscriptionId?: string | null,
  ): Promise<void> {
    logger.info("Payment: Начало продления подписки", {
      userId,
      userPaymentId,
      newPaymentId,
      newSubscriptionId,
    });

    try {
      // Получаем текущую запись user_payment
      const currentPayments = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      if (currentPayments.length === 0) {
        logger.error("Payment: Запись user_payment не найдена", { userPaymentId });
        throw new Error("User payment not found");
      }

      const currentPayment = currentPayments[0];

      // Вычисляем новый finalDayAt: +1 месяц от текущего finalDayAt
      const newFinalDayAt = new Date(currentPayment.finalDayAt);
      newFinalDayAt.setMonth(newFinalDayAt.getMonth() + 1);
      newFinalDayAt.setHours(23, 59, 0, 0);

      logger.debug("Payment: Новая дата окончания подписки", {
        oldFinalDayAt: currentPayment.finalDayAt,
        newFinalDayAt,
      });

      // Обновляем существующую запись user_payment
      await db
        .update(userPaymentTable)
        .set({
          finalDayAt: newFinalDayAt,
          paymentId: newPaymentId, // Обновляем на новый платеж
          month: currentPayment.month + 1, // Увеличиваем счетчик месяцев
          paymentAttempts: 0, // Сбрасываем счетчик попыток
          lastPaymentAttemptAt: new Date(),
          subscriptionId: newSubscriptionId || currentPayment.subscriptionId, // Обновляем если пришел новый
        })
        .where(eq(userPaymentTable.id, userPaymentId));

      logger.info("Payment: Подписка успешно продлена", {
        userId,
        userPaymentId,
        newFinalDayAt,
        newMonth: currentPayment.month + 1,
      });
    } catch (error) {
      logger.error(
        "Payment: Ошибка при продлении подписки",
        error instanceof Error ? error : new Error(String(error)),
        { userId, userPaymentId, newPaymentId }
      );
      throw error;
    }
  }

  /**
   * Активация отсроченного плана
   * @param userPaymentId - ID записи user_payment отсроченного плана
   * @returns Активированный план
   */
  static async activateScheduledPlan(userPaymentId: number): Promise<Plan> {
    logger.debug("Payment: Начало активации отсроченного плана", { userPaymentId });

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
      logger.error("Payment: Отсроченный план не найден", { userPaymentId });
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
   * Отмена автопродления подписки
   * @param userId - ID пользователя
   */
  static async cancelSubscription(userId: number): Promise<void> {
    logger.info("Payment: Запрос на отмену автопродления", { userId });

    // Находим активный платный план пользователя
    const currentUserPayment = await db
      .select()
      .from(userPaymentTable)
      .where(
        and(
          eq(userPaymentTable.userId, userId),
          eq(userPaymentTable.isActive, true),
        ),
      )
      .limit(1);

    if (currentUserPayment.length === 0) {
      logger.error("Payment: Активный платный план не найден", { userId });
      const error = new Error("Active paid plan not found");
      error.name = "ActivePlanNotFoundError";
      throw error;
    }

    // Обновляем флаг отмены автопродления
    await db
      .update(userPaymentTable)
      .set({ cancelAutoRenew: true })
      .where(eq(userPaymentTable.id, currentUserPayment[0].id));

    logger.info("Payment: Автопродление отменено", {
      userId,
      userPaymentId: currentUserPayment[0].id,
    });
  }
}
