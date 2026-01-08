import { ContextHole } from "@/app/context/context.hole";
import { queryClinet } from "@/app/query-client";
import { AuthContext } from "@/entities/User/auth.context";
import {
  getStartAppParam,
  isValidDeepLinkPath,
  processTelegramDeepLink,
} from "@/lib/telegram-deep-link";
import { isTelegramAvailable } from "@/lib/telegram-sdk";
import NotFound from "@/pages/404";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";

const RootLayout = () => {
  const navigate = useNavigate();
  const { isAuth } = useContext(AuthContext);
  const { t } = useTranslation("common");

  // Обработка deep links из Telegram при загрузке приложения
  useEffect(() => {
    try {
      // Обрабатываем deep link только если Telegram доступен
      if (!isTelegramAvailable()) {
        return;
      }

      // Проверяем наличие параметра startapp
      const startAppParam = getStartAppParam();
      if (!startAppParam) {
        return;
      }

      // Обрабатываем deep link и сохраняем целевой путь
      const decodedPath = processTelegramDeepLink();
      if (decodedPath) {
        console.log("Обработан Telegram deep link:", decodedPath);

        // Валидируем путь перед использованием (дополнительная проверка)
        if (!isValidDeepLinkPath(decodedPath)) {
          console.warn("Невалидный deep link путь:", decodedPath);
          toast.error(t("telegram.auth.deepLink.invalid"));
          return;
        }

        // Если пользователь уже авторизован - сразу редиректим на целевой путь
        if (isAuth) {
          try {
            navigate({ to: decodedPath as any });
          } catch (error) {
            // Если навигация не удалась - показываем ошибку и редиректим на dashboard
            console.error("Ошибка навигации на deep link:", error);
            toast.error(t("telegram.auth.deepLink.invalid"));
            navigate({ to: "/app/dashboard" });
          }
          return;
        }

        // Если пользователь не авторизован - редиректим на страницу Telegram авторизации
        // Страница telegram-auth сама обработает авторизацию и затем редиректит на сохраненный путь
        navigate({ to: "/telegram-auth" });
      }
    } catch (error) {
      // Обработка любых неожиданных ошибок при обработке deep link
      console.error("Неожиданная ошибка при обработке deep link в __root:", error);
      // Не показываем toast, чтобы не беспокоить пользователя при обычной загрузке
    }
  }, [isAuth, navigate, t]);

  return (
    <QueryClientProvider client={queryClinet}>
      <ContextHole>
        <Outlet />
        <Toaster />
      </ContextHole>
    </QueryClientProvider>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});
