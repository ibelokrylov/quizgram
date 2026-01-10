// Сервис для бэкапа логов в S3
// Выполняет бэкап лог-файлов в конце каждого дня

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { S3Service, UploadResult } from "./s3.service";
import { logger } from "../lib/logger";

/**
 * Получает путь к директории логов
 * Читается динамически для поддержки тестов
 */
function getLogDir(): string {
  const logDirEnv = (typeof Bun !== "undefined" ? Bun.env : process.env).LOG_DIR || "logs";
  return resolve(logDirEnv);
}

export abstract class BackupLogService {
  /**
   * Выполняет бэкап лог-файла за указанную дату в S3
   * @param date - Дата для бэкапа (по умолчанию вчерашний день)
   * @returns Результат загрузки в S3 или undefined если файл не найден
   */
  static async backupLogFile(date?: Date): Promise<UploadResult | undefined> {
    try {
      // Если дата не указана, используем вчерашний день (для бэкапа в конце дня)
      const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const logFileName = `${dateStr}.log`;
      const logFilePath = join(getLogDir(), logFileName);

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

      // Загружаем в S3
      const uploadResult = await S3Service.uploadFile(logFileContent, logFileName, "backups/logs");

      logger.info("Лог-файл успешно загружен в S3", {
        date: dateStr,
        s3Key: uploadResult.fileKey,
        fileSize: logFileContent.length,
      });

      return uploadResult;
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
   * @returns Результат загрузки в S3 или undefined если файл не найден
   */
  static async backupYesterdayLog(): Promise<UploadResult | undefined> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.backupLogFile(yesterday);
  }
}

