import { isTelegramAvailable } from '@/lib/telegram-sdk';
import http from '@/lib/http';
import type { User } from '@/entities/User/User.type';
import { useState, useCallback } from 'react';

type TelegramAuthResult =
  | { success: true; user: User; requiresVerification: boolean }
  | { success: false; requiresRegistration: boolean; error?: string };

/**
 * Хук для работы с Telegram авторизацией
 */
export function useTelegramAuth() {
  const [loading, setLoading] = useState(false);

  /**
   * Получает initData из Telegram WebApp
   */
  const getInitData = useCallback((): string | null => {
    if (!isTelegramAvailable()) {
      return null;
    }

    const tg = window.Telegram?.WebApp;
    return tg?.initData || null;
  }, []);

  /**
   * Получает данные пользователя из Telegram WebApp (unsafe, только для UI)
   */
  const getTelegramUser = useCallback(() => {
    if (!isTelegramAvailable()) {
      return null;
    }

    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user || null;
  }, []);

  /**
   * Авторизация через Telegram
   */
  const login = useCallback(async (): Promise<TelegramAuthResult> => {
    if (!isTelegramAvailable()) {
      return {
        success: false,
        requiresRegistration: false,
        error: 'Telegram недоступен',
      };
    }

    const initData = getInitData();
    if (!initData) {
      return {
        success: false,
        requiresRegistration: true,
        error: 'InitData не найден',
      };
    }

    setLoading(true);

    try {
      const res = await http<User>({
        url: '/v1/auth/telegram/login',
        method: 'POST',
        body: { initData },
      });

      if (res.data) {
        // Пользователь найден и авторизован
        return {
          success: true,
          user: res.data,
          requiresVerification: !res.data.isVerification,
        };
      } else if (res.message === 'registration_required' || (res as any).requiresRegistration) {
        // Пользователь не найден - требуется регистрация
        return {
          success: false,
          requiresRegistration: true,
        };
      } else {
        // Другая ошибка
        return {
          success: false,
          requiresRegistration: false,
          error: res.message || 'Ошибка авторизации',
        };
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.error || 'Ошибка авторизации';
      return {
        success: false,
        requiresRegistration: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [getInitData]);

  /**
   * Регистрация через Telegram
   */
  const register = useCallback(
    async (email: string, name?: string, language?: string): Promise<TelegramAuthResult> => {
      if (!isTelegramAvailable()) {
        return {
          success: false,
          requiresRegistration: false,
          error: 'Telegram недоступен',
        };
      }

      const initData = getInitData();
      if (!initData) {
        return {
          success: false,
          requiresRegistration: false,
          error: 'InitData не найден',
        };
      }

      setLoading(true);

      try {
        const res = await http<User>({
          url: '/v1/auth/telegram/register',
          method: 'POST',
          body: {
            initData,
            email,
            name,
            language,
          },
        });

        if (res.data) {
          // Пользователь зарегистрирован и авторизован
          return {
            success: true,
            user: res.data,
            requiresVerification: !res.data.isVerification,
          };
        } else {
          return {
            success: false,
            requiresRegistration: false,
            error: res.message || 'Ошибка регистрации',
          };
        }
      } catch (err: any) {
        const errorMessage = err?.message || err?.error || 'Ошибка регистрации';
        return {
          success: false,
          requiresRegistration: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [getInitData]
  );

  return {
    loading,
    isTelegramAvailable: isTelegramAvailable(),
    getInitData,
    getTelegramUser,
    login,
    register,
  };
}
