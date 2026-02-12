import type { TelegramWebApp } from "../types/telegram-webapp";

/**
 * Получает экземпляр Telegram WebApp
 */
function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Проверяет, доступно ли Telegram окружение
 */
export function isTelegramAvailable(): boolean {
  return getTelegramWebApp() !== null;
}

/**
 * Инициализация Telegram SDK
 * Документация: https://core.telegram.org/bots/webapps#initializing-mini-apps
 */
export async function initTelegramSdk() {
  const tg = getTelegramWebApp();

  if (!tg) {
    // В обычном браузере Telegram недоступен - это нормально
    // Не логируем ошибку, чтобы не засорять консоль
    return;
  }

  // Уведомляем Telegram, что приложение готово
  tg.ready();

  document.body.style.setProperty(
    "padding-top",
    "calc(var(--tg-content-safe-area-inset-top) + 2rem)",
  );

  // Настраиваем стили
  tg.expand();

  // Переводим приложение в полноэкранный режим (убирает верхнюю и нижнюю панели Telegram)
  if (typeof tg.requestFullscreen === "function") {
    tg.requestFullscreen();
  }
}
