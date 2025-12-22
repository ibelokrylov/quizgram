import { logger } from "../lib/logger";
import { UserService } from "../modules/user/service";
import { BaseTelegramBotService, type TelegramMessage, type TelegramUpdate } from "./base-telegram-bot.service";

/**
 * Сервис CRM-бота Quizgram.
 * Обрабатывает:
 * - команду /start - отправляет приветственное сообщение
 * - UID пользователя (36 символов) - привязывает Telegram ID к пользователю в БД
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
        "Я CRM-бот Quizgram.";

      await BaseTelegramBotService.sendMessage("BOT_CRM_TOKEN", message.chat.id, welcomeText);
      return;
    }

    // Проверяем, является ли сообщение UID (UUID формат - 36 символов)
    if (text.length === 36) {
      logger.debug("Обработка UID для привязки Telegram", {
        updateId: update.update_id,
        chatId: message.chat.id,
        uid: text,
      });

      try {
        // Ищем пользователя по UID
        const user = await UserService.findByUid(text);

        if (!user) {
          logger.warn("Пользователь с указанным UID не найден", {
            uid: text,
            chatId: message.chat.id,
          });
          await BaseTelegramBotService.sendMessage(
            "BOT_CRM_TOKEN",
            message.chat.id,
            "❌ Пользователь с указанным UID не найден.",
          );
          return;
        }

        // Проверяем, не привязан ли уже Telegram ID
        if (user.telegramId) {
          logger.warn("Попытка привязать Telegram ID к пользователю, у которого уже есть привязка", {
            userId: user.id,
            uid: user.uid,
            existingTelegramId: user.telegramId,
            chatId: message.chat.id,
          });
          await BaseTelegramBotService.sendMessage(
            "BOT_CRM_TOKEN",
            message.chat.id,
            "⚠️ Этот пользователь уже привязан к боту. Обратитесь к администрации.",
          );
          return;
        }

        // Присваиваем telegramId пользователю
        const telegramId = String(message.chat.id);
        await UserService.updateTelegramId(user.id, telegramId);

        logger.info("Telegram ID успешно привязан к пользователю", {
          userId: user.id,
          uid: user.uid,
          telegramId,
          chatId: message.chat.id,
        });

        await BaseTelegramBotService.sendMessage(
          "BOT_CRM_TOKEN",
          message.chat.id,
          "✅ Ваш Telegram успешно привязан к аккаунту!",
        );
        return;
      } catch (error) {
        logger.error(
          "Ошибка при привязке Telegram ID к пользователю",
          error instanceof Error ? error : new Error(String(error)),
          {
            uid: text,
            chatId: message.chat.id,
          },
        );
        await BaseTelegramBotService.sendMessage(
          "BOT_CRM_TOKEN",
          message.chat.id,
          "❌ Произошла ошибка при привязке аккаунта. Попробуйте позже.",
        );
        return;
      }
    }

    // Остальные команды пока игнорируем
    logger.debug("CRM-бот получил не поддерживаемую команду", {
      updateId: update.update_id,
      text,
    });
  }
}
