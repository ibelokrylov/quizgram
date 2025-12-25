// Сервис для отправки email через SMTP используя nodemailer
// Использует переменные окружения для конфигурации

import { existsSync, readFileSync } from "fs";
import nodemailer from "nodemailer";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger";

const MAIL_HOST = process.env.MAIL_HOST;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_PORT = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 465;
const APP_NAME = process.env.APP_NAME || "TGMApp";

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateMailConfig(): void {
  const errors: string[] = [];

  if (!MAIL_HOST) {
    errors.push("MAIL_HOST environment variable is not set");
  }
  if (!MAIL_USER) {
    errors.push("MAIL_USER environment variable is not set");
  }
  if (!MAIL_PASS) {
    errors.push("MAIL_PASS environment variable is not set");
  }

  if (errors.length > 0) {
    const errorMessage = [
      "SMTP configuration is incomplete:",
      ...errors,
      "",
      "Пожалуйста, настройте переменные окружения для отправки email.",
      "Документация: pkg/api/docs/SMTP_SETUP.md",
      "",
      "Для Yandex используйте пароль приложения, а не обычный пароль!",
      "Создайте пароль приложения: https://passport.yandex.ru/profile",
    ].join("\n");

    throw new Error(errorMessage);
  }
}

// Создаём транспортер nodemailer (ленивая инициализация)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  validateMailConfig();

  // Определяем, используется ли SSL/TLS (порт 465) или STARTTLS (порт 587)
  const isSecure = MAIL_PORT === 465;

  logger.debug("Инициализация SMTP транспортера", {
    host: MAIL_HOST,
    port: MAIL_PORT,
    user: MAIL_USER,
    secure: isSecure,
  });

  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: isSecure, // true для порта 465, false для других портов
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
    tls: {
      // Отключаем проверку сертификата (аналогично Go коду с InsecureSkipVerify: true)
      rejectUnauthorized: false,
    },
    // Увеличиваем таймауты для медленных SMTP серверов
    connectionTimeout: 10000, // 10 секунд
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  return transporter;
}

/**
 * Отправка email через SMTP используя nodemailer
 */
async function sendMail(
  subject: string,
  body: string,
  to: string,
): Promise<void> {
  validateMailConfig();

  if (!validateEmail(to)) {
    throw new Error(`Invalid email address: ${to}`);
  }

  const mailTransporter = getTransporter();

  const mailOptions = {
    from: `${APP_NAME} <${MAIL_USER}>`,
    to: to,
    subject: subject,
    html: body,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    logger.info("Email отправлен успешно", {
      to,
      messageId: info.messageId,
    });
  } catch (error) {
    // Детальное логирование ошибки для диагностики
    const errorDetails: Record<string, any> = {
      to,
      host: MAIL_HOST,
      port: MAIL_PORT,
      user: MAIL_USER,
      secure: MAIL_PORT === 465,
    };

    if (error instanceof Error) {
      errorDetails.errorMessage = error.message;
      errorDetails.errorName = error.name;
      errorDetails.errorStack = error.stack;

      // Дополнительные поля для SMTP ошибок
      // Type guard для проверки SMTP ошибки
      type SMTPError = Error & {
        code?: string;
        command?: string;
        response?: string;
        responseCode?: number;
      };
      
      const smtpError = error as unknown;
      if (typeof smtpError === 'object' && smtpError !== null) {
        if ('code' in smtpError && typeof smtpError.code === 'string') {
          errorDetails.errorCode = smtpError.code;
        }
        if ('command' in smtpError && typeof smtpError.command === 'string') {
          errorDetails.smtpCommand = smtpError.command;
        }
        if ('response' in smtpError && typeof smtpError.response === 'string') {
          errorDetails.smtpResponse = smtpError.response;
        }
        if ('responseCode' in smtpError && typeof smtpError.responseCode === 'number') {
          errorDetails.smtpResponseCode = smtpError.responseCode;
        }
      }
    }

    logger.error(
      "Ошибка при отправке email",
      error instanceof Error ? error : new Error(String(error)),
      errorDetails,
    );
    throw error;
  }
}

// Путь к директории с шаблонами
// Определяем путь относительно текущего файла
const getTemplatesDir = (): string => {
  // В Bun используем import.meta.dirname
  if (typeof import.meta !== "undefined" && import.meta.dirname) {
    return join(import.meta.dirname, "templates");
  }

  // В Node.js с ES modules используем import.meta.url
  if (typeof import.meta !== "undefined" && import.meta.url) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, "templates");
  }

  // В Node.js с CommonJS используем __dirname
  if (typeof __dirname !== "undefined") {
    return join(__dirname, "templates");
  }

  // Fallback: пробуем разные варианты путей
  const possiblePaths = [
    join(process.cwd(), "src", "services", "templates"),
    join(process.cwd(), "bapi", "src", "services", "templates"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Если ничего не найдено, возвращаем первый вариант
  return possiblePaths[0];
};

const templatesDir = getTemplatesDir();

// Кэш для загруженных шаблонов
const templateCache: Map<string, string> = new Map();

/**
 * Загрузка шаблона из файла с кэшированием
 * Поддерживает выбор языка: если language = "en", загружает шаблон с суффиксом "_en"
 */
function loadTemplate(templateName: string, language?: string): string {
  // Определяем имя шаблона с учетом языка
  const templateKey = language === "en" ? `${templateName}_en` : templateName;
  const templateFile = language === "en" ? `${templateName}_en.html` : `${templateName}.html`;

  if (templateCache.has(templateKey)) {
    return templateCache.get(templateKey)!;
  }

  try {
    const templatePath = join(templatesDir, templateFile);
    const template = readFileSync(templatePath, "utf-8");
    templateCache.set(templateKey, template);
    return template;
  } catch (error) {
    // Если не найден шаблон с языком, пробуем базовый шаблон
    if (language === "en") {
      try {
        const fallbackPath = join(templatesDir, `${templateName}.html`);
        const template = readFileSync(fallbackPath, "utf-8");
        templateCache.set(templateKey, template);
        logger.warn("Английский шаблон не найден, используется базовый", { templateName });
        return template;
      } catch (fallbackError) {
        // Продолжаем с основной ошибкой
      }
    }

    logger.error(
      "Ошибка при загрузке шаблона",
      error instanceof Error ? error : new Error(String(error)),
      { templateName, language, templateFile },
    );
    throw new Error(`Template ${templateName} not found`);
  }
}

/**
 * Замена плейсхолдеров в шаблоне
 */
function renderTemplate(template: string, data: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return rendered;
}

export abstract class MailService {
  /**
   * Отправка кода верификации на email
   * @param email - Email адрес получателя
   * @param code - Код верификации
   * @param language - Язык пользователя ("en" или "ru"), по умолчанию "ru"
   */
  static async sendVerificationEmailCode(
    email: string,
    code: string,
    language: string = "ru",
  ): Promise<void> {
    const template = loadTemplate("verification_code", language);
    const html = renderTemplate(template, { CODE: code });
    const subject = language === "en" ? "Verification Code" : "Код верификации";
    await sendMail(subject, html, email);
  }

  /**
   * Отправка кода для восстановления пароля
   * @param email - Email адрес получателя
   * @param code - Код восстановления пароля
   * @param language - Язык пользователя ("en" или "ru"), по умолчанию "ru"
   */
  static async sendForgotPasswordEmailCode(
    email: string,
    code: string,
    language: string = "ru",
  ): Promise<void> {
    const template = loadTemplate("forgot_password_code", language);
    const html = renderTemplate(template, { CODE: code });
    const subject = language === "en" ? "Password Recovery" : "Восстановление пароля";
    await sendMail(subject, html, email);
  }

  /**
   * Отправка уведомления об успешном изменении пароля
   * @param email - Email адрес получателя
   * @param language - Язык пользователя ("en" или "ru"), по умолчанию "ru"
   */
  static async sendInformationOfResetPassword(
    email: string,
    language: string = "ru",
  ): Promise<void> {
    const template = loadTemplate("password_reset_notification", language);
    const html = renderTemplate(template, {});
    const subject = language === "en" ? "Password Successfully Changed" : "Пароль успешно изменен";
    await sendMail(subject, html, email);
  }

  /**
   * Отправка уведомления о предстоящем списании через 2 дня
   * @param email - Email адрес получателя
   * @param language - Язык пользователя ("en" или "ru"), по умолчанию "ru"
   */
  static async sendPaymentReminder(
    email: string,
    language: string = "ru",
    paymentUrl?: string,
  ): Promise<void> {
    // Если есть ссылка на оплату, отправляем другой вариант письма
    if (paymentUrl) {
      const subject = language === "en"
        ? "Payment Required: Your Subscription Has Expired"
        : "Требуется оплата: Ваша подписка истекла";

      const html = language === "en"
        ? `
          <html>
            <body>
              <h2>Payment Required</h2>
              <p>Hello!</p>
              <p>Your subscription has expired and requires payment to continue using our service.</p>
              <p>Please click the link below to make a payment:</p>
              <p><a href="${paymentUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Pay Now</a></p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p>${paymentUrl}</p>
              <p>Thank you for using our service!</p>
            </body>
          </html>
        `
        : `
          <html>
            <body>
              <h2>Требуется оплата</h2>
              <p>Здравствуйте!</p>
              <p>Ваша подписка истекла и требует оплаты для продолжения использования нашего сервиса.</p>
              <p>Пожалуйста, перейдите по ссылке ниже чтобы оплатить:</p>
              <p><a href="${paymentUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Оплатить сейчас</a></p>
              <p>Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
              <p>${paymentUrl}</p>
              <p>Спасибо за использование нашего сервиса!</p>
            </body>
          </html>
        `;

      await sendMail(subject, html, email);
    } else {
      // Если нет ссылки на оплату, отправляем стандартное напоминание
      const subject = language === "en"
        ? "Payment will be charged in 2 days"
        : "Списание средств произойдет через 2 дня";

      const html = language === "en"
        ? `
          <html>
            <body>
              <h2>Payment Reminder</h2>
              <p>Hello!</p>
              <p>We would like to inform you that your subscription payment will be automatically charged in 2 days.</p>
              <p>Thank you for using our service!</p>
            </body>
          </html>
        `
        : `
          <html>
            <body>
              <h2>Напоминание об оплате</h2>
              <p>Здравствуйте!</p>
              <p>Уведомляем вас, что через 2 дня произойдет автоматическое списание средств по вашей подписке.</p>
              <p>Спасибо за использование нашего сервиса!</p>
            </body>
          </html>
        `;

      await sendMail(subject, html, email);
    }
  }

  /**
   * Отправка уведомления об окончании платного плана и переходе на FREE
   * @param email - Email адрес получателя
   * @param currentPlanName - Название текущего платного плана (BASE, PRO_PLUS)
   * @param expirationDate - Дата окончания платного плана
   * @param language - Язык пользователя ("en" или "ru"), по умолчанию "ru"
   */
  static async sendPlanExpirationNotice(
    email: string,
    expirationDate: string | Date,
    language: string = "ru",
    currentPlanName?: string,
  ): Promise<void> {
    // Функция для получения отображаемого имени плана
    const getDisplayPlanName = (planName?: string): string => {
      if (!planName) return "платный";
      if (planName === "BASE") return "Pro";
      if (planName === "PRO_PLUS") return "Pro+";
      return planName;
    };

    const displayPlanName = getDisplayPlanName(currentPlanName);
    
    // Форматируем дату окончания
    const dateObj = typeof expirationDate === "string" 
      ? new Date(expirationDate) 
      : expirationDate;
    
    const formattedDate = dateObj.toLocaleDateString(
      language === "en" ? "en-US" : "ru-RU",
      { year: "numeric", month: "long", day: "numeric" }
    );

    const subject = language === "en"
      ? `Your ${displayPlanName} plan will expire soon`
      : `Ваш тарифный план ${displayPlanName} скоро закончится`;

    const html = language === "en"
      ? `
        <html>
          <body>
            <h2>Plan Expiration Notice</h2>
            <p>Hello!</p>
            <p>We would like to inform you that your <strong>${displayPlanName}</strong> plan will expire on <strong>${formattedDate}</strong>.</p>
            <p>After this date, your account will automatically switch to the <strong>Free</strong> plan with limited features.</p>
            <p>If you wish to continue using the premium features, please renew your subscription before the expiration date.</p>
            <p>Thank you for using our service!</p>
          </body>
        </html>
      `
      : `
        <html>
          <body>
            <h2>Уведомление об окончании тарифного плана</h2>
            <p>Здравствуйте!</p>
            <p>Уведомляем вас, что ваш тарифный план <strong>${displayPlanName}</strong> закончится <strong>${formattedDate}</strong>.</p>
            <p>После этой даты ваш аккаунт автоматически перейдёт на тарифный план <strong>Free</strong> с ограниченными возможностями.</p>
            <p>Если вы хотите продолжить использовать премиум функции, пожалуйста, продлите подписку до даты окончания.</p>
            <p>Спасибо за использование нашего сервиса!</p>
          </body>
        </html>
      `;

    await sendMail(subject, html, email);
  }

  /**
   * Отправка уведомления владельцу квиза о новой заявке
   * @param email - Email адрес получателя
   * @param reportUrl - URL ссылка на отчет о заявке в CRM
   * @param language - Язык пользователя ("en" или "ru"), по умолчанию "ru"
   */
  static async sendNewBidNotification(
    email: string,
    reportUrl: string,
    language: string = "ru",
  ): Promise<void> {
    const subject = language === "en"
      ? "New quiz response received"
      : "Получен новый ответ на квиз";

    const html = language === "en"
      ? `
        <html>
          <body>
            <h2>New Quiz Response</h2>
            <p>Hello!</p>
            <p>You have received a new response to your quiz.</p>
            <p><a href="${reportUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Response</a></p>
            <p>Thank you for using our service!</p>
          </body>
        </html>
      `
      : `
        <html>
          <body>
            <h2>Новый ответ на квиз</h2>
            <p>Здравствуйте!</p>
            <p>Вы получили новый ответ на ваш квиз.</p>
            <p><a href="${reportUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Посмотреть ответ</a></p>
            <p>Спасибо за использование нашего сервиса!</p>
          </body>
        </html>
      `;

    await sendMail(subject, html, email);
  }
}
