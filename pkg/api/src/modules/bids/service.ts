import { and, count, desc, eq, gte, or, sql } from 'drizzle-orm';
import { db, quizBidTable, quizTable, userTable } from '../../db';
import { logger } from '../../lib/logger';
import { BidsListFilters, UpdateBidStatus } from './model';

export abstract class BidsService {
  /**
   * Получает список заявок для квизов пользователя с учетом лимитов тарифа
   * @param userId - ID пользователя
   * @param filters - фильтры для поиска
   * @param userCreatedAt - дата регистрации пользователя
   * @param bidMonthLimit - лимит заявок в месяц из базы данных (таблица plan)
   */
  static async getBidsList(
    userId: number,
    filters: BidsListFilters,
    userCreatedAt: Date,
    bidMonthLimit: number,
    planName: string = "FREE"
  ) {
    try {
      // Лимит заявок берется из базы данных (таблица plan.bid_month_limit)
      const monthlyLimit = bidMonthLimit;

      // Если план FREE и isFull не указан, по умолчанию показываем только завершенные заявки
      const effectiveFilters = { ...filters };
      if (planName === "FREE" && effectiveFilters.isFull === undefined) {
        effectiveFilters.isFull = true;
      }

      // Вычисляем количество месяцев с регистрации (округление вверх)
      const now = new Date();
      const monthsDiff = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44); // Среднее количество дней в месяце
      const monthsRegistered = Math.max(1, Math.ceil(monthsDiff)); // Минимум 1 месяц

      // Формируем условия для фильтрации
      const conditions = [eq(quizTable.userId, userId)];

      if (effectiveFilters.quiz_uid) {
        conditions.push(eq(quizTable.uid, effectiveFilters.quiz_uid));
      }

      if (effectiveFilters.status) {
        conditions.push(eq(quizBidTable.status, effectiveFilters.status));
      }

      if (effectiveFilters.isFull !== undefined) {
        conditions.push(eq(quizBidTable.isFull, effectiveFilters.isFull));
      }

      // Получаем общее количество записей (для hasMoreBeyondLimit)
      const totalCountResult = await db
        .select({ count: count() })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(and(...conditions));

      const total = totalCountResult[0]?.count || 0;

      // Подсчитываем total (isFull = true) и totalNotFull (isFull = false)
      // Базовые условия без фильтра isFull
      const baseConditions = [eq(quizTable.userId, userId)];
      if (effectiveFilters.quiz_uid) {
        baseConditions.push(eq(quizTable.uid, effectiveFilters.quiz_uid));
      }
      if (effectiveFilters.status) {
        baseConditions.push(eq(quizBidTable.status, effectiveFilters.status));
      }

      // Подсчет isFull = true
      const totalFullConditions = [...baseConditions, eq(quizBidTable.isFull, true)];
      const totalFullResult = await db
        .select({ count: count() })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(and(...totalFullConditions));
      const totalFull = totalFullResult[0]?.count || 0;

      // Подсчет isFull = false
      const totalNotFullConditions = [...baseConditions, eq(quizBidTable.isFull, false)];
      const totalNotFullResult = await db
        .select({ count: count() })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(and(...totalNotFullConditions));
      const totalNotFull = totalNotFullResult[0]?.count || 0;

      // Получаем заявки с ограничением по месяцам через оконную функцию
      // Берем по monthlyLimit заявок из каждого месяца, начиная с месяца регистрации
      // Создаем дату начала месяца регистрации в UTC
      const userCreatedAtMonth = new Date(Date.UTC(
        userCreatedAt.getFullYear(),
        userCreatedAt.getMonth(),
        1,
        0, 0, 0, 0
      ));
      
      // Формируем WHERE условия динамически с использованием sql``
      const whereConditions: any[] = [sql`q.user_id = ${userId}`];

      if (effectiveFilters.quiz_uid) {
        whereConditions.push(sql`q.uid = ${effectiveFilters.quiz_uid}`);
      }

      if (effectiveFilters.status) {
        whereConditions.push(sql`b.status = ${effectiveFilters.status}`);
      }

      if (effectiveFilters.isFull !== undefined) {
        whereConditions.push(sql`b.is_full = ${effectiveFilters.isFull}`);
      }

      // Передаем дату как ISO строку для правильной обработки PostgreSQL
      whereConditions.push(sql`DATE_TRUNC('month', b.created_at) >= DATE_TRUNC('month', ${userCreatedAtMonth.toISOString()}::timestamp)`);

      // Объединяем условия через AND
      let combinedWhere = whereConditions[0];
      for (let i = 1; i < whereConditions.length; i++) {
        combinedWhere = sql`${combinedWhere} AND ${whereConditions[i]}`;
      }

      // Используем SQL с оконной функцией для нумерации заявок в каждом месяце
      const bidsWithRowNumber = await db.execute(sql`
        WITH ranked_bids AS (
          SELECT 
            q.uid,
            b.key,
            b.status,
            b.is_full as "isFull",
            b.is_read as "isRead",
            b.first,
            b.created_at as "createdAt",
            b.updated_at as "updatedAt",
            b.info,
            b.ip_location as "ipLocation",
            q.name as "quizName",
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('month', b.created_at)
              ORDER BY b.id DESC
            ) as row_num
          FROM quiz_bid b
          LEFT JOIN quiz q ON b.quiz_id = q.id
          WHERE ${combinedWhere}
        )
        SELECT 
          uid,
          key,
          status,
          "isFull",
          "isRead",
          first,
          "createdAt",
          "updatedAt",
          info,
          "ipLocation",
          "quizName"
        FROM ranked_bids
        WHERE row_num <= ${monthlyLimit}
        ORDER BY "createdAt" DESC
        LIMIT ${effectiveFilters.limit || 10}
        OFFSET ${effectiveFilters.offset || 0}
      `);

      // В Drizzle ORM с postgres.js результат db.execute - это массив объектов напрямую
      const bids = (bidsWithRowNumber as unknown as Array<{
        uid: string;
        key: string;
        status: string;
        isFull: boolean;
        isRead: boolean;
        first: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
        info: any;
        ipLocation: { country: string | null; city: string | null; ip: string | null } | null;
        quizName: string;
      }>) || [];

      // Подсчитываем общее количество доступных заявок (в пределах лимита по месяцам)
      const availableCountResult = await db.execute(sql`
        WITH ranked_bids AS (
          SELECT 
            b.id,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('month', b.created_at)
              ORDER BY b.id DESC
            ) as row_num
          FROM quiz_bid b
          LEFT JOIN quiz q ON b.quiz_id = q.id
          WHERE ${combinedWhere}
        )
        SELECT COUNT(*)::int as count
        FROM ranked_bids
        WHERE row_num <= ${monthlyLimit}
      `);

      // В Drizzle ORM с postgres.js результат db.execute - это массив объектов напрямую
      const countResult = (availableCountResult as unknown as Array<{ count: number | string }>) || [];
      const maxAvailable = Number(countResult[0]?.count || 0);
      const actualOffset = effectiveFilters.offset || 0;

      // Трансформируем данные для ответа
      const transformedBids = bids.map(bid => ({
        uid: bid.uid,
        key: bid.key,
        status: bid.status,
        isFull: bid.isFull,
        isRead: bid.isRead,
        first: bid.first,
        createdAt: bid.createdAt instanceof Date 
          ? bid.createdAt.toISOString() 
          : new Date(bid.createdAt).toISOString(),
        updatedAt: bid.updatedAt instanceof Date 
          ? bid.updatedAt.toISOString() 
          : new Date(bid.updatedAt).toISOString(),
        quizName: bid.quizName,
        contacts: bid.info?.contacts || null,
        ipLocation: bid.ipLocation,
      }));

      // Проверяем, есть ли еще данные в рамках доступного лимита
      const hasMore = actualOffset + transformedBids.length < maxAvailable;
      
      // Проверяем, есть ли заявки сверх лимита (общее количество больше доступного по месяцам)
      const hasMoreBeyondLimit = total > maxAvailable;

      logger.debug("Bids list retrieved", {
        userId,
        filters: effectiveFilters,
        planName,
        bidMonthLimit,
        monthsRegistered,
        requestedLimit: effectiveFilters.limit || 10,
        offset: actualOffset,
        total: totalFull,
        totalNotFull,
        maxAvailable,
        returned: transformedBids.length,
        hasMore,
        hasMoreBeyondLimit,
      });

      return {
        data: transformedBids,
        total: totalFull, // Количество isFull = true
        totalNotFull, // Количество isFull = false
        hasMore,
        hasMoreBeyondLimit,
      };
    } catch (error) {
      logger.error("Failed to get bids list", error as Error, { 
        userId, 
        filters: effectiveFilters,
        planName,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Обновляет статус заявки (если пользователь владелец квиза)
   * @param userId - ID пользователя
   * @param updateData - данные для обновления
   */
  static async updateBidStatus(userId: number, updateData: UpdateBidStatus) {
    try {
      // Сначала проверяем, принадлежит ли квиз пользователю
      const bidInfo = await db
        .select({
          bidId: quizBidTable.id,
          quizId: quizTable.id,
        })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(
          and(
            eq(quizBidTable.key, updateData.key),
            eq(quizTable.userId, userId)
          )
        )
        .limit(1);

      if (!bidInfo.length) {
        throw new Error("Bid not found or access denied");
      }

      // Обновляем статус
      await db
        .update(quizBidTable)
        .set({
          status: updateData.status,
        })
        .where(eq(quizBidTable.id, bidInfo[0].bidId));

      logger.debug("Bid status updated", {
        userId,
        key: updateData.key,
        newStatus: updateData.status,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to update bid status", error as Error, { userId, updateData });
      throw error;
    }
  }

  /**
   * Получает полную информацию о заявке по key (если пользователь владелец квиза)
   * @param userId - ID пользователя
   * @param key - ключ заявки
   */
  static async getBidDetails(userId: number, key: string) {
    try {
      // Получаем заявку с проверкой прав доступа
      const bid = await db
        .select({
          bidId: quizBidTable.id,
          uid: quizTable.uid,
          key: quizBidTable.key,
          status: quizBidTable.status,
          isFull: quizBidTable.isFull,
          data: quizBidTable.answer,
          info: quizBidTable.info,
          questions: quizBidTable.questions,
          userInfo: quizBidTable.userInfo,
          ipLocation: quizBidTable.ipLocation,
          createdAt: quizBidTable.createdAt,
          updatedAt: quizBidTable.updatedAt,
          quizName: quizTable.name,
        })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(
          and(
            eq(quizBidTable.key, key),
            eq(quizTable.userId, userId)
          )
        )
        .limit(1);

      if (!bid.length) {
        throw new Error("Bid not found or access denied");
      }

      const bidData = bid[0];

      // Обновляем isRead на true при просмотре заявки
      await db
        .update(quizBidTable)
        .set({
          isRead: true,
        })
        .where(eq(quizBidTable.id, bidData.bidId));

      logger.debug("Bid details retrieved and marked as read", {
        userId,
        key,
        status: bidData.status,
      });

      return {
        uid: bidData.uid,
        key: bidData.key,
        status: bidData.status,
        isFull: bidData.isFull,
        createdAt: bidData.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: bidData.updatedAt?.toISOString() || new Date().toISOString(),
        quizName: bidData.quizName,
        data: bidData.data,
        info: bidData.info,
        questions: bidData.questions,
        userInfo: bidData.userInfo,
        ipLocation: bidData.ipLocation,
      };
    } catch (error) {
      logger.error("Failed to get bid details", error as Error, { userId, key });
      throw error;
    }
  }

}