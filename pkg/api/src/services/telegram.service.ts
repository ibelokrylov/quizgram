import { createHash, createHmac } from 'crypto';
import { logger } from '../lib/logger';
import { BotType } from '../type/bot.type';

// Интерфейсы для данных Telegram
export interface TelegramInitData {
  query_id?: string;
  user?: string;
  auth_date?: string;
  hash?: string;
  [key: string]: string | undefined;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export interface TelegramUserInfo {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  allowsWriteToPm?: boolean;
  authDate: number;
}

/**
 * Сервис для работы с Telegram Mini App
 */
export abstract class TelegramService {
  /**
   * Получает токен CRM-бота для валидации initData
   * Использует BOT_CRM_TOKEN из переменных окружения
   * (deep links идут через CRM-бота @Quiz_gramm_bot)
   */
  private static getCrmBotToken(): string {
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const token = env.BOT_CRM_TOKEN;

    if (!token || token === 'ДОБАВИТЬ_ТОКЕН') {
      throw new Error('BOT_CRM_TOKEN не найден в переменных окружения');
    }

    return token;
  }

  /**
   * Получает токен квиз-бота для валидации initData
   * Использует BOT_QUIZ_TOKEN из переменных окружения
   */
  private static getBotToken(): string {
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const token = env.BOT_QUIZ_TOKEN;

    if (!token || token === 'ДОБАВИТЬ_ТОКЕН') {
      throw new Error('BOT_QUIZ_TOKEN не найден в переменных окружения');
    }

    return token;
  }

  /**
   * Валидация данных от Telegram Mini App
   * @param initData - строка initData из Telegram WebApp
   * @param t - BotType - для верного определения нужного токена
   * @returns объект с данными пользователя
   */
  static async validateInitData(initData: string, t: BotType = 'quiz'): Promise<TelegramUserInfo> {
    try {
      logger.info('Начало валидации Telegram initData');

      // Разбираем query string
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      const sign = urlParams.get('signature')
      logger.debug('signature', { signature: sign })

      if (!hash) {
        throw new Error('Hash не найден в initData');
      }

      // Получаем токен CRM-бота для валидации
      const botToken = t === 'crm' ? this.getCrmBotToken() : this.getBotToken();

      // Создаем secret key согласно документации Telegram:
      // secret_key = HMAC_SHA256(bot_token, "WebAppData")
      const secretKey = createHmac('sha256', botToken)
        .update('WebAppData')
        .digest();

      // Создаем data-check-string из всех параметров кроме hash,
      // отсортированных по ключу в формате "key=value\n"
      const dataCheckString = Array.from(urlParams.entries())
        .filter(([key]) => key !== 'hash')
        .filter(([key]) => key !== 'signature')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');


      // Вычисляем hash согласно документации Telegram:
      // hash = HMAC_SHA256(data_check_string, secret_key)
      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Проверяем хеш (сравниваем в hex)
      if (process.env.ENV === 'production') {
        if (calculatedHash !== hash) {
          logger.warn('Ошибка валидации initData: hash не совпадает', {
            expected: hash,
            calculated: calculatedHash,
            dataCheckString: dataCheckString,
          });
          throw new Error('Неверная подпись initData');
        }
      }

      // Извлекаем информацию о пользователе
      const userStr = urlParams.get('user');
      if (!userStr) {
        throw new Error('Данные пользователя не найдены');
      }

      const user: TelegramUser = JSON.parse(decodeURIComponent(userStr));
      const authDate = parseInt(urlParams.get('auth_date') || '0');

      const userInfo: TelegramUserInfo = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        languageCode: user.language_code,
        isPremium: user.is_premium,
        allowsWriteToPm: user.allows_write_to_pm,
        authDate,
      };

      logger.info('Данные пользователя успешно валидированы', { userId: userInfo.id });
      return userInfo;

    } catch (error) {
      logger.error('Ошибка валидации Telegram initData', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Извлекает initData из различных источников
   * @param headers - заголовки запроса
   * @param body - тело запроса
   * @returns строка initData
   */
  static extractInitData(headers: Record<string, string>, body?: any): string {
    // Ищем в заголовках
    const tgInitData = headers['x-telegram-init-data'] || headers['telegram-web-app-init-data'];
    if (tgInitData) {
      return tgInitData;
    }

    // Ищем в теле запроса
    if (body?.initData) {
      return body.initData;
    }

    if (body?.telegramWebAppInitData) {
      return body.telegramWebAppInitData;
    }

    throw new Error('InitData не найден в запросе');
  }
}
