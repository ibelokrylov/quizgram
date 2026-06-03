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

const TOKEN_MAP: Record<string, string> = {
  BOT_CRM_TOKEN: 'crm',
  BOT_QUIZ_TOKEN: 'quiz',
};

function getSenderUrl(): string {
  const url = process.env.TG_SENDER_URL;
  if (!url) {
    throw new Error('TG_SENDER_URL не настроен');
  }
  return url;
}

function mapBot(tokenEnvKey: string): string {
  const bot = TOKEN_MAP[tokenEnvKey];
  if (!bot) {
    throw new Error(`Неизвестный ключ бота: ${tokenEnvKey}`);
  }
  return bot;
}

async function request(method: string, body: Record<string, unknown>): Promise<void> {
  const url = `${getSenderUrl()}/api/${method}`;
  const botName = String(body.bot || '');

  logger.debug(`Запрос к tg-sender: POST /api/${method}`, { bot: botName });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      const err = new Error(`tg-sender ответил ${resp.status}: ${text}`);
      logger.error(`Ошибка tg-sender: POST /api/${method}`, err, { bot: botName, status: resp.status });
      throw err;
    }

    logger.info(`Запрос к tg-sender выполнен: POST /api/${method}`, { bot: botName });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Базовый сервис для работы с Telegram ботами.
 * Отправляет запросы в tg-sender (Go) через HTTP (fetch).
 */
export abstract class BaseTelegramBotService {
  static async sendMessage(
    tokenEnvKey: string,
    chatId: number,
    text: string,
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML',
    disableWebPagePreview: boolean = false,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<void> {
    const body: Record<string, unknown> = {
      bot: mapBot(tokenEnvKey),
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    await request('sendMessage', body);
  }

  static async answerCallbackQuery(tokenEnvKey: string, callbackQueryId: string): Promise<void> {
    await request('answerCallbackQuery', {
      bot: mapBot(tokenEnvKey),
      callback_query_id: callbackQueryId,
    });
  }

  static async sendPhoto(
    tokenEnvKey: string,
    chatId: number,
    text: string,
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML',
    file: string,
    disableWebPagePreview: boolean = false,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<void> {
    const body: Record<string, unknown> = {
      bot: mapBot(tokenEnvKey),
      chat_id: chatId,
      caption: text,
      parse_mode: parseMode,
      photo: file,
      disable_web_page_preview: disableWebPagePreview,
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    await request('sendPhoto', body);
  }

  static getUserDisplayName(message: TelegramMessage): string {
    return message.chat.first_name || message.chat.username || 'друг';
  }

  static escapeMarkdownV2(text: string): string {
    return text.replace(/([_\*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}
