// Сервис payment — бизнес-логика для обновления плана пользователя

import { eq } from "drizzle-orm";
import {
  db,
  planTable,
  userPaymentTable,
  userTable,
  type NewUserPayment,
  type Plan,
} from "../../db";
import { logger } from "../../lib/logger";

export abstract class PaymentService {
  /**
   * Обновление плана пользователя
   * @param userId - ID пользователя
   * @param planId - ID нового плана
   * @returns Обновленный план
   */
  static async updateUserPlan(
    userId: number,
    planId: number,
  ): Promise<Plan> {
    // Проверяем, существует ли план
    const plans = await db
      .select()
      .from(planTable)
      .where(eq(planTable.id, planId))
      .limit(1);

    const plan = plans[0];

    if (!plan) {
      const error = new Error("Plan not found");
      error.name = "PlanNotFoundError";
      throw error;
    }

    // Обновляем план пользователя
    await db
      .update(userTable)
      .set({
        planId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    // Создаём или обновляем запись в user_payment
    try {
      // Вычисляем finalDayAt: 30 дней от текущего времени + время 23:59:00
      const finalDayAt = new Date();
      finalDayAt.setDate(finalDayAt.getDate() + 30);
      finalDayAt.setHours(23, 59, 0, 0);

      const userPaymentData: NewUserPayment = {
        userId,
        planId: plan.id,
        limit: plan.bidMonthLimit, // Используем bid_month_limit из плана
        finalDayAt,
        currentLimit: 0, // Сбрасываем текущий лимит при смене плана
        extended: true,
        month: 1,
      };

      // Используем upsert: обновляем существующую запись или создаём новую
      await db
        .insert(userPaymentTable)
        .values(userPaymentData)
        .onConflictDoUpdate({
          target: [userPaymentTable.userId], // Конфликт по уникальному user_id
          set: {
            planId: plan.id,
            limit: plan.bidMonthLimit,
            finalDayAt,
            currentLimit: 0, // Сбрасываем текущий лимит при смене плана
            extended: true,
            month: 1,
          },
        });

      logger.info("Запись user_payment создана/обновлена при изменении плана", {
        userId,
        planId: plan.id,
        planName: plan.name,
        limit: plan.bidMonthLimit,
      });
    } catch (paymentError) {
      logger.error(
        "Ошибка при создании/обновлении user_payment при изменении плана",
        paymentError instanceof Error
          ? paymentError
          : new Error(String(paymentError)),
        { userId, planId: plan.id },
      );
      // Не прерываем обновление плана, если не удалось создать/обновить user_payment
    }

    logger.info("План пользователя успешно обновлен", {
      userId,
      planId: plan.id,
      planName: plan.name,
    });

    return plan;
  }
}
