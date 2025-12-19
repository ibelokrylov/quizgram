import { logger } from '../../lib/logger';
import { SchedulerService } from './service';

/**
 * Запускает scheduler для обработки незавершенных заявок и платежей
 * - Обработка незавершенных заявок: каждую 1 минуту
 * - Обработка платежей: каждый день в 00:00:00
 */
export function startScheduler() {
  const BIDS_INTERVAL_MS = 1 * 60 * 1000; // 1 минута
  const PAYMENTS_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Проверяем каждый час, чтобы не пропустить 00:00:00

  logger.info("Scheduler запущен", {
    tasks: [
      { name: "Обработка незавершенных заявок", interval: "1 минута" },
      { name: "Обработка платежей", schedule: "каждый день в 00:00:00" },
    ],
  });

  // Выполняем обработку незавершенных заявок сразу при запуске
  SchedulerService.processIncompleteBids().catch((error) => {
    logger.error("Ошибка при первом запуске scheduler (заявки)", error as Error);
  });

  // Затем выполняем обработку незавершенных заявок каждую 1 минуту
  const bidsIntervalId = setInterval(() => {
    SchedulerService.processIncompleteBids().catch((error) => {
      logger.error("Ошибка при выполнении scheduler (заявки)", error as Error);
    });
  }, BIDS_INTERVAL_MS);

  // Функция для проверки и запуска обработки платежей
  const checkAndRunPayments = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Проверяем, наступило ли время 00:00:00 (с небольшой погрешностью до 5 минут)
    if (hours === 0 && minutes < 5) {
      logger.info("Запуск обработки платежей", {
        time: now.toISOString(),
      });

      SchedulerService.processPayments().catch((error) => {
        logger.error("Ошибка при выполнении scheduler (платежи)", error as Error);
      });
    }
  };

  // Выполняем проверку сразу при запуске (на случай если сервер запустился в 00:00:00)
  checkAndRunPayments();

  // Затем проверяем каждый час
  const paymentsIntervalId = setInterval(() => {
    checkAndRunPayments();
  }, PAYMENTS_CHECK_INTERVAL_MS);

  // Не держим процесс живым только из-за таймера scheduler
  // В Node.js/Bun у таймера есть метод unref, но его может не быть в типах
  // @ts-ignore
  if (typeof bidsIntervalId.unref === "function") {
    // @ts-ignore
    bidsIntervalId.unref();
  }
  // @ts-ignore
  if (typeof paymentsIntervalId.unref === "function") {
    // @ts-ignore
    paymentsIntervalId.unref();
  }

  // Обработка завершения процесса
  if (typeof process !== 'undefined') {
    process.on('SIGINT', () => {
      logger.info("Остановка scheduler");
      clearInterval(bidsIntervalId);
      clearInterval(paymentsIntervalId);
    });

    process.on('SIGTERM', () => {
      logger.info("Остановка scheduler");
      clearInterval(bidsIntervalId);
      clearInterval(paymentsIntervalId);
    });
  }

  return { bidsIntervalId, paymentsIntervalId };
}
