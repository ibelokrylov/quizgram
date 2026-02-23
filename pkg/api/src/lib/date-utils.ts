// Утилиты для работы с датами используя Luxon
// Luxon обеспечивает более надёжную работу с датами и часовыми поясами

import { DateTime } from 'luxon';

/**
 * Часовой пояс по умолчанию для приложения
 * Можно настроить через переменную окружения
 */
const DEFAULT_TIMEZONE = process.env.TZ || 'UTC';

/**
 * Получить текущую дату/время в указанном часовом поясе
 */
export function now(timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.now().setZone(timezone);
}

/**
 * Получить начало текущего дня (00:00:00)
 */
export function startOfToday(timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.now().setZone(timezone).startOf('day');
}

/**
 * Получить конец текущего дня (23:59:59.999)
 */
export function endOfToday(timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.now().setZone(timezone).endOf('day');
}

/**
 * Добавить дни к дате
 */
export function addDays(date: DateTime | Date, days: number): DateTime {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.plus({ days });
}

/**
 * Добавить месяцы к дате
 */
export function addMonths(date: DateTime | Date, months: number): DateTime {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.plus({ months });
}

/**
 * Установить время для даты (часы, минуты, секунды)
 */
export function setTime(
  date: DateTime | Date,
  hours: number,
  minutes: number = 0,
  seconds: number = 0,
  milliseconds: number = 0
): DateTime {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.set({ hour: hours, minute: minutes, second: seconds, millisecond: milliseconds });
}

/**
 * Преобразовать DateTime в JavaScript Date
 */
export function toJSDate(date: DateTime): Date {
  return date.toJSDate();
}

/**
 * Преобразовать JavaScript Date в DateTime
 */
export function fromJSDate(date: Date, timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.fromJSDate(date).setZone(timezone);
}

/**
 * Преобразовать строку ISO в DateTime
 */
export function fromISO(iso: string, timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.fromISO(iso).setZone(timezone);
}

/**
 * Форматировать дату в ISO строку
 */
export function toISO(date: DateTime | Date): string {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.toISO() || '';
}

/**
 * Форматировать дату в читаемый формат
 */
export function format(date: DateTime | Date, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.toFormat(format);
}

/**
 * Форматировать дату только дата (без времени)
 */
export function formatDate(date: DateTime | Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Форматировать дату для отображения пользователю
 */
export function formatUserDate(date: DateTime | Date, locale: string = 'ru'): string {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.setLocale(locale).toLocaleString(DateTime.DATE_FULL);
}

/**
 * Сравнить две даты
 * @returns true если date1 < date2
 */
export function isBefore(date1: DateTime | Date, date2: DateTime | Date): boolean {
  const dt1 = date1 instanceof Date ? DateTime.fromJSDate(date1) : date1;
  const dt2 = date2 instanceof Date ? DateTime.fromJSDate(date2) : date2;
  return dt1 < dt2;
}

/**
 * Сравнить две даты
 * @returns true если date1 > date2
 */
export function isAfter(date1: DateTime | Date, date2: DateTime | Date): boolean {
  const dt1 = date1 instanceof Date ? DateTime.fromJSDate(date1) : date1;
  const dt2 = date2 instanceof Date ? DateTime.fromJSDate(date2) : date2;
  return dt1 > dt2;
}

/**
 * Проверить, находится ли дата между двумя датами (исключая границы)
 */
export function isBetween(
  date: DateTime | Date,
  start: DateTime | Date,
  end: DateTime | Date
): boolean {
  return isAfter(date, start) && isBefore(date, end);
}

/**
 * Проверить, находится ли дата между двумя датами (включая границы)
 * @returns true если start <= date <= end
 */
export function isBetweenInclusive(
  date: DateTime | Date,
  start: DateTime | Date,
  end: DateTime | Date
): boolean {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  const dtStart = start instanceof Date ? DateTime.fromJSDate(start) : start;
  const dtEnd = end instanceof Date ? DateTime.fromJSDate(end) : end;
  return dt >= dtStart && dt <= dtEnd;
}

/**
 * Получить количество дней между двумя датами
 */
export function daysBetween(date1: DateTime | Date, date2: DateTime | Date): number {
  const dt1 = date1 instanceof Date ? DateTime.fromJSDate(date1) : date1;
  const dt2 = date2 instanceof Date ? DateTime.fromJSDate(date2) : date2;
  return Math.floor(dt2.diff(dt1, 'days').days);
}

/**
 * Вычислить дату окончания подписки (+1 месяц, 23:59:00)
 */
export function calculateSubscriptionEndDate(
  startDate?: DateTime | Date,
  timezone: string = DEFAULT_TIMEZONE
): DateTime {
  const start = startDate
    ? startDate instanceof Date
      ? DateTime.fromJSDate(startDate)
      : startDate
    : DateTime.now().setZone(timezone);

  return start.plus({ months: 1 }).set({ hour: 23, minute: 59, second: 0, millisecond: 0 });
}

/**
 * Вычислить дату через N дней с установкой времени в конец дня
 */
export function calculateDatePlusDaysEndOfDay(
  days: number,
  startDate?: DateTime | Date,
  timezone: string = DEFAULT_TIMEZONE
): DateTime {
  const start = startDate
    ? startDate instanceof Date
      ? DateTime.fromJSDate(startDate)
      : startDate
    : DateTime.now().setZone(timezone);

  return start.plus({ days }).set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
}

/**
 * Проверить, является ли дата сегодняшней
 */
export function isToday(date: DateTime | Date, timezone: string = DEFAULT_TIMEZONE): boolean {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  const today = DateTime.now().setZone(timezone);
  return dt.hasSame(today, 'day');
}

/**
 * Проверить, находится ли текущее время в указанном диапазоне часов
 * @param startHour - начальный час (например, 0 для 00:00)
 * @param endHour - конечный час (например, 2 для 02:00)
 */
export function isWithinHourRange(
  startHour: number,
  endHour: number,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  return hour >= startHour && hour < endHour;
}
