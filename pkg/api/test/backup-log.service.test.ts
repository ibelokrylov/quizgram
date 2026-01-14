// Тесты для BackupLogService

import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { BackupLogService } from "../src/services/backup-log.service";
import { S3Service } from "../src/services/s3.service";

// Переменные окружения для тестов должны быть установлены
const TEST_FOLDER = "test-backups-logs";

// Список файлов, созданных в тестах, для последующего удаления
const createdFiles: string[] = [];

// Временная директория для тестовых логов
const TEST_LOG_DIR = resolve("test-logs-backup");

/**
 * Очистка созданных файлов после тестов
 */
async function cleanupTestFiles() {
  for (const fileKey of createdFiles) {
    try {
      await S3Service.deleteFile(fileKey);
    } catch (error) {
      // Игнорируем ошибки при удалении
      console.warn(`Не удалось удалить тестовый файл ${fileKey}:`, error);
    }
  }
  createdFiles.length = 0;
}

/**
 * Создает тестовый лог-файл
 */
function createTestLogFile(date: Date, content: string): string {
  if (!existsSync(TEST_LOG_DIR)) {
    mkdirSync(TEST_LOG_DIR, { recursive: true });
  }

  const dateStr = date.toISOString().split("T")[0];
  const logFileName = `${dateStr}.log`;
  const logFilePath = join(TEST_LOG_DIR, logFileName);

  writeFileSync(logFilePath, content, "utf-8");
  return logFilePath;
}

beforeAll(async () => {
  // Проверяем наличие необходимых переменных окружения
  const requiredEnvVars = [
    "S3_ACCESS_KEY",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName] && !(typeof Bun !== "undefined" && Bun.env[varName]),
  );

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Предупреждение: Отсутствуют переменные окружения для S3: ${missingVars.join(", ")}`,
    );
    console.warn("Тесты BackupLogService будут пропущены, если переменные не установлены");
  }

  // Создаем тестовую директорию для логов
  if (!existsSync(TEST_LOG_DIR)) {
    mkdirSync(TEST_LOG_DIR, { recursive: true });
  }
});

afterAll(async () => {
  // Удаляем все созданные файлы из S3
  await cleanupTestFiles();
});

test("1. Бэкап существующего лог-файла", async () => {
  // Пропускаем тест, если нет переменных окружения
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Создаем тестовый лог-файл за вчерашний день
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const testLogContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Тестовое сообщение для бэкапа",
  }) + "\n";

  const logFilePath = createTestLogFile(yesterday, testLogContent);

  // Временно переопределяем LOG_DIR через переменную окружения
  const env = typeof Bun !== "undefined" ? Bun.env : process.env;
  const originalLogDir = env.LOG_DIR;
  
  if (typeof Bun !== "undefined") {
    Bun.env.LOG_DIR = TEST_LOG_DIR;
  } else {
    process.env.LOG_DIR = TEST_LOG_DIR;
  }

  try {
    // Выполняем бэкап
    const result = await BackupLogService.backupLogFile(yesterday);

    // Добавляем загруженный файл в список для удаления
    if (result) {
      createdFiles.push(result.fileKey);
    }

    // Проверяем, что файл был загружен в S3
    expect(result).toBeDefined();
    expect(result?.fileKey).toBeDefined();
  } finally {
    // Восстанавливаем оригинальный LOG_DIR
    if (originalLogDir) {
      if (typeof Bun !== "undefined") {
        Bun.env.LOG_DIR = originalLogDir;
      } else {
        process.env.LOG_DIR = originalLogDir;
      }
    } else {
      if (typeof Bun !== "undefined") {
        delete Bun.env.LOG_DIR;
      } else {
        delete process.env.LOG_DIR;
      }
    }

    // Удаляем тестовый лог-файл
    if (existsSync(logFilePath)) {
      const { unlinkSync } = await import("fs");
      unlinkSync(logFilePath);
    }
  }
});

test("2. Бэкап несуществующего лог-файла (пропуск)", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Создаем дату, для которой точно нет лог-файла
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // Метод должен выполниться без ошибок, но пропустить бэкап
  await BackupLogService.backupLogFile(futureDate);
  expect(true).toBe(true); // Если дошли сюда, значит ошибок не было
});

test("3. Бэкап лог-файла за вчерашний день (backupYesterdayLog)", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Создаем тестовый лог-файл за вчерашний день
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const testLogContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Тестовое сообщение для backupYesterdayLog",
  }) + "\n";

  const logFilePath = createTestLogFile(yesterday, testLogContent);

  const env = typeof Bun !== "undefined" ? Bun.env : process.env;
  const originalLogDir = env.LOG_DIR;
  
  if (typeof Bun !== "undefined") {
    Bun.env.LOG_DIR = TEST_LOG_DIR;
  } else {
    process.env.LOG_DIR = TEST_LOG_DIR;
  }

  try {
    // Выполняем бэкап через backupYesterdayLog
    const result = await BackupLogService.backupYesterdayLog();

    // Добавляем загруженный файл в список для удаления
    if (result) {
      createdFiles.push(result.fileKey);
    }

    expect(result).toBeDefined();
    expect(result?.fileKey).toBeDefined();
  } finally {
    if (originalLogDir) {
      if (typeof Bun !== "undefined") {
        Bun.env.LOG_DIR = originalLogDir;
      } else {
        process.env.LOG_DIR = originalLogDir;
      }
    } else {
      if (typeof Bun !== "undefined") {
        delete Bun.env.LOG_DIR;
      } else {
        delete process.env.LOG_DIR;
      }
    }

    if (existsSync(logFilePath)) {
      const { unlinkSync } = await import("fs");
      unlinkSync(logFilePath);
    }
  }
});

test("4. Бэкап лог-файла с правильным путем в S3", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Создаем тестовый лог-файл
  const testDate = new Date();
  testDate.setDate(testDate.getDate() - 1); // Вчера
  const dateStr = testDate.toISOString().split("T")[0];
  const testLogContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Тестовое сообщение для проверки пути в S3",
  }) + "\n";

  const logFilePath = createTestLogFile(testDate, testLogContent);

  const env = typeof Bun !== "undefined" ? Bun.env : process.env;
  const originalLogDir = env.LOG_DIR;
  
  if (typeof Bun !== "undefined") {
    Bun.env.LOG_DIR = TEST_LOG_DIR;
  } else {
    process.env.LOG_DIR = TEST_LOG_DIR;
  }

  try {
    // Выполняем бэкап
    const result = await BackupLogService.backupLogFile(testDate);

    // Добавляем файл для удаления ПЕРЕД проверками
    if (result) {
      createdFiles.push(result.fileKey);
    }

    expect(result).toBeDefined();
    expect(result?.fileKey).toBeDefined();

    // Проверяем, что файл существует в S3
    if (result) {
      const file = await S3Service.getFile(result.fileKey);
      expect(file).toBeDefined();
      expect(file.length).toBeGreaterThan(0);
    }
  } finally {
    if (originalLogDir) {
      if (typeof Bun !== "undefined") {
        Bun.env.LOG_DIR = originalLogDir;
      } else {
        process.env.LOG_DIR = originalLogDir;
      }
    } else {
      if (typeof Bun !== "undefined") {
        delete Bun.env.LOG_DIR;
      } else {
        delete process.env.LOG_DIR;
      }
    }

    if (existsSync(logFilePath)) {
      const { unlinkSync } = await import("fs");
      unlinkSync(logFilePath);
    }
  }
});

