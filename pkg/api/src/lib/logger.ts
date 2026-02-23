// Система логирования с ротацией файлов и автоматической очисткой старых логов
// Логи сохраняются в файлы и хранятся 30 дней

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { appendFile } from 'fs/promises';
import { join, resolve } from 'path';

// Путь к директории логов можно настроить через переменную окружения LOG_DIR
// По умолчанию используется "logs" (относительно рабочей директории)
// В Docker контейнере рабочая директория: /app/pkg/api, поэтому "logs" -> /app/pkg/api/logs
// В docker-compose.yml эта директория монтируется как ./logs/api на хосте
const LOG_DIR_ENV = (typeof Bun !== 'undefined' ? Bun.env : process.env).LOG_DIR || 'logs';
const LOG_DIR = resolve(LOG_DIR_ENV); // Преобразуем в абсолютный путь для надежности
const RETENTION_DAYS = 30;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  traceId?: string;
}

class Logger {
  private logDir: string;
  private retentionDays: number;
  private currentLogFile: string | null = null;
  private currentDate: string = '';

  constructor(logDir: string = LOG_DIR, retentionDays: number = RETENTION_DAYS) {
    this.logDir = logDir;
    this.retentionDays = retentionDays;
    this.ensureLogDir();
    this.startCleanupTask();
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return join(this.logDir, `${dateStr}.log`);
  }

  private getCurrentLogFile(): string {
    const today = new Date().toISOString().split('T')[0];

    if (this.currentDate !== today || !this.currentLogFile) {
      this.currentDate = today;
      this.currentLogFile = this.getLogFileName();
    }

    return this.currentLogFile;
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: Error,
    traceId?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (data) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (traceId) {
      entry.traceId = traceId;
    }

    return entry;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const logFile = this.getCurrentLogFile();
    const logLine = JSON.stringify(entry) + '\n';

    try {
      // Убеждаемся, что директория существует
      this.ensureLogDir();

      // Используем appendFile для добавления в конец файла
      // Если файл не существует, он будет создан автоматически
      await appendFile(logFile, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
    }

    // Также выводим в консоль для разработки
    const tracePrefix = entry.traceId ? `[${entry.traceId}] ` : '';
    const consoleMessage = `[${new Date().toISOString()}] [${entry.level}] ${tracePrefix}${entry.message}`;
    if (entry.level === LogLevel.ERROR) {
      console.error(consoleMessage, entry.data || entry.error || '');
    } else if (entry.level === LogLevel.WARN) {
      console.warn(consoleMessage, entry.data || '');
    } else {
      console.log(consoleMessage, entry.data || '');
    }
  }

  debug(message: string, data?: any, traceId?: string): void {
    this.writeLog(this.formatLogEntry(LogLevel.DEBUG, message, data, undefined, traceId));
  }

  info(message: string, data?: Record<string, any>, traceId?: string): void {
    this.writeLog(this.formatLogEntry(LogLevel.INFO, message, data, undefined, traceId));
  }

  warn(message: string, data?: Record<string, any>, traceId?: string): void {
    this.writeLog(this.formatLogEntry(LogLevel.WARN, message, data, undefined, traceId));
  }

  error(message: string, error?: any, data?: Record<string, any>, traceId?: string): void {
    this.writeLog(this.formatLogEntry(LogLevel.ERROR, message, data, error, traceId));
  }

  private startCleanupTask(): void {
    // Запускаем очистку сразу при старте
    this.cleanOldLogs();

    // Затем запускаем периодическую очистку раз в сутки
    setInterval(
      () => {
        this.cleanOldLogs();
      },
      24 * 60 * 60 * 1000
    ); // 24 часа
  }

  private cleanOldLogs(): void {
    try {
      if (!existsSync(this.logDir)) {
        return;
      }

      const files = readdirSync(this.logDir);
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.log')) {
          continue;
        }

        const filePath = join(this.logDir, file);
        try {
          const stats = statSync(filePath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > retentionMs) {
            unlinkSync(filePath);
            this.info('Удалён старый лог-файл', {
              file,
              ageDays: Math.floor(fileAge / (24 * 60 * 60 * 1000)),
            });
          }
        } catch (error) {
          this.error(
            'Ошибка при удалении старого лог-файла',
            error instanceof Error ? error : new Error(String(error)),
            { file }
          );
        }
      }
    } catch (error) {
      console.error('Ошибка при очистке старых логов:', error);
    }
  }
}

// Экспортируем singleton экземпляр логгера
export const logger = new Logger();
