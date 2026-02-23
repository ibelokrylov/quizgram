// Утилита для проверки подключения к базе данных при старте приложения
// Выполняет простой SQL запрос для проверки доступности БД

import { logger } from './logger';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Проверяет подключение к базе данных
 * Выполняет простой SQL запрос SELECT 1 для проверки доступности БД
 *
 * @param retries - Количество попыток подключения (по умолчанию 3)
 * @param retryDelay - Задержка между попытками в миллисекундах (по умолчанию 1000)
 * @throws {Error} Если подключение не удалось после всех попыток
 */
export async function checkDatabaseConnection(
  retries: number = 3,
  retryDelay: number = 1000
): Promise<void> {
  const env = typeof Bun !== 'undefined' ? Bun.env : process.env;
  const dbHost = env.POSTGRES_HOST || env.DATABASE_URL?.match(/@([^:]+)/)?.[1] || 'unknown';
  const dbName = env.POSTGRES_DB || env.DATABASE_URL?.match(/\/([^?]+)/)?.[1] || 'unknown';

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Проверка подключения к БД (попытка ${attempt}/${retries})`, {
        host: dbHost,
        database: dbName,
      });

      // Получаем экземпляр БД (это создаст подключение, если его еще нет)
      const db = getDb();

      // Выполняем простой запрос для проверки подключения
      // Используем sql template literal для выполнения SELECT 1
      const result = await db.execute(sql`SELECT 1 as test`);

      // Проверяем, что результат получен и является массивом
      // В Drizzle ORM с postgres.js результат db.execute - это массив объектов
      if (Array.isArray(result) && result.length > 0) {
        logger.info('✅ Подключение к БД успешно установлено', {
          host: dbHost,
          database: dbName,
        });
        return; // Успешное подключение
      } else {
        throw new Error('Запрос выполнен, но результат пуст или имеет неверный формат');
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message.toLowerCase();
      let errorType = 'Неизвестная ошибка';

      if (errorMessage.includes('connect') || errorMessage.includes('connection')) {
        errorType = 'Ошибка подключения';
      } else if (errorMessage.includes('timeout')) {
        errorType = 'Таймаут подключения';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
        errorType = 'Ошибка аутентификации';
      } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
        errorType = 'База данных не существует';
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        errorType = 'Ошибка доступа';
      }

      logger.warn(`❌ Попытка ${attempt}/${retries} не удалась`, {
        error: errorType,
        message: lastError.message,
        host: dbHost,
        database: dbName,
      });

      // Если это не последняя попытка, ждем перед следующей попыткой
      if (attempt < retries) {
        logger.info(`Повторная попытка через ${retryDelay}мс...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Если все попытки не удались, логируем детальную ошибку и завершаем процесс
  logger.error('❌ Не удалось подключиться к базе данных после всех попыток', lastError, {
    host: dbHost,
    database: dbName,
    attempts: retries,
  });

  // Выбрасываем ошибку с детальной информацией
  throw new Error(
    `Не удалось подключиться к базе данных после ${retries} попыток. ` +
      `Хост: ${dbHost}, База данных: ${dbName}. ` +
      `Последняя ошибка: ${lastError?.message || 'Неизвестная ошибка'}`
  );
}
