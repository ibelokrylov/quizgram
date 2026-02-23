import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../lib/logger';

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
 * Тип для inline keyboard кнопки
 */
export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

/**
 * Тип для inline keyboard
 */
export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Базовый сервис для работы с Telegram ботами на основе node-telegram-bot-api.
 * Отвечает за создание и кэширование инстансов ботов и отправку сообщений.
 */
export abstract class BaseTelegramBotService {
  // Кэш инстансов ботов по имени переменной окружения с токеном
  private static bots: Map<string, TelegramBot> = new Map();

  /**
   * Получает (или создаёт) инстанс TelegramBot по ключу переменной окружения.
   * В dev режиме может использовать polling, в production - только как HTTP-клиент.
   */
  static getBot(tokenEnvKey: string, usePolling: boolean = false): TelegramBot {
    const existing = this.bots.get(tokenEnvKey);
    if (existing) {
      logger.debug('Используется кэшированный инстанс Telegram бота', {
        tokenEnvKey,
      });
      return existing;
    }

    const token = process.env[tokenEnvKey];

    if (!token) {
      const error = new Error(
        `Переменная окружения ${tokenEnvKey} не установлена для Telegram бота`
      );
      logger.error('Ошибка конфигурации Telegram бота', error, { tokenEnvKey });
      throw error;
    }

    // В dev режиме можно использовать polling, в production - только как HTTP‑клиент
    const bot = new TelegramBot(token, { polling: usePolling });
    this.bots.set(tokenEnvKey, bot);

    logger.info('Инициализирован Telegram бот', { tokenEnvKey });

    // Пытаемся получить информацию о боте (getMe) и залогировать её
    bot
      .getMe()
      .then((me) => {
        logger.info('Успешное подключение к Telegram боту', {
          tokenEnvKey,
          botId: me.id,
          botUsername: me.username,
          botName: me.first_name,
        });
      })
      .catch((error) => {
        logger.error(
          'Не удалось получить информацию о Telegram боте (getMe)',
          error instanceof Error ? error : new Error(String(error)),
          { tokenEnvKey }
        );
      });

    return bot;
  }

  /**
   * Отправка сообщения через node-telegram-bot-api
   * @param parseMode - режим парсинга: "HTML", "Markdown" или "MarkdownV2" (по умолчанию "HTML")
   * @param disableWebPagePreview - отключить превью ссылок (по умолчанию false)
   * @param replyMarkup - inline keyboard для сообщения (опционально)
   */
  static async sendMessage(
    tokenEnvKey: string,
    chatId: number,
    text: string,
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML',
    disableWebPagePreview: boolean = false,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      logger.debug('Отправка сообщения в Telegram бота', {
        tokenEnvKey,
        chatId,
        textPreview: text,
        textLength: text.length,
        parseMode,
        disableWebPagePreview,
        hasReplyMarkup: !!replyMarkup,
      });

      const options: TelegramBot.SendMessageOptions = {
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview,
      };

      if (replyMarkup) {
        options.reply_markup = replyMarkup as TelegramBot.InlineKeyboardMarkup;
      }

      const result = await bot.sendMessage(chatId, text, options);

      logger.info('Сообщение успешно отправлено в Telegram', {
        tokenEnvKey,
        chatId,
        parseMode,
        messageId: result.message_id,
        resultText: result.text,
        hasReplyMarkup: !!replyMarkup,
      });
    } catch (error) {
      logger.error(
        'Ошибка при отправке сообщения через node-telegram-bot-api',
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey, chatId, parseMode }
      );
      throw error;
    }
  }

  /**
   * Получение человекочитаемого имени пользователя
   */
  static getUserDisplayName(message: TelegramMessage): string {
    return message.chat.first_name || message.chat.username || 'друг';
  }

  /**
   * Экранирование специальных символов для MarkdownV2
   * MarkdownV2 требует экранирования следующих символов: _ * [ ] ( ) ~ ` > # + - = | { } . !
   */
  static escapeMarkdownV2(text: string): string {
    // eslint-disable-next-line no-useless-escape
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Настройка webhook для бота
   * @param tokenEnvKey - ключ переменной окружения с токеном бота
   * @param webhookUrl - URL для webhook (должен быть HTTPS в production)
   */
  static async setWebhook(tokenEnvKey: string, webhookUrl: string): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      logger.info('Настройка webhook для Telegram бота', {
        tokenEnvKey,
        webhookUrl,
      });

      await bot.setWebHook(webhookUrl);

      const webhookInfo = await bot.getWebHookInfo();
      logger.info('Webhook успешно настроен', {
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
        'Ошибка при настройке webhook для Telegram бота',
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey, webhookUrl }
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
      logger.info('Удаление webhook для Telegram бота', { tokenEnvKey });

      await bot.deleteWebHook();

      logger.info('Webhook успешно удалён', { tokenEnvKey });
    } catch (error) {
      logger.error(
        'Ошибка при удалении webhook для Telegram бота',
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey }
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
    handler: (update: TelegramUpdate) => Promise<void>
  ): Promise<void> {
    const bot = this.getBot(tokenEnvKey, true);

    // Удаляем webhook, если он был настроен (polling и webhook не могут работать одновременно)
    try {
      await bot.deleteWebHook();
      logger.info('Webhook удалён для запуска polling', { tokenEnvKey });
    } catch (error) {
      logger.debug('Ошибка при удалении webhook (может быть не настроен)', {
        tokenEnvKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Настраиваем обработчики событий
    bot.on('message', async (msg) => {
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
          'Ошибка при обработке сообщения в polling режиме',
          error instanceof Error ? error : new Error(String(error)),
          { tokenEnvKey, chatId: msg.chat.id }
        );
      }
    });

    logger.info('Polling запущен для Telegram бота', { tokenEnvKey });
  }

  /**
   * Получение доступа к кэшу ботов (для очистки при остановке)
   */
  static getBotsCache(): Map<string, TelegramBot> {
    return this.bots;
  }
}
