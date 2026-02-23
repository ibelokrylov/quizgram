// Сервис payment — бизнес-логика для обновления плана пользователя

import { and, eq, isNull, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import {
  db,
  paymentTable,
  planTable,
  quizBidTable,
  quizTable,
  upLimitTable,
  userPaymentTable,
  UserTable,
  type NewUserPayment,
  type Plan,
  type UpLimit,
} from '../../db';
import { logger } from '../../lib/logger';

export abstract class PaymentService {
  /**
   * Получение списка up_limits для тарифа Pro+
   */
  static async getUpLimits(): Promise<UpLimit[]> {
    logger.debug('Payment: Запрос списка up_limits');
    const upLimits = await db.select().from(upLimitTable).orderBy(upLimitTable.bid);
    logger.debug('Payment: Получено up_limits', { count: upLimits.length });
    return upLimits;
  }

  /**
   * Получение статуса платежа
   * @param paymentId - ID платежа
   * @param userId - ID пользователя (для проверки прав доступа)
   * @returns Статус платежа
   */
  static async getPaymentStatus(paymentId: number, userId: number) {
    logger.debug('Payment: Запрос статуса платежа', { paymentId, userId });

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.id, paymentId))
      .limit(1);

    if (payments.length === 0) {
      logger.error('Payment: Платёж не найден', { paymentId, userId });
      const error = new Error('Payment not found');
      error.name = 'PaymentNotFoundError';
      throw error;
    }

    const payment = payments[0];

    if (payment.userId !== userId) {
      logger.error('Payment: Доступ запрещён - платёж принадлежит другому пользователю', {
        paymentId,
        requestedByUserId: userId,
        paymentOwnerId: payment.userId,
      });
      const error = new Error('Payment does not belong to user');
      error.name = 'PaymentAccessDeniedError';
      throw error;
    }

    logger.debug('Payment: Статус платежа получен', {
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
   * Формула: sha256(method + "{up}" + sorted(params_values) + "{up}" + secretKey)
   * Параметры сортируются по ключу, signature исключается из расчёта
   * @param params - Параметры запроса webhook (плоский объект без method в корне)
   * @returns true, если подпись верная
   */
  static verifyUnitpaySignature(params: Record<string, any>): boolean {
    const method = params.method;
    const signature = params.signature;
    const unitpayId = params.unitpayId;

    logger.info('UnitPay Signature: Начало проверки подписи', {
      method,
      unitpayId,
      hasSignature: !!signature,
      paramsCount: Object.keys(params).length,
    });

    logger.debug('UnitPay Signature: Все ключи параметров', {
      keys: Object.keys(params).sort(),
    });

    const secretKey = process.env.UNITPAY_SECRET_KEY;
    if (!secretKey) {
      logger.error('UnitPay Signature: UNITPAY_SECRET_KEY не настроен в окружении');
      return false;
    }

    if (!signature) {
      logger.error('UnitPay Signature: Отсутствует signature в запросе', {
        unitpayId,
        params,
      });
      return false;
    }

    if (!method) {
      logger.error('UnitPay Signature: Отсутствует method в запросе', {
        unitpayId,
        params,
      });
      return false;
    }

    // Получаем все ключи кроме signature и method, сортируем по алфавиту
    const paramKeys = Object.keys(params)
      .filter((key) => key !== 'signature' && key !== 'method')
      .sort();

    // Получаем значения в отсортированном порядке
    const sortedParamsValues = paramKeys.map((key) => String(params[key]));

    // Формируем строку для хеширования: method{up}value1{up}value2{up}...{up}secretKey
    const signatureString = [method, ...sortedParamsValues, secretKey].join('{up}');

    const calculatedSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const isValid = signature === calculatedSignature;

    logger.info('UnitPay Signature: Результат проверки', {
      unitpayId,
      isValid,
      receivedSignature: signature,
      calculatedSignature,
    });

    logger.debug('UnitPay Signature: Детали расчёта', {
      method,
      paramKeys,
      sortedParamsValues,
      signatureStringPreview: signatureString.substring(0, 100) + '...',
      secretKeyLength: secretKey.length,
    });

    if (!isValid) {
      logger.error('UnitPay Signature: Подпись НЕ совпадает', {
        unitpayId,
        receivedSignature: signature,
        calculatedSignature,
        paramKeys,
        sortedParamsValues,
      });
    }

    return isValid;
  }

  /**
   * Обработка события 'check' от UnitPay
   * CHECK проверяет готовность системы: корректность суммы, существование платежа
   * account содержит paymentId из нашей БД
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayCheck(params: Record<string, any>) {
    const unitpayPaymentId = params.unitpayId;
    const orderSum = params.orderSum;
    const account = params.account; // Это наш paymentId
    const isTest = params.test === '1';

    logger.info('UnitPay CHECK: Начало обработки', {
      unitpayPaymentId,
      orderSum,
      account,
      isTest,
      projectId: params.projectId,
    });

    // Проверка подписи
    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error('UnitPay CHECK: Неверная подпись webhook', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Неверная подпись' } };
    }

    logger.info('UnitPay CHECK: Подпись верна', { unitpayPaymentId });

    // Поиск платежа по id (account содержит наш paymentId)
    const paymentId = Number(account);

    logger.debug('UnitPay CHECK: Поиск платежа в БД', {
      searchBy: 'id',
      paymentId,
    });

    if (isNaN(paymentId)) {
      logger.error('UnitPay CHECK: Невалидный account (paymentId)', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Невалидный идентификатор платежа' } };
    }

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.id, paymentId))
      .limit(1);

    if (payments.length === 0) {
      logger.error('UnitPay CHECK: Платёж не найден в БД', {
        unitpayPaymentId,
        paymentId,
        account,
      });
      return { error: { message: 'Платёж не найден' } };
    }

    const payment = payments[0];

    logger.info('UnitPay CHECK: Платёж найден', {
      unitpayPaymentId,
      paymentId: payment.id,
      userId: payment.userId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      invoiceId: payment.invoiceId,
    });

    // Сохраняем unitpayId (invoiceId) если ещё не сохранён
    if (!payment.invoiceId) {
      logger.debug('UnitPay CHECK: Сохранение unitpayId в БД', {
        paymentId: payment.id,
        unitpayPaymentId,
      });

      await db
        .update(paymentTable)
        .set({ invoiceId: String(unitpayPaymentId) })
        .where(eq(paymentTable.id, payment.id));

      logger.info('UnitPay CHECK: unitpayId сохранён', {
        paymentId: payment.id,
        unitpayPaymentId,
      });
    }

    // Проверка статуса
    if (payment.status !== 'pending') {
      logger.error('UnitPay CHECK: Платёж не в статусе pending', {
        unitpayPaymentId,
        paymentId: payment.id,
        currentStatus: payment.status,
      });
      return { error: { message: 'Некорректный статус платежа' } };
    }

    // Проверка суммы
    const expectedAmount = payment.amount;
    const receivedAmount = Number(orderSum);

    if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
      logger.error('UnitPay CHECK: Несовпадение суммы', {
        unitpayPaymentId,
        paymentId: payment.id,
        expectedAmount,
        receivedAmount,
        difference: Math.abs(expectedAmount - receivedAmount),
      });
      return { error: { message: 'Несовпадение суммы' } };
    }

    logger.info('UnitPay CHECK: Успешно завершён', {
      unitpayPaymentId,
      paymentId: payment.id,
      amount: expectedAmount,
    });

    return { result: { message: 'Запрос успешно обработан' } };
  }

  /**
   * Обработка события 'pay' от UnitPay (успешная оплата)
   * PAY уведомляет об успешном списании - необходимо оказать услугу
   * account содержит paymentId из нашей БД
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayPay(params: Record<string, any>) {
    const unitpayPaymentId = params.unitpayId;
    const orderSum = params.orderSum;
    const account = params.account; // Это наш paymentId
    const subscriptionId = params.subscriptionId ? String(params.subscriptionId) : null;
    const isTest = params.test === '1';

    logger.info('UnitPay PAY: Начало обработки', {
      unitpayPaymentId,
      orderSum,
      account,
      subscriptionId,
      isTest,
      projectId: params.projectId,
      profit: params.profit,
    });

    // Проверка подписи
    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error('UnitPay PAY: Неверная подпись webhook', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Неверная подпись' } };
    }

    logger.info('UnitPay PAY: Подпись верна', { unitpayPaymentId });

    // Поиск платежа по id (account содержит наш paymentId)
    const paymentId = Number(account);

    logger.debug('UnitPay PAY: Поиск платежа в БД', {
      searchBy: 'id',
      paymentId,
    });

    if (isNaN(paymentId)) {
      logger.error('UnitPay PAY: Невалидный account (paymentId)', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Невалидный идентификатор платежа' } };
    }

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.id, paymentId))
      .limit(1);

    if (payments.length === 0) {
      logger.error('UnitPay PAY: Платёж не найден в БД', {
        unitpayPaymentId,
        paymentId,
        account,
      });
      return { error: { message: 'Платёж не найден' } };
    }

    const payment = payments[0];

    logger.info('UnitPay PAY: Платёж найден', {
      unitpayPaymentId,
      paymentId: payment.id,
      userId: payment.userId,
      status: payment.status,
      amount: payment.amount,
    });

    // Идемпотентность: если платёж уже оплачен, возвращаем успех
    if (payment.status === 'paid') {
      logger.info('UnitPay PAY: Платёж уже обработан (идемпотентность)', {
        unitpayPaymentId,
        paymentId: payment.id,
      });
      return { result: { message: 'Запрос успешно обработан' } };
    }

    try {
      // Обновляем статус платежа на "paid"
      logger.debug('UnitPay PAY: Обновление статуса платежа на paid', {
        paymentId: payment.id,
      });

      await db.update(paymentTable).set({ status: 'paid' }).where(eq(paymentTable.id, payment.id));

      // Парсинг metadata
      let metadata: {
        planId?: number;
        upLimitId?: number;
        isAutoRenewal?: boolean;
        originalUserPaymentId?: number;
      } = {};

      try {
        metadata = JSON.parse(payment.metadata || '{}');
        logger.debug('UnitPay PAY: Metadata распарсен', {
          paymentId: payment.id,
          metadata,
        });
      } catch (parseError) {
        logger.error('UnitPay PAY: Ошибка парсинга metadata', parseError, {
          unitpayPaymentId,
          paymentId: payment.id,
          rawMetadata: payment.metadata,
        });
        return { error: { message: 'Ошибка парсинга metadata' } };
      }

      const { planId, upLimitId, isAutoRenewal, originalUserPaymentId } = metadata;

      if (isAutoRenewal && originalUserPaymentId) {
        // Автопродление подписки
        logger.info('UnitPay PAY: Обработка автопродления подписки', {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
          planId,
          originalUserPaymentId,
          subscriptionId,
        });

        await this.renewSubscription(
          payment.userId,
          originalUserPaymentId,
          payment.id,
          subscriptionId
        );

        logger.info('UnitPay PAY: Автопродление завершено', {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
        });
      } else {
        // Первичный платёж
        logger.info('UnitPay PAY: Обработка первичного платежа', {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
          planId,
          upLimitId,
          subscriptionId,
        });

        if (!planId) {
          logger.error('UnitPay PAY: planId отсутствует в metadata', {
            unitpayPaymentId,
            paymentId: payment.id,
            metadata,
          });
          return { error: { message: 'planId отсутствует в metadata' } };
        }

        await this.updateUserPlan(
          payment.userId,
          planId,
          payment.id,
          upLimitId,
          true,
          subscriptionId
        );

        logger.info('UnitPay PAY: План пользователя обновлён', {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
          planId,
        });
      }

      logger.info('UnitPay PAY: Успешно завершён', {
        unitpayPaymentId,
        paymentId: payment.id,
        userId: payment.userId,
        planId,
        subscriptionId,
      });

      return { result: { message: 'Запрос успешно обработан' } };
    } catch (error) {
      logger.error(
        'UnitPay PAY: Ошибка при обработке',
        error instanceof Error ? error : new Error(String(error)),
        {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
        }
      );
      return { error: { message: 'Ошибка обработки платежа' } };
    }
  }

  /**
   * Обработка события 'error' от UnitPay
   * ERROR уведомляет об ошибке платежа на любом этапе
   * Статус не конечный - после ERROR может последовать PAY
   * account содержит paymentId из нашей БД
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayError(params: Record<string, any>) {
    const unitpayPaymentId = params.unitpayId;
    const account = params.account; // Это наш paymentId
    const errorMessage = params.errorMessage;
    const isTest = params.test === '1';

    logger.info('UnitPay ERROR: Начало обработки', {
      unitpayPaymentId,
      account,
      errorMessage,
      isTest,
      projectId: params.projectId,
    });

    // Проверка подписи
    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error('UnitPay ERROR: Неверная подпись webhook', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Неверная подпись' } };
    }

    logger.info('UnitPay ERROR: Подпись верна', { unitpayPaymentId });

    try {
      // Поиск платежа по id (account содержит наш paymentId)
      const paymentId = Number(account);

      if (isNaN(paymentId)) {
        logger.warn('UnitPay ERROR: Невалидный account (paymentId)', {
          unitpayPaymentId,
          account,
        });
        return { result: { message: 'Запрос успешно обработан' } };
      }

      const payments = await db
        .select()
        .from(paymentTable)
        .where(eq(paymentTable.id, paymentId))
        .limit(1);

      if (payments.length === 0) {
        logger.warn('UnitPay ERROR: Платёж не найден в БД', {
          unitpayPaymentId,
          paymentId,
          account,
        });
        return { result: { message: 'Запрос успешно обработан' } };
      }

      const payment = payments[0];

      logger.info('UnitPay ERROR: Платёж найден, обновление статуса на failed', {
        unitpayPaymentId,
        paymentId: payment.id,
        userId: payment.userId,
        currentStatus: payment.status,
        errorMessage,
      });

      await db
        .update(paymentTable)
        .set({ status: 'failed' })
        .where(eq(paymentTable.id, payment.id));

      logger.info('UnitPay ERROR: Успешно завершён', {
        unitpayPaymentId,
        paymentId: payment.id,
        newStatus: 'failed',
      });

      return { result: { message: 'Запрос успешно обработан' } };
    } catch (error) {
      logger.error(
        'UnitPay ERROR: Ошибка при обработке',
        error instanceof Error ? error : new Error(String(error)),
        { unitpayPaymentId }
      );
      return { error: { message: 'Ошибка обновления статуса' } };
    }
  }

  /**
   * Обработка события 'refund' от UnitPay (возврат средств)
   * account содержит paymentId из нашей БД
   * @param params - Параметры запроса от UnitPay
   * @returns { result: { message: string } } | { error: { message: string } }
   */
  static async handleUnitpayRefund(params: Record<string, any>) {
    const unitpayPaymentId = params.unitpayId;
    const account = params.account; // Это наш paymentId
    const isTest = params.test === '1';

    logger.info('UnitPay REFUND: Начало обработки', {
      unitpayPaymentId,
      account,
      isTest,
      projectId: params.projectId,
    });

    // Проверка подписи
    const isValid = this.verifyUnitpaySignature(params);
    if (!isValid) {
      logger.error('UnitPay REFUND: Неверная подпись webhook', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Неверная подпись' } };
    }

    logger.info('UnitPay REFUND: Подпись верна', { unitpayPaymentId });

    // Поиск платежа по id (account содержит наш paymentId)
    const paymentId = Number(account);

    if (isNaN(paymentId)) {
      logger.error('UnitPay REFUND: Невалидный account (paymentId)', {
        unitpayPaymentId,
        account,
      });
      return { error: { message: 'Невалидный идентификатор платежа' } };
    }

    const payments = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.id, paymentId))
      .limit(1);

    if (payments.length === 0) {
      logger.error('UnitPay REFUND: Платёж не найден в БД', {
        unitpayPaymentId,
        paymentId,
        account,
      });
      return { error: { message: 'Платёж не найден' } };
    }

    const payment = payments[0];

    logger.info('UnitPay REFUND: Платёж найден', {
      unitpayPaymentId,
      paymentId: payment.id,
      userId: payment.userId,
      status: payment.status,
      amount: payment.amount,
    });

    try {
      // Обновляем статус платежа на 'failed' (возврат = отмена)
      logger.debug('UnitPay REFUND: Обновление статуса платежа на failed', {
        paymentId: payment.id,
      });

      await db
        .update(paymentTable)
        .set({
          status: 'failed',
          metadata: JSON.stringify({
            ...JSON.parse(payment.metadata || '{}'),
            refundedAt: new Date().toISOString(),
            refundReason: params.errorMessage || 'Возврат средств',
          }),
        })
        .where(eq(paymentTable.id, payment.id));

      // Откатываем план пользователя на FREE
      const freePlans = await db
        .select()
        .from(planTable)
        .where(eq(planTable.name, 'FREE'))
        .limit(1);

      if (freePlans.length > 0) {
        const freePlan = freePlans[0];

        logger.info('UnitPay REFUND: Откат плана пользователя на FREE', {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
          freePlanId: freePlan.id,
        });

        // Деактивируем текущий активный план
        await db
          .update(userPaymentTable)
          .set({ isActive: false })
          .where(
            and(eq(userPaymentTable.userId, payment.userId), eq(userPaymentTable.isActive, true))
          );

        // Обновляем план пользователя на FREE
        await db
          .update(UserTable)
          .set({
            planId: freePlan.id,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.id, payment.userId));

        logger.info('UnitPay REFUND: План пользователя откачен на FREE', {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
        });
      } else {
        logger.warn('UnitPay REFUND: FREE план не найден в БД', {
          unitpayPaymentId,
          userId: payment.userId,
        });
      }

      logger.info('UnitPay REFUND: Успешно завершён', {
        unitpayPaymentId,
        paymentId: payment.id,
        userId: payment.userId,
      });

      return { result: { message: 'Запрос успешно обработан' } };
    } catch (error) {
      logger.error(
        'UnitPay REFUND: Ошибка при обработке',
        error instanceof Error ? error : new Error(String(error)),
        {
          unitpayPaymentId,
          paymentId: payment.id,
          userId: payment.userId,
        }
      );
      return { error: { message: 'Ошибка обработки возврата' } };
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
    upLimitId?: number
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
    logger.debug('UnitPay: Начало создания платежа', {
      userId,
      planId,
      upLimitId,
    });

    const projectId = process.env.UNITPAY_PROJECT_ID;
    const secretKey = process.env.UNITPAY_SECRET_KEY;

    logger.debug('UnitPay: Параметры окружения', {
      hasProjectId: !!projectId,
      hasSecretKey: !!secretKey,
      projectId,
    });

    if (!projectId || !secretKey) {
      const error = new Error('UNITPAY_PROJECT_ID или UNITPAY_SECRET_KEY не настроены');
      error.name = 'UnitpayConfigError';
      throw error;
    }

    // Получаем email пользователя для UnitPay
    const users = await db.select().from(UserTable).where(eq(UserTable.id, userId)).limit(1);

    const user = users[0];
    if (!user) {
      const error = new Error('User not found');
      error.name = 'UserNotFoundError';
      throw error;
    }

    const plans = await db.select().from(planTable).where(eq(planTable.id, planId)).limit(1);

    const plan = plans[0];
    if (!plan) {
      const error = new Error('Plan not found');
      error.name = 'PlanNotFoundError';
      throw error;
    }

    logger.debug('UnitPay: План найден', {
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      bidMonthLimit: plan.bidMonthLimit,
    });

    let totalAmount = plan.price;
    let additionalBid = 0;
    let upLimit = undefined;

    if (plan.name === 'PRO_PLUS' && upLimitId) {
      const upLimits = await db
        .select()
        .from(upLimitTable)
        .where(eq(upLimitTable.id, upLimitId))
        .limit(1);

      if (upLimits.length > 0) {
        additionalBid = upLimits[0].bid;
        totalAmount += upLimits[0].price;
        upLimit = upLimits[0];
        logger.debug('UnitPay: Найден дополнительный лимит', {
          upLimitId,
          bid: upLimits[0].bid,
          price: upLimits[0].price,
        });
      }
    }

    logger.debug('UnitPay: Вычисление итоговой суммы', {
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
      currency: 'RUB',
      status: 'pending' as const,
      method: 'card' as const,
      provider: 'unitpay' as const,
      metadata: JSON.stringify({
        planName: plan.name,
        planId,
        upLimitId: upLimitId ?? null,
        additionalBid,
      }),
    };

    const newPayments = await db.insert(paymentTable).values(paymentData).returning();

    const newPayment = newPayments[0];
    const paymentId = newPayment.id;

    logger.debug('UnitPay: Запись создана в БД', {
      paymentId,
      paymentData,
    });

    const env = typeof Bun !== 'undefined' ? Bun.env : process.env;
    const isDevelopment = env.ENV === 'development';

    let paymentUrl: string;
    let unitpayPaymentId: number | undefined;

    if (isDevelopment) {
      paymentUrl = `http://localhost:5173/app/payment/success?paymentId=${paymentId}`;
      logger.info('UnitPay: Режим разработки - ссылка на страницу success', {
        paymentUrl,
      });
    } else {
      const appUrl = process.env.APP_URL || 'https://app.quizgram.com';
      const resultUrl = `${appUrl}/app/payment/success?paymentId=${paymentId}`;

      logger.debug('UnitPay: URL возврата', { resultUrl });

      // cashItems для 54-ФЗ (онлайн-касса)
      // Согласно документации UnitPay: JSON -> base64 -> URL encode
      const cashItemsJson = JSON.stringify([
        {
          name: description,
          count: 1,
          price: totalAmount,
          currency: 'RUB',
          nds: 'none',
          type: 'service',
          paymentMethod: 'full_payment',
        },
      ]);
      const cashItems = Buffer.from(cashItemsJson).toString('base64');

      const params = {
        method: 'initPayment',
        'params[paymentType]': 'card',
        'params[projectId]': projectId,
        'params[secretKey]': secretKey,
        'params[sum]': totalAmount.toString(),
        'params[account]': paymentId.toString(), // paymentId для идентификации в webhook
        'params[desc]': description,
        'params[currency]': 'RUB',
        'params[resultUrl]': resultUrl,
        'params[customerEmail]': user.login,
        'params[subscription]': 'true', // Рекуррентная подписка
        'params[cashItems]': cashItems,
      };

      logger.debug('UnitPay: Параметры запроса к API (с подпиской)', { params });

      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const apiUrl = `https://unitpay.ru/api?${queryString}`;

      logger.debug('UnitPay: URL запроса к API', { apiUrl });

      const response = await fetch(apiUrl);
      const responseData = await response.json();

      logger.debug('UnitPay: Ответ от API', { responseData });

      if (responseData.error) {
        const error = new Error(responseData.error.message);
        error.name = 'UnitpayApiError';
        throw error;
      }

      if (responseData.result?.type === 'redirect') {
        unitpayPaymentId = responseData.result.paymentId;
        paymentUrl = responseData.result.redirectUrl;

        logger.info('UnitPay: Платёж создан через API', {
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
        const error = new Error(`Неожиданный тип ответа от UnitPay: ${responseData.result?.type}`);
        error.name = 'UnitpayResponseTypeError';
        throw error;
      }
    }

    logger.info('Платёж создан через UnitPay', {
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
    userPaymentId: number
  ): Promise<boolean> {
    logger.info('UnitPay: Попытка автосписания по подписке', {
      userId,
      planId,
      subscriptionId,
      amount,
      userPaymentId,
    });

    const projectId = process.env.UNITPAY_PROJECT_ID;
    const secretKey = process.env.UNITPAY_SECRET_KEY;

    if (!projectId || !secretKey) {
      logger.error('UnitPay: Не настроены учетные данные');
      return false;
    }

    try {
      // Получаем пользователя и план
      const users = await db.select().from(UserTable).where(eq(UserTable.id, userId)).limit(1);

      const user = users[0];
      if (!user) {
        logger.error('UnitPay: Пользователь не найден', { userId });
        return false;
      }

      const plans = await db.select().from(planTable).where(eq(planTable.id, planId)).limit(1);

      const plan = plans[0];
      if (!plan) {
        logger.error('UnitPay: План не найден', { planId });
        return false;
      }

      const description = `Автопродление подписки ${plan.name}`;

      // Формируем параметры для UnitPay API
      const params = {
        method: 'initPayment',
        'params[paymentType]': 'card',
        'params[projectId]': projectId,
        'params[secretKey]': secretKey,
        'params[sum]': amount.toString(),
        'params[account]': userId.toString(),
        'params[desc]': description,
        'params[currency]': 'RUB',
        'params[subscriptionId]': subscriptionId, // Ключевой параметр для автосписания
        'params[customerEmail]': user.login,
      };

      logger.debug('UnitPay: Параметры автосписания', { params });

      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const apiUrl = `https://unitpay.ru/api?${queryString}`;
      const response = await fetch(apiUrl);
      const responseData = await response.json();

      logger.debug('UnitPay: Ответ на автосписание', { responseData });

      // Проверяем успешность
      if (responseData.error) {
        logger.error('UnitPay: Ошибка автосписания', {
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
      if (responseData.result?.type === 'redirect') {
        logger.info('UnitPay: Автосписание инициировано', {
          userId,
          subscriptionId,
          paymentId: responseData.result.paymentId,
        });

        // Создаем запись о платеже
        const paymentData = {
          userId,
          planId,
          amount,
          currency: 'RUB',
          status: 'pending' as const,
          method: 'card' as const,
          provider: 'unitpay' as const,
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

        logger.info('UnitPay: Запись о платеже автопродления создана', {
          userId,
          planId,
        });

        return true; // Списание инициировано, продление будет в webhook
      }

      logger.error('UnitPay: Неожиданный тип ответа', {
        userId,
        subscriptionId,
        responseType: responseData.result?.type,
      });

      return false;
    } catch (error) {
      logger.error(
        'UnitPay: Исключение при автосписании',
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
          'UnitPay: Не удалось обновить счетчик',
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
    subscriptionId?: string | null
  ): Promise<Plan> {
    // Проверяем, существует ли план
    const plans = await db.select().from(planTable).where(eq(planTable.id, planId)).limit(1);

    const plan = plans[0];

    if (!plan) {
      const error = new Error('Plan not found');
      error.name = 'PlanNotFoundError';
      throw error;
    }

    const userResult = await db
      .select({ isAdmin: UserTable.isAdmin })
      .from(UserTable)
      .where(eq(UserTable.id, userId))
      .limit(1);

    const isAdmin = userResult[0]?.isAdmin ?? false;

    // Проверяем текущий активный платный план пользователя
    const currentUserPayment = await db
      .select({
        userPayment: userPaymentTable,
        currentPlan: planTable,
      })
      .from(userPaymentTable)
      .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
      .where(and(eq(userPaymentTable.userId, userId), eq(userPaymentTable.isActive, true)))
      .limit(1);

    const hasActivePaidPlan =
      currentUserPayment.length > 0 && currentUserPayment[0].currentPlan.price > 0;
    const currentPlan = currentUserPayment[0]?.currentPlan;
    const currentUserPaymentRecord = currentUserPayment[0]?.userPayment;
    const isDowngrade = hasActivePaidPlan && currentPlan && plan.price < currentPlan.price;
    const currentPlanEndsAt = currentUserPaymentRecord?.finalDayAt;
    const now = new Date();
    const shouldSchedule = isDowngrade && currentPlanEndsAt && currentPlanEndsAt > now;

    // Если это отсроченный план (понижение и текущий план еще не закончился)
    if (shouldSchedule) {
      // Не обновляем план пользователя сразу, создаем отсроченную запись
      logger.info('Создание отсроченного плана', {
        userId,
        currentPlanId: currentPlan.id,
        newPlanId: plan.id,
        startsAt: currentPlanEndsAt,
      });

      // Для Pro+ получаем дополнительный лимит
      let additionalLimit = 0;
      if (plan.name === 'PRO_PLUS' && upLimitId) {
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

      logger.info('Отсроченный план создан', {
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
      .update(UserTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, userId));

    // Создаём или обновляем запись в user_payment
    try {
      // 1. Деактивируем все старые записи user_payment для этого пользователя
      await db
        .update(userPaymentTable)
        .set({ isActive: false })
        .where(and(eq(userPaymentTable.userId, userId), eq(userPaymentTable.isActive, true)));

      logger.info('Старые записи user_payment деактивированы', { userId });

      // Вычисляем finalDayAt: +1 месяц от текущей даты + время 23:59:00
      const finalDayAt = new Date();
      finalDayAt.setMonth(finalDayAt.getMonth() + 1);
      finalDayAt.setHours(23, 59, 0, 0);

      // Для Pro+ получаем дополнительный лимит
      let additionalLimit = 0;
      if (plan.name === 'PRO_PLUS' && upLimitId) {
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
      if (plan.price > 0 && !isAdmin) {
        // Находим все активные квизы пользователя
        const activeQuizzes = await db
          .select({ id: quizTable.id })
          .from(quizTable)
          .where(
            and(
              eq(quizTable.userId, userId),
              eq(quizTable.isActive, true),
              isNull(quizTable.deletedAt)
            )
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
                eq(quizBidTable.isEqualPaymentLimit, false)
              )
            );

          currentLimit = bidsToUpdate.length;

          logger.info('Найдено ставок для учёта в новом тарифе', {
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

            logger.info('Ставки обновлены: isEqualPaymentLimit = true', {
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

      logger.info('Новая запись user_payment создана', {
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
        'Ошибка при создании/обновлении user_payment при изменении плана',
        paymentError instanceof Error ? paymentError : new Error(String(paymentError)),
        { userId, planId: plan.id }
      );
      throw paymentError; // Прерываем выполнение, т.к. это критическая ошибка
    }

    logger.info('План пользователя успешно обновлен', {
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
    newSubscriptionId?: string | null
  ): Promise<void> {
    logger.info('Payment: Начало продления подписки', {
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
        logger.error('Payment: Запись user_payment не найдена', { userPaymentId });
        throw new Error('User payment not found');
      }

      const currentPayment = currentPayments[0];

      // Вычисляем новый finalDayAt: +1 месяц от текущего finalDayAt
      const newFinalDayAt = new Date(currentPayment.finalDayAt);
      newFinalDayAt.setMonth(newFinalDayAt.getMonth() + 1);
      newFinalDayAt.setHours(23, 59, 0, 0);

      logger.debug('Payment: Новая дата окончания подписки', {
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

      logger.info('Payment: Подписка успешно продлена', {
        userId,
        userPaymentId,
        newFinalDayAt,
        newMonth: currentPayment.month + 1,
      });
    } catch (error) {
      logger.error(
        'Payment: Ошибка при продлении подписки',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          userPaymentId,
          newPaymentId,
        }
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
    logger.debug('Payment: Начало активации отсроченного плана', { userPaymentId });

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
      logger.error('Payment: Отсроченный план не найден', { userPaymentId });
      const error = new Error('Scheduled payment not found');
      error.name = 'ScheduledPaymentNotFoundError';
      throw error;
    }

    const { userPayment, plan } = scheduledPayments[0];

    // Деактивируем все старые активные записи user_payment для этого пользователя
    await db
      .update(userPaymentTable)
      .set({ isActive: false })
      .where(
        and(eq(userPaymentTable.userId, userPayment.userId), eq(userPaymentTable.isActive, true))
      );

    logger.info('Старые активные планы деактивированы', {
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
      .update(UserTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, userPayment.userId));

    logger.info('Отсроченный план активирован', {
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
    logger.info('Payment: Запрос на отмену автопродления', { userId });

    // Находим активный платный план пользователя
    const currentUserPayment = await db
      .select()
      .from(userPaymentTable)
      .where(and(eq(userPaymentTable.userId, userId), eq(userPaymentTable.isActive, true)))
      .limit(1);

    if (currentUserPayment.length === 0) {
      logger.error('Payment: Активный платный план не найден', { userId });
      const error = new Error('Active paid plan not found');
      error.name = 'ActivePlanNotFoundError';
      throw error;
    }

    // Обновляем флаг отмены автопродления
    await db
      .update(userPaymentTable)
      .set({ cancelAutoRenew: true })
      .where(eq(userPaymentTable.id, currentUserPayment[0].id));

    logger.info('Payment: Автопродление отменено', {
      userId,
      userPaymentId: currentUserPayment[0].id,
    });
  }
}
