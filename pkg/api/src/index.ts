import { cors } from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { serverTiming } from "@elysiajs/server-timing";
import { Elysia } from "elysia";
import { checkDatabaseConnection } from "./lib/db-check";
import { checkRequiredEnvVars } from "./lib/env-check";
import { logger } from "./lib/logger";
import { auth } from "./modules/auth";
import { bids } from "./modules/bids";
import { payment } from "./modules/payment";
import { publicModule } from "./modules/public";
import { quiz } from "./modules/quiz";
import { SchedulerService } from "./modules/scheduler/service";
import { statistics } from "./modules/statistics";
import { telegram } from "./modules/telegram";
import { user } from "./modules/user";
import { BackupDbService } from "./services/backup-db.service";
import { BackupLogService } from "./services/backup-log.service";
import { PlanService } from "./services/plan.service";
import {
  initTelegramBotsOnStartup,
  stopTelegramBots,
} from "./services/quiz-bot.service";

// Храним сервер и приложение для возможности graceful shutdown
let server: ReturnType<typeof Elysia.prototype.listen>["server"] | null = null;
let appInstance: any = null;
// Храним интервалы scheduler для development режима
let schedulerIntervals: {
  processIncompleteBids?: ReturnType<typeof setInterval>;
  processPayments?: ReturnType<typeof setInterval>;
} | null = null;

// Главная функция запуска приложения
// Проверяет переменные окружения и подключение к БД перед запуском сервера
async function startApp() {
  // Проверка обязательных переменных окружения перед запуском приложения
  // Если переменные отсутствуют, приложение завершится с ошибкой
  try {
    checkRequiredEnvVars();
  } catch (error) {
    logger.error(
      "Критическая ошибка: не удалось проверить переменные окружения",
      error instanceof Error ? error : new Error(String(error)),
    );
    process.exit(1);
  }

  // Проверка подключения к базе данных перед запуском приложения
  // Если подключение не удалось, приложение завершится с ошибкой
  try {
    await checkDatabaseConnection();
  } catch (error) {
    logger.error(
      "Критическая ошибка: не удалось подключиться к базе данных",
      error instanceof Error ? error : new Error(String(error)),
    );
    process.exit(1);
  }

  // Инициализация планов при запуске приложения
  PlanService.scanPlanAndCreate().catch((error) => {
    logger.error(
      "Ошибка при инициализации планов",
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  // Явная инициализация Telegram‑ботов при старте API
  initTelegramBotsOnStartup();

  // Определяем окружение
  const env = typeof Bun !== "undefined" ? Bun.env : process.env;
  const isDevelopment = env.ENV !== "production";

  // Настраиваем HTTPS если указаны сертификаты
  const httpsCertPath = env.HTTPS_CERT;
  const httpsKeyPath = env.HTTPS_KEY;
  const httpsPort = env.HTTPS_PORT ? parseInt(env.HTTPS_PORT, 10) : 5001;
  const httpPort = env.PORT ? parseInt(env.PORT, 10) : 5001;

  let tlsConfig: { cert: string; key: string } | undefined;
  if (httpsCertPath && httpsKeyPath) {
    try {
      const cert = await Bun.file(httpsCertPath).text();
      const key = await Bun.file(httpsKeyPath).text();
      tlsConfig = { cert, key };
      logger.info("HTTPS сертификаты загружены", {
        certPath: httpsCertPath,
        keyPath: httpsKeyPath,
      });
    } catch (error) {
      logger.error(
        "Ошибка при загрузке HTTPS сертификатов",
        error instanceof Error ? error : new Error(String(error)),
      );
      logger.warn("Сервер будет запущен без HTTPS");
    }
  }

  // Настраиваем CORS в зависимости от окружения
  // Читаем разрешённые URL из переменной окружения APP_URLS
  const appUrls = env.APP_URLS
    ? env.APP_URLS.split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : [];
  logger.debug("appUrls", appUrls);

  const corsConfig = {
    origin: appUrls,
    credentials: true,
  };

  // Создаём основное приложение Elysia
  const app = new Elysia()
    // Подключаем CORS перед роутами для обработки preflight запросов
    .use(cors(corsConfig))
    // Подключаем Server Timing для мониторинга производительности (только в dev режиме)
    .use(
      serverTiming({
        enabled: isDevelopment,
      }),
    );

  // Настраиваем scheduler в зависимости от окружения
  if (isDevelopment) {
    // В development используем setTimeout вместо cron
    logger.info("Scheduler настроен через setTimeout для development режима", {
      tasks: [
        {
          name: "Обработка незавершенных заявок",
          interval: "каждую 1 минуту (60000ms)",
        },
        { name: "Обработка платежей", interval: "каждые 20 минут (1200000ms)" },
      ],
    });

    // Обработка незавершенных заявок каждую 1 минуту
    const processIncompleteBidsInterval = setInterval(() => {
      logger.debug("Запуск обработки незавершенных заявок через setTimeout", {
        time: new Date().toISOString(),
      });

      SchedulerService.processIncompleteBids().catch((error) => {
        logger.error(
          "Ошибка при выполнении scheduler (заявки через setTimeout)",
          error as Error,
        );
      });
    }, 60 * 1000); // 1 минута

    // Обработка платежей каждые 20 минут
    const processPaymentsInterval = setInterval(
      () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Запускаем только в период 00:00-02:00
        if ((hours >= 0 && hours < 2) || (hours === 2 && minutes === 0)) {
          logger.info("Запуск обработки платежей через setTimeout", {
            time: now.toISOString(),
            interval: "каждые 20 минут в период 00:00-02:00",
          });

          SchedulerService.processPayments().catch((error) => {
            logger.error(
              "Ошибка при выполнении scheduler (платежи через setTimeout)",
              error as Error,
            );
          });
        } else {
          logger.debug(
            "Пропуск обработки платежей: вне временных рамок 00:00-02:00",
            {
              currentHour: hours,
              currentMinutes: minutes,
            },
          );
        }
      },
      20 * 60 * 1000,
    ); // 20 минут

    // Сохраняем интервалы для очистки при shutdown
    schedulerIntervals = {
      processIncompleteBids: processIncompleteBidsInterval,
      processPayments: processPaymentsInterval,
    };
  } else {
    // В production используем cron
    app
      // Подключаем cron для обработки незавершенных заявок каждую 1 минуту
      .use(
        cron({
          name: "processIncompleteBids",
          pattern: "*/1 * * * *", // Каждую 1 минуту
          run() {
            logger.debug("Запуск обработки незавершенных заявок через cron", {
              time: new Date().toISOString(),
            });

            SchedulerService.processIncompleteBids().catch((error) => {
              logger.error(
                "Ошибка при выполнении scheduler (заявки через cron)",
                error as Error,
              );
            });
          },
        }),
      )
      // Подключаем cron для обработки платежей каждые 20 минут в период 00:00-02:00
      // Паттерн: каждые 20 минут (0, 20, 40) в часы 0 и 1 (00:00-01:59)
      // Дополнительно запускаем в 02:00 для последней попытки
      .use(
        cron({
          name: "processPayments",
          pattern: "0,20,40 0-1 * * *", // Каждые 20 минут в часы 0 и 1 (00:00, 00:20, 00:40, 01:00, 01:20, 01:40)
          run() {
            // Проверяем, что текущее время в пределах 00:00-02:00
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Запускаем только в период 00:00-02:00
            // Разрешаем запуск до 02:00 включительно (02:00 - это последняя попытка)
            if ((hours >= 0 && hours < 2) || (hours === 2 && minutes === 0)) {
              logger.info("Запуск обработки платежей через cron", {
                time: now.toISOString(),
                pattern: "каждые 20 минут в период 00:00-02:00",
              });

              SchedulerService.processPayments().catch((error) => {
                logger.error(
                  "Ошибка при выполнении scheduler (платежи через cron)",
                  error as Error,
                );
              });
            } else {
              logger.debug(
                "Пропуск обработки платежей: вне временных рамок 00:00-02:00",
                {
                  currentHour: hours,
                  currentMinutes: minutes,
                },
              );
            }
          },
        }),
      )
      // Дополнительный cron для запуска в 02:00 (последняя попытка)
      .use(
        cron({
          name: "processPaymentsLastAttempt",
          pattern: "0 2 * * *", // Ровно в 02:00
          run() {
            logger.info(
              "Запуск обработки платежей через cron (последняя попытка в 02:00)",
              {
                time: new Date().toISOString(),
              },
            );

            SchedulerService.processPayments().catch((error) => {
              logger.error(
                "Ошибка при выполнении scheduler (платежи через cron в 02:00)",
                error as Error,
              );
            });
          },
        }),
      )
      // Бэкап логов в конце каждого дня (в 23:59)
      .use(
        cron({
          name: "backupLogs",
          pattern: "59 23 * * *", // Каждый день в 23:59
          run() {
            logger.info("Запуск бэкапа логов через cron", {
              time: new Date().toISOString(),
            });

            BackupLogService.backupYesterdayLog().catch((error) => {
              logger.error(
                "Ошибка при выполнении бэкапа логов",
                error instanceof Error ? error : new Error(String(error)),
              );
            });
          },
        }),
      )
      // Бэкап PostgreSQL каждые 2 часа
      .use(
        cron({
          name: "backupDatabase",
          pattern: "0 */2 * * *", // Каждые 2 часа (00:00, 02:00, 04:00, ...)
          run() {
            logger.info("Запуск бэкапа базы данных через cron", {
              time: new Date().toISOString(),
            });

            BackupDbService.backupDatabase().catch((error) => {
              logger.error(
                "Ошибка при выполнении бэкапа базы данных",
                error instanceof Error ? error : new Error(String(error)),
              );
            });
          },
        }),
      );
  }

  app
    // Подключаем middleware логирования
    .get("/", () => ({
      message: "BAPI - Backend API",
      version: "1.0.50",
    }))
    // Подключаем модули с префиксом /v1
    .group("/v1", (app) =>
      app
        .use(auth)
        .use(user)
        .use(quiz)
        .use(bids)
        .use(payment)
        .use(statistics)
        .use(publicModule),
    )
    // Webhook'и для Telegram ботов (без префикса /v1, так как Telegram отправляет на указанный URL)
    .use(telegram);

  // Запускаем сервер с HTTPS или HTTP
  if (tlsConfig) {
    app.listen({
      port: httpsPort,
      tls: tlsConfig,
    });
    logger.info("Сервер запущен с HTTPS", {
      port: httpsPort,
      protocol: "https",
    });
  } else {
    app.listen(httpPort);
    logger.info("Сервер запущен с HTTP", {
      port: httpPort,
      protocol: "http",
    });
  }

  // Сохраняем сервер и приложение для graceful shutdown
  server = app.server;
  appInstance = app;

  logger.info("Сервер запущен", {
    hostname: app.server?.hostname,
    port: app.server?.port,
    protocol: tlsConfig ? "https" : "http",
  });
}

/**
 * Graceful shutdown - корректное завершение всех сервисов
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Получен сигнал ${signal}, начало graceful shutdown`);

  try {
    // Останавливаем scheduler (cron jobs или setTimeout intervals)
    try {
      // В development режиме очищаем setTimeout intervals
      if (schedulerIntervals) {
        if (schedulerIntervals.processIncompleteBids) {
          clearInterval(schedulerIntervals.processIncompleteBids);
          logger.info("Scheduler interval 'processIncompleteBids' остановлен");
        }
        if (schedulerIntervals.processPayments) {
          clearInterval(schedulerIntervals.processPayments);
          logger.info("Scheduler interval 'processPayments' остановлен");
        }
      }

      // В production режиме останавливаем cron jobs
      if (appInstance) {
        const store = appInstance.store;
        if (store?.cron) {
          // Останавливаем все cron jobs
          if (store.cron.processIncompleteBids) {
            store.cron.processIncompleteBids.stop();
            logger.info("Cron job 'processIncompleteBids' остановлен");
          }
          if (store.cron.processPayments) {
            store.cron.processPayments.stop();
            logger.info("Cron job 'processPayments' остановлен");
          }
          if (store.cron.processPaymentsLastAttempt) {
            store.cron.processPaymentsLastAttempt.stop();
            logger.info("Cron job 'processPaymentsLastAttempt' остановлен");
          }
          if (store.cron.backupLogs) {
            store.cron.backupLogs.stop();
            logger.info("Cron job 'backupLogs' остановлен");
          }
          if (store.cron.backupDatabase) {
            store.cron.backupDatabase.stop();
            logger.info("Cron job 'backupDatabase' остановлен");
          }
        }
      }
    } catch (error) {
      logger.error(
        "Ошибка при остановке scheduler",
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Останавливаем Telegram ботов
    await stopTelegramBots();

    // Останавливаем HTTP сервер
    if (server) {
      server.stop(true);
      logger.info("HTTP сервер остановлен");
    }

    logger.info("Graceful shutdown завершён успешно");
    process.exit(0);
  } catch (error) {
    logger.error(
      "Ошибка при graceful shutdown",
      error instanceof Error ? error : new Error(String(error)),
    );
    process.exit(1);
  }
}

// Обработчики сигналов для graceful shutdown
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Запускаем приложение
startApp().catch((error) => {
  logger.error(
    "Критическая ошибка при запуске приложения",
    error instanceof Error ? error : new Error(String(error)),
  );
  process.exit(1);
});
