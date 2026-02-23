// Конфигурация drizzle-kit для генерации миграций
// Документация: https://orm.drizzle.team/docs/sql-schema-declaration

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',

  // Путь до схем (мы описываем таблицы в отдельных файлах в src/db)
  schema: './src/db',

  // Куда складывать миграции
  out: './drizzle',

  // Подключение к БД для миграций (drizzle-kit запускается в Node, а не в Bun).
  // В используемой версии drizzle-kit здесь ожидаются именно разобранные поля,
  // без поля connectionString.
  dbCredentials: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB as string,
  },
});
