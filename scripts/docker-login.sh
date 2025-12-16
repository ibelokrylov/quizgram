#!/bin/bash
# Скрипт для авторизации в Docker Hub
# Использование: ./scripts/docker-login.sh
# Или с переменными окружения: DOCKER_HUB_LOGIN=user DOCKER_HUB_TOKEN=token ./scripts/docker-login.sh

set -e

# Загружаем переменные из .env файла, если он существует
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Проверяем наличие переменных окружения
if [ -z "$DOCKER_HUB_LOGIN" ]; then
  echo "Ошибка: DOCKER_HUB_LOGIN не установлен"
  echo "Установите переменную окружения или добавьте в .env файл:"
  echo "  DOCKER_HUB_LOGIN=your_username"
  exit 1
fi

if [ -z "$DOCKER_HUB_TOKEN" ]; then
  echo "Ошибка: DOCKER_HUB_TOKEN не установлен"
  echo "Установите переменную окружения или добавьте в .env файл:"
  echo "  DOCKER_HUB_TOKEN=your_access_token"
  exit 1
fi

# Авторизуемся в Docker Hub
echo "Авторизация в Docker Hub как $DOCKER_HUB_LOGIN..."
echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_LOGIN" --password-stdin

if [ $? -eq 0 ]; then
  echo "✅ Успешная авторизация в Docker Hub"
else
  echo "❌ Ошибка авторизации в Docker Hub"
  exit 1
fi
