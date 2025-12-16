# 🚀 Быстрая шпаргалка по GitHub Actions

## Кнопки в GitHub Actions

### 🔄 Restart Containers - Перезапуск контейнеров
**Когда использовать:** Контейнер завис, нужен быстрый перезапуск

```
Actions → Restart Containers → Run workflow
• containers: all (или выберите нужный)
• rebuild: false (быстро) или true (с пересборкой)
```

⏱️ **Время:** ~30 сек без rebuild, ~2-3 мин с rebuild

---

### 🚀 Deploy Quizgram - Полный деплой
**Когда использовать:** Изменился код, нужен полный деплой

```
Actions → Deploy Quizgram → Run workflow
• skip_build: false (собрать все) или true (только бэкенд)
```

⏱️ **Время:** ~5-7 минут

---

### 📊 View Logs - Просмотр логов
**Когда использовать:** Нужно посмотреть логи или найти ошибку

```
Actions → View Logs → Run workflow
• container: api (или выберите другой)
• lines: 100 (количество строк)
```

⏱️ **Время:** ~10 секунд

---

## Частые сценарии

| Ситуация | Действие |
|----------|----------|
| 🐛 API не отвечает | Restart Containers → `api`, `rebuild: false` |
| 📝 Изменил код, хочу задеплоить | `git push` (автоматически) или Deploy Quizgram |
| 📄 Изменил README.md | Просто `git push` (деплой не запустится) |
| 🔧 Изменил .env на сервере | Restart Containers → `all`, `rebuild: true` |
| ❌ Ищу ошибку в логах | View Logs → `api`, `lines: 500` |
| 🔄 Все контейнеры зависли | Restart Containers → `all`, `rebuild: false` |
| 🐘 PostgreSQL упал | Restart Containers → `postgres`, `rebuild: false` |

---

## Автоматический деплой

✅ **Запустится** при изменении:
- `pkg/**` - код приложений
- `docker-compose.yml` - конфигурация Docker
- `Dockerfile.*` - образы Docker

❌ **НЕ запустится** при изменении:
- `README.md`, `*.md` - документация
- `.github/workflows/*` - сами workflows (кроме deploy.yml)
- Другие файлы

---

## Горячие клавиши

В GitHub Actions:
- `G` → `A` - быстро перейти в Actions
- `/` - поиск workflows
- Кликните на workflow → `Run workflow` справа сверху

---

## Полезные ссылки

- 📚 [Полная документация workflows](.github/workflows/README.md)
- 📧 [Настройка SMTP](../pkg/api/docs/SMTP_SETUP.md)
- 🐳 [Docker Compose файл](../docker-compose.yml)
