// Сервис пользователя — бизнес-логика, отделённая от HTTP-слоя

import { eq } from "drizzle-orm";
import { codeTable, db, userTable, type User } from "../../db";
import { logger } from "../../lib/logger";
import { CodeService } from "../../services/code.service";
import { MailService } from "../../services/mail.service";

export abstract class UserService {
  /**
   * Поиск пользователя по ID
   */
  static async findById(id: number): Promise<User | null> {
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);

    return users[0] ?? null;
  }

  /**
   * Получение профиля пользователя по ID
   */
  static async getSessionProfile(userId: number): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      const error = new Error("User not found");
      error.name = "UserNotFoundError";
      throw error;
    }

    return user;
  }

  /**
   * Верификация email пользователя по коду:
   * - проверка, не верифицирован ли уже пользователь
   * - поиск кода по типу "registration" и пользователю
   * - проверка срока действия кода
   * - пометка пользователя как верифицированного
   * - удаление использованного кода
   */
  static async verifyEmail(user: User, code: string): Promise<void> {
    // Проверяем, не верифицирован ли уже пользователь
    if (user.isVerification) {
      return; // Уже верифицирован, ничего не делаем
    }

    // Находим код по типу и пользователю
    const foundCode = await CodeService.findCode(
      code,
      "registration",
      user.id,
    );

    if (!foundCode) {
      const error = new Error("Invalid or expired code");
      error.name = "VerificationError";
      throw error;
    }

    // Проверяем, не истёк ли код
    if (new Date(foundCode.life) < new Date()) {
      const error = new Error("Verification code has expired");
      error.name = "VerificationError";
      throw error;
    }

    // Помечаем пользователя как верифицированного
    await db
      .update(userTable)
      .set({ isVerification: true })
      .where(eq(userTable.id, user.id));

    // Удаляем использованный код
    await db
      .update(codeTable)
      .set({ isActive: false })
      .where(eq(codeTable.id, foundCode.id));
  }

  /**
   * Повторная отправка кода верификации:
   * - проверка, не верифицирован ли уже пользователь
   * - генерация или получение существующего кода регистрации
   * - проверка rate limiting (2 минуты между отправками)
   * - отправка email с кодом
   * - обновление NextMailSendAvailable после успешной отправки
   */
  static async resendVerificationCode(user: User): Promise<void> {
    // Если пользователь уже верифицирован, возвращаем успех
    if (user.isVerification) {
      return;
    }

    // Генерируем или получаем существующий код (очистка истёкших кодов обрабатывается внутри)
    const code = await CodeService.generateCodeByAuthUser(
      "registration",
      user.id,
    );

    // Проверяем rate limiting
    if (new Date(code.nextMailSendAvailable) > new Date()) {
      const error = new Error(
        "verification email can be sent again after 2 minutes",
      );
      error.name = "RateLimitError";
      throw error;
    }

    // Отправляем email
    try {
      await MailService.sendVerificationEmailCode(user.login, code.value);

      // Обновляем NextMailSendAvailable после успешной отправки
      await db
        .update(codeTable)
        .set({
          nextMailSendAvailable: new Date(Date.now() + 2 * 60 * 1000), // 2 минуты
        })
        .where(eq(codeTable.id, code.id));

      logger.info("Email с кодом верификации отправлен повторно", {
        login: user.login,
      });
    } catch (mailError) {
      logger.error(
        "Ошибка при повторной отправке email с кодом верификации",
        mailError instanceof Error ? mailError : new Error(String(mailError)),
        { login: user.login },
      );
      const error = new Error("Failed to send verification email");
      error.name = "MailError";
      throw error;
    }
  }
}
