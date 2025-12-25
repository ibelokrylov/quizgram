import { logger } from '../../lib/logger';

/**
 * Запускает scheduler для обработки незавершенных заявок
 * 
 * Примечание: Все задачи scheduler теперь запускаются через @elysiajs/cron в Elysia app:
 * - Обработка незавершенных заявок: каждую 1 минуту (cron: каждую минуту)
 * - Обработка платежей: каждые 20 минут в период 00:00-02:00 (cron: 0,20,40 0-1 * * * и 0 2 * * *)
 * 
 * Эта функция оставлена для совместимости, но больше не выполняет никаких действий.
 * Все cron jobs настраиваются в src/index.ts
 */
export function startScheduler() {
  logger.info("Scheduler настроен через @elysiajs/cron", {
    tasks: [
      { name: "Обработка незавершенных заявок", schedule: "каждую 1 минуту (cron: каждую минуту)" },
      { name: "Обработка платежей", schedule: "каждые 20 минут в период 00:00-02:00 (cron: 0,20,40 0-1 * * * и 0 2 * * *)" },
    ],
  });
}

/**
 * Останавливает scheduler и очищает все интервалы
 * 
 * Примечание: Остановка cron jobs теперь выполняется через store в graceful shutdown.
 * Эта функция оставлена для совместимости, но больше не выполняет никаких действий.
 */
export async function stopScheduler(): Promise<void> {
  logger.info("Scheduler остановка выполняется через graceful shutdown (cron jobs останавливаются через store)");
}
