import { sql, SQL } from 'drizzle-orm';
import { db } from '../../db';
import { logger } from '../../lib/logger';
import { BidsListFilters, UpdateBidStatus } from './model';

export abstract class BidsService {
  /**
   * Формирует условия WHERE для SQL запросов
   * @param userId - ID пользователя
   * @param filters - фильтры для поиска
   * @param includeFullFilter - включать ли фильтр isFull
   * @param includePaymentLimit - включать ли условие isEqualPaymentLimit=true при isFull=true
   * @returns массив SQL условий
   */
  private static buildWhereConditions(
    userId: number,
    filters: BidsListFilters,
    includeFullFilter: boolean = true,
    includePaymentLimit: boolean = false
  ): SQL[] {
    const conditions: SQL[] = [
      sql`q.user_id = ${userId}`,
      sql`b.deleted_at IS NULL`,
    ];

    if (filters.quiz_uid) {
      conditions.push(sql`q.uid = ${filters.quiz_uid}`);
    }

    if (filters.status) {
      conditions.push(sql`b.status = ${filters.status}`);
    }

    if (includeFullFilter && filters.isFull !== undefined) {
      conditions.push(sql`b.is_full = ${filters.isFull}`);
      // При запросе с isFull=true и includePaymentLimit=true добавляем условие isEqualPaymentLimit=true
      if (filters.isFull === true && includePaymentLimit) {
        conditions.push(sql`b.is_equal_payment_limit = true`);
      }
    }

    if (filters.isRead !== undefined) {
      conditions.push(sql`b.is_read = ${filters.isRead}`);
    }

    return conditions;
  }

  /**
   * Объединяет массив SQL условий в одно условие через AND
   */
  private static combineWhereConditions(conditions: SQL[]): SQL {
    if (conditions.length === 0) {
      return sql`1=1`; // Всегда true, если нет условий
    }
    if (conditions.length === 1) {
      return conditions[0];
    }
    let combined = conditions[0];
    for (let i = 1; i < conditions.length; i++) {
      combined = sql`${combined} AND ${conditions[i]}`;
    }
    return combined;
  }

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

      // Формируем условия для основного запроса (с фильтром isFull и isEqualPaymentLimit)
      const mainWhereConditions = this.buildWhereConditions(
        userId,
        effectiveFilters,
        true,
        effectiveFilters.isFull === true // Включаем isEqualPaymentLimit только если isFull=true
      );
      const combinedWhere = this.combineWhereConditions(mainWhereConditions);

      // Формируем базовые условия без фильтра isFull (для подсчетов)
      const baseFilters = { ...effectiveFilters };
      delete baseFilters.isFull;
      const baseWhereConditions = this.buildWhereConditions(userId, baseFilters, false, false);
      const combinedBaseWhere = this.combineWhereConditions(baseWhereConditions);

      // ОПТИМИЗАЦИЯ: Объединяем все COUNT запросы в один с использованием FILTER
      const countsResult = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE b.is_full = true)::int as total_full,
          COUNT(*) FILTER (WHERE b.is_full = false)::int as total_not_full,
          COUNT(*) FILTER (WHERE b.is_full = true AND b.is_equal_payment_limit = true)::int as max_available_full
        FROM quiz_bid b
        INNER JOIN quiz q ON b.quiz_id = q.id
        WHERE ${combinedBaseWhere}
      `);

      const counts = (countsResult as unknown as Array<{
        total: number | string;
        total_full: number | string;
        total_not_full: number | string;
        max_available_full: number | string;
      }>) || [];

      const total = Number(counts[0]?.total || 0);
      const totalFull = Number(counts[0]?.total_full || 0);
      const totalNotFull = Number(counts[0]?.total_not_full || 0);
      const maxAvailableFull = Number(counts[0]?.max_available_full || 0);

      // Подсчитываем общее количество доступных заявок (с учетом всех фильтров включая isFull)
      const availableCountResult = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM quiz_bid b
        INNER JOIN quiz q ON b.quiz_id = q.id
        WHERE ${combinedWhere}
      `);

      const countResult = (availableCountResult as unknown as Array<{ count: number | string }>) || [];
      const maxAvailable = Number(countResult[0]?.count || 0);

      // ОПТИМИЗАЦИЯ: Используем LIMIT + 1 для определения hasMore
      const requestedLimit = effectiveFilters.limit || 10;
      const actualOffset = effectiveFilters.offset || 0;
      const limitPlusOne = requestedLimit + 1;

      // ОПТИМИЗАЦИЯ: Используем INNER JOIN вместо LEFT JOIN и CASE для условного возврата info
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
          CASE WHEN ${planId} != 1 THEN b.info ELSE NULL END as info,
          q.name as "quizName"
        FROM quiz_bid b
        INNER JOIN quiz q ON b.quiz_id = q.id
        WHERE ${combinedWhere}
        ORDER BY b.created_at DESC
        LIMIT ${limitPlusOne}
        OFFSET ${actualOffset}
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

      // Определяем hasMore по количеству полученных записей
      const hasMore = bids.length > requestedLimit;
      // Удаляем лишнюю запись, если она есть
      if (hasMore) {
        bids.pop();
      }

      // Для упрощения, deletedInLimitFull всегда 0 (так как мы не используем месячную логику)
      const deletedInLimitFull = 0;

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
        adminUpdatedAt: bid.adminUpdatedAt
          ? (bid.adminUpdatedAt instanceof Date
            ? bid.adminUpdatedAt.toISOString()
            : new Date(bid.adminUpdatedAt).toISOString())
          : null,
        quizName: bid.quizName,
        contacts: bid.contacts || null,
        ipLocation: bid.ipLocation,
        // info уже обработан через CASE в SQL, поэтому просто возвращаем как есть
        ...(planId !== 1 && { info: bid.info ?? null }),
      }));

      // Проверяем, есть ли заявки сверх лимита (общее количество больше доступного по месяцам)
      const hasMoreBeyondLimit = total > maxAvailable;

      // Вычисляем количество заявок с isFull = true, которые не влезли из-за лимита тарифного плана
      const beyondLimitCount = Math.max(0, totalFull - maxAvailableFull);

      logger.debug("Bids list retrieved", {
        userId,
        filters: effectiveFilters,
        planName,
        bidMonthLimit,
        requestedLimit,
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
        beyondLimitCount: number; // Количество заявок с isFull=true, которые не влезли из-за лимита (не isEqualPaymentLimit)
        maxAvailableFull: number; // Количество доступных заявок с isFull=true AND isEqualPaymentLimit=true
        deletedInLimitFull: number; // Количество удаленных заявок с isFull = true, которые влезли в лимит
      } = {
        data: transformedBids,
        total: totalFull, // Все заявки где isFull = true
        hasMore,
        hasMoreBeyondLimit,
        beyondLimitCount, // Количество заявок с isFull=true, которые не влезли из-за лимита (не isEqualPaymentLimit)
        maxAvailableFull, // Количество доступных заявок с isFull=true AND isEqualPaymentLimit=true
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
      // ОПТИМИЗАЦИЯ: Используем INNER JOIN и обновляем напрямую через подзапрос
      // Это позволяет выполнить операцию в один запрос вместо двух
      const updateResult = await db.execute(sql`
        UPDATE quiz_bid b
        SET 
          status = ${updateData.status},
          admin_updated_at = NOW()
        FROM quiz q
        WHERE b.quiz_id = q.id
          AND b.key = ${updateData.key}
          AND q.user_id = ${userId}
          AND b.deleted_at IS NULL
        RETURNING b.id
      `);

      const result = (updateResult as unknown as Array<{ id: number }>) || [];

      if (!result.length) {
        throw new Error("Bid not found or access denied");
      }

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
      // ОПТИМИЗАЦИЯ: Используем INNER JOIN и raw SQL для более эффективного запроса
      const bidResult = await db.execute(sql`
        SELECT 
          b.id as "bidId",
          q.uid,
          b.key,
          b.status,
          b.is_full as "isFull",
          b.first,
          b.answer as data,
          b.info,
          b.questions,
          b.contacts,
          b.contacts_form as "contactsForm",
          b.user_info as "userInfo",
          b.init_data as "initData",
          b.created_at as "createdAt",
          b.updated_at as "updatedAt",
          b.admin_updated_at as "adminUpdatedAt",
          q.name as "quizName"
        FROM quiz_bid b
        INNER JOIN quiz q ON b.quiz_id = q.id
        WHERE b.key = ${key}
          AND q.user_id = ${userId}
          AND b.deleted_at IS NULL
        LIMIT 1
      `);

      const bids = (bidResult as unknown as Array<{
        bidId: number;
        uid: string;
        key: string;
        status: string;
        isFull: boolean;
        first: boolean;
        data: any;
        info: any;
        questions: any;
        contacts: any;
        contactsForm: any;
        userInfo: any;
        initData: string | null;
        createdAt: Date | string;
        updatedAt: Date | string;
        adminUpdatedAt: Date | string | null;
        quizName: string;
      }>) || [];

      if (!bids.length) {
        throw new Error("Bid not found or access denied");
      }

      const bidData = bids[0];

      // Проверяем, что uid и quizName не null (заявка должна быть связана с квизом)
      if (!bidData.uid || !bidData.quizName) {
        throw new Error("Bid data is invalid: missing quiz information");
      }

      // ОПТИМИЗАЦИЯ: Обновляем isRead в том же запросе через CTE или отдельным запросом
      // Используем отдельный запрос для простоты, но с INNER JOIN для проверки прав
      await db.execute(sql`
        UPDATE quiz_bid b
        SET 
          is_read = true,
          admin_updated_at = NOW()
        FROM quiz q
        WHERE b.quiz_id = q.id
          AND b.key = ${key}
          AND q.user_id = ${userId}
          AND b.deleted_at IS NULL
      `);

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
        createdAt: bidData.createdAt instanceof Date
          ? bidData.createdAt.toISOString()
          : new Date(bidData.createdAt).toISOString(),
        updatedAt: bidData.updatedAt instanceof Date
          ? bidData.updatedAt.toISOString()
          : new Date(bidData.updatedAt).toISOString(),
        adminUpdatedAt: bidData.adminUpdatedAt
          ? (bidData.adminUpdatedAt instanceof Date
            ? bidData.adminUpdatedAt.toISOString()
            : new Date(bidData.adminUpdatedAt).toISOString())
          : null,
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
      // ОПТИМИЗАЦИЯ: Используем INNER JOIN и обновляем напрямую через подзапрос
      // Это позволяет выполнить операцию в один запрос вместо двух
      const deleteResult = await db.execute(sql`
        UPDATE quiz_bid b
        SET 
          deleted_at = NOW(),
          admin_updated_at = NOW()
        FROM quiz q
        WHERE b.quiz_id = q.id
          AND b.key = ${key}
          AND q.user_id = ${userId}
          AND b.deleted_at IS NULL
        RETURNING b.id
      `);

      const result = (deleteResult as unknown as Array<{ id: number }>) || [];

      if (!result.length) {
        throw new Error("Bid not found or access denied");
      }

      logger.debug("Bid deleted", {
        userId,
        key,
        bidId: result[0].id,
      });
    } catch (error) {
      logger.error("Failed to delete bid", error as Error, { userId, key });
      throw error;
    }
  }

}