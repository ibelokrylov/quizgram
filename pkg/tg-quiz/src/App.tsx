import "@telegram-apps/telegram-ui/dist/styles.css";

import { AppRoot } from "@telegram-apps/telegram-ui";
import { useEffect, useState } from "react";
import { AppContextProvider } from "./App.context.provider";
import { Content } from "./Content";

function App() {
  const [theme, setTheme] = useState<'light' | 'dark' | undefined>('light')
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        setTheme('dark')
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        setTheme('light')
        document.body.classList.add("light");
        document.body.classList.remove("dark");
      }
    };

    // Установить тему при монтировании
    updateTheme(mediaQuery);

    // Слушать изменения темы
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
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
