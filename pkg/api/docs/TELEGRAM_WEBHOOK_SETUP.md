# Настройка Webhook для Telegram ботов

## Проблема

Если вы отправляете команду `/start` боту, но не получаете ответ, скорее всего webhook не настроен.

## Решение

### 1. Убедитесь, что API сервер доступен

Webhook должен быть доступен по HTTPS URL (для production) или HTTP (для локальной разработки через ngrok).

### 2. Настройте webhook для CRM-бота

#### Вариант 1: Через Telegram Bot API напрямую

```bash
# Замените YOUR_BOT_TOKEN на токен вашего бота
# Замените YOUR_DOMAIN на ваш домен (например, https://api.example.com)
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR_DOMAIN/telegram/webhook/crm"
```

#### Вариант 2: Используя node-telegram-bot-api в коде

```typescript
import { CrmBotService } from './services/crm-bot.service';

// Настройка webhook
await CrmBotService.setWebhook('https://YOUR_DOMAIN/telegram/webhook/crm');
```

### 3. Проверьте настройку webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Должен вернуться JSON с информацией о webhook, включая URL.

### 4. Для локальной разработки используйте ngrok

```bash
# Установите ngrok
# Запустите туннель на порт 5001
ngrok http 5001

# Используйте HTTPS URL от ngrok для webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR_NGROK_URL/telegram/webhook/crm"
```

## Endpoints

- **CRM-бот**: `POST /telegram/webhook/crm`
- **Квиз-бот**: `POST /telegram/webhook/quiz`

## Отладка

1. Проверьте логи API сервера - должны быть записи о получении webhook'ов
2. Убедитесь, что переменная окружения `BOT_CRM_TOKEN` установлена
3. Проверьте, что бот инициализирован при старте (должны быть логи об успешном подключении)

## Удаление webhook

Если нужно удалить webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

Или через код:

```typescript
await CrmBotService.deleteWebhook();
```
