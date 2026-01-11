#!/bin/sh
set -e

echo "Ожидаю готовности базы данных..."
sleep 2

echo "Выполняю миграцию базы данных..."
cd /app/pkg/api

bun run db:push:all || {
  echo "Ошибка при выполнении миграции. Проверьте подключение к базе данных."
  exit 1
}

echo "Миграция завершена успешно. Запускаю API..."
exec bun run src/index.ts
