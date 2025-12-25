// Скрипт для пересчета статистики quiz_open из существующих данных quiz_bid
// Использование: 
//   bun run scripts/recalculate-quiz-stats.ts --quiz-uid acc55c8c-4d20-4f22-bd7c-94f06aa9aaaf  (для конкретного квиза)
//   bun run scripts/recalculate-quiz-stats.ts --all  (для всех квизов)

import { eq, isNull, sql } from "drizzle-orm";
import { db, quizBidTable, quizOpenTable, quizTable } from "../src/db";
import { logger } from "../src/lib/logger";

interface Args {
  quizUid?: string;
  all?: boolean;
}

// Парсинг аргументов командной строки
function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--quiz-uid" && i + 1 < argv.length) {
      args.quizUid = argv[i + 1];
      i++;
    } else if (arg === "--all") {
      args.all = true;
    }
  }

  return args;
}

// Пересчет статистики quiz_open для конкретного квиза
async function recalculateQuizStats(quizUid: string, quizId: number): Promise<{ opened: number; openedUnique: number; full: number }> {
  try {
    // Подсчитываем статистику из quiz_bid
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*)::bigint as opened,
        COUNT(DISTINCT key)::bigint as opened_unique,
        COUNT(*) FILTER (WHERE is_full = true)::bigint as full
      FROM quiz_bid
      WHERE quiz_id = ${quizId} AND deleted_at IS NULL
    `);

    const stats = (statsResult as unknown as Array<{
      opened: number | string;
      opened_unique: number | string;
      full: number | string;
    }>)[0];

    const opened = Number(stats?.opened || 0);
    const openedUnique = Number(stats?.opened_unique || 0);
    const full = Number(stats?.full || 0);

    // Обновляем или создаем запись в quiz_open
    await db
      .insert(quizOpenTable)
      .values({
        quizUid,
        opened,
        openedUnique,
        full,
      })
      .onConflictDoUpdate({
        target: quizOpenTable.quizUid,
        set: {
          opened,
          openedUnique,
          full,
        },
      });

    logger.info("Статистика quiz_open пересчитана", {
      quizUid,
      opened,
      openedUnique,
      full,
    });

    return { opened, openedUnique, full };
  } catch (error) {
    logger.error(
      "Ошибка при пересчете статистики quiz_open",
      error instanceof Error ? error : new Error(String(error)),
      { quizUid, quizId }
    );
    throw error;
  }
}

async function main() {
  const args = parseArgs();

  if (!args.quizUid && !args.all) {
    console.error("❌ Ошибка: необходимо указать --quiz-uid <uid> или --all");
    process.exit(1);
  }

  try {
    if (args.quizUid) {
      // Пересчет для конкретного квиза
      console.log(`Пересчитываю статистику для квиза: ${args.quizUid}`);

      const quiz = await db
        .select({ id: quizTable.id, uid: quizTable.uid })
        .from(quizTable)
        .where(eq(quizTable.uid, args.quizUid))
        .limit(1);

      if (quiz.length === 0) {
        throw new Error(`Квиз с uid ${args.quizUid} не найден`);
      }

      const stats = await recalculateQuizStats(quiz[0].uid, quiz[0].id);

      console.log(`\n✅ Статистика пересчитана:`);
      console.log(`   Открытий: ${stats.opened}`);
      console.log(`   Уникальных открытий: ${stats.openedUnique}`);
      console.log(`   Прохождений: ${stats.full}`);
    } else if (args.all) {
      // Пересчет для всех квизов
      console.log("Пересчитываю статистику для всех квизов...");

      const quizzes = await db
        .select({ id: quizTable.id, uid: quizTable.uid })
        .from(quizTable)
        .where(isNull(quizTable.deletedAt));

      if (quizzes.length === 0) {
        console.log("⚠️  Квизы не найдены");
        process.exit(0);
      }

      console.log(`Найдено квизов: ${quizzes.length}\n`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < quizzes.length; i++) {
        const quiz = quizzes[i];
        try {
          const stats = await recalculateQuizStats(quiz.uid, quiz.id);
          successCount++;
          if ((i + 1) % 10 === 0 || i === quizzes.length - 1) {
            console.log(`Обработано: ${i + 1}/${quizzes.length} (успешно: ${successCount}, ошибок: ${errorCount})`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Ошибка при пересчете квиза ${quiz.uid}:`, error);
        }
      }

      console.log(`\n✅ Пересчет завершен:`);
      console.log(`   Успешно: ${successCount}`);
      console.log(`   Ошибок: ${errorCount}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при пересчете статистики:", error);
    logger.error(
      "Ошибка при пересчете статистики",
      error instanceof Error ? error : new Error(String(error)),
      { args }
    );
    process.exit(1);
  }
}

main();

