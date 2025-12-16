# GitHub Actions Workflows

Этот проект использует несколько GitHub Actions workflows для автоматизации деплоя и управления контейнерами.

## 📋 Список Workflows

### 1. 🚀 Deploy Quizgram (`deploy.yml`)

**Когда запускается:**
- Автоматически при push в `main` (только если изменились важные файлы: `pkg/**`, `docker-compose.yml`, `Dockerfile.*`)
- Вручную через кнопку "Run workflow" в GitHub Actions

**Что делает:**
1. Устанавливает Bun и зависимости
2. Собирает фронтенд (`pkg/app` и `pkg/tg-quiz`)
3. Обновляет код на сервере через git pull
4. Создает все `.env` файлы из GitHub secrets
5. Авторизуется в Docker Hub
6. Перезапускает контейнеры с пересборкой

**Мануальный запуск:**
- Перейдите в Actions → Deploy Quizgram → Run workflow
- Опция `skip_build`: пропустить сборку фронтенда (если только бэкенд изменился)

**Использование:**
```
Когда изменился код → автоматически задеплоится
Нужен полный деплой вручную → Run workflow без опций
Только бэкенд изменился → Run workflow с skip_build: true
```

---

### 2. 🔄 Restart Containers (`restart.yml`)

**Когда запускается:**
- Только вручную через кнопку "Run workflow"

**Что делает:**
- Быстро перезапускает контейнеры без полной сборки и git pull
- Можно выбрать, какие контейнеры перезапустить
- Можно выбрать, пересобирать образы или нет

**Параметры:**
- `containers`: выбор контейнеров (all/api/app/tg-quiz/postgres)
- `rebuild`: пересобрать образы перед перезапуском (true/false)

**Использование:**
```
Контейнер завис → restart с rebuild: false
После правки .env → restart с rebuild: true
Только API упал → выбрать api, rebuild: false
```

**Примеры:**
- **Быстрый перезапуск всех контейнеров:** `containers: all`, `rebuild: false`
- **Перезапуск только API с пересборкой:** `containers: api`, `rebuild: true`
- **Перезапуск PostgreSQL:** `containers: postgres`, `rebuild: false`

---

### 3. 📊 View Logs (`logs.yml`)

**Когда запускается:**
- Только вручную через кнопку "Run workflow"

**Что делает:**
- Показывает логи выбранного контейнера
- Показывает статус и использование ресурсов
- Для API также показывает логи из файлов

**Параметры:**
- `container`: какой контейнер (api/app/tg-quiz/postgres/all)
- `lines`: сколько строк логов показать (по умолчанию 100)

**Использование:**
```
Нужно посмотреть ошибки → View Logs для нужного контейнера
Проверить статус → View Logs с container: all
Найти проблему в API → View Logs, container: api, lines: 500
```

---

## 🎯 Типичные сценарии использования

### Сценарий 1: Изменили код и хотите задеплоить

**Вариант А: Автоматически (рекомендуется для важных изменений)**
```bash
git add .
git commit -m "feat: добавлена новая фича"
git push
# GitHub Actions автоматически задеплоит
```

**Вариант Б: Вручную**
1. Сделайте commit и push
2. Перейдите в Actions → Deploy Quizgram → Run workflow
3. Нажмите "Run workflow"

### Сценарий 2: Слишком частые коммиты (документация, README, мелкие правки)

**Решение:** Автоматический деплой **НЕ** запустится при изменении:
- `README.md`
- `*.md` файлов
- `.github/workflows/*` (кроме `deploy.yml`)
- Других файлов вне `pkg/**`, `docker-compose.yml`, `Dockerfile.*`

Если нужно задеплоить эти изменения:
1. Actions → Deploy Quizgram → Run workflow

### Сценарий 3: Контейнер завис или нужен быстрый перезапуск

**Решение:** Используйте Restart Containers
1. Actions → Restart Containers → Run workflow
2. Выберите контейнер (например, `api`)
3. `rebuild: false` для быстрого перезапуска
4. Нажмите "Run workflow"

⏱️ Время выполнения: ~30 секунд

### Сценарий 4: Изменили .env на сервере вручную

**Решение:**
1. Actions → Restart Containers → Run workflow
2. `containers: all`, `rebuild: true`
3. Нажмите "Run workflow"

### Сценарий 5: Нужно посмотреть логи и найти ошибку

**Решение:** Используйте View Logs
1. Actions → View Logs → Run workflow
2. Выберите контейнер (например, `api`)
3. Укажите количество строк (например, `500`)
4. Нажмите "Run workflow"
5. Посмотрите результаты в логах workflow

### Сценарий 6: Изменили только документацию, не хотите деплоить

**Решение:** Ничего делать не нужно!
- Автоматический деплой не запустится при изменении `.md` файлов
- Просто делайте commit и push как обычно

---

## 🔐 Необходимые GitHub Secrets

Все workflows требуют следующие secrets в environment `prod`:

### SSH и сервер
- `SERVER_IP` - IP адрес сервера
- `SERVER_PORT` - SSH порт (обычно 22)
- `SERVER_USER` - SSH пользователь (обычно root)
- `SERVER_PASS` - SSH пароль

### Docker Hub
- `DOCKER_HUB_LOGIN` - логин Docker Hub
- `DOCKER_HUB_TOKEN` - access token Docker Hub

### База данных (для deploy.yml)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `DATABASE_URL`

### API конфигурация (для deploy.yml)
- `ENV` - окружение (production)
- `JWT_SECRET`
- `COOKIE_SECRET`
- `MAIL_USER`, `MAIL_PASS`, `MAIL_HOST`, `MAIL_PORT`
- `PORT`, `APP_NAME`, `APP_URLS`
- `S3_*` - настройки S3
- `BOT_TOKEN`, `BOT_TOKEN_DEV` - Telegram боты

### Frontend конфигурация (для deploy.yml)
- `VITE_PUBLIC_API_URL`
- `VITE_PUBLIC_APP_NAME`
- `VITE_PUBLIC_QUIZ_URL`
- `VITE_TG_QUIZ_API_URL`

---

## 📊 Мониторинг workflows

### Как посмотреть результаты:
1. Перейдите в репозиторий на GitHub
2. Откройте вкладку "Actions"
3. Выберите нужный workflow слева
4. Нажмите на конкретный запуск для просмотра деталей

### Индикаторы:
- ✅ Зеленая галочка - успешно
- ❌ Красный крестик - ошибка
- 🟡 Желтая точка - выполняется
- ⚪ Серый кружок - ожидание

---

## 🚨 Troubleshooting

### Workflow не запускается автоматически
- Проверьте, что изменились файлы из списка `paths` в `deploy.yml`
- Если изменили только `.md` файлы - это нормально, автодеплой не нужен

### SSH connection failed
- Проверьте secrets: `SERVER_IP`, `SERVER_PORT`, `SERVER_USER`, `SERVER_PASS`
- Убедитесь, что сервер доступен

### Docker Hub authentication failed
- Проверьте secrets: `DOCKER_HUB_LOGIN`, `DOCKER_HUB_TOKEN`
- Убедитесь, что token не истек

### Контейнеры не перезапускаются
- Используйте View Logs для диагностики
- Проверьте логи Docker на сервере
- Попробуйте Restart Containers с `rebuild: true`

---

## 💡 Рекомендации

1. **Используйте Restart Containers для быстрых правок**
   - Если изменили только код, не нужен полный деплой
   - Быстрее и меньше нагрузка на сервер

2. **View Logs - ваш друг**
   - Регулярно проверяйте логи после деплоя
   - Помогает быстро найти проблемы

3. **Не деплойте документацию**
   - Изменения `.md` файлов не требуют деплоя
   - Автоматический деплой их игнорирует

4. **Используйте мануальный деплой для тестирования**
   - Перед важным релизом запустите вручную
   - Можно следить за процессом в реальном времени

5. **Проверяйте статус перед деплоем**
   - Запустите View Logs чтобы убедиться, что все работает
   - Затем делайте деплой
