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

export interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
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
 * Внутренняя структура для хранения инстанса бота с метаданными
 */
interface BotInstance {
  bot: TelegramBot;
  mode: 'polling' | 'webhook';
  handler: (update: TelegramUpdate) => Promise<void>;
  healthCheckInterval: ReturnType<typeof setInterval> | null;
}

const HEALTH_CHECK_INTERVAL_MS = 60_000;

/**
 * Базовый сервис для работы с Telegram ботами на основе node-telegram-bot-api.
 * Отвечает за создание и кэширование инстансов ботов и отправку сообщений.
 */
export abstract class BaseTelegramBotService {
  private static bots: Map<string, BotInstance> = new Map();

  /**
   * Получает существующий инстанс TelegramBot по ключу переменной окружения.
   * Если инстанс не найден — выбрасывает ошибку.
   */
  static getBot(tokenEnvKey: string): TelegramBot {
    const existing = this.bots.get(tokenEnvKey);
    if (existing) {
      logger.debug('Используется кэшированный инстанс Telegram бота', {
        tokenEnvKey,
        mode: existing.mode,
      });
      return existing.bot;
    }

    const error = new Error(
      `Инстанс Telegram бота ${tokenEnvKey} не инициализирован. Сначала вызовите startPolling() или setWebhook().`
    );
    logger.error('Ошибка доступа к Telegram боту', error, { tokenEnvKey });
    throw error;
  }

  /**
   * Получает (или создаёт) инстанс TelegramBot по ключу переменной окружения.
   */
  private static getOrCreateBot(
    tokenEnvKey: string,
    mode: 'polling' | 'webhook'
  ): TelegramBot {
    const existing = this.bots.get(tokenEnvKey);
    if (existing) {
      logger.debug('Используется кэшированный инстанс Telegram бота', {
        tokenEnvKey,
        mode: existing.mode,
      });
      return existing.bot;
    }

    const token = process.env[tokenEnvKey];

    if (!token) {
      const error = new Error(
        `Переменная окружения ${tokenEnvKey} не установлена для Telegram бота`
      );
      logger.error('Ошибка конфигурации Telegram бота', error, { tokenEnvKey });
      throw error;
    }

    const proxyUrl = process.env.TELEGRAM_PROXY;

    const bot = new TelegramBot(token, {
      polling: mode === 'polling',
      request: {
        ...(proxyUrl ? { proxy: proxyUrl } : {}),
        timeout: 15000,
      } as never,
    });

    if (proxyUrl) {
      logger.info('Используется прокси для Telegram бота', {
        tokenEnvKey,
        proxyType: proxyUrl.startsWith('http') ? 'http' : 'unknown',
      });
    }
    if (tokenEnvKey === 'BOT_CRM_TOKEN') {
      bot.setMyCommands([
        {
          command: 'start',
          description: 'Запуск бота',
        },
      ]);
    }

    const instance: BotInstance = {
      bot,
      mode,
      handler: async () => {},
      healthCheckInterval: null,
    };
    this.bots.set(tokenEnvKey, instance);

    logger.info('Инициализирован Telegram бот', { tokenEnvKey, mode });

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
   * Навешивает обработчики событий на инстанс бота
   */
  private static attachEventListeners(
    bot: TelegramBot,
    tokenEnvKey: string,
    handler: (update: TelegramUpdate) => Promise<void>
  ): void {
    bot.on('message', async (msg) => {
      const update: TelegramUpdate = {
        update_id: 0,
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
      logger.info(`MESSAGE ${tokenEnvKey}`, { msg });

      try {
        await handler(update);
      } catch (error) {
        logger.error('Ошибка при обработке сообщения в polling режиме', {
          tokenEnvKey,
          chatId: msg.chat.id,
          error,
        });
      }
    });

    bot.on('callback_query', async (query) => {
      const update: TelegramUpdate = {
        update_id: 0,
        callback_query: {
          id: query.id,
          data: query.data,
          message: query.message
            ? {
                message_id: query.message.message_id,
                chat: {
                  id: query.message.chat.id,
                  first_name: query.message.chat.first_name,
                  username: query.message.chat.username,
                },
                text: query.message.text,
              }
            : undefined,
        },
      };

      try {
        await handler(update);
      } catch (error) {
        logger.error(
          'Ошибка при обработке callback_query в polling режиме',
          error instanceof Error ? error : new Error(String(error)),
          { tokenEnvKey, callbackQueryId: query.id }
        );
      }
    });
  }

  /**
   * Запускает периодическую проверку здоровья бота (только для polling)
   */
  private static startHealthCheck(tokenEnvKey: string): void {
    const instance = this.bots.get(tokenEnvKey);
    if (!instance) {
      logger.debug(`instance bot not found key: ${tokenEnvKey}`);
      return;
    }

    if (instance.mode !== 'polling') {
      logger.debug('Health check пропущен: бот работает в webhook режиме', {
        tokenEnvKey,
      });
      return;
    }

    const interval = setInterval(async () => {
      try {
        await instance.bot.getMe();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Health check бота не пройден', {
          tokenEnvKey,
          errorMessage: message,
        });

        clearInterval(interval);
        instance.healthCheckInterval = null;
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    instance.healthCheckInterval = interval;
    logger.debug('Health check запущен для Telegram бота', {
      tokenEnvKey,
      intervalMs: HEALTH_CHECK_INTERVAL_MS,
    });
  }

  /**
   * Отправка сообщения через node-telegram-bot-api
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
   * Ответ на callback_query (снимает индикатор загрузки на кнопке)
   */
  static async answerCallbackQuery(tokenEnvKey: string, callbackQueryId: string): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      await bot.answerCallbackQuery(callbackQueryId);
      logger.debug('Ответ на callback_query отправлен', {
        tokenEnvKey,
        callbackQueryId,
      });
    } catch (error) {
      logger.error(
        'Ошибка при ответе на callback_query',
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey, callbackQueryId }
      );
      throw error;
    }
  }

  static async sendPhoto(
    tokenEnvKey: string,
    chatId: number,
    text: string,
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML',
    file: string | Buffer,
    disableWebPagePreview: boolean = false,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<void> {
    const bot = this.getBot(tokenEnvKey);

    try {
      await bot.sendPhoto(chatId, file, {
        caption: text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });
      logger.info(`Send photo to chatId: ${chatId}`);
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
   */
  static escapeMarkdownV2(text: string): string {
    // eslint-disable-next-line no-useless-escape
    return text.replace(/([_\*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Настройка webhook для бота
   */
  static async setWebhook(tokenEnvKey: string, webhookUrl: string): Promise<void> {
    const bot = this.getOrCreateBot(tokenEnvKey, 'webhook');

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
   * Запуск polling для бота
   */
  static async startPolling(
    tokenEnvKey: string,
    handler: (update: TelegramUpdate) => Promise<void>
  ): Promise<void> {
    const bot = this.getOrCreateBot(tokenEnvKey, 'polling');

    const instance = this.bots.get(tokenEnvKey);
    if (instance) {
      instance.handler = handler;
    }

    try {
      await bot.deleteWebHook();
      logger.info('Webhook удалён для запуска polling', { tokenEnvKey });
    } catch (error) {
      logger.debug('Ошибка при удалении webhook (может быть не настроен)', {
        tokenEnvKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.attachEventListeners(bot, tokenEnvKey, handler);

    logger.info('Polling запущен для Telegram бота', { tokenEnvKey });

    this.startHealthCheck(tokenEnvKey);
  }

  /**
   * Получение доступа к кэшу ботов (для обратной совместимости)
   */
  static getBotsCache(): Map<string, TelegramBot> {
    const result = new Map<string, TelegramBot>();
    for (const [key, instance] of this.bots) {
      result.set(key, instance.bot);
    }
    return result;
  }

  /**
   * Получение полного кэша инстансов (включая метаданные)
   */
  static getBotInstances(): Map<string, BotInstance> {
    return this.bots;
  }
}
