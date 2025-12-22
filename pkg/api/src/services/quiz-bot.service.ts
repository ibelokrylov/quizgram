import TelegramBot from "node-telegram-bot-api";
import { logger } from "../lib/logger";
import { CrmBotService } from "./crm-bot.service";

// Минимальные типы для работы с Telegram Bot API
export interface TelegramChat {
  id: number;
  first_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Базовый сервис для работы с Telegram ботами на основе node-telegram-bot-api.
 * Отвечает за создание и кэширование инстансов ботов и отправку сообщений.
 */
abstract class BaseTelegramBotService {
  // Кэш инстансов ботов по имени переменной окружения с токеном
  private static bots: Map<string, TelegramBot> = new Map();

  /**
   * Получает (или создаёт) инстанс TelegramBot по ключу переменной окружения.
   * В dev режиме может использовать polling, в production - только как HTTP-клиент.
   */
  static getBot(tokenEnvKey: string, usePolling: boolean = false): TelegramBot {
    const existing = this.bots.get(tokenEnvKey);
    if (existing) {
      logger.debug("Используется кэшированный инстанс Telegram бота", {
        tokenEnvKey,
      });
      return existing;
    }

    const token = process.env[tokenEnvKey];

    if (!token) {
      const error = new Error(
        `Переменная окружения ${tokenEnvKey} не установлена для Telegram бота`,
      );
      logger.error("Ошибка конфигурации Telegram бота", error, { tokenEnvKey });
      throw error;
    }

    // В dev режиме можно использовать polling, в production - только как HTTP‑клиент
    const bot = new TelegramBot(token, { polling: usePolling });
    this.bots.set(tokenEnvKey, bot);

    logger.info("Инициализирован Telegram бот", { tokenEnvKey });

    // Пытаемся получить информацию о боте (getMe) и залогировать её
    bot
      .getMe()
      .then((me) => {
        logger.info("Успешное подключение к Telegram боту", {
          tokenEnvKey,
          botId: me.id,
          botUsername: me.username,
          botName: me.first_name,
        });
      })
      .catch((error) => {
        logger.error(
          "Не удалось получить информацию о Telegram боте (getMe)",
          error instanceof Error ? error : new Error(String(error)),
          { tokenEnvKey },
        );
      });

    return bot;
  }

  /**
   * Отправка сообщения через node-telegram-bot-api
   */
  static async sendMessage(
    tokenEnvKey: string,
    chatId: number,
    text: string,
  ): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      logger.debug("Отправка сообщения в Telegram бота", {
        tokenEnvKey,
        chatId,
        textPreview: text.slice(0, 100),
        textLength: text.length,
      });

      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
      });

      logger.info("Сообщение успешно отправлено в Telegram", {
        tokenEnvKey,
        chatId,
      });
    } catch (error) {
      logger.error(
        "Ошибка при отправке сообщения через node-telegram-bot-api",
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey, chatId },
      );
      throw error;
    }
  }

  /**
   * Получение человекочитаемого имени пользователя
   */
  static getUserDisplayName(message: TelegramMessage): string {
    return message.chat.first_name || message.chat.username || "друг";
  }

  /**
   * Настройка webhook для бота
   * @param tokenEnvKey - ключ переменной окружения с токеном бота
   * @param webhookUrl - URL для webhook (должен быть HTTPS в production)
   */
  static async setWebhook(
    tokenEnvKey: string,
    webhookUrl: string,
  ): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      logger.info("Настройка webhook для Telegram бота", {
        tokenEnvKey,
        webhookUrl,
      });

      await bot.setWebHook(webhookUrl);

      const webhookInfo = await bot.getWebHookInfo();
      logger.info("Webhook успешно настроен", {
        tokenEnvKey,
        webhookUrl,
        webhookInfo: {
          url: webhookInfo.url,
          hasCustomCertificate: webhookInfo.has_custom_certificate,
          pendingUpdateCount: webhookInfo.pending_update_count,
        },
      });
    } catch (error) {
      logger.error(
        "Ошибка при настройке webhook для Telegram бота",
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey, webhookUrl },
      );
      throw error;
    }
  }

  /**
   * Удаление webhook для бота
   * @param tokenEnvKey - ключ переменной окружения с токеном бота
   */
  static async deleteWebhook(tokenEnvKey: string): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      logger.info("Удаление webhook для Telegram бота", { tokenEnvKey });

      await bot.deleteWebHook();

      logger.info("Webhook успешно удалён", { tokenEnvKey });
    } catch (error) {
      logger.error(
        "Ошибка при удалении webhook для Telegram бота",
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey },
      );
      throw error;
    }
  }

  /**
   * Запуск polling для бота в dev режиме
   * @param tokenEnvKey - ключ переменной окружения с токеном бота
   * @param handler - функция обработки обновлений
   */
  static async startPolling(
    tokenEnvKey: string,
    handler: (update: TelegramUpdate) => Promise<void>,
  ): Promise<void> {
    const bot = this.getBot(tokenEnvKey, true);

    // Удаляем webhook, если он был настроен (polling и webhook не могут работать одновременно)
    try {
      await bot.deleteWebHook();
      logger.info("Webhook удалён для запуска polling", { tokenEnvKey });
    } catch (error) {
      logger.debug("Ошибка при удалении webhook (может быть не настроен)", {
        tokenEnvKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Настраиваем обработчики событий
    bot.on("message", async (msg) => {
      const update: TelegramUpdate = {
        update_id: 0, // В polling режиме update_id не используется
        message: {
          message_id: msg.message_id,
          chat: {
            id: msg.chat.id,
            first_name: msg.chat.first_name,
            username: msg.chat.username,
          },
          text: msg.text,
        },
      };

      try {
        await handler(update);
      } catch (error) {
        logger.error(
          "Ошибка при обработке сообщения в polling режиме",
          error instanceof Error ? error : new Error(String(error)),
          { tokenEnvKey, chatId: msg.chat.id },
        );
      }
    });

    logger.info("Polling запущен для Telegram бота", { tokenEnvKey });
  }
}

/**
 * Сервис квиз-бота Quizgram.
 * Пока что обрабатывает только команду /start и отправляет приветственное сообщение.
 */
export abstract class QuizBotService extends BaseTelegramBotService {
  /**
   * Обработка входящего апдейта от Telegram (webhook или polling).
   * Использует node-telegram-bot-api для отправки ответов.
   */
  static async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;

    logger.debug("Получен апдейт от Telegram для квиз-бота", {
      updateId: update.update_id,
      hasMessage: !!message,
      chatId: message?.chat.id,
      text: message?.text,
    });

    if (!message || !message.text) {
      logger.debug(
        "Получен апдейт без текстового сообщения для квиз-бота",
        { updateId: update.update_id },
      );
      return;
    }

    const text = message.text.trim();

    if (text === "/start") {
      logger.debug("Обработка команды /start квиз-бота", {
        updateId: update.update_id,
        chatId: message.chat.id,
      });
      const name = this.getUserDisplayName(message);
      const welcomeText =
        `Привет, ${name}! 🎉\n\n` +
        "Я квиз-бот Quizgram. Совсем скоро здесь появятся интерактивные квизы и опросы.";

      await this.sendMessage("BOT_QUIZ_TOKEN", message.chat.id, welcomeText);
      return;
    }

    // Остальные команды пока игнорируем
    logger.debug("Квиз-бот получил не поддерживаемую команду", {
      updateId: update.update_id,
      text,
    });
  }
}

/**
 * Явная инициализация Telegram‑ботов при старте API.
 * В dev режиме автоматически запускает polling, в production - только инициализирует ботов.
 */
export function initTelegramBotsOnStartup(): void {
  try {
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const isDevelopment = env.NODE_ENV !== "production";

    logger.info("Инициализация Telegram ботов при старте API", {
      mode: isDevelopment ? "dev (polling)" : "production (webhook)",
    });

    if (isDevelopment) {
      // В dev режиме запускаем polling для обоих ботов
      logger.info("Запуск polling для Telegram ботов в dev режиме");

      BaseTelegramBotService.startPolling(
        "BOT_QUIZ_TOKEN",
        QuizBotService.handleUpdate,
      ).catch((error) => {
        logger.error(
          "Ошибка при запуске polling для квиз-бота",
          error instanceof Error ? error : new Error(String(error)),
        );
      });

      BaseTelegramBotService.startPolling(
        "BOT_CRM_TOKEN",
        CrmBotService.handleUpdate,
      ).catch((error) => {
        logger.error(
          "Ошибка при запуске polling для CRM-бота",
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    } else {
      // В production режиме только инициализируем ботов (webhook настраивается отдельно)
      BaseTelegramBotService.getBot("BOT_QUIZ_TOKEN");
      BaseTelegramBotService.getBot("BOT_CRM_TOKEN");
      logger.info(
        "Telegram боты инициализированы. Настройте webhook для получения обновлений.",
      );
    }
  } catch (error) {
    logger.error(
      "Ошибка инициализации Telegram ботов при старте",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Останавливает все Telegram боты (останавливает polling и очищает кэш)
 */
export async function stopTelegramBots(): Promise<void> {
  logger.info("Остановка Telegram ботов");

  const bots = Array.from(BaseTelegramBotService["bots"].entries());

  for (const [tokenEnvKey, bot] of bots) {
    try {
      // Останавливаем polling если он был запущен
      if (bot.isPolling()) {
        await bot.stopPolling();
        logger.info("Polling остановлен для Telegram бота", { tokenEnvKey });
      }
    } catch (error) {
      logger.error(
        "Ошибка при остановке Telegram бота",
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey },
      );
    }
  }

  // Очищаем кэш ботов
  BaseTelegramBotService["bots"].clear();

  logger.info("Все Telegram боты остановлены");
}
