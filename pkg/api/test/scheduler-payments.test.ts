// Тесты для обработки платежей в scheduler

import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db, userTable } from "../src/db";
import { SchedulerService } from "../src/modules/scheduler/service";
import { MailService } from "../src/services/mail.service";
import {
  cleanupTestUser,
  createTestPayment,
  createTestUpLimit,
  createTestUser,
  createTestUserPayment,
  createTestUserPaymentPro,
  ensureTestPlan,
  getActiveUserPayment,
  getAllUserPayments,
  getPlanByName,
  getUserPlan,
} from "./utils/test-db";
import { TestLogger } from "./utils/test-logger";

const logger = new TestLogger("scheduler-payments");

// Вспомогательная функция для измерения времени выполнения теста
async function measureTest<T>(
  testName: string,
  testFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    logger.logResult({
      testName,
      status: "passed",
      duration,
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResult({
      testName,
      status: "failed",
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

beforeAll(async () => {
  // Убеждаемся, что планы существуют с реальными значениями из plan.service.ts
  await ensureTestPlan("FREE", 0, 10);
  await ensureTestPlan("BASE", 900, 100);
  await ensureTestPlan("PRO_PLUS", 1600, 200);
});

afterAll(async () => {
  // Сохраняем результаты тестов
  const filepath = await logger.saveResults();
  console.log(`\n📊 Результаты тестов сохранены в: ${filepath}`);

  // Очищаем всех оставшихся тестовых пользователей
  const { cleanupAllTestUsers } = await import("./utils/test-db");
  await cleanupAllTestUsers();
});

test("1. Отправка письма за 2 дня до окончания подписки (extended=true)", async () => {
  await measureTest("1. Отправка письма за 2 дня", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 1000, 200);

    // Создаем дату, которая закончится через 2 дня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0); // Середина дня

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: 200, // BASE план имеет limit 200 (bidMonthLimit)
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: true, // Важно: должен быть true для отправки письма
    });

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, "sendPaymentReminder");
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что письмо было отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(1);

      const user = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      expect(sendPaymentReminderSpy).toHaveBeenCalledWith(
        user[0].login,
        user[0].language || "ru"
      );

      logger.logResult({
        testName: "1. Отправка письма за 2 дня",
        status: "passed",
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

test("2. Отправка письма о переходе на FREE план, если extended=false", async () => {
  await measureTest("2. Отправка письма о переходе на FREE (extended=false)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    // Создаем дату, которая закончится через 2 дня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: false, // Важно: extended=false, отправляется письмо о переходе на FREE
    });

    try {
      // Мокируем отправку письма о переходе на FREE план
      const sendPlanExpirationNoticeSpy = spyOn(MailService, "sendPlanExpirationNotice");
      sendPlanExpirationNoticeSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что письмо о переходе на FREE было отправлено
      expect(sendPlanExpirationNoticeSpy).toHaveBeenCalledTimes(1);

      const user = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      // Проверяем параметры вызова
      // Сигнатура: sendPlanExpirationNotice(email, expirationDate, language, currentPlanName)
      const callArgs = sendPlanExpirationNoticeSpy.mock.calls[0];
      expect(callArgs[0]).toBe(user[0].login); // email
      expect(typeof callArgs[1]).toBe("string"); // expirationDate (форматированная дата "YYYY-MM-DD")
      expect(callArgs[2]).toBe(user[0].language || "ru"); // language
      expect(callArgs[3]).toBe("BASE"); // currentPlanName

      logger.logResult({
        testName: "2. Отправка письма о переходе на FREE (extended=false)",
        status: "passed",
        duration: 0,
        data: {
          userId,
          planId: basePlanId,
          extended: false,
          emailSent: true,
          finalDayAt: twoDaysLater.toISOString(),
        },
      });

      sendPlanExpirationNoticeSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("3. Автоматическое продление подписки после окончания", async () => {
  await measureTest("3. Автоматическое продление подписки", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
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
      currentLimit: 50, // Уже использовано 50 заявок
      finalDayAt: yesterday,
      isPaid: true,
      extended: true,
    });

    try {
      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что подписка была продлена
      const activePayment = await getActiveUserPayment(userId);
      expect(activePayment).not.toBeNull();
      expect(activePayment?.finalDayAt.getTime()).toBeGreaterThan(today.getTime());

      // Проверяем, что лимиты обновились (используем значение из БД)
      expect(activePayment?.limit).toBe(basePlan.bidMonthLimit);
      expect(activePayment?.currentLimit).toBe(0); // Сброшен
      expect(activePayment?.extended).toBe(true);
      expect(activePayment?.month).toBe(1);

      // Проверяем, что новая finalDayAt через месяц от сегодня
      const expectedFinalDay = new Date(today);
      expectedFinalDay.setMonth(expectedFinalDay.getMonth() + 1);
      expectedFinalDay.setHours(23, 59, 0, 0);

      const daysDiff = Math.abs(
        (activePayment!.finalDayAt.getTime() - expectedFinalDay.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeLessThan(1); // Разница меньше дня

      logger.logResult({
        testName: "3. Автоматическое продление подписки",
        status: "passed",
        duration: 0,
        data: {
          userId,
          planId: basePlanId,
          oldFinalDayAt: yesterday.toISOString(),
          newFinalDayAt: activePayment?.finalDayAt.toISOString(),
          limitReset: true,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("4. Активация отсроченного плана в день начала (повышение)", async () => {
  await measureTest("4. Активация отсроченного плана (повышение)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);
    const proPlusPlanId = await ensureTestPlan("PRO_PLUS", 1600, 200);

    // Получаем реальные значения планов из БД
    const basePlan = await getPlanByName("BASE");
    const proPlusPlan = await getPlanByName("PRO_PLUS");
    if (!basePlan || !proPlusPlan) {
      throw new Error("Планы не найдены в БД");
    }

    // Создаем активный план BASE (более дешевый)
    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt,
      isPaid: true,
      isActive: true, // Активный план
    });

    // Создаем отсроченный план PRO_PLUS (повышение), который должен начаться сегодня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const scheduledPaymentId = await createTestPayment(userId, proPlusPlanId);
    await createTestUserPayment(userId, proPlusPlanId, {
      paymentId: scheduledPaymentId,
      limit: proPlusPlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: today, // Не важно для отсроченного
      isPaid: true,
      isActive: false, // Неактивный (отсроченный)
      startsAt: today, // Начинается сегодня
      scheduledPlanId: proPlusPlanId,
    });

    try {
      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что отсроченный план был активирован (повышение применяется сразу)
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
        testName: "4. Активация отсроченного плана (повышение)",
        status: "passed",
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

test("4.1. Активация отсроченного плана в день начала (понижение PRO_PLUS -> BASE)", async () => {
  await measureTest("4.1. Активация отсроченного плана (понижение PRO_PLUS -> BASE)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);
    const proPlusPlanId = await ensureTestPlan("PRO_PLUS", 1600, 200);

    // Получаем реальные значения планов из БД
    const basePlan = await getPlanByName("BASE");
    const proPlusPlan = await getPlanByName("PRO_PLUS");
    if (!basePlan || !proPlusPlan) {
      throw new Error("Планы не найдены в БД");
    }

    // Создаем активный план PRO_PLUS (более дорогой)
    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, proPlusPlanId);
    await createTestUserPayment(userId, proPlusPlanId, {
      paymentId,
      limit: proPlusPlan.bidMonthLimit, // Используем значение из БД
      finalDayAt,
      isPaid: true,
      isActive: true, // Активный план
    });

    // Создаем отсроченный план BASE (понижение), который должен начаться сегодня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const scheduledPaymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId: scheduledPaymentId,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: today, // Не важно для отсроченного
      isPaid: true,
      isActive: false, // Неактивный (отсроченный)
      startsAt: today, // Начинается сегодня
      scheduledPlanId: basePlanId,
    });

    try {
      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что отсроченный план был активирован (понижение применяется в день начала)
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
      expect(activePayment?.startsAt).toBeNull(); // Должно быть очищено после активации

      logger.logResult({
        testName: "4.1. Активация отсроченного плана (понижение PRO_PLUS -> BASE)",
        status: "passed",
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

test("4.2. Активация отсроченного плана в день начала (понижение BASE -> FREE)", async () => {
  await measureTest("4.2. Активация отсроченного плана (понижение BASE -> FREE)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);
    const freePlanId = await ensureTestPlan("FREE", 0, 10);

    // Получаем реальные значения планов из БД
    const basePlan = await getPlanByName("BASE");
    const freePlan = await getPlanByName("FREE");
    if (!basePlan || !freePlan) {
      throw new Error("Планы не найдены в БД");
    }

    // Создаем активный план BASE
    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt,
      isPaid: true,
      isActive: true, // Активный план
    });

    // Создаем отсроченный план FREE (понижение), который должен начаться сегодня
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    await createTestUserPayment(userId, freePlanId, {
      limit: freePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: today, // Не важно для отсроченного
      isPaid: true,
      isActive: false, // Неактивный (отсроченный)
      startsAt: today, // Начинается сегодня
      scheduledPlanId: freePlanId,
    });

    try {
      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что отсроченный план был активирован (понижение применяется в день начала)
      const userPlan = await getUserPlan(userId);
      expect(userPlan?.id).toBe(freePlanId);

      // Проверяем, что старый план деактивирован
      const allPayments = await getAllUserPayments(userId);
      const oldPayment = allPayments.find((p) => p.planId === basePlanId && p.isActive === false);
      expect(oldPayment).toBeDefined();

      // Проверяем, что новый план активен
      const activePayment = await getActiveUserPayment(userId);
      expect(activePayment?.planId).toBe(freePlanId);
      expect(activePayment?.isActive).toBe(true);
      expect(activePayment?.startsAt).toBeNull(); // Должно быть очищено после активации

      logger.logResult({
        testName: "4.2. Активация отсроченного плана (понижение BASE -> FREE)",
        status: "passed",
        duration: 0,
        data: {
          userId,
          oldPlanId: basePlanId,
          newPlanId: freePlanId,
          startsAt: today.toISOString(),
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("5. НЕ продление подписки, если она еще не закончилась", async () => {
  await measureTest("5. НЕ продление активной подписки", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
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
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      currentLimit: 50,
      finalDayAt: tenDaysLater,
      isPaid: true,
      extended: true,
    });

    try {
      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что подписка НЕ была изменена
      const activePayment = await getActiveUserPayment(userId);
      expect(activePayment).not.toBeNull();

      // finalDayAt должна остаться той же
      const daysDiff = Math.abs(
        (activePayment!.finalDayAt.getTime() - tenDaysLater.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeLessThan(1);

      // currentLimit не должен быть сброшен
      expect(activePayment?.currentLimit).toBe(50);

      logger.logResult({
        testName: "5. НЕ продление активной подписки",
        status: "passed",
        duration: 0,
        data: {
          userId,
          planId: basePlanId,
          finalDayAt: activePayment?.finalDayAt.toISOString(),
          currentLimit: activePayment?.currentLimit,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("6. Обработка нескольких пользователей одновременно", async () => {
  await measureTest("6. Обработка нескольких пользователей", async () => {
    const userId1 = await createTestUser();
    const userId2 = await createTestUser();
    const userId3 = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Пользователь 1: подписка закончилась (нужно продлить автоматически)
    // Без paymentId - используется старая логика автоматического продления
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    await createTestUserPayment(userId1, basePlanId, {
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: yesterday,
      isPaid: true,
      extended: true,
    });

    // Пользователь 2: подписка заканчивается через 2 дня (нужно отправить письмо)
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);
    const payment2 = await createTestPayment(userId2, basePlanId);
    await createTestUserPayment(userId2, basePlanId, {
      paymentId: payment2,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: true,
    });

    // Пользователь 3: активная подписка (ничего не делать)
    const tenDaysLater = new Date(today);
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    const payment3 = await createTestPayment(userId3, basePlanId);
    await createTestUserPayment(userId3, basePlanId, {
      paymentId: payment3,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: tenDaysLater,
      isPaid: true,
      extended: true,
    });

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, "sendPaymentReminder");
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем пользователя 1 (продление)
      const activePayment1 = await getActiveUserPayment(userId1);
      expect(activePayment1?.finalDayAt.getTime()).toBeGreaterThan(today.getTime());
      expect(activePayment1?.currentLimit).toBe(0);
      expect(activePayment1?.limit).toBe(basePlan.bidMonthLimit); // Лимит из плана BASE из БД

      // Проверяем пользователя 2 (письмо)
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(1);

      // Проверяем пользователя 3 (без изменений)
      const activePayment3 = await getActiveUserPayment(userId3);
      const daysDiff = Math.abs(
        (activePayment3!.finalDayAt.getTime() - tenDaysLater.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeLessThan(1);

      logger.logResult({
        testName: "6. Обработка нескольких пользователей",
        status: "passed",
        duration: 0,
        data: {
          user1Extended: true,
          user2EmailSent: true,
          user3Unchanged: true,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId1);
      await cleanupTestUser(userId2);
      await cleanupTestUser(userId3);
    }
  });
});

test("7. НЕ отправка письма удаленному пользователю", async () => {
  await measureTest("7. НЕ отправка письма удаленному пользователю", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);

    const paymentId = await createTestPayment(userId, basePlanId);
    await createTestUserPayment(userId, basePlanId, {
      paymentId,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      finalDayAt: twoDaysLater,
      isPaid: true,
      extended: true,
    });

    // Помечаем пользователя как удаленного
    await db
      .update(userTable)
      .set({ deletedAt: new Date() })
      .where(eq(userTable.id, userId));

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, "sendPaymentReminder");
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что письмо НЕ было отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(0);

      logger.logResult({
        testName: "7. НЕ отправка письма удаленному пользователю",
        status: "passed",
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

test("8. НЕ обработка бесплатного плана", async () => {
  await measureTest("8. НЕ обработка бесплатного плана", async () => {
    const userId = await createTestUser();
    const freePlanId = await ensureTestPlan("FREE", 0, 10);

    // Устанавливаем пользователю бесплатный план
    await db
      .update(userTable)
      .set({ planId: freePlanId })
      .where(eq(userTable.id, userId));

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, "sendPaymentReminder");
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что ничего не произошло
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(0);

      logger.logResult({
        testName: "8. НЕ обработка бесплатного плана",
        status: "passed",
        duration: 0,
        data: {
          userId,
          planId: freePlanId,
          processed: false,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("9. Установка правильного лимита для Pro+ с дополнительным лимитом", async () => {
  await measureTest("9. Установка правильного лимита для Pro+ с дополнительным лимитом", async () => {
    const userId = await createTestUser();
    const proPlusPlanId = await ensureTestPlan("PRO_PLUS", 1600, 200);

    // Получаем реальные значения плана из БД
    const proPlusPlan = await getPlanByName("PRO_PLUS");
    if (!proPlusPlan) {
      throw new Error("План PRO_PLUS не найден в БД");
    }

    // Создаём дополнительный лимит +500
    const upLimitId = await createTestUpLimit(500, 500);
    const additionalLimit = 500; // Дополнительный лимит из upLimit

    // Создаём user_payment_pro для пользователя
    await createTestUserPaymentPro(userId, upLimitId);

    // Устанавливаем пользователю план PRO_PLUS
    await db
      .update(userTable)
      .set({ planId: proPlusPlanId })
      .where(eq(userTable.id, userId));

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера (подписка уже истекла)
    finalDayAt.setHours(12, 0, 0, 0);

    const expectedTotalLimit = proPlusPlan.bidMonthLimit + additionalLimit; // 200 + 500 = 700

    await createTestUserPayment(userId, proPlusPlanId, {
      finalDayAt,
      extended: true,
      limit: expectedTotalLimit, // Базовый лимит из БД + дополнительный
      currentLimit: 200, // Использовано 200
    });

    try {
      // Запускаем обработку платежей (в тестах пропускаем проверку временных рамок)
      await SchedulerService.processPayments(true);

      // Проверяем, что подписка продлилась
      const updatedPayment = await getActiveUserPayment(userId);
      expect(updatedPayment).not.toBeNull();
      expect(updatedPayment!.limit).toBe(expectedTotalLimit); // Должен восстановиться базовый лимит из БД + дополнительный
      expect(updatedPayment!.currentLimit).toBe(0); // Лимит должен сброситься

      // Проверяем, что finalDayAt обновился (продлён на месяц)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const expectedFinalDay = new Date(today);
      expectedFinalDay.setMonth(expectedFinalDay.getMonth() + 1);
      expectedFinalDay.setHours(23, 59, 0, 0);

      const daysDiff = Math.abs(
        (updatedPayment!.finalDayAt.getTime() - expectedFinalDay.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeLessThan(1); // Разница меньше дня

      logger.logResult({
        testName: "9. Установка правильного лимита для Pro+ с дополнительным лимитом",
        status: "passed",
        duration: 0,
        data: {
          userId,
          planId: proPlusPlanId,
          baseLimit: proPlusPlan.bidMonthLimit,
          additionalLimit: additionalLimit,
          totalLimit: updatedPayment!.limit,
          currentLimit: updatedPayment!.currentLimit,
          subscriptionExtended: true,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

