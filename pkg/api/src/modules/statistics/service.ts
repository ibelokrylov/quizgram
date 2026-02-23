import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { db, quizBidTable, quizOpenTable, quizTable } from '../../db';
import {
  addDays,
  addMonths,
  formatDate as formatDateUtil,
  fromISO,
  now,
  toISO,
} from '../../lib/date-utils';
import { logger } from '../../lib/logger';
import type { StatisticsModel } from './model';

// Кеш для хранения статистики (простой in-memory кеш)
interface CacheEntry<T> {
  data: T;
  generatedAt: DateTime;
  expiresAt: DateTime;
}

// TTL для кеша в секундах (5 минут)
const CACHE_TTL = 5 * 60;

// Хранилище кеша
const dailyStatsCache = new Map<string, CacheEntry<StatisticsModel.dailyStatsResponse>>();
const abandonmentStatsCache = new Map<
  string,
  CacheEntry<StatisticsModel.abandonmentStatsResponse>
>();

// Утилита для создания ключа кеша
function createCacheKey(quizUid: string, start?: string, end?: string): string {
  return `${quizUid}:${start || ''}:${end || ''}`;
}

// Утилита для проверки валидности кеша
function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return false;
  return now() < entry.expiresAt;
}

// Утилита для безопасного преобразования в DateTime
function toDateTime(value: string | Date | DateTime | null | undefined): DateTime {
  if (value instanceof DateTime) {
    return value;
  }
  if (value instanceof Date) {
    return DateTime.fromJSDate(value);
  }
  if (typeof value === 'string') {
    const dt = DateTime.fromISO(value);
    if (!dt.isValid) {
      throw new Error(`Не удалось преобразовать значение в DateTime: ${value}`);
    }
    return dt;
  }
  throw new Error(`Не удалось преобразовать значение в DateTime: ${value}`);
}

// Утилита для генерации массива дат между start и end
function generateDateRange(start: DateTime | string, end: DateTime | string): string[] {
  const dates: string[] = [];
  const startDate = typeof start === 'string' ? fromISO(start) : start;
  const endDate = typeof end === 'string' ? fromISO(end) : end;
  let currentDate = startDate.startOf('day');

  const endDateStart = endDate.startOf('day');

  while (currentDate <= endDateStart) {
    dates.push(formatDateUtil(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export abstract class StatisticsService {
  /**
   * Получить общую статистику по дням
   */
  static async getDailyStats(
    params: StatisticsModel.queryParams
  ): Promise<StatisticsModel.dailyStatsResponse> {
    const { quiz_uid, start, end } = params;

    // Проверяем кеш
    const cacheKey = createCacheKey(quiz_uid, start, end);
    const cachedEntry = dailyStatsCache.get(cacheKey);

    if (isCacheValid(cachedEntry)) {
      logger.debug('Статистика получена из кеша', { quiz_uid, cacheKey });
      return cachedEntry!.data;
    }

    try {
      // Получаем квиз для проверки существования и даты создания
      const quizResult = await db
        .select({
          id: quizTable.id,
          createdAt: quizTable.createdAt,
        })
        .from(quizTable)
        .where(eq(quizTable.uid, quiz_uid))
        .limit(1);

      if (quizResult.length === 0) {
        throw new Error('Квиз не найден');
      }

      const quiz = quizResult[0];
      const quizCreatedAt = toDateTime(quiz.createdAt);
      const currentDate = now();

      // Определяем период
      // По умолчанию: 1 месяц с начала квиза (или до текущей даты, если квиз создан менее месяца назад)
      let startDate: DateTime;
      let endDate: DateTime;

      if (start && end) {
        // Если указаны оба параметра, используем их
        startDate = fromISO(start);
        endDate = fromISO(end);
      } else if (start) {
        // Если указан только start, end = start + 1 месяц (или текущая дата, если меньше)
        startDate = fromISO(start);
        const oneMonthLater = addMonths(startDate, 1);
        endDate = oneMonthLater < currentDate ? oneMonthLater : currentDate;
      } else if (end) {
        // Если указан только end, start = end - 1 месяц (или дата создания квиза, если больше)
        endDate = fromISO(end);
        const oneMonthEarlier = addMonths(endDate, -1);
        startDate = oneMonthEarlier > quizCreatedAt ? oneMonthEarlier : quizCreatedAt;
      } else {
        // Если не указаны оба, используем период: дата создания квиза + 1 месяц (или текущая дата)
        startDate = quizCreatedAt;
        const oneMonthLater = addMonths(quizCreatedAt, 1);
        endDate = oneMonthLater < currentDate ? oneMonthLater : currentDate;
      }

      // Убеждаемся, что даты валидны
      if (!startDate.isValid) {
        throw new Error(`Неверная дата начала: ${start} - ${startDate.invalidReason}`);
      }
      if (!endDate.isValid) {
        throw new Error(`Неверная дата окончания: ${end} - ${endDate.invalidReason}`);
      }

      // Получаем статистику из базы данных
      // Группируем по дате (используем DATE() для группировки по дням)
      // Для SQL запроса преобразуем DateTime в ISO строку
      const startDateISO = toISO(startDate);
      const endDateISO = toISO(endDate);

      // Получаем статистику из базы данных
      // total_opens = все открытия (включая повторные, first=false)
      // unique_opens = только уникальные открытия (first=true)
      //
      // Важно: повторные открытия (first=false) не создают новые записи в quiz_bid,
      // они только увеличивают счетчик в quiz_open. Поэтому для разбивки по дням
      // мы используем данные из quiz_bid (только уникальные открытия),
      // а для учета повторных открытий используем общие счетчики из quiz_open
      // и распределяем их пропорционально уникальным открытиям по дням

      // Получаем статистику по дням из quiz_bid (только уникальные открытия, которые создали записи)
      const statsResult = await db.execute<{
        date: string;
        unique_opens: string;
        completed: string;
        not_completed: string;
      }>(sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(DISTINCT key)::bigint as unique_opens,
          COUNT(*) FILTER (WHERE is_full = true)::bigint as completed,
          COUNT(*) FILTER (WHERE is_full = false)::bigint as not_completed
        FROM quiz_bid
        WHERE quiz_id = ${quiz.id}
          AND deleted_at IS NULL
          AND created_at >= ${startDateISO}::timestamp
          AND created_at <= ${endDateISO}::timestamp
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `);

      // Получаем общие счетчики из quiz_open для расчета повторных открытий
      const quizOpenStats = await db
        .select({
          opened: quizOpenTable.opened,
          openedUnique: quizOpenTable.openedUnique,
        })
        .from(quizOpenTable)
        .where(eq(quizOpenTable.quizUid, quiz_uid))
        .limit(1);

      const totalOpened = quizOpenStats.length > 0 ? Number(quizOpenStats[0].opened) : 0;
      const totalOpenedUnique =
        quizOpenStats.length > 0 ? Number(quizOpenStats[0].openedUnique) : 0;

      // Вычисляем общее количество повторных открытий за все время
      const totalRepeatedOpens = totalOpened - totalOpenedUnique;

      // Вычисляем количество уникальных открытий в выбранном периоде
      const _totalUniqueInPeriod = statsResult.reduce(
        (sum, row) => sum + Number(row.unique_opens),
        0
      );

      // Вычисляем коэффициент для распределения повторных открытий по дням
      // Распределяем повторные открытия пропорционально уникальным открытиям по дням
      // Используем общее количество уникальных открытий за все время для расчета пропорции
      const ratio = totalOpenedUnique > 0 ? totalRepeatedOpens / totalOpenedUnique : 0;

      // Создаем карту для быстрого доступа к статистике по дате
      const statsMap = new Map<
        string,
        {
          total_opens: number;
          unique_opens: number;
          repeated_opens: number;
          completed: number;
          not_completed: number;
        }
      >();

      for (const row of statsResult) {
        const uniqueOpens = Number(row.unique_opens);
        // Добавляем повторные открытия пропорционально уникальным
        const repeatedOpensForDay = Math.round(uniqueOpens * ratio);
        const totalOpens = uniqueOpens + repeatedOpensForDay;

        statsMap.set(row.date, {
          total_opens: totalOpens,
          unique_opens: uniqueOpens,
          repeated_opens: repeatedOpensForDay,
          completed: Number(row.completed),
          not_completed: Number(row.not_completed),
        });
      }

      // Генерируем массив дат для всего периода (включая дни без данных)
      const dateRange = generateDateRange(startDate, endDate);

      // Формируем итоговый массив с данными за каждый день
      const daily = dateRange.map((date) => {
        const stats = statsMap.get(date);
        return {
          date,
          total_opens: stats?.total_opens || 0,
          unique_opens: stats?.unique_opens || 0,
          repeated_opens: stats?.repeated_opens || 0,
          completed: stats?.completed || 0,
          not_completed: stats?.not_completed || 0,
        };
      });

      const generatedAt = now();
      const response: StatisticsModel.dailyStatsResponse = {
        quiz_uid,
        generated_at: toISO(generatedAt),
        ttl: CACHE_TTL,
        period: {
          start: formatDateUtil(startDate),
          end: formatDateUtil(endDate),
        },
        daily,
      };

      // Сохраняем в кеш
      dailyStatsCache.set(cacheKey, {
        data: response,
        generatedAt,
        expiresAt: generatedAt.plus({ seconds: CACHE_TTL }),
      });

      logger.info('Общая статистика рассчитана', {
        quiz_uid,
        period: response.period,
        total_days: daily.length,
      });

      return response;
    } catch (error) {
      logger.error(
        'Ошибка при получении общей статистики',
        error instanceof Error ? error : new Error(String(error)),
        { quiz_uid, start, end }
      );
      throw error;
    }
  }

  /**
   * Получить статистику по незавершенным квизам
   */
  static async getAbandonmentStats(
    params: StatisticsModel.queryParams
  ): Promise<StatisticsModel.abandonmentStatsResponse> {
    const { quiz_uid, start, end } = params;

    // Проверяем кеш
    const cacheKey = createCacheKey(quiz_uid, start, end);
    const cachedEntry = abandonmentStatsCache.get(cacheKey);

    if (isCacheValid(cachedEntry)) {
      logger.debug('Статистика по незавершенным квизам получена из кеша', { quiz_uid, cacheKey });
      return cachedEntry!.data;
    }

    try {
      // Получаем квиз для проверки существования и даты создания
      const quizResult = await db
        .select({
          id: quizTable.id,
          createdAt: quizTable.createdAt,
        })
        .from(quizTable)
        .where(eq(quizTable.uid, quiz_uid))
        .limit(1);

      if (quizResult.length === 0) {
        throw new Error('Квиз не найден');
      }

      const quiz = quizResult[0];
      const quizCreatedAt = toDateTime(quiz.createdAt);
      const currentDate = now();

      // Определяем период
      // По умолчанию: 1 месяц с начала квиза (или до текущей даты, если квиз создан менее месяца назад)
      let startDate: DateTime;
      let endDate: DateTime;

      if (start && end) {
        // Если указаны оба параметра, используем их
        startDate = fromISO(start);
        endDate = fromISO(end);
      } else if (start) {
        // Если указан только start, end = start + 1 месяц (или текущая дата, если меньше)
        startDate = fromISO(start);
        const oneMonthLater = addMonths(startDate, 1);
        endDate = oneMonthLater < currentDate ? oneMonthLater : currentDate;
      } else if (end) {
        // Если указан только end, start = end - 1 месяц (или дата создания квиза, если больше)
        endDate = fromISO(end);
        const oneMonthEarlier = addMonths(endDate, -1);
        startDate = oneMonthEarlier > quizCreatedAt ? oneMonthEarlier : quizCreatedAt;
      } else {
        // Если не указаны оба, используем период: дата создания квиза + 1 месяц (или текущая дата)
        startDate = quizCreatedAt;
        const oneMonthLater = addMonths(quizCreatedAt, 1);
        endDate = oneMonthLater < currentDate ? oneMonthLater : currentDate;
      }

      // Убеждаемся, что даты валидны
      if (!startDate.isValid) {
        throw new Error(`Неверная дата начала: ${start} - ${startDate.invalidReason}`);
      }
      if (!endDate.isValid) {
        throw new Error(`Неверная дата окончания: ${end} - ${endDate.invalidReason}`);
      }

      // Получаем все незавершенные записи с ответами (is_full = false)
      // Для Drizzle ORM преобразуем DateTime в Date через toJSDate()
      const bidsResult = await db
        .select({
          createdAt: quizBidTable.createdAt,
          answer: quizBidTable.answer,
          questions: quizBidTable.questions,
          contacts: quizBidTable.contacts,
          info: quizBidTable.info,
        })
        .from(quizBidTable)
        .where(
          and(
            eq(quizBidTable.quizId, quiz.id),
            eq(quizBidTable.isFull, false),
            gte(quizBidTable.createdAt, startDate.toJSDate()),
            lte(quizBidTable.createdAt, endDate.toJSDate())
          )
        );

      // Группируем статистику по дням
      // by_question использует question_uid как ключ
      const dailyStatsMap = new Map<
        string,
        {
          no_answers: number;
          by_question: Map<
            string,
            {
              question_uid: string;
              question_number: number;
              question_title?: string;
              question_type?: string;
              count: number;
            }
          >;
          completed_no_contacts: number;
        }
      >();

      // Вспомогательная функция для определения вопроса отвала
      const getDropoutQuestion = (
        bid: (typeof bidsResult)[0]
      ): {
        question_uid: string;
        question_number: number;
        question_title?: string;
        question_type?: string;
      } | null => {
        const questions = Array.isArray(bid.questions) ? bid.questions : [];
        const answers = Array.isArray(bid.answer) ? bid.answer : [];
        const answersCount = answers.length;
        const totalQuestions = questions.length;

        // Если есть info с данными об отвале, используем их (приоритет)
        if (bid.info && typeof bid.info === 'object' && 'dropoutIndex' in bid.info) {
          const info = bid.info as any;
          const dropoutIndex =
            typeof info.dropoutIndex === 'number' ? info.dropoutIndex : answersCount;

          // Если есть dropoutQuestionUid в info, используем его
          if (info.dropoutQuestionUid && typeof info.dropoutQuestionUid === 'string') {
            // Ищем вопрос по uid
            const question = questions.find((q: any) => q?.uid === info.dropoutQuestionUid);
            if (question) {
              return {
                question_uid: info.dropoutQuestionUid,
                question_number:
                  typeof info.dropoutQuestionNumber === 'number'
                    ? info.dropoutQuestionNumber
                    : dropoutIndex + 1,
                question_title: question?.content?.title || question?.content?.text || undefined,
                question_type: question?.type || undefined,
              };
            }
          }

          // Если question_uid нет, но есть индекс
          if (dropoutIndex >= 0 && dropoutIndex < questions.length) {
            const question = questions[dropoutIndex];
            return {
              question_uid: question?.uid || `unknown-${dropoutIndex}`,
              question_number:
                typeof info.dropoutQuestionNumber === 'number'
                  ? info.dropoutQuestionNumber
                  : dropoutIndex + 1,
              question_title: question?.content?.title || question?.content?.text || undefined,
              question_type: question?.type || undefined,
            };
          }
        }

        // Если info нет, анализируем напрямую
        // Если ответов нет, отвал на первом вопросе
        if (answersCount === 0 && questions.length > 0) {
          const question = questions[0];
          return {
            question_uid: question?.uid || 'unknown-0',
            question_number: 1,
            question_title: question?.content?.title || question?.content?.text || undefined,
            question_type: question?.type || undefined,
          };
        }

        // Если ответов меньше, чем вопросов, отвал на следующем вопросе после последнего ответа
        if (answersCount > 0 && answersCount < totalQuestions) {
          const question = questions[answersCount];
          return {
            question_uid: question?.uid || `unknown-${answersCount}`,
            question_number: answersCount + 1,
            question_title: question?.content?.title || question?.content?.text || undefined,
            question_type: question?.type || undefined,
          };
        }

        return null;
      };

      for (const bid of bidsResult) {
        // Безопасно преобразуем createdAt в DateTime и форматируем
        const bidDate = toDateTime(bid.createdAt);
        const date = formatDateUtil(bidDate);

        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, {
            no_answers: 0,
            by_question: new Map(),
            completed_no_contacts: 0,
          });
        }

        const dayStats = dailyStatsMap.get(date)!;
        const answers = Array.isArray(bid.answer) ? bid.answer : [];
        const questions = Array.isArray(bid.questions) ? bid.questions : [];
        const answersCount = answers.length;
        const totalQuestions = questions.length;

        // Вышли не ответив ни на один вопрос
        if (answersCount === 0) {
          dayStats.no_answers++;
        }
        // Прошли все вопросы, но не заполнили контакты
        else if (answersCount === totalQuestions && !bid.contacts) {
          dayStats.completed_no_contacts++;
        }
        // Ответили на вопросы и вышли - определяем точный вопрос отвала
        else if (answersCount > 0) {
          const dropoutQuestion = getDropoutQuestion(bid);
          if (dropoutQuestion) {
            const existing = dayStats.by_question.get(dropoutQuestion.question_uid);
            if (existing) {
              existing.count++;
            } else {
              dayStats.by_question.set(dropoutQuestion.question_uid, {
                question_uid: dropoutQuestion.question_uid,
                question_number: dropoutQuestion.question_number,
                question_title: dropoutQuestion.question_title,
                question_type: dropoutQuestion.question_type,
                count: 1,
              });
            }
          }
        }
      }

      // Генерируем массив дат для всего периода
      const dateRange = generateDateRange(startDate, endDate);

      // Формируем итоговый массив с данными за каждый день
      const daily = dateRange.map((date) => {
        const stats = dailyStatsMap.get(date);

        // Преобразуем Map в массив и сортируем по номеру вопроса
        const byQuestion = stats?.by_question
          ? Array.from(stats.by_question.values()).sort(
              (a, b) => a.question_number - b.question_number
            )
          : [];

        return {
          date,
          no_answers: stats?.no_answers || 0,
          by_question: byQuestion,
          completed_no_contacts: stats?.completed_no_contacts || 0,
        };
      });

      const generatedAt = now();
      const response: StatisticsModel.abandonmentStatsResponse = {
        quiz_uid,
        generated_at: toISO(generatedAt),
        ttl: CACHE_TTL,
        period: {
          start: formatDateUtil(startDate),
          end: formatDateUtil(endDate),
        },
        daily,
      };

      // Сохраняем в кеш
      abandonmentStatsCache.set(cacheKey, {
        data: response,
        generatedAt,
        expiresAt: generatedAt.plus({ seconds: CACHE_TTL }),
      });

      logger.info('Статистика по незавершенным квизам рассчитана', {
        quiz_uid,
        period: response.period,
        total_days: daily.length,
        total_abandoned: bidsResult.length,
      });

      return response;
    } catch (error) {
      logger.error(
        'Ошибка при получении статистики по незавершенным квизам',
        error instanceof Error ? error : new Error(String(error)),
        { quiz_uid, start, end }
      );
      throw error;
    }
  }

  /**
   * Очистить кеш для конкретного квиза или весь кеш
   */
  static clearCache(quizUid?: string): void {
    if (quizUid) {
      // Очищаем только записи для конкретного квиза
      for (const key of dailyStatsCache.keys()) {
        if (key.startsWith(`${quizUid}:`)) {
          dailyStatsCache.delete(key);
        }
      }
      for (const key of abandonmentStatsCache.keys()) {
        if (key.startsWith(`${quizUid}:`)) {
          abandonmentStatsCache.delete(key);
        }
      }
      logger.info('Кеш статистики очищен для квиза', { quiz_uid: quizUid });
    } else {
      // Очищаем весь кеш
      dailyStatsCache.clear();
      abandonmentStatsCache.clear();
      logger.info('Весь кеш статистики очищен');
    }
  }
}
