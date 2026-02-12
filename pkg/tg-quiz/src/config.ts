/**
 * Конфигурация приложения
 * Централизованное хранение переменных окружения и констант
 */

export const API_BASE_URL = import.meta.env.VITE_TG_QUIZ_API_URL || 'http://localhost:5001';
export const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || 'https://quizgram.ru';
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.quizgram.site';
