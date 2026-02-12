import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    mkcert(), // Создает доверенные SSL сертификаты (без предупреждений браузера)
  ],
  server: {
    host: true, // Открываем доступ извне (для тестирования в Telegram)
  },
});
