#!/bin/bash
# Скрипт для установки локального CA от mkcert
# Это нужно для того, чтобы браузер доверял локальным сертификатам

echo "Установка локального CA для mkcert..."
echo "Этот скрипт требует sudo права для установки CA в систему"
echo ""

# Проверяем наличие mkcert
MKCERT_PATH=""
if [ -f "../../mkcert" ]; then
  MKCERT_PATH="../../mkcert"
elif command -v mkcert &> /dev/null; then
  MKCERT_PATH="mkcert"
else
  echo "❌ mkcert не найден!"
  echo "Установите mkcert или используйте бинарник из корня проекта"
  exit 1
fi

echo "Используется mkcert: $MKCERT_PATH"
echo ""
echo "Запуск установки CA..."
$MKCERT_PATH -install

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Локальный CA успешно установлен!"
  echo "Теперь браузер будет доверять сертификатам, созданным через mkcert"
else
  echo ""
  echo "❌ Ошибка при установке CA"
  echo "Попробуйте выполнить вручную: sudo $MKCERT_PATH -install"
fi

