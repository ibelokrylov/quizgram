// CLI скрипт для управления миграциями
// Использование:
//   bun run scripts/migrate.ts        - выполнить все pending миграции
//   bun run scripts/migrate.ts status - показать статус всех миграций

import { MigrationRunner, migrations } from "../src/migrations";
import { logger } from "../src/lib/logger";

// Получаем параметры подключения к БД
const env = typeof Bun !== "undefined" ? Bun.env : process.env;
const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST = "localhost",
  POSTGRES_PORT = "5432",
  DATABASE_URL,
} = env;

// Формируем connection string
const connectionString =
  DATABASE_URL ??
  `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

async function main() {
  const command = process.argv[2] || "run";
  const runner = new MigrationRunner(connectionString, migrations);

  try {
    if (command === "status") {
      // Показать статус всех миграций
      console.log("\n📋 Статус миграций:\n");
      const status = await runner.getStatus();
      
      for (const migration of status) {
        const icon = migration.executed ? "✅" : "⏳";
        const executedInfo = migration.executed && migration.executedAt
          ? ` (выполнена ${migration.executedAt.toLocaleString("ru-RU")})`
          : "";
        
        console.log(`${icon} ${migration.name}${executedInfo}`);
        console.log(`   ${migration.description}`);
        console.log();
      }
      process.exit(0);
    } else if (command === "run") {
      // Выполнить pending миграции
      await runner.runPending();
      process.exit(0);
    } else {
      console.error(`❌ Неизвестная команда: ${command}`);
      console.log("\nИспользование:");
      console.log("  bun run scripts/migrate.ts        - выполнить pending миграции");
      console.log("  bun run scripts/migrate.ts status - показать статус миграций");
      process.exit(1);
    }
  } catch (error) {
    logger.error("❌ Ошибка при выполнении миграций", error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

main();

