# GitHub Actions Documentation

Документация по GitHub Actions workflows для проекта Quizgram.

## 📚 Документация

### Быстрый старт
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Быстрая шпаргалка по workflows
  - Краткое описание всех workflows
  - Частые сценарии использования
  - Таблица решений проблем

### Детальная документация
- **[workflows/README.md](workflows/README.md)** - Полная документация workflows
  - Описание каждого workflow
  - Список необходимых секретов
  - Инструкции по использованию
  - Отладка и решение проблем

### Архитектура
- **[workflows/ARCHITECTURE.md](workflows/ARCHITECTURE.md)** - Архитектура workflows
  - Визуальные схемы процессов
  - Детальные диаграммы
  - Зависимости между workflows
  - Время выполнения и ресурсы

- **[WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md)** - Визуальные диаграммы
  - ASCII-схемы процессов
  - Сравнение старого и нового подхода
  - Временная шкала выполнения
  - Матрица решений

### История изменений
- **[CHANGELOG_WORKFLOWS.md](CHANGELOG_WORKFLOWS.md)** - История изменений
  - Что изменилось
  - Зачем изменилось
  - Как мигрировать
  - Следующие шаги

---

## 🚀 Workflows

### 1. Build All Packages (`build.yml`)
**Автоматически** при push в `main`

Проверяет что все пакеты собираются без ошибок.

### 2. Deploy to Server (`deploy.yml`)
**Вручную** через GitHub Actions UI

Деплоит приложение на production сервер.

---

## 🎯 Двухэтапный процесс

```
STAGE 1: BUILD (автоматически)
    ↓
    Проверка сборки всех пакетов
    ↓
STAGE 2: DEPLOY (вручную)
    ↓
    Деплой на production сервер
```

---

## 🔒 Безопасность

✅ PostgreSQL **никогда** не перезапускается в `deploy.yml`
✅ Все секреты в GitHub Secrets
✅ SSH через проверенные known_hosts
✅ Docker Hub через токен

---

## 📖 Читать дальше

1. Начни с [QUICK_REFERENCE.md](QUICK_REFERENCE.md) для быстрого старта
2. Изучи [workflows/README.md](workflows/README.md) для детальной информации
3. Посмотри [WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md) для визуального понимания
4. Прочитай [CHANGELOG_WORKFLOWS.md](CHANGELOG_WORKFLOWS.md) для истории изменений

---

## 🆘 Помощь

Если что-то не работает:

1. Проверь [workflows/README.md](workflows/README.md) → раздел "Отладка"
2. Проверь статус контейнеров на сервере

---

## 📁 Структура документации

```
.github/
├── README.md                    ← Ты здесь
├── QUICK_REFERENCE.md           ← Быстрая шпаргалка
├── CHANGELOG_WORKFLOWS.md       ← История изменений
├── WORKFLOW_DIAGRAM.md          ← Визуальные диаграммы
└── workflows/
    ├── README.md                ← Полная документация
    ├── ARCHITECTURE.md          ← Архитектура
    ├── build.yml                ← Workflow: Сборка
    └── deploy.yml               ← Workflow: Деплой
```

---

**Последнее обновление:** 2025-12-16
