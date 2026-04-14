#!/bin/sh
set -e

echo "Миграция завершена успешно. Запускаю API..."
exec bun run src/index.ts
