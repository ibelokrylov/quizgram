import TelegramBot from "node-telegram-bot-api";
import { logger } from "../lib/logger";

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
   */
  static getBot(tokenEnvKey: string): TelegramBot {
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

    // Создаём бота без polling/webhook — используем только как HTTP‑клиент
    const bot = new TelegramBot(token, { polling: false });
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
  protected static async sendMessage(
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
  protected static getUserDisplayName(message: TelegramMessage): string {
    return message.chat.first_name || message.chat.username || "друг";
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
 * Вызываем для того, чтобы сразу увидеть в логах успешное/неуспешное подключение.
 */
export function initTelegramBotsOnStartup(): void {
  try {
    logger.info("Инициализация Telegram ботов при старте API");
    BaseTelegramBotService.getBot("BOT_QUIZ_TOKEN");
    BaseTelegramBotService.getBot("BOT_CRM_TOKEN");
    logger.info("Запрос инициализации Telegram ботов отправлен");
  } catch (error) {
    logger.error(
      "Ошибка инициализации Telegram ботов при старте",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
