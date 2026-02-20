import { AppContext } from '@/app/context/app.context';
import { Loader } from '@/components/loader';
import { useNavigate } from '@tanstack/react-router';
import { useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '../User/User.type';
import { AuthContext } from './auth.context';
import { useUser } from './useUser';
import { useUserPlan } from './useUserPlan';

export const AuthContextProvider = (props: PropsWithChildren) => {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [user, setUser] = useState<undefined | User>(undefined);
  const [isPaidUser, setIsPaidUser] = useState(false);

  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const authCtx = useContext(AuthContext);
  const appCtx = useContext(AppContext);

  const { query } = useUser();
  const { query: planQuery } = useUserPlan();

  useEffect(() => {
    if (query.error?.message === 'registration_required') {
      navigate({ to: '/telegram-auth' });
      return;
    }
    if (query.data) {
      setUser(query.data);
      setIsAuth(true);
      if (planQuery.data) sessionStorage.setItem('userPlan', JSON.stringify(planQuery.data));

      // Устанавливаем язык из профиля пользователя, если он есть
      // Но только если текущий язык в i18n не совпадает с языком из БД
      // Это предотвращает перезапись языка, который пользователь только что выбрал
      if (query.data.language && (query.data.language === 'en' || query.data.language === 'ru')) {
        const currentLang = i18n.language || 'en';
        const normalizedCurrentLang = currentLang.startsWith('ru') ? 'ru' : currentLang.startsWith('en') ? 'en' : currentLang;

        // Устанавливаем язык только если он отличается от текущего
        if (normalizedCurrentLang !== query.data.language) {
          i18n.changeLanguage(query.data.language);
        }
      }
      if (query.data.isAdmin || query.data.planId !== 1) authCtx.setIsPaidUser(true);
    }
  }, [query, i18n, planQuery]);

  // Сохраняем план в sessionStorage когда он загружен
  useEffect(() => {
    if (planQuery.data) {
      try {
      } catch (error) {
        console.error('Ошибка при сохранении плана в sessionStorage:', error);
      }
    }
  }, [planQuery.data]);

  useEffect(() => {
    appCtx.setLoading(query.isLoading || planQuery.isLoading);
  }, [query.isLoading, planQuery.isLoading, appCtx]);

  return (
    <AuthContext.Provider
      value={{
        isAuth,
        setIsAuth,
        user,
        setUser,
        isPaidUser,
        setIsPaidUser,
      }}
    >
      {appCtx.loading ? <Loader /> : props.children}
    </AuthContext.Provider>
  );
};
