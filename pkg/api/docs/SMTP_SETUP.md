# Настройка SMTP для отправки email

## Общие переменные окружения

Добавьте в `.env` файл следующие переменные:

```env
MAIL_HOST=smtp.example.com
MAIL_PORT=465
MAIL_USER=your_email@example.com
MAIL_PASS=your_password_or_app_password
APP_NAME=Quizgram
```

---

## Yandex Mail (Яндекс.Почта)

### Настройка

```env
MAIL_HOST=smtp.yandex.ru
MAIL_PORT=465
MAIL_USER=your_email@yandex.ru
MAIL_PASS=your_app_password
```

### ⚠️ Важно для Yandex:

1. **Используйте пароль приложения, а не обычный пароль от почты**
2. **Как создать пароль приложения:**
   - Перейдите на https://passport.yandex.ru/profile
   - Откройте раздел "Пароли и авторизация"
   - Найдите "Пароли приложений"
   - Создайте новый пароль для "Почта"
   - Используйте этот пароль в `MAIL_PASS`

3. **Альтернативный порт:** Можно использовать `MAIL_PORT=587` с STARTTLS

### Типичные ошибки Yandex:

- **"Authentication failed"** - используется обычный пароль вместо пароля приложения
- **"Connection timeout"** - проверьте firewall и доступность smtp.yandex.ru:465
- **"Invalid login or password"** - неправильный email или пароль приложения

---

## Gmail

### Настройка

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

### ⚠️ Важно для Gmail:

1. **Обязательно используйте пароль приложения (App Password)**
2. **Как создать пароль приложения:**
   - Включите двухфакторную аутентификацию
   - Перейдите на https://myaccount.google.com/apppasswords
   - Создайте пароль для "Mail" или "Other"
   - Используйте сгенерированный 16-символьный пароль

3. **Альтернативный порт:** `MAIL_PORT=587` с STARTTLS

---

## Mail.ru

### Настройка

```env
MAIL_HOST=smtp.mail.ru
MAIL_PORT=465
MAIL_USER=your_email@mail.ru
MAIL_PASS=your_app_password
```

### ⚠️ Важно для Mail.ru:

1. **Создайте пароль для внешнего приложения:**
   - Настройки → Пароль и безопасность → Пароли для внешних приложений
2. **Альтернативный порт:** `MAIL_PORT=587` с STARTTLS

---

## Mailgun (для продакшена)

```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USER=postmaster@yourdomain.mailgun.org
MAIL_PASS=your_smtp_password
```

---

## SendGrid (для продакшена)

```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASS=your_sendgrid_api_key
```

---

## Порты SMTP

- **465** - SMTP с SSL (secure: true)
- **587** - SMTP с STARTTLS (secure: false, но шифрование включается автоматически)
- **25** - Обычный SMTP без шифрования (не рекомендуется)

---

## Проверка настроек

### 1. Проверка доступности SMTP сервера

```bash
# Проверка подключения к SMTP серверу
telnet smtp.yandex.ru 465

# Или с помощью nc
nc -zv smtp.yandex.ru 465
```

### 2. Проверка отправки из контейнера

```bash
# Войти в контейнер
docker exec -it quizgram-api sh

# Проверить переменные окружения
echo $MAIL_HOST
echo $MAIL_PORT
echo $MAIL_USER
```

### 3. Просмотр логов ошибок

```bash
# Логи контейнера
docker logs -f quizgram-api

# Логи из файлов
tail -f ./logs/api/$(date +%Y-%m-%d).log | grep ERROR
```

---

## Тестирование отправки

После настройки попробуйте зарегистрироваться или восстановить пароль. В логах вы увидите:

### Успешная отправка:

```
[INFO] Email отправлен успешно { to: "user@example.com", messageId: "..." }
```

### Ошибка с деталями:

```
[ERROR] Ошибка при отправке email {
  to: "user@example.com",
  host: "smtp.yandex.ru",
  port: 465,
  errorMessage: "Invalid login or password",
  errorCode: "EAUTH",
  smtpResponse: "535 5.7.8 Error: authentication failed"
}
```

---

## Решение частых проблем

### "EAUTH: Invalid login or password"

- Используйте пароль приложения, а не обычный пароль
- Проверьте правильность email адреса в `MAIL_USER`

### "ETIMEDOUT" или "ECONNREFUSED"

- Проверьте доступность SMTP сервера
- Проверьте firewall и сетевые настройки
- Попробуйте другой порт (587 вместо 465)

### "ESOCKET: self signed certificate"

- В коде уже отключена проверка сертификата (`rejectUnauthorized: false`)
- Если проблема сохраняется, убедитесь, что используется правильный хост

### Email не приходит, но ошибок нет

- Проверьте папку "Спам"
- Проверьте лимиты отправки (некоторые провайдеры ограничивают)
- Проверьте `messageId` в логах - письмо было отправлено

---

## Безопасность

1. **Никогда не коммитьте `.env` файл с реальными паролями**
2. **Используйте пароли приложений, а не основные пароли**
3. **Для продакшена рассмотрите использование сервисов типа Mailgun или SendGrid**
4. **Храните пароли в секретах Docker/Kubernetes на проде**
