# Dockerfile для Frontend App
# Сборка: docker build -f Dockerfile.app -t quizgram-app .
# Запуск с обычной сетью: docker run -p 5173:5173 quizgram-app
# Запуск с host network: docker run --network host quizgram-app
# Примечание: переменные окружения загружаются из pkg/app/.env во время сборки
# При host network nginx будет слушать на порту 5173 хоста напрямую

# ============================================
# Этап 1: Сборка приложения
# ============================================
FROM oven/bun:latest AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем корневые файлы для workspaces
COPY package.json bun.lock ./

# Копируем все пакеты (нужно для правильной работы lockfile)
COPY pkg/ ./pkg/

# Устанавливаем все зависимости (включая dev для сборки)
RUN bun install --linker=isolated

# Переходим в директорию app
WORKDIR /app/pkg/app

# Vite автоматически загружает переменные из .env файла в корне проекта
# .env файл уже скопирован через COPY pkg/ выше
# Устанавливаем NODE_ENV для production сборки
ENV NODE_ENV=production

# Ограничиваем память для сборки (важно для серверов с малым RAM)
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Собираем приложение (Vite автоматически использует переменные из .env)
RUN bun run build

# ============================================
# Этап 2: Nginx для статики
# ============================================
FROM nginx:alpine AS runner

# Копируем собранные файлы из этапа сборки
COPY --from=builder /app/pkg/app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx для SPA (client-side routing)
RUN echo 'server { \
    listen 5173; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript; \
    \
    # SPA routing - все запросы на index.html \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Кеширование статических файлов \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Открываем порт 5173
EXPOSE 5173

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
