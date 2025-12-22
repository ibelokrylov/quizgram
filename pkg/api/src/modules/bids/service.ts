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
      // Если план FREE, всегда показываем только isFull=true AND isEqualPaymentLimit=true
      const effectiveFilters = { ...filters };
      if (planId === 1) {
        effectiveFilters.isFull = true;
      }

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
        // При запросе с isFull=true добавляем условие isEqualPaymentLimit=true
        if (effectiveFilters.isFull === true) {
          conditions.push(eq(quizBidTable.isEqualPaymentLimit, true));
        }
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

      // Подсчет isFull = true AND isEqualPaymentLimit = true
      const totalFullConditions = [
        ...baseConditions,
        eq(quizBidTable.isFull, true),
        eq(quizBidTable.isEqualPaymentLimit, true),
      ];
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

      // Формируем базовые условия для SQL запроса
      const baseWhereConditions: any[] = [
        sql`q.user_id = ${userId}`,
        sql`b.deleted_at IS NULL`, // Исключаем удаленные заявки
      ];

      if (effectiveFilters.quiz_uid) {
        baseWhereConditions.push(sql`q.uid = ${effectiveFilters.quiz_uid}`);
      }

      if (effectiveFilters.status) {
        baseWhereConditions.push(sql`b.status = ${effectiveFilters.status}`);
      }

      if (effectiveFilters.isFull !== undefined) {
        baseWhereConditions.push(sql`b.is_full = ${effectiveFilters.isFull}`);
        // При запросе с isFull=true добавляем условие isEqualPaymentLimit=true
        if (effectiveFilters.isFull === true) {
          baseWhereConditions.push(sql`b.is_equal_payment_limit = true`);
        }
      }

      if (effectiveFilters.isRead !== undefined) {
        baseWhereConditions.push(sql`b.is_read = ${effectiveFilters.isRead}`);
      }

      // Объединяем условия
      let combinedWhere = baseWhereConditions[0];
      for (let i = 1; i < baseWhereConditions.length; i++) {
        combinedWhere = sql`${combinedWhere} AND ${baseWhereConditions[i]}`;
      }

      // Получаем заявки без ограничения по месяцам
      const bidsResult = await db.execute(sql`
        SELECT 
          q.uid,
          b.key,
          b.status,
          b.is_full as "isFull",
          b.is_read as "isRead",
          b.first,
          b.created_at as "createdAt",
          b.updated_at as "updatedAt",
          b.admin_updated_at as "adminUpdatedAt",
          b.contacts,
          b.ip_location as "ipLocation",
          b.info,
          q.name as "quizName"
        FROM quiz_bid b
        LEFT JOIN quiz q ON b.quiz_id = q.id
        WHERE ${combinedWhere}
        ORDER BY b.created_at DESC
        LIMIT ${effectiveFilters.limit || 10}
        OFFSET ${effectiveFilters.offset || 0}
      `);

      // В Drizzle ORM с postgres.js результат db.execute - это массив объектов напрямую
      const bids = (bidsResult as unknown as Array<{
        uid: string;
        key: string;
        status: string;
        isFull: boolean;
        isRead: boolean;
        first: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
        adminUpdatedAt: Date | string | null;
        contacts: Record<string, string> | null;
        ipLocation: { country: string | null; city: string | null; ip: string | null } | null;
        info: any | null;
        quizName: string;
      }>) || [];

      // Подсчитываем общее количество доступных заявок
      const availableCountResult = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM quiz_bid b
        LEFT JOIN quiz q ON b.quiz_id = q.id
        WHERE ${combinedWhere}
      `);

      // В Drizzle ORM с postgres.js результат db.execute - это массив объектов напрямую
      const countResult = (availableCountResult as unknown as Array<{ count: number | string }>) || [];
      const maxAvailable = Number(countResult[0]?.count || 0);
      const actualOffset = effectiveFilters.offset || 0;

      // Подсчитываем количество доступных заявок с isFull = true AND isEqualPaymentLimit = true
      const whereConditionsForLimitFull: any[] = [
        sql`q.user_id = ${userId}`,
        sql`b.deleted_at IS NULL`,
        sql`b.is_full = true`,
        sql`b.is_equal_payment_limit = true`,
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

      let combinedWhereForLimitFull = whereConditionsForLimitFull[0];
      for (let i = 1; i < whereConditionsForLimitFull.length; i++) {
        combinedWhereForLimitFull = sql`${combinedWhereForLimitFull} AND ${whereConditionsForLimitFull[i]}`;
      }

      const availableCountFullResult = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM quiz_bid b
        LEFT JOIN quiz q ON b.quiz_id = q.id
        WHERE ${combinedWhereForLimitFull}
      `);

      const countFullResult = (availableCountFullResult as unknown as Array<{ count: number | string }>) || [];
      const maxAvailableFull = Number(countFullResult[0]?.count || 0);

      // Для упрощения, deletedInLimitFull всегда 0 (так как мы не используем месячную логику)
      const deletedInLimitFull = 0;

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
          adminUpdatedAt: bid.adminUpdatedAt
            ? (bid.adminUpdatedAt instanceof Date
              ? bid.adminUpdatedAt.toISOString()
              : new Date(bid.adminUpdatedAt).toISOString())
            : null,
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
          adminUpdatedAt: new Date(),
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
          updatedAt: quizBidTable.updatedAt,
          adminUpdatedAt: quizBidTable.adminUpdatedAt,
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
          adminUpdatedAt: new Date(),
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
        updatedAt: bidData.updatedAt?.toISOString() || new Date().toISOString(),
        adminUpdatedAt: bidData.adminUpdatedAt?.toISOString() || null,
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
          adminUpdatedAt: new Date(),
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