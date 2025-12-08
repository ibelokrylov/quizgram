// Сервис аутентификации — бизнес-логика, отделённая от HTTP-слоя
// Работает с базой данных через Drizzle ORM и Bun.password для проверки пароля

import { eq } from "drizzle-orm";
import {
  codeTable,
  db,
  userTable,
  type NewUser,
  type User,
} from "../../db";
import { logger } from "../../lib/logger";
import { CodeService } from "../../services/code.service";
import { MailService } from "../../services/mail.service";
import type { AuthModel } from "./model";

// Возможные коды ошибок аутентификации
const AUTH_ERROR_MESSAGE = "notification.user.no-authenticated";

export abstract class AuthService {
  /**
   * Поиск пользователя по логину (email)
   */
  static async findByLogin(login: string): Promise<User | null> {
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.login, login))
      .limit(1);

    return users[0] ?? null;
  }

  /**
   * Проверка пароля пользователя
   */
  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    // Проверяем, доступен ли Bun.password (в среде Bun)
    if (typeof Bun !== "undefined" && Bun.password) {
      return Bun.password.verify(plainPassword, hashedPassword);
    }

    // В других средах считаем, что пароль не прошёл проверку
    return false;
  }

  /**
   * Генерация токена сессии для пользователя
   */
  static async generateSessionToken(userId: number): Promise<string> {
    const { SessionService } = await import("../../services/session.service");
    return SessionService.generateSessionToken(userId);
  }

  /**
   * Получение пользователя по токену из cookie
   * Возвращает пользователя, если токен валиден, иначе null
   * Используется для оптимизации - избегает повторной проверки пароля при наличии валидной сессии
   */
  static async getUserFromToken(token: string): Promise<User | null> {
    if (!token) {
      return null;
    }

    try {
      const { SessionService } = await import("../../services/session.service");
      const session = SessionService.parseSessionToken(token);

      // Находим пользователя по ID из токена
      const users = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, session.ID))
        .limit(1);

      return users[0] ?? null;
    } catch (error) {
      // При ошибке парсинга токена возвращаем null
      return null;
    }
  }

  /**
   * Полный сценарий логина:
   * - поиск пользователя по логину
   * - проверка пароля
   * - генерация токена
   */
  static async login(
    payload: AuthModel.loginBody,
  ): Promise<{ user: User; token: string }> {
    const user = await this.findByLogin(payload.login);

    if (!user) {
      const error = new Error(AUTH_ERROR_MESSAGE);
      error.name = "AuthError";
      throw error;
    }

    const isPasswordValid = await this.verifyPassword(
      payload.password,
      user.password,
    );

    if (!isPasswordValid) {
      const error = new Error(AUTH_ERROR_MESSAGE);
      error.name = "AuthError";
      throw error;
    }

    const token = await this.generateSessionToken(user.id);

    return { user, token };
  }

  /**
   * Хеширование пароля
   */
  static async hashPassword(password: string): Promise<string> {
    if (typeof Bun !== "undefined" && Bun.password) {
      return Bun.password.hash(password);
    }
    throw new Error("Bun.password is not available");
  }

  /**
   * Регистрация нового пользователя:
   * - создание пользователя
   * - генерация кода верификации
   * - отправка email с кодом
   * - генерация токена сессии
   */
  static async registration(
    payload: AuthModel.registrationBody,
  ): Promise<{ user: User; token: string }> {
    // Проверяем, не существует ли уже пользователь с таким email
    const existingUser = await this.findByLogin(payload.login);
    if (existingUser) {
      const error = new Error("User with this email already exists");
      error.name = "RegistrationError";
      throw error;
    }

    // Хешируем пароль
    const hashedPassword = await this.hashPassword(payload.password);

    // Создаём нового пользователя
    const newUser: NewUser = {
      uid: crypto.randomUUID(),
      login: payload.login,
      password: hashedPassword,
      name: payload.name || null,
      planId: 1, // По умолчанию бесплатный план
      isVerification: false,
    };

    const [createdUser] = await db
      .insert(userTable)
      .values(newUser)
      .returning();

    // Генерируем код верификации
    try {
      const code = await CodeService.generateCodeByAuthUser(
        "registration",
        createdUser.id,
      );

      // Отправляем email с кодом верификации
      try {
        await MailService.sendVerificationEmailCode(
          createdUser.login,
          code.value,
        );

        // Обновляем NextMailSendAvailable после успешной отправки
        await db
          .update(codeTable)
          .set({
            nextMailSendAvailable: new Date(Date.now() + 2 * 60 * 1000), // 2 минуты
          })
          .where(eq(codeTable.id, code.id));
      } catch (mailError) {
        logger.error(
          "Ошибка при отправке email при регистрации",
          mailError instanceof Error ? mailError : new Error(String(mailError)),
          { userId: createdUser.id },
        );
        // Не прерываем регистрацию, если не удалось отправить email
      }
    } catch (codeError) {
      logger.error(
        "Ошибка при создании кода при регистрации",
        codeError instanceof Error ? codeError : new Error(String(codeError)),
        { login: payload.login },
      );
      // Не прерываем регистрацию, если не удалось создать код
    }

    // Генерируем токен сессии
    const token = await this.generateSessionToken(createdUser.id);

    return { user: createdUser, token };
  }

  /**
   * Запрос на восстановление пароля:
   * - поиск пользователя по email
   * - генерация кода восстановления
   * - отправка email с кодом (с учётом rate limiting)
   */
  static async forgotPassword(
    payload: AuthModel.forgotPasswordBody,
  ): Promise<void> {
    const user = await this.findByLogin(payload.login);
    if (!user) {
      // В Go коде всегда возвращается успех, даже если пользователь не найден
      // Это сделано для безопасности (не раскрывать существование email)
      return;
    }

    // Генерируем код восстановления пароля
    const code = await CodeService.generateCodeByEmail(
      "reset_password",
      user.login,
    );

    // Проверяем rate limiting
    if (new Date(code.nextMailSendAvailable) > new Date()) {
      logger.debug("Rate limit для восстановления пароля", {
        login: user.login,
        nextSendAvailable: code.nextMailSendAvailable.toISOString(),
      });
      return;
    }

    // Отправляем email с кодом восстановления пароля
    try {
      await MailService.sendForgotPasswordEmailCode(user.login, code.value);

      // Обновляем NextMailSendAvailable после успешной отправки
      await db
        .update(codeTable)
        .set({
          nextMailSendAvailable: new Date(Date.now() + 2 * 60 * 1000), // 2 минуты
        })
        .where(eq(codeTable.id, code.id));

      logger.info("Email с кодом восстановления пароля отправлен", {
        login: user.login,
      });
    } catch (mailError) {
      logger.error(
        "Ошибка при отправке email для восстановления пароля",
        mailError instanceof Error ? mailError : new Error(String(mailError)),
        { login: user.login },
      );
      // Не прерываем процесс, если не удалось отправить email
    }
  }

  /**
   * Проверка кода восстановления пароля (начало процесса):
   * - поиск пользователя по email
   * - проверка существования и валидности кода
   */
  static async startResetPassword(
    payload: AuthModel.verifyResetPasswordStartBody,
  ): Promise<void> {
    const user = await this.findByLogin(payload.email);
    if (!user) {
      const error = new Error("User not found");
      error.name = "ResetPasswordError";
      throw error;
    }

    const code = await CodeService.findCode(
      payload.code,
      "reset_password",
      user.id,
    );

    if (!code) {
      const error = new Error("Invalid or expired code");
      error.name = "ResetPasswordError";
      throw error;
    }

    // Проверяем, не истёк ли код
    if (new Date(code.life) < new Date()) {
      const error = new Error("Code has expired");
      error.name = "ResetPasswordError";
      throw error;
    }
  }

  /**
   * Завершение восстановления пароля:
   * - поиск пользователя по email
   * - проверка кода
   * - обновление пароля
   * - отправка уведомления на email
   */
  static async endResetPassword(
    payload: AuthModel.forgotPasswordEndBody,
  ): Promise<void> {
    const user = await this.findByLogin(payload.email);
    if (!user) {
      const error = new Error("User not found");
      error.name = "ResetPasswordError";
      throw error;
    }

    // Проверяем код
    const code = await CodeService.findCode(
      payload.code,
      "reset_password",
      user.id,
    );

    if (!code) {
      const error = new Error("Invalid or expired code");
      error.name = "ResetPasswordError";
      throw error;
    }

    // Проверяем, не истёк ли код
    if (new Date(code.life) < new Date()) {
      const error = new Error("Code has expired");
      error.name = "ResetPasswordError";
      throw error;
    }

    // Хешируем новый пароль
    const hashedPassword = await this.hashPassword(payload.password);

    // Обновляем пароль пользователя
    await db
      .update(userTable)
      .set({ password: hashedPassword, isVerification: true })
      .where(eq(userTable.id, user.id));

    // Отправляем уведомление об успешном изменении пароля
    try {
      await MailService.sendInformationOfResetPassword(payload.email);
    } catch (mailError) {
      logger.error(
        "Ошибка при отправке уведомления об изменении пароля",
        mailError instanceof Error ? mailError : new Error(String(mailError)),
        { email: payload.email },
      );
      // Не прерываем процесс, если не удалось отправить email
    }
  }
}


