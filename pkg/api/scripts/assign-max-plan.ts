// Скрипт для ручной выдачи тарифа PRO_PLUS пользователю по email
// Запуск: bun run scripts/assign-max-plan.ts

import postgres from "postgres";

// ============================================
// НАСТРОЙКИ - УКАЖИТЕ EMAIL ПОЛЬЗОВАТЕЛЯ И UP_LIMIT_ID
// ============================================
const USER_EMAIL: string = "bellivan64@gmail.com"; // <-- Укажите email пользователя
const UP_LIMIT_ID: number | null = 5; // <-- ID из таблицы up_limit (null = без доп. лимита)
// ============================================

const env = typeof Bun !== "undefined" ? Bun.env : process.env;
const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST = "localhost",
  POSTGRES_PORT = "5432",
  DATABASE_URL,
} = env;

const connectionString =
  DATABASE_URL ??
  `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

// PRO_PLUS plan ID = 3
const PRO_PLUS_PLAN_ID = 3;

async function assignMaxPlan() {
  if (USER_EMAIL === "user@example.com") {
    console.error("❌ Укажите email пользователя в переменной USER_EMAIL");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    const email = USER_EMAIL.toLowerCase().trim();
    console.log(`\nПоиск пользователя: ${email}`);

    // 1. Находим пользователя по email
    const users = await sql`
      SELECT id, login, name, plan_id
      FROM "user"
      WHERE LOWER(login) = ${email}
      LIMIT 1
    `;

    if (users.length === 0) {
      console.error(`❌ Пользователь с email "${email}" не найден`);
      process.exit(1);
    }

    const user = users[0];
    console.log(
      `✅ Пользователь найден: ID=${user.id}, name="${user.name}", текущий plan_id=${user.plan_id}`,
    );

    // 2. Получаем план PRO_PLUS из БД
    const plans = await sql`
      SELECT id, name, bid_month_limit
      FROM plan
      WHERE id = ${PRO_PLUS_PLAN_ID}
      LIMIT 1
    `;

    if (plans.length === 0) {
      console.error(`❌ План PRO_PLUS (id=${PRO_PLUS_PLAN_ID}) не найден`);
      process.exit(1);
    }

    const plan = plans[0];
    const baseBidLimit = plan.bid_month_limit;
    console.log(`✅ План: ${plan.name}, базовый лимит: ${baseBidLimit}`);

    // 3. Получаем дополнительный лимит из up_limit (если указан)
    let additionalLimit = 0;
    let upLimitRecord = null;
    if (UP_LIMIT_ID !== null) {
      const upLimits = await sql`
        SELECT id, bid, price
        FROM up_limit
        WHERE id = ${UP_LIMIT_ID}
        LIMIT 1
      `;

      if (upLimits.length === 0) {
        console.error(`❌ up_limit с id=${UP_LIMIT_ID} не найден`);
        console.log(`\nДоступные up_limit:`);
        const allUpLimits =
          await sql`SELECT id, bid, price FROM up_limit ORDER BY bid`;
        for (const ul of allUpLimits) {
          console.log(`  ID=${ul.id}: +${ul.bid} заявок (${ul.price} руб.)`);
        }
        process.exit(1);
      }

      upLimitRecord = upLimits[0];
      additionalLimit = upLimitRecord.bid;
      console.log(
        `✅ up_limit: ID=${upLimitRecord.id}, +${additionalLimit} заявок`,
      );
    }

    const totalLimit = baseBidLimit + additionalLimit;
    console.log(
      `✅ Итоговый лимит: ${baseBidLimit} + ${additionalLimit} = ${totalLimit}`,
    );

    // 4. Обновляем plan_id пользователя
    await sql`
      UPDATE "user"
      SET plan_id = ${PRO_PLUS_PLAN_ID}, updated_at = NOW()
      WHERE id = ${user.id}
    `;
    console.log(
      `✅ plan_id пользователя обновлён на ${PRO_PLUS_PLAN_ID} (PRO_PLUS)`,
    );

    // 5. Деактивируем все текущие активные подписки
    const deactivated = await sql`
      UPDATE user_payment
      SET is_active = false
      WHERE user_id = ${user.id} AND is_active = true
    `;
    console.log(`✅ Деактивировано старых подписок: ${deactivated.count}`);

    // 6. Рассчитываем дату окончания (1 месяц от сегодня, 23:59:00)
    const finalDayAt = new Date();
    finalDayAt.setMonth(finalDayAt.getMonth() + 1);
    finalDayAt.setHours(23, 59, 0, 0);

    // 7. Создаём новую запись user_payment
    const inserted = await sql`
      INSERT INTO user_payment (
        user_id,
        plan_id,
        payment_id,
        created_at,
        final_day_at,
        "limit",
        current_limit,
        extended,
        month,
        is_active,
        is_paid,
        starts_at,
        scheduled_plan_id,
        payment_attempts,
        max_payment_attempts
      ) VALUES (
        ${user.id},
        ${PRO_PLUS_PLAN_ID},
        NULL,
        NOW(),
        ${finalDayAt},
        ${totalLimit},
        0,
        true,
        1,
        true,
        true,
        NULL,
        NULL,
        0,
        7
      )
      RETURNING id
    `;
    console.log(`✅ Создана подписка user_payment ID=${inserted[0].id}`);

    // 8. Если указан upLimit, создаём запись в user_payment_pro
    if (UP_LIMIT_ID !== null && upLimitRecord) {
      const existingPro = await sql`
        SELECT id FROM user_payment_pro
        WHERE user_id = ${user.id} AND up_limit_id = ${UP_LIMIT_ID}
        LIMIT 1
      `;

      if (existingPro.length === 0) {
        await sql`
          INSERT INTO user_payment_pro (user_id, up_limit_id, created_at)
          VALUES (${user.id}, ${UP_LIMIT_ID}, NOW())
        `;
        console.log(
          `✅ Создана запись user_payment_pro для up_limit_id=${UP_LIMIT_ID}`,
        );
      } else {
        console.log(`ℹ️ Запись user_payment_pro уже существует`);
      }
    }

    console.log(`\n========================================`);
    console.log(`Пользователю ${email} выдан тариф PRO_PLUS`);
    console.log(`Лимит заявок: ${totalLimit}`);
    if (UP_LIMIT_ID !== null) {
      console.log(`  (базовый ${baseBidLimit} + доп. ${additionalLimit})`);
    }
    console.log(
      `Действует до: ${finalDayAt.toLocaleDateString("ru-RU")} 23:59`,
    );
    console.log(`========================================\n`);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

assignMaxPlan();
