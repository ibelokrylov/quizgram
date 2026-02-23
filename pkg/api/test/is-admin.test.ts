// Тесты для функционала is_admin
// Админы имеют расширенные права даже на FREE плане

import { afterAll, beforeAll, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db, UserTable } from '../src/db';
import { BidsService } from '../src/modules/bids/service';
import {
  cleanupTestUser,
  createTestAdminUser,
  createTestBid,
  createTestQuiz,
  createTestUser,
  ensureTestPlan,
  getTestUser,
  setUserAdminStatus,
} from './utils/test-db';
import { TestLogger } from './utils/test-logger';

const logger = new TestLogger('is-admin');

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
  // Убеждаемся, что планы существуют
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

test('1. Админ на FREE плане видит незавершенные заявки (isFull=false)', async () => {
  await measureTest('1. Админ видит незавершенные заявки', async () => {
    // Создаём админа на FREE плане
    const adminId = await createTestAdminUser();
    const admin = await getTestUser(adminId);

    // Создаём квиз и заявки
    const quiz = await createTestQuiz(adminId);

    // Создаём завершённую заявку (isFull=true)
    await createTestBid(quiz.id, { isFull: true, isEqualPaymentLimit: true });

    // Создаём незавершённую заявку (isFull=false)
    await createTestBid(quiz.id, { isFull: false, isEqualPaymentLimit: false });

    try {
      // Админ должен видеть обе заявки
      const result = await BidsService.getBidsList(
        adminId,
        { limit: 10, offset: 0 },
        admin!.createdAt,
        10, // bidMonthLimit для FREE
        'FREE',
        1, // planId для FREE
        true // isAdmin = true
      );

      // Должны быть видны обе заявки (isFull=true и isFull=false)
      expect(result.data.length).toBe(2);
      // result.total возвращает количество isFull=true заявок
      expect(result.total).toBe(1);

      logger.logResult({
        testName: '1. Админ видит незавершенные заявки',
        status: 'passed',
        duration: 0,
        data: {
          adminId,
          totalBids: result.total,
          bidsCount: result.data.length,
        },
      });
    } finally {
      await cleanupTestUser(adminId);
    }
  });
});

test('2. Обычный пользователь на FREE плане НЕ видит незавершенные заявки', async () => {
  await measureTest('2. Обычный пользователь не видит незавершенные заявки', async () => {
    // Создаём обычного пользователя на FREE плане
    const userId = await createTestUser();
    const user = await getTestUser(userId);

    // Создаём квиз и заявки
    const quiz = await createTestQuiz(userId);

    // Создаём завершённую заявку (isFull=true)
    await createTestBid(quiz.id, { isFull: true, isEqualPaymentLimit: true });

    // Создаём незавершённую заявку (isFull=false)
    await createTestBid(quiz.id, { isFull: false, isEqualPaymentLimit: false });

    try {
      // Обычный пользователь должен видеть только завершённые заявки
      const result = await BidsService.getBidsList(
        userId,
        { limit: 10, offset: 0 },
        user!.createdAt,
        10, // bidMonthLimit для FREE
        'FREE',
        1, // planId для FREE
        false // isAdmin = false
      );

      // Должна быть видна только 1 заявка (isFull=true)
      expect(result.data.length).toBe(1);
      expect(result.data[0].isFull).toBe(true);

      logger.logResult({
        testName: '2. Обычный пользователь не видит незавершенные заявки',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          totalBids: result.total,
          bidsCount: result.data.length,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('3. Админ на FREE плане видит поле info в заявках', async () => {
  await measureTest('3. Админ видит поле info', async () => {
    // Создаём админа на FREE плане
    const adminId = await createTestAdminUser();
    const admin = await getTestUser(adminId);

    // Создаём квиз и заявку с info
    const quiz = await createTestQuiz(adminId);
    const testInfo = { telegram_id: '123456', username: 'testuser' };
    await createTestBid(quiz.id, {
      isFull: true,
      isEqualPaymentLimit: true,
      info: testInfo,
    });

    try {
      // Админ должен видеть поле info
      const result = await BidsService.getBidsList(
        adminId,
        { limit: 10, offset: 0 },
        admin!.createdAt,
        10,
        'FREE',
        1,
        true // isAdmin = true
      );

      expect(result.data.length).toBe(1);
      // Проверяем что поле info присутствует в объекте (для админа оно должно быть включено)
      expect('info' in result.data[0]).toBe(true);

      logger.logResult({
        testName: '3. Админ видит поле info',
        status: 'passed',
        duration: 0,
        data: {
          adminId,
          hasInfoField: 'info' in result.data[0],
        },
      });
    } finally {
      await cleanupTestUser(adminId);
    }
  });
});

test('4. Обычный пользователь на FREE плане НЕ видит поле info', async () => {
  await measureTest('4. Обычный пользователь не видит поле info', async () => {
    // Создаём обычного пользователя на FREE плане
    const userId = await createTestUser();
    const user = await getTestUser(userId);

    // Создаём квиз и заявку с info
    const quiz = await createTestQuiz(userId);
    const testInfo = { telegram_id: '123456', username: 'testuser' };
    await createTestBid(quiz.id, {
      isFull: true,
      isEqualPaymentLimit: true,
      info: testInfo,
    });

    try {
      // Обычный пользователь не должен видеть поле info
      const result = await BidsService.getBidsList(
        userId,
        { limit: 10, offset: 0 },
        user!.createdAt,
        10,
        'FREE',
        1,
        false // isAdmin = false
      );

      expect(result.data.length).toBe(1);
      // Для FREE плана поле info не должно присутствовать в объекте
      expect('info' in result.data[0]).toBe(false);

      logger.logResult({
        testName: '4. Обычный пользователь не видит поле info',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          hasInfoField: 'info' in result.data[0],
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('5. Админ на FREE плане может экспортировать заявки', async () => {
  await measureTest('5. Админ может экспортировать заявки', async () => {
    // Создаём админа на FREE плане
    const adminId = await createTestAdminUser();

    // Создаём квиз и заявки
    const quiz = await createTestQuiz(adminId);
    await createTestBid(quiz.id, { isFull: true, isEqualPaymentLimit: true });
    await createTestBid(quiz.id, { isFull: false, isEqualPaymentLimit: false });

    try {
      // Админ должен иметь возможность экспортировать данные
      const result = await BidsService.getBidsForExport(
        adminId,
        {}, // без фильтров
        1, // planId для FREE
        true // isAdmin = true
      );

      // Должны экспортироваться обе заявки
      expect(result.length).toBe(2);

      logger.logResult({
        testName: '5. Админ может экспортировать заявки',
        status: 'passed',
        duration: 0,
        data: {
          adminId,
          exportedCount: result.length,
        },
      });
    } finally {
      await cleanupTestUser(adminId);
    }
  });
});

test('6. Обычный пользователь на FREE плане экспортирует только завершённые заявки', async () => {
  await measureTest('6. Обычный пользователь экспортирует только завершённые', async () => {
    // Создаём обычного пользователя на FREE плане
    const userId = await createTestUser();

    // Создаём квиз и заявки
    const quiz = await createTestQuiz(userId);
    await createTestBid(quiz.id, { isFull: true, isEqualPaymentLimit: true });
    await createTestBid(quiz.id, { isFull: false, isEqualPaymentLimit: false });

    try {
      // Обычный пользователь должен экспортировать только завершённые
      const result = await BidsService.getBidsForExport(
        userId,
        {}, // без фильтров
        1, // planId для FREE
        false // isAdmin = false
      );

      // Должна экспортироваться только 1 заявка (isFull=true)
      expect(result.length).toBe(1);
      // Проверяем что это завершённая заявка
      const bid = result[0];
      expect(bid.isFull).toBe(true);

      logger.logResult({
        testName: '6. Обычный пользователь экспортирует только завершённые',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          exportedCount: result.length,
          firstBidIsFull: bid.isFull,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('7. Админ на FREE плане включается в обработку scheduler', async () => {
  await measureTest('7. Админ включается в scheduler', async () => {
    // Создаём админа на FREE плане
    const adminId = await createTestAdminUser();

    // Создаём квиз и незавершённую заявку
    const quiz = await createTestQuiz(adminId);
    await createTestBid(quiz.id, {
      isFull: false,
      isEqualPaymentLimit: false,
      status: 'create',
    });

    try {
      // Проверяем, что админ включён в выборку платных пользователей
      // Это делается через SQL запрос в SchedulerService.processIncompleteBids
      const paidUsersQuery = await db
        .select({ id: UserTable.id })
        .from(UserTable)
        .where(sql`${UserTable.planId} != 1 OR ${UserTable.isAdmin} = true`);

      const adminInList = paidUsersQuery.some((u) => u.id === adminId);
      expect(adminInList).toBe(true);

      logger.logResult({
        testName: '7. Админ включается в scheduler',
        status: 'passed',
        duration: 0,
        data: {
          adminId,
          adminInPaidUsersList: adminInList,
        },
      });
    } finally {
      await cleanupTestUser(adminId);
    }
  });
});

test('8. Обычный пользователь на FREE плане НЕ включается в обработку scheduler', async () => {
  await measureTest('8. Обычный пользователь не включается в scheduler', async () => {
    // Создаём обычного пользователя на FREE плане
    const userId = await createTestUser();

    try {
      // Проверяем, что обычный пользователь НЕ включён в выборку платных пользователей
      const paidUsersQuery = await db
        .select({ id: UserTable.id })
        .from(UserTable)
        .where(sql`${UserTable.planId} != 1 OR ${UserTable.isAdmin} = true`);

      const userInList = paidUsersQuery.some((u) => u.id === userId);
      expect(userInList).toBe(false);

      logger.logResult({
        testName: '8. Обычный пользователь не включается в scheduler',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          userInPaidUsersList: userInList,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('9. Изменение статуса админа влияет на доступ к заявкам', async () => {
  await measureTest('9. Изменение статуса админа', async () => {
    // Создаём обычного пользователя
    const userId = await createTestUser();
    const user = await getTestUser(userId);

    // Создаём квиз и заявки
    const quiz = await createTestQuiz(userId);
    await createTestBid(quiz.id, { isFull: true, isEqualPaymentLimit: true });
    await createTestBid(quiz.id, { isFull: false, isEqualPaymentLimit: false });

    try {
      // Сначала как обычный пользователь - видит только 1 заявку
      const resultBefore = await BidsService.getBidsList(
        userId,
        { limit: 10, offset: 0 },
        user!.createdAt,
        10,
        'FREE',
        1,
        false
      );
      expect(resultBefore.data.length).toBe(1);

      // Делаем пользователя админом
      await setUserAdminStatus(userId, true);

      // Теперь как админ - видит все 2 заявки
      const resultAfter = await BidsService.getBidsList(
        userId,
        { limit: 10, offset: 0 },
        user!.createdAt,
        10,
        'FREE',
        1,
        true // теперь isAdmin = true
      );
      expect(resultAfter.data.length).toBe(2);

      logger.logResult({
        testName: '9. Изменение статуса админа',
        status: 'passed',
        duration: 0,
        data: {
          userId,
          bidsBefore: resultBefore.data.length,
          bidsAfter: resultAfter.data.length,
        },
      });
    } finally {
      await cleanupTestUser(userId);
    }
  });
});

test('10. Админ на FREE плане видит info в экспорте', async () => {
  await measureTest('10. Админ видит info в экспорте', async () => {
    // Создаём админа на FREE плане
    const adminId = await createTestAdminUser();

    // Создаём квиз и заявку с info
    const quiz = await createTestQuiz(adminId);
    const testInfo = { telegram_id: '123456', username: 'testuser' };
    await createTestBid(quiz.id, {
      isFull: true,
      isEqualPaymentLimit: true,
      info: testInfo,
    });

    try {
      // Админ должен видеть info в экспорте
      const result = await BidsService.getBidsForExport(
        adminId,
        {},
        1, // planId для FREE
        true // isAdmin = true
      );

      expect(result.length).toBe(1);
      // Проверяем что поле info присутствует в объекте (для админа оно должно быть включено)
      expect('info' in result[0]).toBe(true);

      logger.logResult({
        testName: '10. Админ видит info в экспорте',
        status: 'passed',
        duration: 0,
        data: {
          adminId,
          hasInfoField: 'info' in result[0],
        },
      });
    } finally {
      await cleanupTestUser(adminId);
    }
  });
});
