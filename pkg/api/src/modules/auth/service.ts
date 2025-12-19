// Сервис аутентификации — бизнес-логика, отделённая от HTTP-слоя
// Работает с базой данных через Drizzle ORM и Bun.password для проверки пароля

import { eq } from "drizzle-orm";
import {
  codeTable,
  db,
  planTable,
  userNotificationTable,
  userPaymentTable,
  userTable,
  type NewUser,
  type NewUserNotification,
  type NewUserPayment,
  type Plan,
  type User,
} from "../../db";
import { logger } from "../../lib/logger";
import { CodeService } from "../../services/code.service";
import { MailService } from "../../services/mail.service";
import type { AuthModel } from "./model";

// Возможные коды ошибок аутентификации
const AUTH_ERROR_MESSAGE = "notification.user.no-authenticated";

/**
 * Тип пользователя с планом
 */
export type UserWithPlan = User & { plan: Plan | null };

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
   * 
   * @param token - токен сессии
   * @param plan - если true, подгружает план пользователя (по умолчанию false)
   * @returns User | UserWithPlan | null в зависимости от параметра plan
   */
  static async getUserFromToken(
    token: string,
    plan: boolean = false,
  ): Promise<User | UserWithPlan | null> {
    if (!token) {
      return null;
    }

    try {
      const { SessionService } = await import("../../services/session.service");
      const session = SessionService.parseSessionToken(token);

      if (plan) {
        // Подгружаем пользователя с планом через leftJoin
        const results = await db
          .select({
            user: userTable,
            plan: planTable,
          })
          .from(userTable)
          .leftJoin(planTable, eq(userTable.planId, planTable.id))
          .where(eq(userTable.id, session.ID))
          .limit(1);

        const result = results[0];
        if (!result) {
          return null;
        }

        return {
          ...result.user,
          plan: result.plan,
        } as UserWithPlan;
      } else {
        // Обычный запрос без плана
        const users = await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, session.ID))
          .limit(1);

        return users[0] ?? null;
      }
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
      language: payload.language || "en", // Сохраняем язык или используем "en" по умолчанию
    };

    const [createdUser] = await db
      .insert(userTable)
      .values(newUser)
      .returning();

    // Создаём запись в user_payment с FREE планом
    try {
      // Получаем FREE план (id = 1)
      const freePlan = await db
        .select()
        .from(planTable)
        .where(eq(planTable.id, 1))
        .limit(1);

      if (freePlan[0]) {
        // Вычисляем finalDayAt: 30 дней от created_at + время 23:59:00
        const createdAt = createdUser.createdAt;
        const finalDayAt = new Date(createdAt);
        finalDayAt.setDate(finalDayAt.getDate() + 30);
        finalDayAt.setHours(23, 59, 0, 0);

        const newUserPayment: NewUserPayment = {
          userId: createdUser.id,
          planId: 1, // FREE план
          limit: freePlan[0].bidMonthLimit, // Используем bid_month_limit из плана
          finalDayAt,
        };

        await db.insert(userPaymentTable).values(newUserPayment);

        logger.info("Создана запись user_payment для нового пользователя", {
          userId: createdUser.id,
          planId: 1,
          limit: freePlan[0].bidMonthLimit,
        });
      } else {
        logger.warn("FREE план не найден при создании user_payment", {
          userId: createdUser.id,
        });
      }
    } catch (paymentError) {
      logger.error(
        "Ошибка при создании user_payment при регистрации",
        paymentError instanceof Error
          ? paymentError
          : new Error(String(paymentError)),
        { userId: createdUser.id },
      );
      // Не прерываем регистрацию, если не удалось создать user_payment
    }

    // Создаём запись в user_notification с настройками по умолчанию
    try {
      const newUserNotification: NewUserNotification = {
        userId: createdUser.id,
        telegram: false,
        email: true,
      };

      await db.insert(userNotificationTable).values(newUserNotification);

      logger.info("Создана запись user_notification для нового пользователя", {
        userId: createdUser.id,
      });
    } catch (notificationError) {
      logger.error(
        "Ошибка при создании user_notification при регистрации",
        notificationError instanceof Error
          ? notificationError
          : new Error(String(notificationError)),
        { userId: createdUser.id },
      );
      // Не прерываем регистрацию, если не удалось создать user_notification
    }

    // Генерируем код верификации
    try {
      const code = await CodeService.generateCodeByAuthUser(
        "registration",
        createdUser.id,
      );

      // Отправляем email с кодом верификации
      try {
        const userLanguage = createdUser.language || payload.language || "en";
        await MailService.sendVerificationEmailCode(
          createdUser.login,
          code.value,
          userLanguage,
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
      const userLanguage = user.language || "en";
      await MailService.sendForgotPasswordEmailCode(user.login, code.value, userLanguage);

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
      const userLanguage = user.language || "en";
      await MailService.sendInformationOfResetPassword(payload.email, userLanguage);
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


