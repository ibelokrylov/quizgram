// Подключение к PostgreSQL через Drizzle ORM в среде Bun
// Используем драйвер postgres.js: https://github.com/porsager/postgres

import { DefaultLogger, type LogWriter } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "../lib/logger";

// Импортируем таблицы, чтобы было удобно использовать их вместе с db
export * from "./code";
export * from "./plan";
export * from "./quiz";
export * from "./quiz/quiz-open";
export * from "./user";
export * from "./user-file";

// Импортируем relations для передачи в drizzle
import { relations } from "./relations";

// Ленивая инициализация подключения к БД
// Это нужно, чтобы drizzle-kit мог импортировать схемы без создания реального подключения
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  // Читаем настройки подключения из переменных окружения
  // Используем универсальный подход: process.env работает и в Bun, и в Node.js
  const env = typeof Bun !== "undefined" ? Bun.env : process.env;
  const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    POSTGRES_HOST = "localhost",
    POSTGRES_PORT = "5432",
    DATABASE_URL,
  } = env;

  // Формируем connection string, если явно не задан DATABASE_URL
  const connectionString =
    DATABASE_URL ??
    `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

  // Инициализируем клиент postgres.js
  const client = postgres(connectionString, {
    max: 10, // максимальное количество соединений в пуле
  });

  // Создаем кастомный writer для логирования SQL-запросов через наш logger
  const drizzleLogWriter: LogWriter = {
    write: (message: string) => {
      logger.debug("SQL запрос", { query: message });
    },
  };

  // Создаем logger для Drizzle с нашим writer
  const drizzleLogger = new DefaultLogger({ writer: drizzleLogWriter });

  dbInstance = drizzle({
    client,
    logger: drizzleLogger,
    relations,
  });
  return dbInstance;
}

// Экспортируем функцию для получения экземпляра БД
// Используется для relations API, который требует прямого доступа к экземпляру
export { getDb };

// Экспортируем экземпляр Drizzle для использования в приложении
// Подключение создастся только при первом обращении к db
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});


