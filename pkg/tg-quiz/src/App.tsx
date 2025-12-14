import '@telegram-apps/telegram-ui/dist/styles.css';

import { AppRoot } from '@telegram-apps/telegram-ui';
import { AppContextProvider } from './App.context.provider';
import { Content } from './Content';

function App() {
  // const launchParams = useLaunchParams();
  // const isTelegramMiniApp = !!launchParams.platform;

  // useEffect(() => {
  //   // Если это Telegram Mini App - ничего не делаем (Telegram управляет темой)
  //   if (isTelegramMiniApp) {
  //     return;
  //   }

  //   // Если это браузер - добавляем автодетект темы
  //   const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  //   const updateTheme = (e: MediaQueryList | MediaQueryListEvent) => {
  //     if (e.matches) {
  //       document.body.classList.add('dark');
  //       document.body.classList.remove('light');
  //     } else {
  //       document.body.classList.add('light');
  //       document.body.classList.remove('dark');
  //     }
  //   };

  //   // Установить тему при монтировании
  //   updateTheme(mediaQuery);

  //   // Слушать изменения темы
  //   mediaQuery.addEventListener('change', updateTheme);

  //   return () => {
  //     mediaQuery.removeEventListener('change', updateTheme);
  //   };
  // }, [isTelegramMiniApp]);

  return (
    <AppContextProvider>
      <AppRoot className='app'>
        <Content />
      </AppRoot>
    </AppContextProvider>
  );
}

export default App;
