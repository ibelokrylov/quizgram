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
import { TelegramService } from "../../services/telegram.service";
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
      const session = await SessionService.parseSessionToken(token);

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
        } satisfies UserWithPlan;
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
    // Приводим email к нижнему регистру
    const normalizedLogin = payload.login.toLowerCase();
    const user = await this.findByLogin(normalizedLogin);

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
   * Генерация уникального реферального кода
   */
  static async generateReferralCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Исключаем похожие символы (0, O, I, 1)
    let code: string;
    let isUnique = false;

    // Пытаемся сгенерировать уникальный код (максимум 10 попыток)
    for (let attempt = 0; attempt < 10; attempt++) {
      code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Проверяем уникальность
      const existingUsers = await db
        .select()
        .from(userTable)
        .where(eq(userTable.referralCode, code))
        .limit(1);

      if (existingUsers.length === 0) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique || !code!) {
      throw new Error("Failed to generate unique referral code");
    }

    return code!;
  }

  /**
   * Поиск пользователя по реферальному коду
   */
  static async findByReferralCode(referralCode: string): Promise<User | null> {
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.referralCode, referralCode))
      .limit(1);

    return users[0] ?? null;
  }

  /**
   * Регистрация нового пользователя:
   * - проверка реферального кода (если указан)
   * - создание пользователя
   * - генерация реферального кода для нового пользователя
   * - генерация кода верификации
   * - отправка email с кодом
   * - генерация токена сессии
   */
  static async registration(
    payload: AuthModel.registrationBody,
  ): Promise<{ user: User; token: string }> {
    // Приводим email к нижнему регистру
    const normalizedLogin = payload.login.toLowerCase();
    // Проверяем, не существует ли уже пользователь с таким email
    const existingUser = await this.findByLogin(normalizedLogin);
    if (existingUser) {
      const error = new Error("User with this email already exists");
      error.name = "RegistrationError";
      throw error;
    }

    // Проверяем реферальный код, если он указан
    let referralId: number | null = null;
    if (payload.referralCode) {
      const referrer = await this.findByReferralCode(payload.referralCode);
      if (!referrer) {
        const error = new Error("Invalid referral code");
        error.name = "RegistrationError";
        throw error;
      }
      referralId = referrer.id;
    }

    // Хешируем пароль
    const hashedPassword = await this.hashPassword(payload.password);

    // Генерируем реферальный код для нового пользователя
    const referralCode = await this.generateReferralCode();

    // Создаём нового пользователя
    const newUser: NewUser = {
      uid: crypto.randomUUID(),
      login: normalizedLogin, // Сохраняем email в нижнем регистре
      password: hashedPassword,
      name: payload.name || null,
      planId: 1, // По умолчанию бесплатный план
      isVerification: false,
      language: payload.language || "en", // Сохраняем язык или используем "en" по умолчанию
      telegramId: null, // По умолчанию null
      referralId,
      referralCode,
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
        // Вычисляем finalDayAt: +1 месяц от created_at + время 23:59:00
        const createdAt = createdUser.createdAt;
        const finalDayAt = new Date(createdAt);
        finalDayAt.setMonth(finalDayAt.getMonth() + 1);
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
    // Приводим email к нижнему регистру
    const normalizedLogin = payload.login.toLowerCase();
    const user = await this.findByLogin(normalizedLogin);
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
    // Приводим email к нижнему регистру
    const normalizedEmail = payload.email.toLowerCase();
    const user = await this.findByLogin(normalizedEmail);
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
    // Приводим email к нижнему регистру
    const normalizedEmail = payload.email.toLowerCase();
    const user = await this.findByLogin(normalizedEmail);
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
      await MailService.sendInformationOfResetPassword(normalizedEmail, userLanguage);
    } catch (mailError) {
      logger.error(
        "Ошибка при отправке уведомления об изменении пароля",
        mailError instanceof Error ? mailError : new Error(String(mailError)),
        { email: payload.email },
      );
      // Не прерываем процесс, если не удалось отправить email
    }
  }

  /**
   * Поиск пользователя по Telegram ID
   */
  static async findByTelegramId(telegramId: string): Promise<User | null> {
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.telegramId, telegramId))
      .limit(1);

    return users[0] ?? null;
  }

  /**
   * Авторизация через Telegram:
   * - валидация initData
   * - поиск пользователя по telegramId
   * - генерация токена сессии
   */
  static async telegramLogin(
    payload: AuthModel.telegramLoginBody,
  ): Promise<{ user: User; token: string } | null> {
    // Валидируем initData от Telegram
    const telegramUserInfo = await TelegramService.validateInitData(
      payload.initData,
      'crm'
    );

    // Ищем пользователя по telegramId
    const telegramId = String(telegramUserInfo.id);
    const user = await this.findByTelegramId(telegramId);

    if (!user) {
      // Пользователь не найден - требуется регистрация
      return null;
    }

    // Генерируем токен сессии
    const token = await this.generateSessionToken(user.id);

    logger.info("Пользователь авторизован через Telegram", {
      userId: user.id,
      telegramId,
    });

    return { user, token };
  }

  /**
   * Регистрация через Telegram:
   * - валидация initData
   * - проверка существования email
   * - создание пользователя с telegramId
   * - отправка кода верификации на email
   * - генерация токена сессии
   */
  static async telegramRegister(
    payload: AuthModel.telegramRegisterBody,
  ): Promise<{ user: User; token: string }> {
    // Валидируем initData от Telegram
    const telegramUserInfo = await TelegramService.validateInitData(
      payload.initData,
      'crm'
    );

    // Приводим email к нижнему регистру
    const normalizedLogin = payload.email.toLowerCase();

    // Проверяем, не существует ли уже пользователь с таким email
    const existingUser = await this.findByLogin(normalizedLogin);
    if (existingUser) {
      const error = new Error("User with this email already exists");
      error.name = "RegistrationError";
      throw error;
    }

    // Проверяем, не существует ли уже пользователь с таким telegramId
    const telegramId = String(telegramUserInfo.id);
    const existingTelegramUser = await this.findByTelegramId(telegramId);
    if (existingTelegramUser) {
      const error = new Error("User with this Telegram ID already exists");
      error.name = "RegistrationError";
      throw error;
    }

    // Проверяем реферальный код, если он указан
    let referralId: number | null = null;
    if (payload.referralCode) {
      const referrer = await this.findByReferralCode(payload.referralCode);
      if (!referrer) {
        const error = new Error("Invalid referral code");
        error.name = "RegistrationError";
        throw error;
      }
      referralId = referrer.id;
    }

    // Генерируем случайный пароль (пользователь не будет его использовать, но поле обязательное)
    const randomPassword = crypto.randomUUID();
    const hashedPassword = await this.hashPassword(randomPassword);

    // Генерируем реферальный код для нового пользователя
    const referralCode = await this.generateReferralCode();

    // Определяем язык из Telegram или из payload
    const language =
      payload.language ||
      telegramUserInfo.languageCode?.substring(0, 2) ||
      "en";
    const normalizedLanguage = language === "ru" ? "ru" : "en";

    // Формируем имя из данных Telegram, если не указано
    const name =
      payload.name ||
      [telegramUserInfo.firstName, telegramUserInfo.lastName]
        .filter(Boolean)
        .join(" ") ||
      null;

    // Создаём нового пользователя
    const newUser: NewUser = {
      uid: crypto.randomUUID(),
      login: normalizedLogin,
      password: hashedPassword,
      name,
      planId: 1, // По умолчанию бесплатный план
      isVerification: false,
      language: normalizedLanguage,
      telegramId, // Сохраняем telegramId
      referralId,
      referralCode,
    };

    const [createdUser] = await db
      .insert(userTable)
      .values(newUser)
      .returning();

    // Создаём запись в user_payment с FREE планом
    try {
      const freePlan = await db
        .select()
        .from(planTable)
        .where(eq(planTable.id, 1))
        .limit(1);

      if (freePlan[0]) {
        const createdAt = createdUser.createdAt;
        const finalDayAt = new Date(createdAt);
        finalDayAt.setMonth(finalDayAt.getMonth() + 1);
        finalDayAt.setHours(23, 59, 0, 0);

        const newUserPayment: NewUserPayment = {
          userId: createdUser.id,
          planId: 1,
          limit: freePlan[0].bidMonthLimit,
          finalDayAt,
        };

        await db.insert(userPaymentTable).values(newUserPayment);

        logger.info("Создана запись user_payment для нового пользователя", {
          userId: createdUser.id,
          planId: 1,
        });
      }
    } catch (paymentError) {
      logger.error(
        "Ошибка при создании user_payment при регистрации через Telegram",
        paymentError instanceof Error
          ? paymentError
          : new Error(String(paymentError)),
        { userId: createdUser.id },
      );
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
        "Ошибка при создании user_notification при регистрации через Telegram",
        notificationError instanceof Error
          ? notificationError
          : new Error(String(notificationError)),
        { userId: createdUser.id },
      );
    }

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
          normalizedLanguage,
        );

        await db
          .update(codeTable)
          .set({
            nextMailSendAvailable: new Date(Date.now() + 2 * 60 * 1000),
          })
          .where(eq(codeTable.id, code.id));
      } catch (mailError) {
        logger.error(
          "Ошибка при отправке email при регистрации через Telegram",
          mailError instanceof Error ? mailError : new Error(String(mailError)),
          { userId: createdUser.id },
        );
      }
    } catch (codeError) {
      logger.error(
        "Ошибка при создании кода при регистрации через Telegram",
        codeError instanceof Error ? codeError : new Error(String(codeError)),
        { login: payload.email },
      );
    }

    // Генерируем токен сессии
    const token = await this.generateSessionToken(createdUser.id);

    logger.info("Пользователь зарегистрирован через Telegram", {
      userId: createdUser.id,
      telegramId,
      email: normalizedLogin,
    });

    return { user: createdUser, token };
  }
}


