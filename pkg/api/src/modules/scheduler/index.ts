import { logger } from '../../lib/logger';
import { SchedulerService } from './service';

/**
 * Запускает scheduler для обработки незавершенных заявок
 * Выполняется каждые 5 минут
 */
export function startScheduler() {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 минут

  logger.info("Scheduler запущен", {
    interval: "5 минут",
    task: "Обработка незавершенных заявок",
  });

  // Выполняем сразу при запуске
  SchedulerService.processIncompleteBids().catch((error) => {
    logger.error("Ошибка при первом запуске scheduler", error as Error);
  });

  // Затем выполняем каждые 5 минут
  const intervalId = setInterval(() => {
    SchedulerService.processIncompleteBids().catch((error) => {
      logger.error("Ошибка при выполнении scheduler", error as Error);
    });
  }, INTERVAL_MS);

  // Не держим процесс живым только из-за таймера scheduler
  // В Node.js/Bun у таймера есть метод unref, но его может не быть в типах
  // @ts-ignore
  if (typeof intervalId.unref === "function") {
    // @ts-ignore
    intervalId.unref();
  }

  // Обработка завершения процесса
  if (typeof process !== 'undefined') {
    process.on('SIGINT', () => {
      logger.info("Остановка scheduler");
      clearInterval(intervalId);
    });

    process.on('SIGTERM', () => {
      logger.info("Остановка scheduler");
      clearInterval(intervalId);
    });
  }

  return intervalId;
}
