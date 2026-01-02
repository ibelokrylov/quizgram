import "@telegram-apps/telegram-ui/dist/styles.css";

import { AppRoot } from "@telegram-apps/telegram-ui";
import { useEffect, useState } from "react";
import { AppContextProvider } from "./App.context.provider";
import { Content } from "./Content";

function App() {
  const [theme, setTheme] = useState<"light" | "dark" | undefined>("light");
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
      document.body.classList.remove("light", "dark");
      document.body.classList.add(newTheme);
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

  return (
    <AppContextProvider>
      <AppRoot className="app" appearance={theme}>
        <Content />
      </AppRoot>
    </AppContextProvider>
  );
}

export default App;
