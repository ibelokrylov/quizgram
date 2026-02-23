import { logger } from '../lib/logger';
import { BaseTelegramBotService, type TelegramUpdate } from './base-telegram-bot.service';
import { CrmBotService } from './crm-bot.service';

// Экспортируем типы для обратной совместимости
export type { TelegramChat, TelegramMessage, TelegramUpdate } from './base-telegram-bot.service';

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

    logger.debug('Получен апдейт от Telegram для квиз-бота', {
      updateId: update.update_id,
      hasMessage: !!message,
      chatId: message?.chat.id,
      text: message?.text,
    });

    if (!message || !message.text) {
      logger.debug('Получен апдейт без текстового сообщения для квиз-бота', {
        updateId: update.update_id,
      });
      return;
    }

    const text = message.text.trim();

    if (text === '/start') {
      logger.debug('Обработка команды /start квиз-бота', {
        updateId: update.update_id,
        chatId: message.chat.id,
      });
      const name = BaseTelegramBotService.getUserDisplayName(message);
      const welcomeText =
        `Привет, ${name}! 🎉\n\n` +
        'Это QuizGram — конструктор квизов в Telegram Mini App\n\n' +
        'Создавайте квизы, которые открываются мгновенно, цепляют внимание и собирают заявки прямо внутри Telegram — без сайта и программиста.\n\n' +
        'Сейчас берём первые проекты и бесплатно внедряем квиз в ваш Telegram-канал или продукт.';

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: 'Внедрить квиз бесплатно',
              url: 'https://t.me/Quiz_gram_bot?startapp=2cd17041-1d5d-4b82-a7cf-12c0d583d1ad',
            },
          ],
          [
            {
              text: 'Подробнее о продукте',
              url: 'https://quizgram.site',
            },
          ],
        ],
      };

      await BaseTelegramBotService.sendMessage(
        'BOT_QUIZ_TOKEN',
        message.chat.id,
        welcomeText,
        'HTML',
        false,
        keyboard
      );
      return;
    }

    // Остальные команды пока игнорируем
    logger.debug('Квиз-бот получил не поддерживаемую команду', {
      updateId: update.update_id,
      text,
    });
  }
}

/**
 * Явная инициализация Telegram‑ботов при старте API.
 * Всегда запускает polling для получения обновлений от Telegram.
 */
export function initTelegramBotsOnStartup(): void {
  try {
    logger.info('Инициализация Telegram ботов при старте API', {
      mode: 'polling',
    });

    // Всегда запускаем polling для обоих ботов
    logger.info('Запуск polling для Telegram ботов');

    BaseTelegramBotService.startPolling('BOT_QUIZ_TOKEN', QuizBotService.handleUpdate).catch(
      (error) => {
        logger.error(
          'Ошибка при запуске polling для квиз-бота',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    );

    BaseTelegramBotService.startPolling('BOT_CRM_TOKEN', CrmBotService.handleUpdate).catch(
      (error) => {
        logger.error(
          'Ошибка при запуске polling для CRM-бота',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    );
  } catch (error) {
    logger.error(
      'Ошибка инициализации Telegram ботов при старте',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Останавливает все Telegram боты (останавливает polling и очищает кэш)
 */
export async function stopTelegramBots(): Promise<void> {
  logger.info('Остановка Telegram ботов');

  const bots = Array.from(BaseTelegramBotService.getBotsCache().entries());

  for (const [tokenEnvKey, bot] of bots) {
    try {
      // Останавливаем polling если он был запущен
      if (bot.isPolling()) {
        await bot.stopPolling();
        logger.info('Polling остановлен для Telegram бота', { tokenEnvKey });
      }
    } catch (error) {
      logger.error(
        'Ошибка при остановке Telegram бота',
        error instanceof Error ? error : new Error(String(error)),
        { tokenEnvKey }
      );
    }
  }

  // Очищаем кэш ботов
  BaseTelegramBotService.getBotsCache().clear();

  logger.info('Все Telegram боты остановлены');
}
