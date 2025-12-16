# GitHub Actions Workflows

Этот проект использует GitHub Actions для автоматизации сборки и деплоя.

## Структура workflows

### 1. Build All Packages (`build.yml`)

**Триггеры:**
- Автоматически при push в `main` (если изменены файлы в `pkg/`)
- Автоматически при создании Pull Request в `main`
- Вручную через GitHub Actions UI

**Что делает:**
- Устанавливает Bun
- Устанавливает все зависимости
- Проверяет TypeScript типы для API
- Собирает `pkg/app` (frontend)
- Собирает `pkg/tg-quiz` (Telegram Mini App)
- Проверяет результаты сборки
- Загружает артефакты сборки (хранятся 7 дней)

**Цель:** Убедиться, что все пакеты собираются без ошибок

---

### 2. Deploy to Server (`deploy.yml`)

**Триггеры:**
- **Только вручную** через GitHub Actions UI

**Параметры:**
- `skip_git_pull` - Пропустить обновление кода из Git (по умолчанию: false)
- `skip_env_update` - Пропустить обновление .env файлов (по умолчанию: false)

**Что делает:**
1. Проверяет наличие всех необходимых секретов
2. Подключается к серверу по SSH
3. Обновляет код из Git (опционально)
4. Создаёт/обновляет .env файлы (опционально)
5. Авторизуется в Docker Hub
6. **Перезапускает контейнеры: `app`, `api`, `tg-quiz`**
7. **PostgreSQL контейнер НЕ перезапускается**
8. Показывает статус контейнеров и последние логи

**Команда деплоя:**
```bash
docker compose up -d --build app api tg-quiz
```

**Цель:** Безопасный деплой на production сервер без перезапуска базы данных

---

### 3. View Logs (`logs.yml`)

**Триггеры:**
- **Только вручную** через GitHub Actions UI

**Параметры:**
- `container` - Какой контейнер смотреть (api, app, tg-quiz, postgres, all)
- `lines` - Сколько строк логов показать (по умолчанию: 100)
- `follow` - Показать только последние логи или весь файл

**Что делает:**
- Подключается к серверу
- Показывает логи выбранного контейнера
- Для API также показывает логи из файлов
- Показывает статус контейнеров и использование ресурсов

**Цель:** Быстрый просмотр логов без подключения к серверу

---

## Типичные сценарии использования

### Сценарий 1: Обычный деплой после изменений

1. Делаешь изменения в коде
2. Push в `main` → автоматически запускается **Build All Packages**
3. Если сборка успешна → вручную запускаешь **Deploy to Server**
4. Контейнеры app, api, tg-quiz перезапускаются с новым кодом

### Сценарий 2: Быстрый перезапуск без изменения кода

1. Запускаешь **Deploy to Server** с параметром `skip_git_pull: true`
2. Контейнеры пересобираются и перезапускаются

### Сценарий 3: Проверка логов

1. Запускаешь **View Logs**
2. Выбираешь контейнер и количество строк
3. Получаешь логи прямо в GitHub Actions

---

## Необходимые секреты

Все секреты настраиваются в Settings → Secrets and variables → Actions → Environment secrets (prod)

### SSH подключение
- `SERVER_IP` - IP адрес сервера
- `SERVER_PORT` - SSH порт
- `SERVER_USER` - SSH пользователь
- `SERVER_PASS` - SSH пароль

### Docker Hub
- `DOCKER_HUB_LOGIN` - Логин в Docker Hub
- `DOCKER_HUB_TOKEN` - Токен доступа Docker Hub

### База данных
- `POSTGRES_USER` - Пользователь PostgreSQL (обязательно)
- `POSTGRES_PASSWORD` - Пароль PostgreSQL (обязательно)
- `POSTGRES_DB` - Имя базы данных (обязательно)
- `POSTGRES_HOST` - Хост базы данных (обязательно)
- `POSTGRES_PORT` - Порт базы данных (опционально, по умолчанию 5432)

**Примечание:** `DATABASE_URL` больше не требуется в secrets. Строка подключения автоматически собирается из отдельных параметров подключения к БД в формате: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`

### API (pkg/api)
- `ENV` - Окружение (production/development)
- `JWT_SECRET` - Секрет для JWT токенов
- `COOKIE_SECRET` - Секрет для cookies
- `PORT` - Порт API
- `APP_NAME` - Название приложения
- `APP_URLS` - Разрешённые URL для CORS
- `MAIL_USER`, `MAIL_PASS`, `MAIL_HOST`, `MAIL_PORT` - Настройки почты
- `S3_*` - Настройки S3 хранилища
- `BOT_TOKEN`, `BOT_TOKEN_DEV` - Токены Telegram ботов

### Frontend (pkg/app)
- `VITE_PUBLIC_API_URL` - URL backend API
- `VITE_PUBLIC_APP_NAME` - Название приложения
- `VITE_PUBLIC_QUIZ_URL` - URL Telegram Mini App

### Telegram Mini App (pkg/tg-quiz)
- `VITE_TG_QUIZ_API_URL` - URL backend API для Telegram Mini App

### Другие
- `IS_DEV` - Флаг dev окружения

---

## Безопасность

- PostgreSQL контейнер **никогда не перезапускается** автоматически
- Все чувствительные данные хранятся в GitHub Secrets
- SSH подключение использует проверку known_hosts
- Docker Hub авторизация через токен, а не пароль

---

## Отладка

Если что-то пошло не так:

1. Проверь логи через **View Logs** workflow
2. Проверь статус контейнеров в логах деплоя
3. Подключись к серверу и проверь вручную:
   ```bash
   cd /root/quizgram
   docker compose ps
   docker compose logs --tail=50 <container>
   ```
