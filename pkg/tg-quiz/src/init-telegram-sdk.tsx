import type { TelegramWebApp } from './types/telegram-webapp';

/**
 * Получает экземпляр Telegram WebApp
 */
function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Инициализация Telegram SDK
 * Документация: https://core.telegram.org/bots/webapps#initializing-mini-apps
 */
export async function initTelegramSdk() {
  const tg = getTelegramWebApp();

  if (!tg) {
    console.warn('Telegram WebApp не доступен');
    return;
  }

  // Уведомляем Telegram, что приложение готово
  tg.ready();

  // Настраиваем стили
  tg.expand();

  // Переводим приложение в полноэкранный режим (убирает верхнюю и нижнюю панели Telegram)
  // Оборачиваем в try-catch, т.к. метод может выбросить ошибку в старых версиях Telegram
  if (typeof tg.requestFullscreen === 'function') {
    try {
      tg.requestFullscreen();
    } catch (e) {
      console.log('[initTelegramSdk] requestFullscreen не поддерживается:', e);
    }
  }

  console.log(tg);
}
