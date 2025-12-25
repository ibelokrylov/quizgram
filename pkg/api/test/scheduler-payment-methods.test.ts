// Тесты для обработки различных способов оплаты в scheduler

import { afterAll, expect, spyOn, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db, userPaymentTable, userTable } from "../src/db";
import { SchedulerService } from "../src/modules/scheduler/service";
import { MailService } from "../src/services/mail.service";
import {
  cleanupTestUser,
  createTestPayment,
  createTestUser,
  createTestUserPayment,
  ensureTestPlan,
  getPlanByName
} from "./utils/test-db";
import { TestLogger } from "./utils/test-logger";

const logger = new TestLogger("scheduler-payment-methods");

// Вспомогательная функция для измерения времени выполнения теста
async function measureTest<T>(
  testName: string,
  testFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await testFn();
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

test("1. Обработка crypto_pay: создание платежа и отправка письма со ссылкой", async () => {
  await measureTest("1. Обработка crypto_pay: создание платежа и отправка письма со ссылкой", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера (подписка истекла)
    finalDayAt.setHours(12, 0, 0, 0);

    // Создаём платёж, чтобы scheduler знал что нужно обработать crypto_pay
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: "pending",
      method: "crypto_pay",
      invoiceUrl: "https://pay.crypto-pay.com/test-invoice-new",
    });

    // Создаём user_payment с paymentId
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      finalDayAt,
      extended: true,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      paymentId,
      paymentAttempts: 0,
      maxPaymentAttempts: 7,
    });

    try {
      // Мокируем отправку письма
      const sendPaymentReminderSpy = spyOn(MailService, "sendPaymentReminder");
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      // Запускаем обработку платежей
      await SchedulerService.processPayments();

      // Проверяем, что письмо было отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(1);

      // Проверяем, что в вызов передана ссылка на оплату (3-й параметр)
      const callArgs = sendPaymentReminderSpy.mock.calls[0];
      expect(callArgs[2]).toBeDefined(); // invoiceUrl
      expect(typeof callArgs[2]).toBe("string");

      // Проверяем, что user_payment обновился
      const updatedPayment = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      expect(updatedPayment[0].paymentAttempts).toBe(1);
      expect(updatedPayment[0].lastPaymentAttemptAt).not.toBeNull();
      expect(updatedPayment[0].paymentId).toBe(paymentId); // Платёж уже существовал

      logger.logResult({
        testName: "1. Обработка crypto_pay: создание платежа и отправка письма со ссылкой",
        status: "passed",
        duration: 0,
        data: {
          userId,
          paymentAttempts: updatedPayment[0].paymentAttempts,
          paymentId: updatedPayment[0].paymentId,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("2. Обработка crypto_pay: повторная отправка письма при существующем платеже", async () => {
  await measureTest("2. Обработка crypto_pay: повторная отправка письма при существующем платеже", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера
    finalDayAt.setHours(12, 0, 0, 0);

    // Создаём платёж заранее
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: "pending",
      method: "crypto_pay",
      invoiceUrl: "https://pay.crypto-pay.com/test-invoice-123",
    });

    // Создаём user_payment с существующим платежом
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      finalDayAt,
      extended: true,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      paymentId,
      paymentAttempts: 1, // Уже была одна попытка
      maxPaymentAttempts: 7,
    });

    try {
      const sendPaymentReminderSpy = spyOn(MailService, "sendPaymentReminder");
      sendPaymentReminderSpy.mockResolvedValue(undefined);

      await SchedulerService.processPayments();

      // Проверяем, что письмо было отправлено
      expect(sendPaymentReminderSpy).toHaveBeenCalledTimes(1);

      // Проверяем, что счётчик попыток увеличился
      const updatedPayment = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      expect(updatedPayment[0].paymentAttempts).toBe(2);

      logger.logResult({
        testName: "2. Обработка crypto_pay: повторная отправка письма при существующем платеже",
        status: "passed",
        duration: 0,
        data: {
          userId,
          paymentAttempts: updatedPayment[0].paymentAttempts,
        },
      });

      sendPaymentReminderSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("3. Перевод на FREE план после превышения максимального количества попыток (crypto_pay)", async () => {
  await measureTest("3. Перевод на FREE план после превышения максимального количества попыток (crypto_pay)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);
    const freePlanId = await ensureTestPlan("FREE", 0, 10);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера
    finalDayAt.setHours(12, 0, 0, 0);

    // Создаём платёж для crypto_pay
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: "pending",
      method: "crypto_pay",
    });

    // Создаём user_payment с максимальным количеством попыток
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      finalDayAt,
      extended: true,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      paymentId,
      paymentAttempts: 7, // Максимум достигнут
      maxPaymentAttempts: 7,
    });

    // Устанавливаем пользователю платный план
    await db
      .update(userTable)
      .set({ planId: basePlanId })
      .where(eq(userTable.id, userId));

    try {
      const sendPlanExpirationNoticeSpy = spyOn(MailService, "sendPlanExpirationNotice");
      sendPlanExpirationNoticeSpy.mockResolvedValue(undefined);

      await SchedulerService.processPayments();

      // Проверяем, что письмо было отправлено
      expect(sendPlanExpirationNoticeSpy).toHaveBeenCalledTimes(1);

      // Проверяем, что user_payment деактивирован
      const updatedPayment = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      expect(updatedPayment[0].isActive).toBe(false);

      // Проверяем, что пользователь переведён на FREE план
      const user = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      expect(user[0].planId).toBe(freePlanId);

      logger.logResult({
        testName: "3. Перевод на FREE план после превышения максимального количества попыток (crypto_pay)",
        status: "passed",
        duration: 0,
        data: {
          userId,
          oldPlanId: basePlanId,
          newPlanId: user[0].planId,
          userPaymentActive: updatedPayment[0].isActive,
        },
      });

      sendPlanExpirationNoticeSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("4. Обработка card: попытка списания средств (неудачная)", async () => {
  await measureTest("4. Обработка card: попытка списания средств (неудачная)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера
    finalDayAt.setHours(12, 0, 0, 0);

    // Создаём платёж со способом оплаты "card"
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: "pending",
      method: "card",
    });

    // Создаём user_payment с paymentId
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      finalDayAt,
      extended: true,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      paymentId,
      paymentAttempts: 0,
      maxPaymentAttempts: 7,
    });

    try {
      // В тестах пропускаем проверку временных рамок (skipTimeCheck=true)
      await SchedulerService.processPayments(true);

      // Проверяем, что счётчик попыток увеличился
      const updatedPayment = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      expect(updatedPayment[0].paymentAttempts).toBe(1);
      expect(updatedPayment[0].lastPaymentAttemptAt).not.toBeNull();

      // Проверяем, что подписка НЕ продлена (так как оплата не прошла)
      expect(updatedPayment[0].isActive).toBe(true); // Остаётся активной до превышения лимита попыток

      logger.logResult({
        testName: "4. Обработка card: попытка списания средств (неудачная)",
        status: "passed",
        duration: 0,
        data: {
          userId,
          paymentAttempts: updatedPayment[0].paymentAttempts,
          paymentMethod: "card",
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("5. Перевод на FREE план после превышения максимального количества попыток (card)", async () => {
  await measureTest("5. Перевод на FREE план после превышения максимального количества попыток (card)", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);
    const freePlanId = await ensureTestPlan("FREE", 0, 10);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера
    finalDayAt.setHours(12, 0, 0, 0);

    // Создаём платёж со способом оплаты "card"
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: "pending",
      method: "card",
    });

    // Создаём user_payment с максимальным количеством попыток
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      finalDayAt,
      extended: true,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      paymentId,
      paymentAttempts: 7, // Максимум достигнут
      maxPaymentAttempts: 7,
    });

    // Устанавливаем пользователю платный план
    await db
      .update(userTable)
      .set({ planId: basePlanId })
      .where(eq(userTable.id, userId));

    try {
      const sendPlanExpirationNoticeSpy = spyOn(MailService, "sendPlanExpirationNotice");
      sendPlanExpirationNoticeSpy.mockResolvedValue(undefined);

      await SchedulerService.processPayments();

      // Проверяем, что письмо было отправлено
      expect(sendPlanExpirationNoticeSpy).toHaveBeenCalledTimes(1);

      // Проверяем, что user_payment деактивирован
      const updatedPayment = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      expect(updatedPayment[0].isActive).toBe(false);

      // Проверяем, что пользователь переведён на FREE план
      const user = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      expect(user[0].planId).toBe(freePlanId);

      logger.logResult({
        testName: "5. Перевод на FREE план после превышения максимального количества попыток (card)",
        status: "passed",
        duration: 0,
        data: {
          userId,
          oldPlanId: basePlanId,
          newPlanId: user[0].planId,
          paymentMethod: "card",
        },
      });

      sendPlanExpirationNoticeSpy.mockRestore();
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test("6. Пропуск попытки списания card вне временных рамок 00:00-02:00", async () => {
  await measureTest("6. Пропуск попытки списания card вне временных рамок", async () => {
    const userId = await createTestUser();
    const basePlanId = await ensureTestPlan("BASE", 900, 100);

    // Получаем реальные значения плана из БД
    const basePlan = await getPlanByName("BASE");
    if (!basePlan) {
      throw new Error("План BASE не найден в БД");
    }

    const finalDayAt = new Date();
    finalDayAt.setDate(finalDayAt.getDate() - 1); // Вчера
    finalDayAt.setHours(12, 0, 0, 0);

    // Создаём платёж со способом оплаты "card"
    const paymentId = await createTestPayment(userId, basePlanId, {
      status: "pending",
      method: "card",
    });

    // Создаём user_payment с paymentId
    const userPaymentId = await createTestUserPayment(userId, basePlanId, {
      finalDayAt,
      extended: true,
      limit: basePlan.bidMonthLimit, // Используем значение из БД
      paymentId,
      paymentAttempts: 0,
      maxPaymentAttempts: 7,
    });

    try {
      // Запускаем обработку БЕЗ пропуска проверки времени (skipTimeCheck=false)
      // Это должно пропустить попытку списания, если текущее время вне рамок 00:00-02:00
      await SchedulerService.processPayments(false);

      // Проверяем, что счётчик попыток НЕ увеличился (если время вне рамок)
      // или увеличился (если время в рамках)
      const updatedPayment = await db
        .select()
        .from(userPaymentTable)
        .where(eq(userPaymentTable.id, userPaymentId))
        .limit(1);

      // Получаем текущий час для проверки
      const now = new Date();
      const currentHour = now.getHours();
      const isWithinWindow = currentHour >= 0 && currentHour < 2;

      if (isWithinWindow) {
        // Если время в рамках, попытка должна была произойти
        expect(updatedPayment[0].paymentAttempts).toBe(1);
        expect(updatedPayment[0].lastPaymentAttemptAt).not.toBeNull();
      } else {
        // Если время вне рамок, попытка должна быть пропущена
        expect(updatedPayment[0].paymentAttempts).toBe(0);
        expect(updatedPayment[0].lastPaymentAttemptAt).toBeNull();
      }

      logger.logResult({
        testName: "6. Пропуск попытки списания card вне временных рамок",
        status: "passed",
        duration: 0,
        data: {
          userId,
          paymentAttempts: updatedPayment[0].paymentAttempts,
          currentHour,
          isWithinWindow,
          paymentMethod: "card",
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

afterAll(async () => {
  // Очищаем всех оставшихся тестовых пользователей
  const { cleanupAllTestUsers } = await import("./utils/test-db");
  await cleanupAllTestUsers();
});
