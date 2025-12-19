import { logger } from "../lib/logger";
import type { TelegramMessage, TelegramUpdate } from "./quiz-bot.service";
import { QuizBotService as BaseTelegramBotService } from "./quiz-bot.service";

/**
 * Сервис CRM-бота Quizgram.
 * Пока что обрабатывает только команду /start и отправляет приветственное сообщение.
 */
export abstract class CrmBotService extends BaseTelegramBotService {
  /**
   * Настройка webhook для CRM-бота
   * @param webhookUrl - URL для webhook (должен быть HTTPS в production)
   */
  static async setWebhook(webhookUrl: string): Promise<void> {
    await BaseTelegramBotService.setWebhook("BOT_CRM_TOKEN", webhookUrl);
  }

  /**
   * Удаление webhook для CRM-бота
   */
  static async deleteWebhook(): Promise<void> {
    await BaseTelegramBotService.deleteWebhook("BOT_CRM_TOKEN");
  }
  /**
   * Обработка входящего апдейта от Telegram (webhook или polling).
   * Использует node-telegram-bot-api через базовый сервис.
   */
  static async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message: TelegramMessage | undefined = update.message;

    logger.debug("Получен апдейт от Telegram для CRM-бота", {
      updateId: update.update_id,
      hasMessage: !!message,
      chatId: message?.chat.id,
      text: message?.text,
    });

    if (!message || !message.text) {
      logger.debug(
        "Получен апдейт без текстового сообщения для CRM-бота",
        { updateId: update.update_id },
      );
      return;
    }

    const text = message.text.trim();

    if (text === "/start") {
      logger.debug("Обработка команды /start CRM-бота", {
        updateId: update.update_id,
        chatId: message.chat.id,
      });
      const name = BaseTelegramBotService.getUserDisplayName(message);
      const welcomeText =
        `Привет, ${name}! 👋\n\n` +
        "Я CRM-бот Quizgram. В ближайшее время здесь появятся уведомления и инструменты для работы с лидами.";

      await BaseTelegramBotService.sendMessage("BOT_CRM_TOKEN", message.chat.id, welcomeText);
      return;
    }

    // Остальные команды пока игнорируем
    logger.debug("CRM-бот получил не поддерживаемую команду", {
      updateId: update.update_id,
      text,
    });
  }
}
