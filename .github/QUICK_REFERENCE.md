# 🚀 Быстрая шпаргалка по GitHub Actions

## Workflows

### 1️⃣ Build All Packages - Автоматическая сборка
**Триггер:** Автоматически при push в `main` (если изменены `pkg/**`)

**Что делает:**
- ✅ Собирает все пакеты (app, tg-quiz)
- ✅ Проверяет TypeScript типы
- ✅ Создаёт артефакты сборки

⏱️ **Время:** ~3-5 минут

---

### 2️⃣ Deploy to Server - Мануальный деплой
**Триггер:** Только вручную через GitHub Actions UI

```
Actions → Deploy to Server → Run workflow
• skip_git_pull: false (обновить код) или true (использовать текущий)
• skip_env_update: false (обновить .env) или true (оставить текущие)
```

**Что делает:**
- 🔄 Обновляет код из Git (опционально)
- 📝 Создаёт .env файлы (опционально)
- 🐳 Перезапускает контейнеры: **app, api, tg-quiz**
- ✅ PostgreSQL **НЕ перезапускается**

⏱️ **Время:** ~3-5 минут

---

### 3️⃣ View Logs - Просмотр логов
**Триггер:** Только вручную

```
Actions → View Logs → Run workflow
• container: api (или app, tg-quiz, postgres, all)
• lines: 100 (количество строк)
```

⏱️ **Время:** ~10 секунд

---

### 4️⃣ Restart Containers - Перезапуск контейнеров
**Триггер:** Только вручную

```
Actions → Restart Containers → Run workflow
• containers: all (или выберите нужный)
• rebuild: true (с пересборкой) или false (быстро)
```

⏱️ **Время:** ~30 сек без rebuild, ~2-3 мин с rebuild

---

## Частые сценарии

| Ситуация | Действие |
|----------|----------|
| 📝 Изменил код, хочу задеплоить | 1. `git push` → Build запустится автоматически<br>2. Если сборка ✅ → Deploy to Server вручную |
| 🐛 API не отвечает | Restart Containers → `api`, `rebuild: false` |
| 🔧 Изменил .env на сервере | Restart Containers → `all`, `rebuild: true` |
| ❌ Ищу ошибку в логах | View Logs → `api`, `lines: 500` |
| 🔄 Все контейнеры зависли | Restart Containers → `all`, `rebuild: false` |
| 🐘 PostgreSQL упал | Restart Containers → `postgres`, `rebuild: false` |
| 📄 Изменил только README.md | Просто `git push` (деплой не запустится) |

---

## Автоматическая сборка (Build)

✅ **Запустится** при изменении:
- `pkg/**` - код приложений
- `package.json`, `bun.lock` - зависимости

❌ **НЕ запустится** при изменении:
- `README.md`, `*.md` - документация
- Другие файлы вне `pkg/`

---

## Безопасность деплоя

✅ **Что делает Deploy:**
```bash
docker compose up -d --build app api tg-quiz
```

❌ **Что НЕ делает:**
- Не перезапускает PostgreSQL
- Не удаляет данные
- Не останавливает все контейнеры

---

## Двухэтапный процесс

```
1️⃣ Build (автоматически)
    ↓
    Проверка сборки
    ↓
    ✅ Сборка успешна
    
2️⃣ Deploy (вручную)
    ↓
    Обновление кода
    ↓
    Перезапуск контейнеров
    ↓
    ✅ Деплой завершён
```

---

## Горячие клавиши

В GitHub:
- `G` → `A` - быстро перейти в Actions
- `/` - поиск workflows
- Кликните на workflow → `Run workflow` справа сверху

---

## Полезные ссылки

- 📚 [Полная документация workflows](workflows/README.md)
- 🐳 [Docker Compose файл](../docker-compose.yml)
