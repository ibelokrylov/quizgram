# quizgram

Монорепозиторий с несколькими пакетами для проекта Quizgram.

## Установка зависимостей

```bash
bun install
```

## Git Hooks

Проект использует [Husky](https://typicode.github.io/husky/) для управления git hooks.

### Автоматическая установка

Hooks устанавливаются автоматически при выполнении `bun install` через скрипт `prepare` в `package.json`.

### Pre-push hook

При каждом `git push` автоматически запускаются тесты из `pkg/api`. Если тесты не проходят, push блокируется.

**Для принудительного push (без тестов):**

```bash
git push --no-verify
```

⚠️ **Внимание:** Используйте `--no-verify` только в исключительных случаях!

## Запуск

```bash
bun run index.ts
```

## Настройка MCP серверов

### GitHub MCP Server

Для работы с GitHub MCP сервером необходимо:

1. Создать Personal Access Token на GitHub:
   - Перейти в Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Создать новый токен с необходимыми правами (репозитории, issues, pull requests и т.д.)

2. Добавить токен в `.env` файл:

   ```bash
   GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
   ```

3. Перезапустить Cursor для применения изменений

**Примечание:** Проект использует wrapper скрипт (`.cursor/github-mcp-wrapper.sh`), который автоматически загружает токен из `.env` файла. Также токен добавлен в `~/.bashrc` как резервный вариант.

Конфигурация MCP серверов находится в `.cursor/mcp.json`.

### Docker Hub авторизация

Для работы с Docker Hub (избежание rate limit) необходимо:

1. Создать Access Token на Docker Hub:
   - Перейти на https://hub.docker.com
   - Account Settings → Security → Access Tokens
   - Создать новый Access Token
   - Сохранить токен (показывается только один раз!)

2. Добавить credentials в `.env` файл:

   ```bash
   DOCKER_HUB_LOGIN=your_docker_hub_username
   DOCKER_HUB_TOKEN=your_docker_hub_access_token
   ```

3. Авторизоваться локально (опционально):
   ```bash
   ./scripts/docker-login.sh
   ```
   Или вручную:
   ```bash
   echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_LOGIN" --password-stdin
   ```

**Примечание:** В CI/CD (GitHub Actions) авторизация происходит автоматически через секреты репозитория `DOCKER_HUB_LOGIN` и `DOCKER_HUB_TOKEN`.

## Docker Compose

### Первый запуск (все сервисы):

```bash
docker compose up -d
```

### Деплой приложений (без перезапуска PostgreSQL):

```bash
docker compose up -d --build api app tg-quiz
```

**Важно:** PostgreSQL не перезапускается при деплое, данные сохраняются в volume `postgres-data`.

## Технологии

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
