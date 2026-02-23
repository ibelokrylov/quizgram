import { AuthContext } from '@/entities/User/auth.context';
import { EmailInput } from '@/pages/TelegramAuth/EmailInput';
import { EmailVerification } from '@/pages/TelegramAuth/EmailVerification';
import {
  clearSavedDeepLink,
  getSavedDeepLinkTarget,
  isValidDeepLinkPath,
} from '@/lib/telegram-deep-link';
import { isTelegramAvailable } from '@/lib/telegram-sdk';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { queryClinet } from '@/app/query-client';

export const Route = createFileRoute('/telegram-auth')({
  component: TelegramAuth,
});

type AuthStage = 'loading' | 'login' | 'email-input' | 'email-verification' | 'success';

function TelegramAuth() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { setIsAuth, setUser, isAuth } = useContext(AuthContext);
  const telegramAuth = useTelegramAuth();
  const [stage, setStage] = useState<AuthStage>('loading');
  console.log('telegram auth');

  // Проверяем доступность Telegram при монтировании
  useEffect(() => {
    if (!isTelegramAvailable()) {
      // Если Telegram недоступен - редиректим на главную
      navigate({ to: '/' });
      return;
    }

    // Если пользователь уже авторизован - проверяем deep link
    if (isAuth) {
      handleSuccessRedirect();
      return;
    }

    // Пытаемся авторизоваться через Telegram
    handleTelegramLogin().catch((error) => {
      // Обработка неожиданных ошибок
      console.error('Неожиданная ошибка при авторизации через Telegram:', error);
      toast.error(t('telegram.auth.login.error'));
      setStage('email-input');
    });
  }, [isAuth, navigate, t]);

  const handleTelegramLogin = async () => {
    if (!telegramAuth.isTelegramAvailable) {
      return;
    }

    const initData = telegramAuth.getInitData();
    if (!initData) {
      // Если нет initData - показываем форму ввода email
      setStage('email-input');
      return;
    }

    setStage('loading');

    const result = await telegramAuth.login();

    if (result.success) {
      // Пользователь найден и авторизован
      setIsAuth(true);
      setUser(result.user);
      queryClinet.invalidateQueries({ queryKey: ['user'] });
      queryClinet.invalidateQueries({ queryKey: ['user-plan'] });

      // Проверяем, нужна ли верификация email
      if (result.requiresVerification) {
        setStage('email-verification');
      } else {
        // Email уже верифицирован - редиректим на сохраненный URL или /app
        handleSuccessRedirect();
      }
    } else if (result.requiresRegistration) {
      // Пользователь не найден - требуется регистрация
      setStage('email-input');
    } else {
      setStage('email-input');
    }
  };

  const handleEmailSubmit = async (email: string) => {
    if (!telegramAuth.isTelegramAvailable) {
      toast.error(t('telegram.auth.initData.missing'));
      return;
    }

    const initData = telegramAuth.getInitData();
    if (!initData) {
      toast.error(t('telegram.auth.initData.missing'));
      return;
    }

    try {
      // Получаем данные пользователя из Telegram для имени и языка
      const tgUser = telegramAuth.getTelegramUser();
      const name = tgUser
        ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
        : undefined;
      const language = tgUser?.language_code?.substring(0, 2) || undefined;

      const result = await telegramAuth.register(email, name, language);

      if (result.success) {
        // Пользователь зарегистрирован и авторизован
        setIsAuth(true);
        setUser(result.user);
        queryClinet.invalidateQueries({ queryKey: ['user'] });
        queryClinet.invalidateQueries({ queryKey: ['user-plan'] });

        // Переходим к верификации email
        setStage('email-verification');
      } else {
        toast.error(result.error || t('telegram.auth.register.error'));
      }
    } catch (error) {
      // Обработка неожиданных ошибок
      console.error('Неожиданная ошибка при регистрации через Telegram:', error);
      toast.error(t('telegram.auth.register.error'));
    }
  };

  const handleVerificationSuccess = () => {
    setStage('success');
    handleSuccessRedirect();
  };

  const handleSuccessRedirect = () => {
    const savedTarget = getSavedDeepLinkTarget();
    if (savedTarget) {
      // Валидируем путь перед редиректом
      if (isValidDeepLinkPath(savedTarget)) {
        clearSavedDeepLink();
        try {
          navigate({ to: savedTarget as any });
        } catch (error) {
          // Если навигация не удалась (невалидный маршрут) - показываем ошибку и редиректим на dashboard
          console.error('Ошибка навигации на deep link:', error);
          toast.error(t('telegram.auth.deepLink.invalid'));
          clearSavedDeepLink();
          navigate({ to: '/app/dashboard' });
        }
      } else {
        // Невалидный путь - показываем ошибку и редиректим на dashboard
        console.warn('Невалидный deep link путь:', savedTarget);
        toast.error(t('telegram.auth.deepLink.invalid'));
        clearSavedDeepLink();
        navigate({ to: '/app/dashboard' });
      }
    } else {
      // Нет сохраненного deep link - редиректим на dashboard
      navigate({ to: '/app/dashboard' });
    }
  };

  if (stage === 'loading') {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent" />
            <div className="text-center">{t('telegram.auth.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-[1200px]">
        {/* Кнопки переключения темы и языка в самом верху страницы */}
        <div className="flex justify-end gap-2 pb-6 md:pb-10">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        {/* Основной контент */}
        <div className="flex w-full items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="w-full max-w-sm">
              {stage === 'email-input' && (
                <EmailInput onSubmit={handleEmailSubmit} loading={telegramAuth.loading} />
              )}
              {stage === 'email-verification' && (
                <EmailVerification onSuccess={handleVerificationSuccess} />
              )}
              {stage === 'success' && (
                <div className="text-center">{t('telegram.auth.success')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
