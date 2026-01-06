// Сервис для бэкапа логов в S3
// Выполняет бэкап лог-файлов в конце каждого дня

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { S3Service } from "./s3.service";
import { logger } from "../lib/logger";

// Путь к директории логов (должен совпадать с logger.ts)
const LOG_DIR_ENV = (typeof Bun !== "undefined" ? Bun.env : process.env).LOG_DIR || "logs";
const LOG_DIR = resolve(LOG_DIR_ENV);

export abstract class BackupLogService {
  /**
   * Выполняет бэкап лог-файла за указанную дату в S3
   * @param date - Дата для бэкапа (по умолчанию вчерашний день)
   * @returns Результат загрузки в S3
   */
  static async backupLogFile(date?: Date): Promise<void> {
    try {
      // Если дата не указана, используем вчерашний день (для бэкапа в конце дня)
      const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const logFileName = `${dateStr}.log`;
      const logFilePath = join(LOG_DIR, logFileName);

      logger.info("Начало бэкапа лог-файла", {
        date: dateStr,
        logFilePath,
      });

      // Проверяем существование файла
      if (!existsSync(logFilePath)) {
        logger.warn("Лог-файл не найден, пропускаем бэкап", {
          date: dateStr,
          logFilePath,
        });
        return;
      }

      // Читаем файл
      const logFileContent = readFileSync(logFilePath);

      // Формируем путь в S3: backups/logs/YYYY-MM-DD.log
      const s3Key = `backups/logs/${logFileName}`;

      // Загружаем в S3
      await S3Service.uploadFile(logFileContent, logFileName, "backups/logs");

      logger.info("Лог-файл успешно загружен в S3", {
        date: dateStr,
        s3Key,
        fileSize: logFileContent.length,
      });
    } catch (error) {
      logger.error(
        "Ошибка при бэкапе лог-файла",
        error instanceof Error ? error : new Error(String(error)),
        { date: date?.toISOString().split("T")[0] }
      );
      throw error;
    }
  }

  /**
   * Выполняет бэкап лог-файла за вчерашний день
   * Используется для ежедневного cron job в конце дня
   */
  static async backupYesterdayLog(): Promise<void> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.backupLogFile(yesterday);
  }
}

