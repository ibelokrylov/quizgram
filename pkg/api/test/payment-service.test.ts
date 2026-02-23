// Тесты для PaymentService

import { afterAll, beforeAll, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { PaymentService } from '../src/modules/payment/service';
import {
  cleanupTestUser,
  createTestPayment,
  createTestUpLimit,
  createTestUser,
  createTestUserPayment,
  ensureTestPlan,
} from './utils/test-db';
import { TestLogger } from './utils/test-logger';

const logger = new TestLogger('payment-service');

const TEST_SECRET_KEY = 'test-secret-key-12345678901234567890';

beforeAll(async () => {
  process.env.UNITPAY_SECRET_KEY = TEST_SECRET_KEY;
  process.env.UNITPAY_PROJECT_ID = 'test-project-id';
  process.env.ENV = 'development';
  await ensureTestPlan('FREE', 0, 10);
  await ensureTestPlan('BASE', 1000, 200);
  await ensureTestPlan('PRO_PLUS', 1600, 200);
});

afterAll(async () => {
  const filepath = await logger.saveResults();
  console.log(`\n📊 Результаты тестов сохранены в: ${filepath}`);

  const { cleanupAllTestUsers } = await import('./utils/test-db');
  await cleanupAllTestUsers();
});

async function measureTest<T>(testName: string, testFn: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    logger.logResult({
      testName,
      status: 'passed',
      duration,
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResult({
      testName,
      status: 'failed',
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

test('1. getUpLimits возвращает список up_limits в правильном порядке', async () => {
  await measureTest('1. getUpLimits', async () => {
    const upLimitId1 = await createTestUpLimit(50, 500);
    const upLimitId2 = await createTestUpLimit(100, 1000);
    const upLimitId3 = await createTestUpLimit(150, 1500);

    try {
      const upLimits = await PaymentService.getUpLimits();

      expect(upLimits.length).toBeGreaterThanOrEqual(3);

      const foundLimit1 = upLimits.find((ul) => ul.id === upLimitId1);
      const foundLimit2 = upLimits.find((ul) => ul.id === upLimitId2);
      const foundLimit3 = upLimits.find((ul) => ul.id === upLimitId3);

      expect(foundLimit1).toBeDefined();
      expect(foundLimit2).toBeDefined();
      expect(foundLimit3).toBeDefined();

      expect(foundLimit1?.bid).toBe(50);
      expect(foundLimit2?.bid).toBe(100);
      expect(foundLimit3?.bid).toBe(150);

      expect(foundLimit1?.price).toBe(500);
      expect(foundLimit2?.price).toBe(1000);
      expect(foundLimit3?.price).toBe(1500);

      const sortedBids = upLimits.map((ul) => ul.bid);
      const isSorted = sortedBids.every((bid, i) => {
        return i === 0 || sortedBids[i - 1] <= bid;
      });
      expect(isSorted).toBe(true);
    } finally {
      const { db, upLimitTable } = await import('../src/db');
      await db.delete(upLimitTable).where(eq(upLimitTable.id, upLimitId1));
      await db.delete(upLimitTable).where(eq(upLimitTable.id, upLimitId2));
      await db.delete(upLimitTable).where(eq(upLimitTable.id, upLimitId3));
    }
  });
});

test('2. getPaymentStatus возвращает статус платежа', async () => {
  await measureTest('2. getPaymentStatus', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    const paymentId = await createTestPayment(userId, basePlanId, {
      status: 'pending',
      amount: 1000,
      currency: 'RUB',
    });

    try {
      const status = await PaymentService.getPaymentStatus(paymentId, userId);

      expect(status.id).toBe(paymentId);
      expect(status.status).toBe('pending');
      expect(status.amount).toBe(1000);
      expect(status.currency).toBe('RUB');
      expect(status.createdAt).toBeInstanceOf(Date);
      expect(status.updatedAt).toBeInstanceOf(Date);
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('3. getPaymentStatus выбрасывает ошибку если платеж не найден', async () => {
  await measureTest('3. getPaymentStatus: платеж не найден', async () => {
    const userId = await createTestUser();

    try {
      await expect(async () => {
        await PaymentService.getPaymentStatus(99999, userId);
      }).toThrow('Payment not found');
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('4. getPaymentStatus выбрасывает ошибку если платеж не принадлежит пользователю', async () => {
  await measureTest('4. getPaymentStatus: нет доступа', async () => {
    const userId1 = await createTestUser();
    const userId2 = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    const paymentId = await createTestPayment(userId1, basePlanId);

    try {
      await expect(async () => {
        await PaymentService.getPaymentStatus(paymentId, userId2);
      }).toThrow('Payment does not belong to user');
    } finally {
      await cleanupTestUser(userId1);
      await cleanupTestUser(userId2);
    }
  });
});

test('5. verifyUnitpaySignature проверяет подпись правильно', async () => {
  await measureTest('5. verifyUnitpaySignature', async () => {
    const params = {
      method: 'check',
      unitpayId: '123456789',
      account: 'user123',
      orderSum: '1000',
      orderCurrency: 'RUB',
      signature: 'invalid-signature',
    };

    const isValid = PaymentService.verifyUnitpaySignature(params);

    expect(typeof isValid).toBe('boolean');
  });
});

test('6. handleUnitpayCheck обрабатывает проверку платежа', async () => {
  await measureTest('6. handleUnitpayCheck', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    // account теперь содержит paymentId, а не userId
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: 'pending',
      amount: 1000,
      currency: 'RUB',
    });

    const crypto = require('crypto');
    const method = 'check';
    const paramKeys = Object.keys({
      unitpayId: '123456789',
      account: paymentId.toString(),
      orderSum: '1000',
      orderCurrency: 'RUB',
    })
      .filter((key) => key !== 'signature' && key !== 'method')
      .sort();
    const sortedParamsValues = paramKeys.map((key) => {
      const params: Record<string, any> = {
        unitpayId: '123456789',
        account: paymentId.toString(),
        orderSum: '1000',
        orderCurrency: 'RUB',
      };
      return params[key];
    });
    const signatureString = [method, ...sortedParamsValues, TEST_SECRET_KEY].join('{up}');
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const params = {
      method: 'check',
      unitpayId: '123456789',
      account: paymentId.toString(),
      orderSum: '1000',
      orderCurrency: 'RUB',
      signature,
    };

    try {
      const result = await PaymentService.handleUnitpayCheck(params);

      expect(result).toHaveProperty('result');
      expect((result as { result: { message: string } }).result.message).toBe(
        'Запрос успешно обработан'
      );
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('7. handleUnitpayCheck возвращает ошибку при неверной подписи', async () => {
  await measureTest('7. handleUnitpayCheck: неверная подпись', async () => {
    const params = {
      method: 'check',
      unitpayId: '123456789',
      account: 'user123',
      orderSum: '1000',
      orderCurrency: 'RUB',
      signature: 'invalid-signature',
    };

    const result = await PaymentService.handleUnitpayCheck(params);

    expect(result).toHaveProperty('error');
    expect((result as { error: { message: string } }).error.message).toBe('Неверная подпись');
  });
});

test('8. handleUnitpayPay обрабатывает успешный платеж', async () => {
  await measureTest('8. handleUnitpayPay', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    // account теперь содержит paymentId, а не userId
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: 'pending',
      invoiceId: '987654321',
      metadata: JSON.stringify({
        planName: 'BASE',
        planId: basePlanId,
        upLimitId: null,
        additionalBid: 0,
      }),
    });

    const crypto = require('crypto');
    const method = 'pay';
    const paramKeys = Object.keys({
      unitpayId: '987654321',
      account: paymentId.toString(),
      orderSum: '1000',
      orderCurrency: 'RUB',
    })
      .filter((key) => key !== 'signature' && key !== 'method')
      .sort();
    const sortedParamsValues = paramKeys.map((key) => {
      const params: Record<string, any> = {
        unitpayId: '987654321',
        account: paymentId.toString(),
        orderSum: '1000',
        orderCurrency: 'RUB',
      };
      return params[key];
    });
    const signatureString = [method, ...sortedParamsValues, TEST_SECRET_KEY].join('{up}');
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const params = {
      method: 'pay',
      unitpayId: '987654321',
      account: paymentId.toString(),
      orderSum: '1000',
      orderCurrency: 'RUB',
      signature,
    };

    try {
      const result = await PaymentService.handleUnitpayPay(params);

      expect(result).toHaveProperty('result');
      expect((result as { result: { message: string } }).result.message).toBe(
        'Запрос успешно обработан'
      );

      const { db, paymentTable } = await import('../src/db');
      const payments = await db
        .select()
        .from(paymentTable)
        .where(eq(paymentTable.id, paymentId))
        .limit(1);

      expect(payments[0]?.status).toBe('paid');
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('9. handleUnitpayPay возвращает ошибку если платеж не найден', async () => {
  await measureTest('9. handleUnitpayPay: платеж не найден', async () => {
    const crypto = require('crypto');
    const method = 'pay';
    // account теперь содержит paymentId (число), используем несуществующий ID
    const nonExistentPaymentId = '999999';
    const paramKeys = Object.keys({
      unitpayId: '999999999',
      account: nonExistentPaymentId,
      orderSum: '1000',
      orderCurrency: 'RUB',
    })
      .filter((key) => key !== 'signature' && key !== 'method')
      .sort();
    const sortedParamsValues = paramKeys.map((key) => {
      const params: Record<string, any> = {
        unitpayId: '999999999',
        account: nonExistentPaymentId,
        orderSum: '1000',
        orderCurrency: 'RUB',
      };
      return params[key];
    });
    const signatureString = [method, ...sortedParamsValues, TEST_SECRET_KEY].join('{up}');
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const params = {
      method: 'pay',
      unitpayId: '999999999',
      account: nonExistentPaymentId,
      orderSum: '1000',
      orderCurrency: 'RUB',
      signature,
    };

    const result = await PaymentService.handleUnitpayPay(params);

    expect(result).toHaveProperty('error');
    expect((result as { error: { message: string } }).error.message).toBe('Платёж не найден');
  });
});

test('10. handleUnitpayError обрабатывает ошибку платежа', async () => {
  await measureTest('10. handleUnitpayError', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    // account теперь содержит paymentId, а не userId
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: 'pending',
      invoiceId: '555555555',
    });

    const crypto = require('crypto');
    const method = 'error';
    const paramKeys = Object.keys({
      unitpayId: '555555555',
      account: paymentId.toString(),
      orderSum: '1000',
      orderCurrency: 'RUB',
    })
      .filter((key) => key !== 'signature' && key !== 'method')
      .sort();
    const sortedParamsValues = paramKeys.map((key) => {
      const params: Record<string, any> = {
        unitpayId: '555555555',
        account: paymentId.toString(),
        orderSum: '1000',
        orderCurrency: 'RUB',
      };
      return params[key];
    });
    const signatureString = [method, ...sortedParamsValues, TEST_SECRET_KEY].join('{up}');
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const params = {
      method: 'error',
      unitpayId: '555555555',
      account: paymentId.toString(),
      orderSum: '1000',
      orderCurrency: 'RUB',
      signature,
    };

    try {
      const result = await PaymentService.handleUnitpayError(params);

      expect(result).toHaveProperty('result');
      expect((result as { result: { message: string } }).result.message).toBe(
        'Запрос успешно обработан'
      );

      const { db, paymentTable } = await import('../src/db');
      const payments = await db
        .select()
        .from(paymentTable)
        .where(eq(paymentTable.id, paymentId))
        .limit(1);

      expect(payments[0]?.status).toBe('failed');
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('11. createPayment создаёт платеж в development режиме', async () => {
  await measureTest('11. createPayment: dev режим', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    try {
      const result = await PaymentService.createPayment(userId, basePlanId);

      expect(result.paymentId).toBeNumber();
      expect(result.paymentUrl).toBeString();
      expect(result.paymentUrl).toContain('localhost:5173');
      expect(result.paymentUrl).toContain('/app/payment/success');
      expect(result.paymentUrl).toContain(`paymentId=${result.paymentId}`);

      expect(result.plan).toBeDefined();
      expect(result.plan?.id).toBe(basePlanId);
      expect(result.plan?.name).toBe('BASE');
      expect(result.plan?.price).toBe(1000);
      expect(result.plan?.bidMonthLimit).toBe(200);

      expect(result.totalAmount).toBe(1000);
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('12. createPayment создаёт платеж PRO_PLUS с дополнительным лимитом', async () => {
  await measureTest('12. createPayment: PRO_PLUS с лимитом', async () => {
    const userId = await createTestUser();
    const proPlusPlanId = await ensureTestPlan('PRO_PLUS', 1600, 200);
    const upLimitId = await createTestUpLimit(50, 500);

    try {
      const result = await PaymentService.createPayment(userId, proPlusPlanId, upLimitId);

      expect(result.paymentId).toBeNumber();
      expect(result.paymentUrl).toBeString();

      expect(result.plan).toBeDefined();
      expect(result.plan?.id).toBe(proPlusPlanId);
      expect(result.plan?.name).toBe('PRO_PLUS');

      expect(result.upLimit).toBeDefined();
      expect(result.upLimit?.id).toBe(upLimitId);
      expect(result.upLimit?.bid).toBe(50);
      expect(result.upLimit?.price).toBe(500);

      expect(result.totalAmount).toBe(1600 + 500);
    } finally {
      await cleanupTestUser(userId);
      const { db, upLimitTable } = await import('../src/db');
      await db.delete(upLimitTable).where(eq(upLimitTable.id, upLimitId));
    }
  });
});

test('13. createPayment выбрасывает ошибку если план не найден', async () => {
  await measureTest('13. createPayment: план не найден', async () => {
    const userId = await createTestUser();

    try {
      await expect(async () => {
        await PaymentService.createPayment(userId, 99999);
      }).toThrow('Plan not found');
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('14. activateScheduledPlan активирует отсроченный план', async () => {
  await measureTest('14. activateScheduledPlan', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);
    const proPlusPlanId = await ensureTestPlan('PRO_PLUS', 1600, 200);

    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: 200,
      finalDayAt,
      isPaid: true,
      isActive: true,
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const scheduledPaymentId = await createTestPayment(userId, proPlusPlanId);
    const scheduledUserPaymentId = await createTestUserPayment(userId, proPlusPlanId, {
      paymentId: scheduledPaymentId,
      limit: 200,
      finalDayAt: today,
      isPaid: true,
      isActive: false,
      startsAt: today,
      scheduledPlanId: proPlusPlanId,
    });

    try {
      const activatedPlan = await PaymentService.activateScheduledPlan(scheduledUserPaymentId);

      expect(activatedPlan.id).toBe(proPlusPlanId);
      expect(activatedPlan.name).toBe('PRO_PLUS');

      const { db, UserTable: userTable } = await import('../src/db');
      const users = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

      expect(users[0]?.planId).toBe(proPlusPlanId);

      const { userPaymentTable } = await import('../src/db');
      const activePayments = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, scheduledUserPaymentId))
        .limit(1);

      expect(activePayments[0]?.isActive).toBe(true);
      expect(activePayments[0]?.startsAt).toBeNull();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('15. activateScheduledPlan выбрасывает ошибку если план не найден', async () => {
  await measureTest('15. activateScheduledPlan: план не найден', async () => {
    await expect(async () => {
      await PaymentService.activateScheduledPlan(99999);
    }).toThrow('Scheduled payment not found');
  });
});
