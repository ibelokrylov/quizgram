import { Text } from "@telegram-apps/telegram-ui";
import { type PropsWithChildren, useContext, useEffect, useState } from "react";
import { AppContext } from "./App.context";
import type { SafeAreaInset } from "./types/telegram-webapp";

/**
 * Хук для получения безопасной зоны контента из Telegram SDK
 */
function useContentSafeAreaInset(): SafeAreaInset | null {
  const [safeAreaInset, setSafeAreaInset] = useState<SafeAreaInset | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      return;
    }

    // Получаем начальное значение
    if (tg.contentSafeAreaInset) {
      setSafeAreaInset(tg.contentSafeAreaInset);
    }

    // Слушаем изменения безопасной зоны
    const handleContentSafeAreaChanged = (event: unknown) => {
      const safeAreaEvent = event as { inset: SafeAreaInset };
      if (safeAreaEvent?.inset) {
        setSafeAreaInset(safeAreaEvent.inset);
      }
    };

    // Подписываемся на событие изменения безопасной зоны контента
    tg.onEvent?.("contentSafeAreaChanged", handleContentSafeAreaChanged);

    return () => {
      tg.offEvent?.("contentSafeAreaChanged", handleContentSafeAreaChanged);
    };
  }, []);

  return safeAreaInset;
}

export const ContentLayout = (props: PropsWithChildren) => {
  const { quiz } = useContext(AppContext);
  const safeAreaInset = useContentSafeAreaInset();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Определяем текущую тему (используем тот же подход, что и в App.tsx)
  useEffect(() => {
    // Функция для получения темы из --tg-color-scheme
    const getThemeFromTelegram = (): "light" | "dark" => {
      const computedStyle = window.getComputedStyle(document.body);
      const colorScheme = computedStyle.getPropertyValue("--tg-color-scheme").trim();

      // Если Telegram установил переменную, используем её
      if (colorScheme === "dark" || colorScheme === "light") {
        return colorScheme;
      }

      // Fallback на prefers-color-scheme, если переменная не установлена
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };

    const updateTheme = () => {
      const newTheme = getThemeFromTelegram();
      setTheme(newTheme);
    };

    // Установить тему при монтировании
    updateTheme();

    // Используем MutationObserver для отслеживания изменений стилей body
    const observer = new MutationObserver(() => {
      updateTheme();
    });

    // Наблюдаем за изменениями атрибутов style и class у body
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Также слушаем изменения prefers-color-scheme как fallback
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  // Устанавливаем CSS-переменные для безопасных зон
  useEffect(() => {
    const root = document.documentElement;
    const tg = window.Telegram?.WebApp;

    // Устанавливаем viewport stable height
    if (tg?.viewportStableHeight) {
      root.style.setProperty("--tg-viewport-stable-height", `${tg.viewportStableHeight}px`);
    } else {
      root.style.setProperty("--tg-viewport-stable-height", "100vh");
    }

    // Устанавливаем content safe area insets
    root.style.setProperty("--tg-content-safe-area-top", `${safeAreaInset?.top || 0}px`);
    root.style.setProperty("--tg-content-safe-area-bottom", `${safeAreaInset?.bottom || 0}px`);
    root.style.setProperty("--tg-content-safe-area-left", `${safeAreaInset?.left || 0}px`);
    root.style.setProperty("--tg-content-safe-area-right", `${safeAreaInset?.right || 0}px`);
  }, [safeAreaInset]);

  return (
    <div className="content">
      <div className="content__body">{props.children}</div>
      {quiz?.isShowLogo !== false ? (
        <div className="footer__logo">
          <Text caps weight={"3"} className="footer__logo-text">
            Сделано в
          </Text>
          <a
            className="footer__logo-button"
            href={`https://quizgram.site?utm_source=quizgram_miniapp&utm_medium=referral&uuid=${quiz?.uid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="footer__logo-item">
              <img src={theme === "dark" ? "/logo_white.png" : "/logo_dark.png"} alt="Quizgram" />
            </span>
            <span className="footer__logo-brand">Quizgram</span>
          </a>
        </div>
      ) : null}
    </div>
  );
};
