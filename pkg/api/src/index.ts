import { cors } from '@elysiajs/cors';
import { Elysia } from "elysia";
import { logger } from "./lib/logger";
import { checkDatabaseConnection } from "./lib/db-check";
import { auth } from "./modules/auth";
import { bids } from "./modules/bids";
import { publicModule } from './modules/public';
import { quiz } from "./modules/quiz";
import { startScheduler } from "./modules/scheduler";
import { user } from "./modules/user";
import { PlanService } from "./services/plan.service";
import { initTelegramBotsOnStartup } from "./services/quiz-bot.service";

// Главная функция запуска приложения
// Проверяет подключение к БД перед запуском сервера
async function startApp() {
  // Проверка подключения к базе данных перед запуском приложения
  // Если подключение не удалось, приложение завершится с ошибкой
  try {
    await checkDatabaseConnection();
  } catch (error) {
    logger.error("Критическая ошибка: не удалось подключиться к базе данных", error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }

  // Инициализация планов при запуске приложения
  PlanService.scanPlanAndCreate().catch((error) => {
    logger.error("Ошибка при инициализации планов", error instanceof Error ? error : new Error(String(error)));
  });

  // Явная инициализация Telegram‑ботов при старте API
  initTelegramBotsOnStartup();

  // Запуск scheduler для обработки незавершенных заявок
  startScheduler();

  // Определяем окружение
  const env = typeof Bun !== "undefined" ? Bun.env : process.env;
  const isDevelopment = env.NODE_ENV !== "production";

  // Настраиваем CORS в зависимости от окружения
  // Читаем разрешённые URL из переменной окружения APP_URLS
  const appUrls = env.APP_URLS
    ? env.APP_URLS.split(",").map((url) => url.trim()).filter(Boolean)
    : [];

  const corsConfig = {
    origin: appUrls.length > 0
      ? appUrls
      : isDevelopment
        ? ["http://localhost:5173", "http://localhost:5174"]
        : "https://example.com",
    credentials: true,
  };

  // Создаём основное приложение Elysia
  const app = new Elysia()
    // Подключаем CORS перед роутами для обработки preflight запросов
    .use(cors(corsConfig))
    // Подключаем middleware логирования
    .get("/", () => ({
      message: "BAPI - Backend API",
      version: "1.0.50",
    }))
    // Подключаем модули с префиксом /v1
    .group("/v1", (app) => app
      .use(auth)
      .use(user)
      .use(quiz)
      .use(bids)
      .use(publicModule)
    )
    .listen(5001);

  logger.info("Сервер запущен", {
    hostname: app.server?.hostname,
    port: app.server?.port,
  });
}

// Запускаем приложение
startApp().catch((error) => {
  logger.error("Критическая ошибка при запуске приложения", error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});

