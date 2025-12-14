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
  if (!MAIL_HOST) {
    throw new Error("MAIL_HOST environment variable is not set");
  }
  if (!MAIL_USER) {
    throw new Error("MAIL_USER environment variable is not set");
  }
  if (!MAIL_PASS) {
    throw new Error("MAIL_PASS environment variable is not set");
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
    logger.error(
      "Ошибка при отправке email",
      error instanceof Error ? error : new Error(String(error)),
      { to },
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
}
