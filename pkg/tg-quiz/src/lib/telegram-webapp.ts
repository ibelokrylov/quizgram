import type { TelegramWebApp, InitDataUnsafe } from "../types/telegram-webapp";

/**
 * Получает экземпляр Telegram WebApp
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Получает initData в сыром формате
 * В Telegram окружении данные всегда реальные, поэтому просто возвращаем то, что есть
 */
export function getRawInitData(): string | null {
  const tg = getTelegramWebApp();
  // Возвращаем initData только если он есть и не пустой
  const initData = tg?.initData;
  if (initData && initData.trim().length > 0) {
    return initData;
  }
  return null;
}

/**
 * Получает параметры запуска из URL и initData
 */
export function getLaunchParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  
  // Парсим параметры из URL
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.forEach((value, key) => {
      // Преобразуем tgWebApp* параметры
      if (key.startsWith("tgWebApp")) {
        const paramName = key.replace("tgWebApp", "").toLowerCase();
        // Преобразуем camelCase в snake_case для совместимости
        const snakeCase = paramName.replace(/([A-Z])/g, "_$1").toLowerCase();
        params[snakeCase] = value;
      } else {
        params[key] = value;
      }
    });
  }

  // Добавляем данные из initDataUnsafe
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe) {
    const initData = tg.initDataUnsafe;
    
    // Добавляем start_param если есть
    if (initData.start_param) {
      params.tgWebAppStartParam = initData.start_param;
      params.startParam = initData.start_param;
    }
    
    // Добавляем user если есть
    if (initData.user) {
      params.tgWebAppUser = initData.user;
    }
    
    // Добавляем другие поля из initData
    Object.keys(initData).forEach((key) => {
      if (!params[key]) {
        params[key] = (initData as unknown as Record<string, unknown>)[key];
      }
    });
  }

  return params;
}

/**
 * Парсит initData строку в объект
 */
export function parseInitData(initData: string): InitDataUnsafe | null {
  try {
    const params = new URLSearchParams(initData);
    const result: Partial<InitDataUnsafe> = {
      hash: params.get("hash") || "",
      auth_date: parseInt(params.get("auth_date") || "0", 10),
    };

    // Парсим query_id
    const queryId = params.get("query_id");
    if (queryId) {
      result.query_id = queryId;
    }

    // Парсим user
    const userStr = params.get("user");
    if (userStr) {
      try {
        result.user = JSON.parse(decodeURIComponent(userStr));
      } catch {
        // Игнорируем ошибки парсинга
      }
    }

    // Парсим receiver
    const receiverStr = params.get("receiver");
    if (receiverStr) {
      try {
        result.receiver = JSON.parse(decodeURIComponent(receiverStr));
      } catch {
        // Игнорируем ошибки парсинга
      }
    }

    // Парсим chat
    const chatStr = params.get("chat");
    if (chatStr) {
      try {
        result.chat = JSON.parse(decodeURIComponent(chatStr));
      } catch {
        // Игнорируем ошибки парсинга
      }
    }

    // Парсим другие поля
    const startParam = params.get("start_param");
    if (startParam) {
      result.start_param = startParam;
    }

    const chatType = params.get("chat_type");
    if (chatType) {
      result.chat_type = chatType;
    }

    const chatInstance = params.get("chat_instance");
    if (chatInstance) {
      result.chat_instance = chatInstance;
    }

    const canSendAfter = params.get("can_send_after");
    if (canSendAfter) {
      result.can_send_after = parseInt(canSendAfter, 10);
    }

    return result as InitDataUnsafe;
  } catch {
    return null;
  }
}

