// Утилита для работы с тестовой БД

import { and, eq, inArray, like, sql } from "drizzle-orm";
import type { NewPayment, NewUser, NewUserPayment } from "../../src/db";
import {
  codeTable,
  db,
  paymentTable,
  planTable,
  quizBidTable,
  quizContactTable,
  quizFileTable,
  quizOpenTable,
  quizQuestionTable,
  quizTable,
  quizThxPageTable,
  upLimitTable,
  userFileTable,
  userNotificationTable,
  userPaymentProTable,
  userPaymentTable,
  userTable,
} from "../../src/db";

/**
 * Создает тестового пользователя
 */
export async function createTestUser(data?: Partial<NewUser>): Promise<number> {
  // Генерируем короткий uid (максимум 36 символов)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const uid = `t-${timestamp}-${random}`.substring(0, 36);

  const testUser: NewUser = {
    uid,
    login: `test-${Date.now()}@example.com`,
    password: "test-password-hash",
    name: "Test User",
    planId: 1, // FREE по умолчанию
    ...data,
  };

  const [user] = await db.insert(userTable).values(testUser).returning();
  return user.id;
}

/**
 * Создает тестового пользователя-администратора
 * Админ имеет расширенные права даже на FREE плане
 */
export async function createTestAdminUser(data?: Partial<NewUser>): Promise<number> {
  return createTestUser({
    isAdmin: true,
    ...data,
  });
}

/**
 * Устанавливает или снимает флаг администратора для пользователя
 */
export async function setUserAdminStatus(userId: number, isAdmin: boolean): Promise<void> {
  await db
    .update(userTable)
    .set({ isAdmin })
    .where(eq(userTable.id, userId));
}

/**
 * Создает тестовый план (если не существует)
 */
export async function ensureTestPlan(name: "FREE" | "BASE" | "PRO_PLUS", price: number, bidMonthLimit: number): Promise<number> {
  const existing = await db
    .select()
    .from(planTable)
    .where(eq(planTable.name, name))
    .limit(1);

  if (existing.length > 0) {
    const plan = existing[0];
    if (plan.price !== price || plan.bidMonthLimit !== bidMonthLimit) {
      await db
        .update(planTable)
        .set({ price, bidMonthLimit })
        .where(eq(planTable.id, plan.id));
    }
    return plan.id;
  }

  const [plan] = await db
    .insert(planTable)
    .values({
      name,
      price,
      bidMonthLimit,
    })
    .returning();

  return plan.id;
}

/**
 * Создает тестовый upLimit или обновляет существующий
 */
export async function createTestUpLimit(bid: number, price: number): Promise<number> {
  // Сначала проверяем, существует ли уже запись с таким bid (из-за UNIQUE constraint)
  const existing = await db
    .select()
    .from(upLimitTable)
    .where(eq(upLimitTable.bid, bid))
    .limit(1);

  if (existing.length > 0) {
    // Обновляем price если он отличается
    if (existing[0].price !== price) {
      await db
        .update(upLimitTable)
        .set({ price })
        .where(eq(upLimitTable.id, existing[0].id));
    }
    return existing[0].id;
  }

  // Если нет, создаём новую
  const [upLimit] = await db
    .insert(upLimitTable)
    .values({
      bid,
      price,
    })
    .returning();

  return upLimit.id;
}

/**
 * Создает тестовый user_payment
 */
export async function createTestUserPayment(
  userId: number,
  planId: number,
  data?: Partial<NewUserPayment>
): Promise<number> {
  const finalDayAt = new Date();
  finalDayAt.setMonth(finalDayAt.getMonth() + 1);
  finalDayAt.setHours(23, 59, 0, 0);

  const testPayment: NewUserPayment = {
    userId,
    planId,
    limit: 200,
    currentLimit: 0,
    finalDayAt,
    extended: true,
    month: 1,
    isActive: true,
    isPaid: true,
    ...data,
  };

  const [userPayment] = await db.insert(userPaymentTable).values(testPayment).returning();
  return userPayment.id;
}

/**
 * Создает тестовый payment
 */
export async function createTestPayment(
  userId: number,
  planId: number,
  data?: Partial<NewPayment>
): Promise<number> {
  const testPayment: NewPayment = {
    userId,
    planId,
    amount: 1000,
    currency: "USDT",
    status: "paid",
    method: "card",
    invoiceId: `test-${Date.now()}`,
    invoiceUrl: "",
    trackId: `test-track-${Date.now()}`,
    ...data,
  };

  const [payment] = await db.insert(paymentTable).values(testPayment).returning();
  return payment.id;
}

/**
 * Создает тестовый user_payment_pro (дополнительный лимит для Pro+)
 */
export async function createTestUserPaymentPro(
  userId: number,
  upLimitId: number
): Promise<number> {
  const [userPaymentPro] = await db
    .insert(userPaymentProTable)
    .values({
      userId,
      upLimitId,
    })
    .returning();

  return userPaymentPro.id;
}

/**
 * Очищает тестовые данные пользователя
 * Удаляет все связанные записи в правильном порядке (сначала дочерние, потом родительские)
 */
export async function cleanupTestUser(userId: number): Promise<void> {
  try {
    // 1. Удаляем quiz и связанные таблицы
    const userQuizzes = await db
      .select({ id: quizTable.id, uid: quizTable.uid })
      .from(quizTable)
      .where(eq(quizTable.userId, userId));

    if (userQuizzes.length > 0) {
      const quizIds = userQuizzes.map((q) => q.id);
      const quizUids = userQuizzes.map((q) => q.uid);

      // Удаляем quiz_bid (связаны через quizId)
      await db.delete(quizBidTable).where(inArray(quizBidTable.quizId, quizIds));

      // Удаляем связанные с quiz таблицы
      // quizOpenTable использует quizUid, а не quizId
      await db.delete(quizOpenTable).where(inArray(quizOpenTable.quizUid, quizUids));
      await db.delete(quizQuestionTable).where(inArray(quizQuestionTable.quizId, quizIds));
      await db.delete(quizThxPageTable).where(inArray(quizThxPageTable.quizId, quizIds));
      await db.delete(quizContactTable).where(inArray(quizContactTable.quizId, quizIds));
      await db.delete(quizFileTable).where(inArray(quizFileTable.quizId, quizIds));

      // Удаляем сами quiz
      await db.delete(quizTable).where(eq(quizTable.userId, userId));
    }

    // 2. Удаляем code
    await db.delete(codeTable).where(eq(codeTable.userId, userId));

    // 3. Удаляем user_file
    await db.delete(userFileTable).where(eq(userFileTable.userId, userId));

    // 4. Удаляем user_notification
    await db.delete(userNotificationTable).where(eq(userNotificationTable.userId, userId));

    // 5. Удаляем user_payment_pro
    await db.delete(userPaymentProTable).where(eq(userPaymentProTable.userId, userId));

    // 6. Удаляем user_payment
    await db.delete(userPaymentTable).where(eq(userPaymentTable.userId, userId));

    // 7. Удаляем payments
    await db.delete(paymentTable).where(eq(paymentTable.userId, userId));

    // 8. Обнуляем referralId у других пользователей, которые ссылаются на этого пользователя
    await db
      .update(userTable)
      .set({ referralId: null })
      .where(eq(userTable.referralId, userId));

    // 9. Удаляем пользователя
    await db.delete(userTable).where(eq(userTable.id, userId));
  } catch (error) {
    // Логируем ошибку, но не падаем - лучше оставить данные, чем упасть
    console.error(`Ошибка при очистке тестового пользователя ${userId}:`, error);
  }
}

/**
 * Удаляет всех тестовых пользователей по паттерну login
 * Используется в afterAll для очистки оставшихся тестовых данных
 */
export async function cleanupAllTestUsers(): Promise<void> {
  try {
    // Находим всех тестовых пользователей по паттерну login
    const testUsers = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(like(userTable.login, "test-%"));

    if (testUsers.length > 0) {
      console.log(`Найдено ${testUsers.length} тестовых пользователей для очистки`);

      // Удаляем каждого пользователя через cleanupTestUser
      for (const user of testUsers) {
        await cleanupTestUser(user.id);
      }

      console.log(`Очищено ${testUsers.length} тестовых пользователей`);
    }

    // Дополнительно очищаем dev-тестовые записи из payment
    // Это записи с invoice_id/track_id начинающимися с "dev-" или metadata содержащим "dev_bypass" или "test"
    const devPayments = await db
      .select({ id: paymentTable.id })
      .from(paymentTable)
      .where(
        sql`${paymentTable.invoiceId} LIKE 'dev-%' 
            OR ${paymentTable.trackId} LIKE 'dev-%' 
            OR (${paymentTable.metadata} IS NOT NULL AND ${paymentTable.metadata} LIKE '%dev_bypass%')
            OR (${paymentTable.metadata} IS NOT NULL AND ${paymentTable.metadata} LIKE '%"dev":%')
            OR (${paymentTable.metadata} IS NOT NULL AND ${paymentTable.metadata} LIKE '%test%')`
      );

    if (devPayments.length > 0) {
      console.log(`Найдено ${devPayments.length} dev-тестовых записей в payment для очистки`);

      const devPaymentIds = devPayments.map((p) => p.id);

      // Удаляем user_payment, которые ссылаются на эти payment
      if (devPaymentIds.length > 0) {
        await db
          .delete(userPaymentTable)
          .where(inArray(userPaymentTable.paymentId, devPaymentIds));

        // Удаляем сами payment записи
        await db
          .delete(paymentTable)
          .where(inArray(paymentTable.id, devPaymentIds));
      }

      console.log(`Очищено ${devPayments.length} dev-тестовых записей из payment`);
    }
  } catch (error) {
    console.error("Ошибка при очистке всех тестовых пользователей:", error);
  }
}

/**
 * Получает текущий план пользователя
 */
export async function getUserPlan(userId: number) {
  const user = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  const plan = await db
    .select()
    .from(planTable)
    .where(eq(planTable.id, user[0].planId))
    .limit(1);

  return plan[0] || null;
}

/**
 * Получает активный user_payment пользователя
 */
export async function getActiveUserPayment(userId: number) {
  const payments = await db
    .select()
    .from(userPaymentTable)
    .where(
      and(
        eq(userPaymentTable.userId, userId),
        eq(userPaymentTable.isActive, true),
      ),
    )
    .limit(1);

  return payments[0] || null;
}

/**
 * Получает все user_payment пользователя (включая неактивные)
 */
export async function getAllUserPayments(userId: number) {
  return await db
    .select()
    .from(userPaymentTable)
    .where(eq(userPaymentTable.userId, userId));
}

/**
 * Получает план из БД по имени
 */
export async function getPlanByName(name: "FREE" | "BASE" | "PRO_PLUS") {
  const plans = await db
    .select()
    .from(planTable)
    .where(eq(planTable.name, name))
    .limit(1);

  return plans[0] || null;
}

/**
 * Создает тестовый квиз
 */
export async function createTestQuiz(userId: number, data?: Partial<{
  name: string;
  isActive: boolean;
  isShowLogo: boolean;
}>): Promise<{ id: number; uid: string }> {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const uid = `tq-${timestamp}-${random}`.substring(0, 36);

  const [quiz] = await db
    .insert(quizTable)
    .values({
      uid,
      userId,
      name: data?.name ?? "Тестовый квиз",
      isActive: data?.isActive ?? true,
      isShowLogo: data?.isShowLogo ?? true,
    })
    .returning();

  return { id: quiz.id, uid: quiz.uid };
}

/**
 * Создает тестовую заявку (bid) для квиза
 */
export async function createTestBid(quizId: number, data?: Partial<{
  isFull: boolean;
  isRead: boolean;
  status: string;
  first: boolean;
  isEqualPaymentLimit: boolean;
  info: Record<string, unknown>;
  contacts: Record<string, string>;
}>): Promise<{ id: number; key: string }> {
  const [bid] = await db
    .insert(quizBidTable)
    .values({
      quizId,
      answer: { test: true },
      isFull: data?.isFull ?? true,
      isRead: data?.isRead ?? false,
      status: data?.status ?? "create",
      first: data?.first ?? false,
      isEqualPaymentLimit: data?.isEqualPaymentLimit ?? true,
      info: data?.info ?? null,
      contacts: data?.contacts ?? null,
    })
    .returning();

  return { id: bid.id, key: bid.key };
}

/**
 * Получает пользователя по ID
 */
export async function getTestUser(userId: number) {
  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return users[0] || null;
}

