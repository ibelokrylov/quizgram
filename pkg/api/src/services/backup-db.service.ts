// Сервис для бэкапа PostgreSQL базы данных в S3
// Выполняет ленивый бэкап (pg_dump) и загружает его в S3

import { existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger";
import { S3Service } from "./s3.service";

// Временная директория для хранения бэкапов перед загрузкой в S3
const TEMP_DIR =
  typeof Bun !== "undefined" ? Bun.env.TEMP_DIR || "/tmp" : process.env.TEMP_DIR || "/tmp";

export abstract class BackupDbService {
  /**
   * Выполняет бэкап PostgreSQL базы данных и загружает его в S3
   * Использует pg_dump для создания ленивого бэкапа
   */
  static async backupDatabase(): Promise<void> {
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const {
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
      POSTGRES_HOST = "localhost",
      POSTGRES_PORT = "5432",
      DATABASE_URL,
    } = env;

    // Генерируем имя файла с меткой времени
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${POSTGRES_DB}-${timestamp}.sql.gz`;
    const backupFilePath = join(TEMP_DIR, backupFileName);

    logger.info("Начало бэкапа базы данных", {
      database: POSTGRES_DB,
      backupFilePath,
    });

    try {
      // Формируем параметры для pg_dump
      const pgDumpArgs = [
        "--no-owner", // Не включать команды OWNER
        "--no-acl", // Не включать команды ACL
        "--clean", // Включать команды DROP перед CREATE
        "--if-exists", // Использовать IF EXISTS в DROP командах
      ];

      // Если есть DATABASE_URL, используем его, иначе отдельные параметры
      if (DATABASE_URL) {
        pgDumpArgs.push(DATABASE_URL);
      } else {
        pgDumpArgs.push(
          `--host=${POSTGRES_HOST}`,
          `--port=${POSTGRES_PORT}`,
          `--username=${POSTGRES_USER}`,
          `--dbname=${POSTGRES_DB}`
        );
      }

      // Настраиваем переменные окружения для pg_dump
      const currentEnv = typeof Bun !== "undefined" ? Bun.env : process.env;
      const pgDumpEnv: Record<string, string> = {};

      // Копируем переменные окружения, фильтруя undefined
      for (const [key, value] of Object.entries(currentEnv)) {
        if (value !== undefined) {
          pgDumpEnv[key] = value;
        }
      }

      // Если используем отдельные параметры, передаем пароль через переменную окружения
      if (!DATABASE_URL && POSTGRES_PASSWORD) {
        pgDumpEnv.PGPASSWORD = POSTGRES_PASSWORD;
      }

      // Выполняем pg_dump с сжатием через gzip
      // Используем Bun.spawn для выполнения команды
      const pgDumpProcess = Bun.spawn(["pg_dump", ...pgDumpArgs], {
        stdout: "pipe",
        stderr: "pipe",
        env: pgDumpEnv,
      });

      // Сжимаем вывод через gzip
      const gzipProcess = Bun.spawn(["gzip", "-c"], {
        stdin: pgDumpProcess.stdout,
        stdout: "pipe",
        stderr: "pipe",
      });

      // Преобразуем поток в Buffer и записываем в файл
      const backupBuffer = Buffer.from(await new Response(gzipProcess.stdout).arrayBuffer());
      await Bun.write(backupFilePath, backupBuffer);

      // Ждем завершения процессов
      await pgDumpProcess.exited;
      await gzipProcess.exited;

      // Проверяем код возврата pg_dump
      if (pgDumpProcess.exitCode !== 0) {
        const stderr = await new Response(pgDumpProcess.stderr).text();
        throw new Error(`pg_dump завершился с ошибкой: ${stderr}`);
      }

      // Проверяем код возврата gzip
      if (gzipProcess.exitCode !== 0) {
        const stderr = await new Response(gzipProcess.stderr).text();
        throw new Error(`gzip завершился с ошибкой: ${stderr}`);
      }

      // Проверяем, что файл создан
      if (!existsSync(backupFilePath)) {
        throw new Error("Файл бэкапа не был создан");
      }

      // Читаем файл для загрузки в S3
      const backupFileContent = readFileSync(backupFilePath);
      const fileSize = backupFileContent.length;

      logger.info("Бэкап базы данных создан", {
        database: POSTGRES_DB,
        backupFilePath,
        fileSize,
      });

      // Формируем путь в S3: backups/db/backup-DBNAME-TIMESTAMP.sql.gz
      const s3Key = `backups/db/${backupFileName}`;

      // Загружаем в S3
      await S3Service.uploadFile(backupFileContent, backupFileName, "backups/db");

      logger.info("Бэкап базы данных успешно загружен в S3", {
        database: POSTGRES_DB,
        s3Key,
        fileSize,
      });

      // Удаляем временный файл после успешной загрузки
      try {
        unlinkSync(backupFilePath);
        logger.debug("Временный файл бэкапа удален", { backupFilePath });
      } catch (error) {
        logger.warn("Не удалось удалить временный файл бэкапа", {
          backupFilePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      logger.error(
        "Ошибка при бэкапе базы данных",
        error instanceof Error ? error : new Error(String(error)),
        { database: POSTGRES_DB, backupFilePath }
      );

      // Пытаемся удалить временный файл в случае ошибки
      if (existsSync(backupFilePath)) {
        try {
          unlinkSync(backupFilePath);
        } catch (cleanupError) {
          logger.warn("Не удалось удалить временный файл бэкапа после ошибки", {
            backupFilePath,
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          });
        }
      }

      throw error;
    }
  }
}
