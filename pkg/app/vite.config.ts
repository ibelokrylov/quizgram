import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    mkcert(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    https: {},
  },
  build: {
    // Используем esbuild вместо terser (быстрее, меньше памяти)
    minify: 'esbuild',
    // Отключаем sourcemaps для production (экономит память)
    sourcemap: false,
    // Увеличиваем лимит для chunks
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Ручное разделение chunks для уменьшения потребления памяти
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
