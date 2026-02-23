// Тесты для обработки платежей в scheduler

import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db, UserTable } from '../src/db';
import { SchedulerService } from '../src/modules/scheduler/service';
import { MailService } from '../src/services/mail.service';
import {
  cleanupTestUser,
  createTestPayment,
  createTestUser,
  createTestUserPayment,
  ensureTestPlan,
  getActiveUserPayment,
  getAllUserPayments,
  getPlanByName,
  getUserPlan,
} from './utils/test-db';
import { TestLogger } from './utils/test-logger';

const logger = new TestLogger('scheduler-payments');

// Вспомогательная функция для измерения времени выполнения теста
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

beforeAll(async () => {
  // Убеждаемся, что планы существуют с реальными значениями из plan.service.ts
  await ensureTestPlan('FREE', 0, 10);
  await ensureTestPlan('BASE', 900, 100);
  await ensureTestPlan('PRO_PLUS', 1600, 200);
});

afterAll(async () => {
  // Сохраняем результаты тестов
  const filepath = await logger.saveResults();
  console.log(`\n📊 Результаты тестов сохранены в: ${filepath}`);

  // Очищаем всех оставшихся тестовых пользователей
  const { cleanupAllTestUsers } = await import('./utils/test-db');
  await cleanupAllTestUsers();
});

test('1. Отправка письма за 2 дня до окончания подписки', async () => {
  await measureTest('1. Отправка письма за 2 дня', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 1000, 200);

    // Создаем дату, которая закончится через 2 дня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: 200,
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: true,
    });

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, 'sendPaymentReminder');
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что письмо было отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(1);

      const user = await db.select().from(UserTable).where(eq(UserTable.id, userId)).limit(1);

      expect(sendPaymentReminderSpy).toHaveBeenCalledWith(user[0].login, user[0].language || 'ru');

      logger.logResult({
        testName: '1. Отправка письма за 2 дня',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          planId: basePlanId,
          finalDayAt: twoDaysLater.toISOString(),
          emailSent: true,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('2. Перевод на FREE план при окончании подписки', async () => {
  await measureTest('2. Перевод на FREE план', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName('BASE');
    if (!basePlan) {
      throw new Error('План BASE не найден в БД');
    }

    // Создаем дату, которая уже закончилась (вчера)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit,
      finalDayAt: yesterday,
      isPaid: true,
      extended: true,
    });

    try {
      // Мокируем отправку письма
      const sendPlanExpirationNoticeSpy = spyOn(MailService, 'sendPlanExpirationNotice');
      sendPlanExpirationNoticeSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что план изменился на FREE
      const user = await getUserPlan(userId);
      expect(user?.name).toBe('FREE');

      // Проверяем, что старая подписка деактивирована
      const allPayments = await getAllUserPayments(userId);
      const oldPayment = allPayments.find((p) => p.id === userPaymentId);
      expect(oldPayment?.isActive).toBe(false);

      // Проверяем, что письмо о переводе на FREE было отправлено
      expect(sendPlanExpirationNoticeSpy).toHaveBeenCalledTimes(1);

      // Проверяем параметры вызова
      const callArgs = sendPlanExpirationNoticeSpy.mock.calls[0];
      expect(callArgs[3]).toBe('BASE'); // currentPlanName

      logger.logResult({
        testName: '2. Перевод на FREE план',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          oldPlanId: basePlanId,
          newPlanName: 'FREE',
          emailSent: true,
        },
      });

      sendPlanExpirationNoticeSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('3. Активация отсроченного плана в день начала (повышение)', async () => {
  await measureTest('3. Активация отсроченного плана (повышение)', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 900, 100);
    const proPlusPlanId = await ensureTestPlan('PRO_PLUS', 1600, 200);

    // Получаем реальные значения планов из БД
    const basePlan = await getPlanByName('BASE');
    const proPlusPlan = await getPlanByName('PRO_PLUS');
    if (!basePlan || !proPlusPlan) {
      throw new Error('Планы не найдены в БД');
    }

    // Создаем активный план BASE
    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit,
      finalDayAt,
      isPaid: true,
      isActive: true,
    });

    // Создаем отсроченный план PRO_PLUS, который должен начаться сегодня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const scheduledPaymentId = await createTestPayment(userId, proPlusPlanId);
    await createTestUserPayment(userId, proPlusPlanId, {
      paymentId: scheduledPaymentId,
      limit: proPlusPlan.bidMonthLimit,
      finalDayAt: today,
      isPaid: true,
      isActive: false,
      startsAt: today,
      scheduledPlanId: proPlusPlanId,
    });

    try {
      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что отсроченный план был активирован
      const userPlan = await getUserPlan(userId);
      expect(userPlan?.id).toBe(proPlusPlanId);

      // Проверяем, что старый план деактивирован
      const allPayments = await getAllUserPayments(userId);
      const oldPayment = allPayments.find((p) => p.planId === basePlanId && p.isActive === false);
      expect(oldPayment).toBeDefined();

      // Проверяем, что новый план активен
      const activePayment = await getActiveUserPayment(userId);
      expect(activePayment?.planId).toBe(proPlusPlanId);
      expect(activePayment?.isActive).toBe(true);

      logger.logResult({
        testName: '3. Активация отсроченного плана (повышение)',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          oldPlanId: basePlanId,
          newPlanId: proPlusPlanId,
          startsAt: today.toISOString(),
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('4. Активация отсроченного плана в день начала (понижение PRO_PLUS -> BASE)', async () => {
  await measureTest('4. Активация отсроченного плана (понижение)', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 900, 100);
    const proPlusPlanId = await ensureTestPlan('PRO_PLUS', 1600, 200);

    // Получаем реальные значения планов из БД
    const basePlan = await getPlanByName('BASE');
    const proPlusPlan = await getPlanByName('PRO_PLUS');
    if (!basePlan || !proPlusPlan) {
      throw new Error('Планы не найдены в БД');
    }

    // Создаем активный план PRO_PLUS
    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, proPlusPlanId);
    await createTestUserPayment(userId, proPlusPlanId, {
      paymentId,
      limit: proPlusPlan.bidMonthLimit,
      finalDayAt,
      isPaid: true,
      isActive: true,
    });

    // Создаем отсроченный план BASE, который должен начаться сегодня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const scheduledPaymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId: scheduledPaymentId,
      limit: basePlan.bidMonthLimit,
      finalDayAt: today,
      isPaid: true,
      isActive: false,
      startsAt: today,
      scheduledPlanId: basePlanId,
    });

    try {
      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что отсроченный план был активирован
      const userPlan = await getUserPlan(userId);
      expect(userPlan?.id).toBe(basePlanId);

      // Проверяем, что старый план деактивирован
      const allPayments = await getAllUserPayments(userId);
      const oldPayment = allPayments.find((p) => p.planId === proPlusPlanId && p.isActive === false);
      expect(oldPayment).toBeDefined();

      // Проверяем, что новый план активен
      const activePayment = await getActiveUserPayment(userId);
      expect(activePayment?.planId).toBe(basePlanId);
      expect(activePayment?.isActive).toBe(true);
      expect(activePayment?.startsAt).toBeNull();

      logger.logResult({
        testName: '4. Активация отсроченного плана (понижение)',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          oldPlanId: proPlusPlanId,
          newPlanId: basePlanId,
          startsAt: today.toISOString(),
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('5. НЕ изменение подписки, если она еще активна', async () => {
  await measureTest('5. НЕ изменение активной подписки', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName('BASE');
    if (!basePlan) {
      throw new Error('План BASE не найден в БД');
    }

    // Создаем дату, которая закончится через 10 дней
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tenDaysLater = new Date(today);
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    tenDaysLater.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit,
      currentLimit: 50,
      finalDayAt: tenDaysLater,
      isPaid: true,
      extended: true,
    });

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, 'sendPaymentReminder');
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что подписка НЕ была изменена
      const activePayment = await getActiveUserPayment(userId);
      expect(activePayment).not.toBeNull();

      // finalDayAt должна остаться той же
      const daysDiff = Math.abs((activePayment!.finalDayAt.getTime() - tenDaysLater.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeLessThan(1);

      // currentLimit не должен быть сброшен
      expect(activePayment?.currentLimit).toBe(50);

      // Письмо не должно быть отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(0);

      logger.logResult({
        testName: '5. НЕ изменение активной подписки',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          planId: basePlanId,
          finalDayAt: activePayment?.finalDayAt.toISOString(),
          currentLimit: activePayment?.currentLimit,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('6. Обработка нескольких пользователей одновременно', async () => {
  await measureTest('6. Обработка нескольких пользователей', async () => {
    const userId1 = await createTestUser();
    const userId2 = await createTestUser();
    const userId3 = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName('BASE');
    if (!basePlan) {
      throw new Error('План BASE не найден в БД');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Пользователь 1: подписка закончилась (перевод на FREE)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const payment1 = await createTestPayment(userId1, basePlanId);
    await createTestUserPayment(userId1, basePlanId, {
      paymentId: payment1,
      limit: basePlan.bidMonthLimit,
      finalDayAt: yesterday,
      isPaid: true,
      extended: true,
    });

    // Пользователь 2: подписка заканчивается через 2 дня (отправка письма)
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);
    const payment2 = await createTestPayment(userId2, basePlanId);
    await createTestUserPayment(userId2, basePlanId, {
      paymentId: payment2,
      limit: basePlan.bidMonthLimit,
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: true,
    });

    // Пользователь 3: активная подписка (без изменений)
    const tenDaysLater = new Date(today);
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    const payment3 = await createTestPayment(userId3, basePlanId);
    await createTestUserPayment(userId3, basePlanId, {
      paymentId: payment3,
      limit: basePlan.bidMonthLimit,
      finalDayAt: tenDaysLater,
      isPaid: true,
      extended: true,
    });

    try {
      // Мокируем отправку писем
      const sendPaymentReminderSpy = spyOn(MailService, 'sendPaymentReminder');
      sendPaymentReminderSpy.mockResolvedValue(undefined);
      const sendPlanExpirationNoticeSpy = spyOn(MailService, 'sendPlanExpirationNotice');
      sendPlanExpirationNoticeSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем пользователя 1 (перевод на FREE)
      const user1Plan = await getUserPlan(userId1);
      expect(user1Plan?.name).toBe('FREE');

      // Проверяем пользователя 2 (письмо)
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(1);

      // Проверяем пользователя 3 (без изменений)
      const activePayment3 = await getActiveUserPayment(userId3);
      const daysDiff = Math.abs((activePayment3!.finalDayAt.getTime() - tenDaysLater.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeLessThan(1);

      logger.logResult({
        testName: '6. Обработка нескольких пользователей',
        status: 'passed',
        duration: 0,
        data: {
          user1ToFree: true,
          user2EmailSent: true,
          user3Unchanged: true,
        },
      });

      sendPaymentReminderSpy.mockRestore();
      sendPlanExpirationNoticeSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId1);
      await cleanupTestUser(userId2);
      await cleanupTestUser(userId3);
    }
  });
});

test('7. НЕ отправка письма удаленному пользователю', async () => {
  await measureTest('7. НЕ отправка письма удаленному пользователю', async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan('BASE', 900, 100);

    const basePlan = await getPlanByName('BASE');
    if (!basePlan) {
      throw new Error('План BASE не найден в БД');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit,
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: true,
    });

    // Помечаем пользователя как удаленного
    await db.update(UserTable).set({ deletedAt: new Date() }).where(eq(UserTable.id, userId));

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, 'sendPaymentReminder');
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что письмо НЕ было отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(0);

      logger.logResult({
        testName: '7. НЕ отправка письма удаленному пользователю',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          deleted: true,
          emailSent: false,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('8. НЕ обработка пользователей с планом FREE', async () => {
  await measureTest('8. НЕ обработка пользователей с планом FREE', async () => {
    const userId = await createTestUser();
    const freePlanId = await ensureTestPlan('FREE', 0, 10);

    // Устанавливаем пользователю бесплатный план
    await db.update(UserTable).set({ planId: freePlanId }).where(eq(UserTable.id, userId));

    try {
      // Мокируем отправку писем
      const sendPaymentReminderSpy = spyOn(MailService, 'sendPaymentReminder');
      sendPaymentReminderSpy.mockResolvedValue(undefined);
      const sendPlanExpirationNoticeSpy = spyOn(MailService, 'sendPlanExpirationNotice');
      sendPlanExpirationNoticeSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что ничего не произошло
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(0);
      expect(sendPlanExpirationNoticeSpy).toHaveBeenCalledTimes(0);

      logger.logResult({
        testName: '8. НЕ обработка пользователей с планом FREE',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          planId: freePlanId,
          processed: false,
        },
      });

      sendPaymentReminderSpy.mockRestore();
      sendPlanExpirationNoticeSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});
