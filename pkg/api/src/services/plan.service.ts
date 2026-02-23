// Сервис для работы с тарифными планами
// Автоматически создаёт планы при запуске приложения, если их нет

import { eq, sql } from 'drizzle-orm';
import { db, planTable, type Plan, upLimitTable } from '../db';
import { logger } from '../lib/logger';

export abstract class PlanService {
  /**
   * Сканирует планы и создаёт их, если они отсутствуют
   * Вызывается при запуске приложения
   */
  static async scanPlanAndCreate(): Promise<void> {
    const plans: Array<{
      id: number;
      name: 'FREE' | 'BASE' | 'PRO_PLUS';
      bidMonthLimit: number;
      price: number;
    }> = [
      { id: 1, name: 'FREE', bidMonthLimit: 10, price: 0 },
      { id: 2, name: 'BASE', bidMonthLimit: 100, price: 900 },
      { id: 3, name: 'PRO_PLUS', bidMonthLimit: 200, price: 1600 }, // Базовый лимит 200 заявок, базовая цена 1600 ₽
    ];

    for (const planInfo of plans) {
      try {
        await this.checkAndCreatePlan(
          planInfo.name,
          planInfo.id,
          planInfo.price,
          planInfo.bidMonthLimit
        );
      } catch (error) {
        logger.error(
          `Ошибка при создании плана ${planInfo.name}`,
          error instanceof Error ? error : new Error(String(error)),
          { planName: planInfo.name, planId: planInfo.id }
        );
      }
    }

    // Создаём записи up_limit для тарифа Pro+
    await this.scanUpLimitsAndCreate();
  }

  /**
   * Создаёт записи up_limit для тарифа Pro+
   * Цены указаны в рублях (не в копейках)
   */
  static async scanUpLimitsAndCreate(): Promise<void> {
    const upLimits: Array<{ bid: number; price: number }> = [
      { bid: 100, price: 600 }, // +100 ставок (итого 300) = 600 ₽
      { bid: 300, price: 2050 }, // +300 ставок (итого 500) = 2050 ₽
      { bid: 800, price: 4300 }, // +800 ставок (итого 1000) = 4300 ₽
      { bid: 2800, price: 9300 }, // +2800 ставок (итого 3000) = 9300 ₽
      { bid: 4800, price: 13300 }, // +4800 ставок (итого 5000) = 13300 ₽
    ];

    for (const upLimitInfo of upLimits) {
      try {
        await this.checkAndCreateUpLimit(upLimitInfo.bid, upLimitInfo.price);
      } catch (error) {
        logger.error(
          `Ошибка при создании up_limit для ${upLimitInfo.bid} заявок`,
          error instanceof Error ? error : new Error(String(error)),
          { bid: upLimitInfo.bid, price: upLimitInfo.price }
        );
      }
    }
  }

  /**
   * Проверяет существование up_limit и создаёт его, если он отсутствует
   */
  private static async checkAndCreateUpLimit(bid: number, price: number): Promise<void> {
    const existingUpLimits = await db
      .select()
      .from(upLimitTable)
      .where(eq(upLimitTable.bid, bid))
      .limit(1);

    if (existingUpLimits.length === 0) {
      await db.insert(upLimitTable).values({ bid, price });
      logger.info(`UpLimit создан`, { bid, price });
    }
  }

  /**
   * Проверяет существование плана и создаёт его, если он отсутствует
   */
  private static async checkAndCreatePlan(
    name: 'FREE' | 'BASE' | 'PRO_PLUS',
    id: number,
    price: number,
    bidLimit: number
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
        sql`INSERT INTO plan (id, name, price, bid_month_limit) VALUES (${id}, ${name}::plan_name, ${price}, ${bidLimit}) ON CONFLICT (id) DO NOTHING`
      );
      logger.info(`План ${name} успешно создан`, {
        planId: id,
        planName: name,
        price,
        bidMonthLimit: bidLimit,
      });
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
    const plans = await db.select().from(planTable).where(eq(planTable.id, id)).limit(1);

    return plans[0] ?? null;
  }
}
