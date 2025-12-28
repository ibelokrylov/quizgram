import { AppContext } from "@/app/context/app.context";
import { Loader } from "@/components/loader";
import { useContext, useEffect, useState, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../User/User.type";
import { AuthContext } from "./auth.context";
import { useUser } from "./useUser";
import { useUserPlan } from "./useUserPlan";

export const AuthContextProvider = (props: PropsWithChildren) => {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [user, setUser] = useState<undefined | User>(undefined);
  const { i18n } = useTranslation();

  const appCtx = useContext(AppContext);

  const { query } = useUser();
  const { query: planQuery } = useUserPlan();

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
      setIsAuth(true);

      // Устанавливаем язык из профиля пользователя, если он есть
      // Но только если текущий язык в i18n не совпадает с языком из БД
      // Это предотвращает перезапись языка, который пользователь только что выбрал
      if (query.data.language && (query.data.language === "en" || query.data.language === "ru")) {
        const currentLang = i18n.language || "en";
        const normalizedCurrentLang = currentLang.startsWith("ru")
          ? "ru"
          : currentLang.startsWith("en")
            ? "en"
            : currentLang;

        // Устанавливаем язык только если он отличается от текущего
        if (normalizedCurrentLang !== query.data.language) {
          i18n.changeLanguage(query.data.language);
        }
      }
    }
  }, [query.data, i18n]);

  // Сохраняем план в sessionStorage когда он загружен
  useEffect(() => {
    if (planQuery.data) {
      try {
        sessionStorage.setItem("userPlan", JSON.stringify(planQuery.data));
      } catch (error) {
        console.error("Ошибка при сохранении плана в sessionStorage:", error);
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
      }}
    >
      {appCtx.loading ? <Loader /> : props.children}
    </AuthContext.Provider>
  );
};
