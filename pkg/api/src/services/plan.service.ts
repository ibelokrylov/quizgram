// Сервис для работы с тарифными планами
// Автоматически создаёт планы при запуске приложения, если их нет

import { eq, sql } from "drizzle-orm";
import { db, planTable, type Plan } from "../db";
import { logger } from "../lib/logger";

export abstract class PlanService {
  /**
   * Сканирует планы и создаёт их, если они отсутствуют
   * Вызывается при запуске приложения
   */
  static async scanPlanAndCreate(): Promise<void> {
    const plans: Array<{
      id: number;
      name: "FREE" | "BASE";
      bidMonthLimit: number;
      price: number;
    }> = [
      { id: 1, name: "FREE", bidMonthLimit: 10, price: 0 },
      { id: 2, name: "BASE", bidMonthLimit: 100, price: 900 },
    ];

    for (const planInfo of plans) {
      try {
        await this.checkAndCreatePlan(
          planInfo.name,
          planInfo.id,
          planInfo.price,
          planInfo.bidMonthLimit,
        );
      } catch (error) {
        logger.error(
          `Ошибка при создании плана ${planInfo.name}`,
          error instanceof Error ? error : new Error(String(error)),
          { planName: planInfo.name, planId: planInfo.id },
        );
      }
    }
  }

  /**
   * Проверяет существование плана и создаёт его, если он отсутствует
   */
  private static async checkAndCreatePlan(
    name: "FREE" | "BASE",
    id: number,
    price: number,
    bidLimit: number,
  ): Promise<void> {
    // Проверяем, существует ли план с таким именем
    const existingPlans = await db
      .select()
      .from(planTable)
      .where(eq(planTable.name, name))
      .limit(1);

    const existingPlan = existingPlans[0];

    // Если план не найден - создаём его
    if (!existingPlan) {
      // Используем SQL напрямую для явного задания id
      // Это необходимо, так как serial поля в Drizzle обычно не позволяют задавать id явно
      await db.execute(
        sql`INSERT INTO plan (id, name, price, bid_month_limit) VALUES (${id}, ${name}::plan_name, ${price}, ${bidLimit}) ON CONFLICT (id) DO NOTHING`,
      );
      logger.info(`План ${name} успешно создан`, { planId: id, planName: name, price, bidMonthLimit: bidLimit });
    }
  }

  /**
   * Получить все планы
   */
  static async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(planTable);
  }

  /**
   * Получить план по ID
   */
  static async getPlanById(id: number): Promise<Plan | null> {
    const plans = await db
      .select()
      .from(planTable)
      .where(eq(planTable.id, id))
      .limit(1);

    return plans[0] ?? null;
  }
}
