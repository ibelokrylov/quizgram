// Runner для выполнения миграций
// Автоматически проверяет и выполняет новые миграции

import postgres from 'postgres';
import { db, migrationTable } from '../db';
import { logger } from '../lib/logger';
import type { MigrationFile, MigrationStatus } from './types';

export class MigrationRunner {
  private sql: postgres.Sql;
  private migrations: MigrationFile[];

  constructor(connectionString: string, migrations: MigrationFile[]) {
    this.sql = postgres(connectionString);
    this.migrations = migrations;
  }

  // Создание таблицы миграций, если её нет
  private async ensureMigrationTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    logger.info('Таблица миграций проверена/создана');
  }

  // Получение списка выполненных миграций
  private async getExecutedMigrations(): Promise<Set<string>> {
    try {
      const executed = await db.select({ name: migrationTable.name }).from(migrationTable);

      return new Set(executed.map((m) => m.name));
    } catch (error) {
      // Если таблица не существует, вернём пустой Set
      logger.warn('Не удалось получить выполненные миграции, таблица может не существовать', {
        error: error instanceof Error ? error.message : String(error),
      });
      return new Set();
    }
  }

  // Получение статуса всех миграций
  async getStatus(): Promise<MigrationStatus[]> {
    await this.ensureMigrationTable();
    const executedMigrations = await this.getExecutedMigrations();

    // Получаем детальную информацию о выполненных миграциях
    const executedDetails = new Map<string, Date>();
    if (executedMigrations.size > 0) {
      const details = await db.select().from(migrationTable);

      for (const migration of details) {
        executedDetails.set(migration.name, migration.executedAt);
      }
    }

    return this.migrations.map((migration) => ({
      name: migration.name,
      description: migration.description,
      executed: executedMigrations.has(migration.name),
      executedAt: executedDetails.get(migration.name),
    }));
  }

  // Выполнение всех pending миграций
  async runPending(): Promise<void> {
    logger.info('Запуск системы миграций...');

    await this.ensureMigrationTable();
    const executedMigrations = await this.getExecutedMigrations();

    const pendingMigrations = this.migrations.filter((m) => !executedMigrations.has(m.name));

    if (pendingMigrations.length === 0) {
      logger.info('✅ Все миграции уже выполнены');
      return;
    }

    logger.info(`Найдено ${pendingMigrations.length} новых миграций для выполнения`);

    for (const migration of pendingMigrations) {
      try {
        logger.info(`Выполнение миграции: ${migration.name}`);
        logger.info(`Описание: ${migration.description}`);

        // Выполняем миграцию
        await migration.up(this.sql);

        // Записываем в таблицу миграций через Drizzle
        await db.insert(migrationTable).values({
          name: migration.name,
        });

        logger.info(`✅ Миграция ${migration.name} успешно выполнена`);
      } catch (error) {
        logger.error(`❌ Ошибка при выполнении миграции ${migration.name}`, error);
        throw error;
      }
    }

    logger.info('✅ Все миграции успешно применены');
  }

  // Закрытие соединения
  async close(): Promise<void> {
    await this.sql.end();
  }
}
