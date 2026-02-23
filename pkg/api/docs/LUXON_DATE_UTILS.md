# Работа с датами в API используя Luxon

Этот документ описывает использование библиотеки [Luxon](https://moment.github.io/luxon/) для работы с датами в API.

## Зачем Luxon?

Luxon обеспечивает:

- ✅ Надёжную работу с часовыми поясами
- ✅ Удобное API для манипуляций с датами
- ✅ Иммутабельность (в отличие от нативного Date)
- ✅ Меньше ошибок при форматировании и вычислениях
- ✅ Современный TypeScript support

## Утилиты

Все утилиты находятся в `/src/lib/date-utils.ts`

### Основные функции

#### Получение текущей даты/времени

```typescript
import * as DateUtils from '../lib/date-utils';

// Текущая дата/время
const now = DateUtils.now();

// Начало текущего дня (00:00:00)
const startOfDay = DateUtils.startOfToday();

// Конец текущего дня (23:59:59.999)
const endOfDay = DateUtils.endOfToday();
```

#### Манипуляции с датами

```typescript
// Добавить дни
const tomorrow = DateUtils.addDays(now, 1);
const nextWeek = DateUtils.addDays(now, 7);

// Добавить месяцы
const nextMonth = DateUtils.addMonths(now, 1);

// Установить конкретное время
const nineAM = DateUtils.setTime(now, 9, 0, 0); // 09:00:00
```

#### Форматирование

```typescript
// ISO строка
const iso = DateUtils.toISO(now); // "2025-12-24T19:52:17.000Z"

// Только дата
const date = DateUtils.formatDate(now); // "2025-12-24"

// Кастомный формат
const custom = DateUtils.format(now, 'dd.MM.yyyy HH:mm'); // "24.12.2025 19:52"

// Для отображения пользователю (локализованный)
const userDate = DateUtils.formatUserDate(now, 'ru'); // "24 декабря 2025 г."
```

#### Сравнение дат

```typescript
const date1 = DateUtils.now();
const date2 = DateUtils.addDays(date1, 1);

// Проверка порядка
if (DateUtils.isBefore(date1, date2)) {
  console.log('date1 раньше date2');
}

if (DateUtils.isAfter(date2, date1)) {
  console.log('date2 позже date1');
}

// Проверка диапазона
if (DateUtils.isBetween(now, date1, date2)) {
  console.log('now находится между date1 и date2');
}

// Разница в днях
const days = DateUtils.daysBetween(date1, date2); // 1
```

#### Преобразования

```typescript
// DateTime → JavaScript Date (для сохранения в БД)
const jsDate = DateUtils.toJSDate(now);

// JavaScript Date → DateTime
const dateTime = DateUtils.fromJSDate(jsDate);

// ISO строка → DateTime
const fromISO = DateUtils.fromISO('2025-12-24T19:52:17.000Z');
```

### Специфичные для бизнес-логики

```typescript
// Вычислить дату окончания подписки (+1 месяц, 23:59:00)
const endDate = DateUtils.calculateSubscriptionEndDate();
const endDateFromToday = DateUtils.calculateSubscriptionEndDate(DateUtils.now());

// Вычислить дату через N дней с концом дня
const in7Days = DateUtils.calculateDatePlusDaysEndOfDay(7);

// Проверить, сегодня ли эта дата
if (DateUtils.isToday(someDate)) {
  console.log('Эта дата сегодня');
}

// Проверить, находимся ли мы в диапазоне часов (для планировщика)
if (DateUtils.isWithinHourRange(0, 2)) {
  console.log('Сейчас между 00:00 и 02:00');
}
```

## Примеры использования

### В Scheduler Service

```typescript
// ❌ Старый подход с Date
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
const twoDaysLater = new Date(today);
twoDaysLater.setDate(twoDaysLater.getDate() + 2);
twoDaysLater.setHours(23, 59, 59, 999);

// ✅ Новый подход с Luxon
const now = DateUtils.now();
const today = DateUtils.startOfToday();
const twoDaysLater = DateUtils.calculateDatePlusDaysEndOfDay(2);
```

### Продление подписки

```typescript
// ❌ Старый подход
const newFinalDayAt = new Date(today);
newFinalDayAt.setMonth(newFinalDayAt.getMonth() + 1);
newFinalDayAt.setHours(23, 59, 0, 0);

// ✅ Новый подход
const newFinalDayAt = DateUtils.calculateSubscriptionEndDate(today);
```

### Сохранение в БД

```typescript
// DateTime нужно преобразовать в JavaScript Date для Drizzle ORM
await db.update(userTable).set({
  updatedAt: DateUtils.toJSDate(DateUtils.now()),
  finalDayAt: DateUtils.toJSDate(newFinalDayAt),
});
```

### Сравнение дат

```typescript
// ❌ Старый подход
if (finalDayAt < today) {
  // ...
}

// ✅ Новый подход
if (DateUtils.isBefore(finalDayAt, today)) {
  // ...
}
```

### Форматирование для писем

```typescript
// ❌ Старый подход
const expirationDate = new Date().toISOString().split('T')[0];

// ✅ Новый подход
const expirationDate = DateUtils.formatDate(DateUtils.now());
```

## Часовые пояса

По умолчанию используется UTC, но можно настроить через переменную окружения:

```bash
TZ=Europe/Moscow
```

Или явно указать при вызове функций:

```typescript
const moscowTime = DateUtils.now('Europe/Moscow');
const startOfDayMoscow = DateUtils.startOfToday('Europe/Moscow');
```

## Best Practices

1. **Всегда используйте DateUtils вместо new Date()**

   ```typescript
   // ❌ Плохо
   const now = new Date();

   // ✅ Хорошо
   const now = DateUtils.now();
   ```

2. **Преобразуйте DateTime в Date только перед сохранением в БД**

   ```typescript
   // Работайте с DateTime
   const endDate = DateUtils.calculateSubscriptionEndDate();

   // Преобразуйте перед сохранением
   await db.update(table).set({
     finalDayAt: DateUtils.toJSDate(endDate),
   });
   ```

3. **Используйте иммутабельные операции**

   ```typescript
   // DateTime иммутабелен - каждая операция возвращает новый объект
   const now = DateUtils.now();
   const tomorrow = DateUtils.addDays(now, 1);
   // now не изменился!
   ```

4. **Используйте специализированные функции**

   ```typescript
   // ❌ Плохо - сложно, подвержено ошибкам
   const date = DateUtils.now();
   const endDate = date.plus({ months: 1 }).set({ hour: 23, minute: 59, second: 0 });

   // ✅ Хорошо - явное намерение
   const endDate = DateUtils.calculateSubscriptionEndDate();
   ```

## Миграция с Date на Luxon

При миграции существующего кода:

1. Импортируйте утилиты: `import * as DateUtils from "../lib/date-utils";`
2. Замените `new Date()` на `DateUtils.now()`
3. Замените `setMonth`, `setDate`, `setHours` на соответствующие функции DateUtils
4. Замените операторы сравнения на `isBefore`, `isAfter`, `isBetween`
5. Добавьте `toJSDate()` при сохранении в БД
6. Запустите тесты чтобы убедиться что всё работает

## Дополнительная информация

- [Luxon Documentation](https://moment.github.io/luxon/#/)
- [Luxon API Reference](https://moment.github.io/luxon/api-docs/index.html)
