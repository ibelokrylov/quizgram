import { isTelegramAvailable } from "./telegram-sdk";

const STORAGE_KEY = "telegram_deep_link_target";

/**
 * Декодирует base64url строку обратно в обычный base64
 * Base64url: заменяем - на +, _ на /, добавляем padding = если нужно
 */
function base64urlToBase64(base64url: string): string {
  // Заменяем base64url символы обратно на base64
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Добавляем padding если нужно (base64 требует длину кратной 4)
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  return base64;
}

/**
 * Декодирует base64url строку в исходный путь
 * @param base64url - строка в формате base64url (из startapp параметра)
 * @returns декодированный путь или null если декодирование не удалось
 */
export function decodeStartAppParam(base64url: string): string | null {
  try {
    // Преобразуем base64url в base64
    const base64 = base64urlToBase64(base64url);

    // Декодируем из base64 в строку
    // В браузере используем atob, в Node.js можно использовать Buffer
    const decoded = atob(base64);

    // Проверяем, что это валидный путь (начинается с /)
    if (decoded.startsWith("/")) {
      return decoded;
    }

    return null;
  } catch (error) {
    console.error("Ошибка декодирования startapp параметра:", error);
    return null;
  }
}

/**
 * Получает параметр startapp из Telegram WebApp
 * Проверяет два источника:
 * 1. window.Telegram.WebApp.initDataUnsafe.start_param
 * 2. URL параметр tgWebAppStartParam
 * @returns значение startapp параметра или null
 */
export function getStartAppParam(): string | null {
  if (!isTelegramAvailable()) {
    return null;
  }

  const tg = window.Telegram?.WebApp;
  if (!tg) {
    return null;
  }

  // Приоритет 1: из initDataUnsafe.start_param
  const startParam = tg.initDataUnsafe?.start_param;
  if (startParam) {
    return startParam;
  }

  // Приоритет 2: из URL параметра tgWebAppStartParam
  const urlParams = new URLSearchParams(window.location.search);
  const urlStartParam = urlParams.get("tgWebAppStartParam");
  if (urlStartParam) {
    return urlStartParam;
  }

  return null;
}

/**
 * Обрабатывает deep link из Telegram
 * Декодирует startapp параметр и сохраняет целевой URL для редиректа после авторизации
 * @returns декодированный путь или null (если невалидный или ошибка)
 */
export function processTelegramDeepLink(): string | null {
  try {
    if (!isTelegramAvailable()) {
      return null;
    }

    const startAppParam = getStartAppParam();
    if (!startAppParam) {
      return null;
    }

    // Декодируем base64url в путь
    const decodedPath = decodeStartAppParam(startAppParam);
    if (!decodedPath) {
      console.warn("Не удалось декодировать startapp параметр:", startAppParam);
      return null;
    }

    // Валидируем путь перед сохранением
    if (!isValidDeepLinkPath(decodedPath)) {
      console.warn("Невалидный deep link путь:", decodedPath);
      return null;
    }

    // Сохраняем целевой путь для редиректа после авторизации
    try {
      sessionStorage.setItem(STORAGE_KEY, decodedPath);
      console.log("Deep link сохранен для редиректа:", decodedPath);
    } catch (error) {
      console.error("Ошибка сохранения deep link:", error);
      return null;
    }

    return decodedPath;
  } catch (error) {
    // Обработка любых неожиданных ошибок
    console.error("Неожиданная ошибка при обработке deep link:", error);
    return null;
  }
}

/**
 * Получает сохраненный целевой URL из deep link
 * @returns путь для редиректа или null
 */
export function getSavedDeepLinkTarget(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Ошибка получения сохраненного deep link:", error);
    return null;
  }
}

/**
 * Очищает сохраненный deep link после использования
 */
export function clearSavedDeepLink(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Ошибка очистки deep link:", error);
  }
}

/**
 * Валидирует путь deep link
 * Проверяет, что путь является валидным маршрутом приложения
 * @param path - путь для валидации
 * @returns true если путь валиден, false если нет
 */
export function isValidDeepLinkPath(path: string): boolean {
  if (!path || !path.startsWith("/")) {
    return false;
  }

  // Проверяем, что путь не содержит опасных символов
  // Разрешаем только буквы, цифры, слэши, дефисы, подчеркивания, знаки вопроса и амперсанды
  const validPathPattern = /^\/[a-zA-Z0-9\/\-_?&=]*$/;
  if (!validPathPattern.test(path)) {
    return false;
  }

  // Проверяем, что путь начинается с известных маршрутов приложения
  const validRoutes = [
    "/app",
    "/app/dashboard",
    "/app/bid",
    "/app/quiz",
    "/app/payment",
    "/app/notification",
    "/app/referral",
  ];

  // Проверяем, что путь начинается с одного из валидных маршрутов
  return validRoutes.some((route) => path.startsWith(route));
}
