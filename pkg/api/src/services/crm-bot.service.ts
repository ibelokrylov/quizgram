import { logger } from '../lib/logger';
import { UserService } from '../modules/user/service';
import {
  BaseTelegramBotService,
  type InlineKeyboardMarkup,
  type TelegramMessage,
  type TelegramUpdate,
} from './base-telegram-bot.service';

const CRM_BOT_TOKEN = 'BOT_CRM_TOKEN';

const CALLBACK_ONBOARD_STEP_2 = 'crm_onboard_2';
const CALLBACK_ONBOARD_STEP_3 = 'crm_onboard_3';

const ONBOARDING_STEP_1_TEXT =
  'QuizGram — конструктор квизов для Telegram.\n\n' +
  'В квизе можно собрать контакты, задать нужные вопросы, понять запрос клиента или провести опрос аудитории канала.\n\n' +
  'Пользователь проходит короткий сценарий прямо внутри Telegram, а вы получаете ответы и контактные данные.';

const ONBOARDING_STEP_2_TEXT =
  'Квизы можно использовать в разных задачах:\n\n' +
  '— собрать заявку на услугу;\n' +
  '— подобрать товар, тариф или формат работы;\n' +
  '— провести опрос среди подписчиков;\n' +
  '— выдать лид-магнит;\n' +
  '— узнать интересы аудитории;\n' +
  '— подготовить клиента к консультации.\n\n' +
  'Такой формат помогает получить больше вводных до переписки с человеком и предложить ему более персонализированное решение.';

const ONBOARDING_STEP_3_TEXT =
  'Соберите свой первый квиз в QuizGram за 5 минут.\n\n' +
  'Добавьте стартовый экран, вопросы, сбор контактов и финальный экран благодарности — без кода и сложной настройки.\n\n' +
  'Откройте конструктор удобным способом:';

/**
 * Сервис CRM-бота Quizgram.
 * Обрабатывает:
 * - команду /start - цепочка онбординга из 3 сообщений
 * - callback кнопок онбординга
 * - UID пользователя (36 символов) - привязывает Telegram ID к пользователю в БД
 */
export abstract class CrmBotService extends BaseTelegramBotService {
  /**
   * Настройка webhook для CRM-бота
   * @param webhookUrl - URL для webhook (должен быть HTTPS в production)
   */
  static async setWebhook(webhookUrl: string): Promise<void> {
    await BaseTelegramBotService.setWebhook(CRM_BOT_TOKEN, webhookUrl);
  }

  /**
   * Удаление webhook для CRM-бота
   */
  static async deleteWebhook(): Promise<void> {
    await BaseTelegramBotService.deleteWebhook(CRM_BOT_TOKEN);
  }

  private static getOnboardingStep3Keyboard(): InlineKeyboardMarkup {
    const appWebUrl = process.env.APP_WEB_URL || 'https://app.quizgram.site';
    const tgAppUrl =
      process.env.ENV === 'production'
        ? 'https://t.me/Quiz_gramm_bot?startapp=openStudioInBot'
        : 'https://t.me/tg_union_bot?startapp=openStudioInBot';

    return {
      inline_keyboard: [
        [{ text: 'Открыть в Telegram', url: tgAppUrl }],
        [{ text: 'Открыть на сайте', url: appWebUrl }],
      ],
    };
  }

  private static async sendOnboardingStep1(chatId: number): Promise<void> {
    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [[{ text: 'Дальше →', callback_data: CALLBACK_ONBOARD_STEP_2 }]],
    };

    await BaseTelegramBotService.sendMessage(
      CRM_BOT_TOKEN,
      chatId,
      ONBOARDING_STEP_1_TEXT,
      'HTML',
      false,
      keyboard
    );
  }

  private static async sendOnboardingStep2(chatId: number): Promise<void> {
    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [[{ text: 'Перейти к созданию →', callback_data: CALLBACK_ONBOARD_STEP_3 }]],
    };

    await BaseTelegramBotService.sendMessage(
      CRM_BOT_TOKEN,
      chatId,
      ONBOARDING_STEP_2_TEXT,
      'HTML',
      false,
      keyboard
    );
  }

  private static async sendOnboardingStep3(chatId: number): Promise<void> {
    await BaseTelegramBotService.sendMessage(
      CRM_BOT_TOKEN,
      chatId,
      ONBOARDING_STEP_3_TEXT,
      'HTML',
      false,
      CrmBotService.getOnboardingStep3Keyboard()
    );
  }

  /**
   * Обработка входящего апдейта от Telegram (webhook или polling).
   * Использует node-telegram-bot-api через базовый сервис.
   */
  static async handleUpdate(update: TelegramUpdate): Promise<void> {
    const callbackQuery = update.callback_query;

    if (callbackQuery) {
      logger.debug('Обработка callback_query CRM-бота', {
        updateId: update.update_id,
        callbackData: callbackQuery.data,
        chatId: callbackQuery.message?.chat.id,
      });

      await BaseTelegramBotService.answerCallbackQuery(CRM_BOT_TOKEN, callbackQuery.id);

      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) {
        logger.warn('callback_query без chat.id для CRM-бота', {
          updateId: update.update_id,
          callbackData: callbackQuery.data,
        });
        return;
      }

      if (callbackQuery.data === CALLBACK_ONBOARD_STEP_2) {
        await CrmBotService.sendOnboardingStep2(chatId);
        return;
      }

      if (callbackQuery.data === CALLBACK_ONBOARD_STEP_3) {
        await CrmBotService.sendOnboardingStep3(chatId);
        return;
      }

      logger.debug('Неизвестный callback_data CRM-бота', {
        updateId: update.update_id,
        callbackData: callbackQuery.data,
      });
      return;
    }

    const message: TelegramMessage | undefined = update.message;

    logger.debug('Получен апдейт от Telegram для CRM-бота', {
      updateId: update.update_id,
      hasMessage: !!message,
      chatId: message?.chat.id,
      text: message?.text,
    });

    if (!message || !message.text) {
      logger.debug('Получен апдейт без текстового сообщения для CRM-бота', {
        updateId: update.update_id,
      });
      return;
    }

    const text = message.text.trim();

    if (text === '/start') {
      logger.debug('Обработка команды /start CRM-бота', {
        updateId: update.update_id,
        chatId: message.chat.id,
      });
      await CrmBotService.sendOnboardingStep1(message.chat.id);
      return;
    }

    // Проверяем, является ли сообщение UID (UUID формат - 36 символов)
    if (text.length === 36) {
      logger.debug('Обработка UID для привязки Telegram', {
        updateId: update.update_id,
        chatId: message.chat.id,
        uid: text,
      });

      try {
        // Ищем пользователя по UID
        const user = await UserService.findByUid(text);

        if (!user) {
          logger.warn('Пользователь с указанным UID не найден', {
            uid: text,
            chatId: message.chat.id,
          });
          await BaseTelegramBotService.sendMessage(
            CRM_BOT_TOKEN,
            message.chat.id,
            '❌ Пользователь с указанным UID не найден.'
          );
          return;
        }

        // Проверяем, не привязан ли уже Telegram ID
        if (user.telegramId) {
          logger.warn(
            'Попытка привязать Telegram ID к пользователю, у которого уже есть привязка',
            {
              userId: user.id,
              uid: user.uid,
              existingTelegramId: user.telegramId,
              chatId: message.chat.id,
            }
          );
          await BaseTelegramBotService.sendMessage(
            CRM_BOT_TOKEN,
            message.chat.id,
            '⚠️ Этот пользователь уже привязан к боту. Обратитесь к администрации.'
          );
          return;
        }

        // Присваиваем telegramId пользователю
        const telegramId = String(message.chat.id);
        await UserService.updateTelegramId(user.id, telegramId);

        logger.info('Telegram ID успешно привязан к пользователю', {
          userId: user.id,
          uid: user.uid,
          telegramId,
          chatId: message.chat.id,
        });

        await BaseTelegramBotService.sendMessage(
          CRM_BOT_TOKEN,
          message.chat.id,
          '✅ Ваш Telegram успешно привязан к аккаунту!'
        );
        return;
      } catch (error) {
        logger.error(
          'Ошибка при привязке Telegram ID к пользователю',
          error instanceof Error ? error : new Error(String(error)),
          {
            uid: text,
            chatId: message.chat.id,
          }
        );
        await BaseTelegramBotService.sendMessage(
          CRM_BOT_TOKEN,
          message.chat.id,
          '❌ Произошла ошибка при привязке аккаунта. Попробуйте позже.'
        );
        return;
      }
    }

    // Остальные команды пока игнорируем
    logger.debug('CRM-бот получил не поддерживаемую команду', {
      updateId: update.update_id,
      text,
    });
  }
}
