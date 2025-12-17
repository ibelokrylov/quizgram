import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { db, quizBidTable, quizTable } from '../../db';
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
    planName: string = "FREE",
    planId: number = 1
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
      const conditions = [
        eq(quizTable.userId, userId),
        isNull(quizBidTable.deletedAt), // Исключаем удаленные заявки
      ];

      if (effectiveFilters.quiz_uid) {
        conditions.push(eq(quizTable.uid, effectiveFilters.quiz_uid));
      }

      if (effectiveFilters.status) {
        conditions.push(eq(quizBidTable.status, effectiveFilters.status));
      }

      if (effectiveFilters.isFull !== undefined) {
        conditions.push(eq(quizBidTable.isFull, effectiveFilters.isFull));
      }

      if (effectiveFilters.isRead !== undefined) {
        conditions.push(eq(quizBidTable.isRead, effectiveFilters.isRead));
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
      const baseConditions = [
        eq(quizTable.userId, userId),
        isNull(quizBidTable.deletedAt), // Исключаем удаленные заявки
      ];
      if (effectiveFilters.quiz_uid) {
        baseConditions.push(eq(quizTable.uid, effectiveFilters.quiz_uid));
      }
      if (effectiveFilters.status) {
        baseConditions.push(eq(quizBidTable.status, effectiveFilters.status));
      }
      if (effectiveFilters.isRead !== undefined) {
        baseConditions.push(eq(quizBidTable.isRead, effectiveFilters.isRead));
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

      // Формируем базовые условия (общие для лимита и отображения)
      const baseWhereConditions: any[] = [
        sql`q.user_id = ${userId}`,
      ];

      if (effectiveFilters.quiz_uid) {
        baseWhereConditions.push(sql`q.uid = ${effectiveFilters.quiz_uid}`);
      }

      if (effectiveFilters.status) {
        baseWhereConditions.push(sql`b.status = ${effectiveFilters.status}`);
      }

      if (effectiveFilters.isFull !== undefined) {
        baseWhereConditions.push(sql`b.is_full = ${effectiveFilters.isFull}`);
      }

      if (effectiveFilters.isRead !== undefined) {
        baseWhereConditions.push(sql`b.is_read = ${effectiveFilters.isRead}`);
      }

      // Передаем дату как ISO строку для правильной обработки PostgreSQL
      baseWhereConditions.push(sql`DATE_TRUNC('month', b.created_at) >= DATE_TRUNC('month', ${userCreatedAtMonth.toISOString()}::timestamp)`);

      // Условия для расчета лимита - ВКЛЮЧАЕМ удаленные заявки (чтобы они занимали место в лимите)
      // Это важно для предотвращения обхода лимита: удаленные заявки все равно считаются в лимите
      const whereConditionsForLimit = [...baseWhereConditions];
      let combinedWhereForLimit = whereConditionsForLimit[0];
      for (let i = 1; i < whereConditionsForLimit.length; i++) {
        combinedWhereForLimit = sql`${combinedWhereForLimit} AND ${whereConditionsForLimit[i]}`;
      }

      // Используем SQL с оконной функцией для нумерации заявок в каждом месяце
      // Сначала ранжируем ВСЕ заявки (включая удаленные) для расчета лимита
      // Затем фильтруем только неудаленные для отображения
      const bidsWithRowNumber = await db.execute(sql`
        WITH all_ranked_bids AS (
          SELECT 
            b.id,
            b.deleted_at,
            q.uid,
            b.key,
            b.status,
            b.is_full as "isFull",
            b.is_read as "isRead",
            b.first,
            b.created_at as "createdAt",
            b.updated_at as "updatedAt",
            b.contacts,
            b.ip_location as "ipLocation",
            b.info,
            q.name as "quizName",
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('month', b.created_at)
              ORDER BY b.id DESC
            ) as row_num
          FROM quiz_bid b
          LEFT JOIN quiz q ON b.quiz_id = q.id
          WHERE ${combinedWhereForLimit}
        ),
        ranked_bids AS (
          SELECT *
          FROM all_ranked_bids
          WHERE row_num <= ${monthlyLimit}
            AND deleted_at IS NULL
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
          contacts,
          "ipLocation",
          info,
          "quizName"
        FROM ranked_bids
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
        contacts: Record<string, string> | null;
        ipLocation: { country: string | null; city: string | null; ip: string | null } | null;
        info: any | null;
        quizName: string;
      }>) || [];

      // Подсчитываем общее количество доступных заявок (в пределах лимита по месяцам)
      // Учитываем только неудаленные заявки, которые попали в лимит
      const availableCountResult = await db.execute(sql`
        WITH all_ranked_bids AS (
          SELECT 
            b.id,
            b.deleted_at,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('month', b.created_at)
              ORDER BY b.id DESC
            ) as row_num
          FROM quiz_bid b
          LEFT JOIN quiz q ON b.quiz_id = q.id
          WHERE ${combinedWhereForLimit}
        )
        SELECT COUNT(*)::int as count
        FROM all_ranked_bids
        WHERE row_num <= ${monthlyLimit}
          AND deleted_at IS NULL
      `);

      // В Drizzle ORM с postgres.js результат db.execute - это массив объектов напрямую
      const countResult = (availableCountResult as unknown as Array<{ count: number | string }>) || [];
      const maxAvailable = Number(countResult[0]?.count || 0);
      const actualOffset = effectiveFilters.offset || 0;

      // Подсчитываем количество доступных заявок с isFull = true в пределах лимита
      // Это нужно для расчета beyondLimitCount (только завершенные заявки)
      const whereConditionsForLimitFull: any[] = [
        sql`q.user_id = ${userId}`,
        sql`b.is_full = true`, // Только завершенные заявки
      ];

      if (effectiveFilters.quiz_uid) {
        whereConditionsForLimitFull.push(sql`q.uid = ${effectiveFilters.quiz_uid}`);
      }

      if (effectiveFilters.status) {
        whereConditionsForLimitFull.push(sql`b.status = ${effectiveFilters.status}`);
      }

      if (effectiveFilters.isRead !== undefined) {
        whereConditionsForLimitFull.push(sql`b.is_read = ${effectiveFilters.isRead}`);
      }

      whereConditionsForLimitFull.push(sql`DATE_TRUNC('month', b.created_at) >= DATE_TRUNC('month', ${userCreatedAtMonth.toISOString()}::timestamp)`);

      let combinedWhereForLimitFull = whereConditionsForLimitFull[0];
      for (let i = 1; i < whereConditionsForLimitFull.length; i++) {
        combinedWhereForLimitFull = sql`${combinedWhereForLimitFull} AND ${whereConditionsForLimitFull[i]}`;
      }

      const availableCountFullResult = await db.execute(sql`
        WITH all_ranked_bids AS (
          SELECT 
            b.id,
            b.deleted_at,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('month', b.created_at)
              ORDER BY b.id DESC
            ) as row_num
          FROM quiz_bid b
          LEFT JOIN quiz q ON b.quiz_id = q.id
          WHERE ${combinedWhereForLimitFull}
        )
        SELECT COUNT(*)::int as count
        FROM all_ranked_bids
        WHERE row_num <= ${monthlyLimit}
          AND deleted_at IS NULL
      `);

      const countFullResult = (availableCountFullResult as unknown as Array<{ count: number | string }>) || [];
      const maxAvailableFull = Number(countFullResult[0]?.count || 0);

      // Подсчитываем количество удаленных заявок с isFull = true, которые влезли в лимит
      const deletedCountFullResult = await db.execute(sql`
        WITH all_ranked_bids AS (
          SELECT 
            b.id,
            b.deleted_at,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('month', b.created_at)
              ORDER BY b.id DESC
            ) as row_num
          FROM quiz_bid b
          LEFT JOIN quiz q ON b.quiz_id = q.id
          WHERE ${combinedWhereForLimitFull}
        )
        SELECT COUNT(*)::int as count
        FROM all_ranked_bids
        WHERE row_num <= ${monthlyLimit}
          AND deleted_at IS NOT NULL
      `);

      const deletedCountFullResultArray = (deletedCountFullResult as unknown as Array<{ count: number | string }>) || [];
      const deletedInLimitFull = Number(deletedCountFullResultArray[0]?.count || 0);

      // Трансформируем данные для ответа
      // Поле info возвращаем только для пользователей с planId != 1
      const transformedBids = bids.map(bid => {
        const baseBid = {
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
          contacts: bid.contacts || null,
          ipLocation: bid.ipLocation,
        };

        // Добавляем поле info только для пользователей с planId != 1
        if (planId !== 1) {
          return {
            ...baseBid,
            info: bid.info ?? null,
          };
        }

        return baseBid;
      });

      // Проверяем, есть ли еще данные в рамках доступного лимита
      const hasMore = actualOffset + transformedBids.length < maxAvailable;

      // Проверяем, есть ли заявки сверх лимита (общее количество больше доступного по месяцам)
      const hasMoreBeyondLimit = total > maxAvailable;

      // Вычисляем количество заявок с isFull = true, которые не влезли из-за лимита тарифного плана
      const beyondLimitCount = Math.max(0, totalFull - maxAvailableFull);

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
        beyondLimitCount,
        returned: transformedBids.length,
        hasMore,
        hasMoreBeyondLimit,
      });

      // Формируем ответ в зависимости от плана
      const response: {
        data: typeof transformedBids;
        total: number;
        totalNotFull?: number;
        hasMore: boolean;
        hasMoreBeyondLimit: boolean;
        beyondLimitCount: number; // Количество заявок, которые не влезли из-за лимита тарифного плана
        maxAvailableFull: number; // Количество доступных заявок с isFull = true в пределах лимита тарифного плана
        deletedInLimitFull: number; // Количество удаленных заявок с isFull = true, которые влезли в лимит
      } = {
        data: transformedBids,
        total: totalFull, // Количество isFull = true
        hasMore,
        hasMoreBeyondLimit,
        beyondLimitCount, // Количество заявок, которые не влезли из-за лимита тарифного плана
        maxAvailableFull, // Количество доступных заявок с isFull = true в пределах лимита тарифного плана
        deletedInLimitFull, // Количество удаленных заявок с isFull = true, которые влезли в лимит
      };

      // Для FREE плана не возвращаем totalNotFull
      if (planName !== "FREE") {
        response.totalNotFull = totalNotFull; // Количество isFull = false
      }

      return response;
    } catch (error) {
      logger.error("Failed to get bids list", error as Error, {
        userId,
        filters,
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
          first: quizBidTable.first,
          data: quizBidTable.answer,
          info: quizBidTable.info,
          questions: quizBidTable.questions,
          contacts: quizBidTable.contacts,
          contactsForm: quizBidTable.contactsForm,
          userInfo: quizBidTable.userInfo,
          initData: quizBidTable.initData,
          createdAt: quizBidTable.createdAt,
          quizName: quizTable.name,
        })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(
          and(
            eq(quizBidTable.key, key),
            eq(quizTable.userId, userId),
            isNull(quizBidTable.deletedAt) // Исключаем удаленные заявки
          )
        )
        .limit(1);

      if (!bid.length) {
        throw new Error("Bid not found or access denied");
      }

      const bidData = bid[0];

      // Проверяем, что uid и quizName не null (заявка должна быть связана с квизом)
      if (!bidData.uid || !bidData.quizName) {
        throw new Error("Bid data is invalid: missing quiz information");
      }

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
        first: bidData.first,
        createdAt: bidData.createdAt?.toISOString() || new Date().toISOString(),
        quizName: bidData.quizName,
        data: bidData.data,
        info: bidData.info,
        questions: bidData.questions,
        contacts: bidData.contacts,
        contactsForm: bidData.contactsForm,
        userInfo: bidData.userInfo,
        initData: bidData.initData,
      };
    } catch (error) {
      logger.error("Failed to get bid details", error as Error, { userId, key });
      throw error;
    }
  }

  /**
   * Удаляет заявку (soft delete - устанавливает deletedAt)
   * @param userId - ID пользователя
   * @param key - ключ заявки
   */
  static async deleteBid(userId: number, key: string): Promise<void> {
    try {
      // Проверяем, принадлежит ли квиз пользователю
      const bidInfo = await db
        .select({
          bidId: quizBidTable.id,
          quizId: quizTable.id,
        })
        .from(quizBidTable)
        .leftJoin(quizTable, eq(quizBidTable.quizId, quizTable.id))
        .where(
          and(
            eq(quizBidTable.key, key),
            eq(quizTable.userId, userId),
            isNull(quizBidTable.deletedAt) // Проверяем, что заявка не удалена
          )
        )
        .limit(1);

      if (!bidInfo.length) {
        throw new Error("Bid not found or access denied");
      }

      // Выполняем soft delete - устанавливаем deletedAt
      await db
        .update(quizBidTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quizBidTable.id, bidInfo[0].bidId));

      logger.debug("Bid deleted", {
        userId,
        key,
        bidId: bidInfo[0].bidId,
      });
    } catch (error) {
      logger.error("Failed to delete bid", error as Error, { userId, key });
      throw error;
    }
  }

}