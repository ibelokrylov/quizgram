import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, quizBidTable, quizTable, userTable } from "../../db";
import { logger } from "../../lib/logger";

export abstract class SchedulerService {
  /**
   * Обрабатывает незавершенные заявки для платных пользователей
   * Находит quiz_bid с isFull=false, info=null, созданные минимум 15 минут назад
   * Анализирует отвал и записывает информацию в info
   */
  static async processIncompleteBids() {
    const startTime = Date.now();
    logger.info("Начало обработки незавершенных заявок");

    try {
      // Вычисляем время 15 минут назад
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      logger.debug("Время отсечки для обработки заявок", {
        fifteenMinutesAgo: fifteenMinutesAgo.toISOString(),
      });

      // Находим всех платных пользователей (planId !== 1)
      logger.debug("Поиск платных пользователей");
      const paidUsers = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(sql`${userTable.planId} != 1`);

      if (paidUsers.length === 0) {
        logger.debug("Нет платных пользователей для обработки");
        return;
      }

      const userIds = paidUsers.map((u) => u.id);
      logger.debug("Найдено платных пользователей", {
        count: paidUsers.length,
        userIds,
      });

      // Находим все квизы платных пользователей, которые не удалены
      logger.debug("Поиск квизов платных пользователей");
      const quizzes = await db
        .select({
          id: quizTable.id,
          userId: quizTable.userId,
        })
        .from(quizTable)
        .where(
          and(inArray(quizTable.userId, userIds), isNull(quizTable.deletedAt)),
        );

      if (quizzes.length === 0) {
        logger.debug("Нет квизов для обработки");
        return;
      }

      const quizIds = quizzes.map((q) => q.id);
      logger.debug("Найдено квизов для обработки", {
        count: quizzes.length,
        quizIds: quizIds.slice(0, 10), // Логируем первые 10 для примера
      });

      // Находим quiz_bid с условиями:
      // - isFull = false (незавершенные заявки)
      // - info = null
      // - созданы минимум 15 минут назад
      // - принадлежат квизам платных пользователей
      logger.debug("Поиск заявок для обработки", {
        conditions: {
          isFull: false,
          infoIsNull: true,
          createdAtBefore: fifteenMinutesAgo.toISOString(),
          quizIdsCount: quizIds.length,
        },
      });

      const bidsToProcess = await db
        .select({
          id: quizBidTable.id,
          quizId: quizBidTable.quizId,
          answer: quizBidTable.answer,
          questions: quizBidTable.questions,
        })
        .from(quizBidTable)
        .where(
          and(
            inArray(quizBidTable.quizId, quizIds),
            eq(quizBidTable.isFull, false),
            sql`${quizBidTable.info} IS NULL`,
            lt(quizBidTable.createdAt, fifteenMinutesAgo),
            isNull(quizBidTable.deletedAt),
          ),
        );

      if (bidsToProcess.length === 0) {
        logger.debug("Нет заявок для обработки");
        return;
      }

      logger.info("Найдено заявок для обработки", {
        count: bidsToProcess.length,
        bidIds: bidsToProcess.map((b) => b.id).slice(0, 10), // Логируем первые 10
      });

      let processedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const bid of bidsToProcess) {
        try {
          logger.debug("Обработка заявки", {
            bidId: bid.id,
            quizId: bid.quizId,
          });

          const info = this.analyzeBidDropout(bid.answer, bid.questions);

          if (info) {
            logger.debug("Результат анализа отвала", {
              bidId: bid.id,
              info,
            });

            await db
              .update(quizBidTable)
              .set({
                info: info,
              })
              .where(eq(quizBidTable.id, bid.id));

            logger.debug("Заявка успешно обработана", {
              bidId: bid.id,
              dropoutAt: info.dropoutAt,
              dropoutIndex: info.dropoutIndex,
              dropoutQuestionNumber: info.dropoutQuestionNumber,
            });

            processedCount++;
          } else {
            logger.debug("Не удалось определить отвал для заявки", {
              bidId: bid.id,
              hasAnswer: !!bid.answer,
              hasQuestions: !!bid.questions,
            });
            skippedCount++;
          }
        } catch (error) {
          logger.error("Ошибка при обработке заявки", error as Error, {
            bidId: bid.id,
            quizId: bid.quizId,
          });
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info("Обработка заявок завершена", {
        total: bidsToProcess.length,
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        "Ошибка при обработке незавершенных заявок",
        error as Error,
        {
          durationMs: duration,
        },
      );
    }
  }

  /**
   * Анализирует отвал в заявке
   * @param answer - данные ответов пользователя (поле answer из quiz_bid)
   * @param questions - вопросы квиза (поле questions из quiz_bid)
   * @returns объект info с информацией об отвале или null
   */
  private static analyzeBidDropout(answer: any, questions: any): any | null {
    logger.debug("Анализ отвала в заявке", {
      hasQuestions: !!questions,
      questionsIsArray: Array.isArray(questions),
      hasAnswer: !!answer,
      answerType: typeof answer,
    });

    if (!questions || !Array.isArray(questions)) {
      // Если нет questions, не можем определить отвал
      logger.debug(
        "Не удалось определить отвал: нет questions или questions не является массивом",
      );
      return null;
    }

    // Подсчитываем количество вопросов
    const questionsCount = questions.length;
    logger.debug("Количество вопросов", { questionsCount });

    if (!answer || typeof answer !== "object") {
      // Если нет answer, отвал произошел на первом вопросе (индекс 0, номер вопроса 1)
      logger.debug("Отвал на первом вопросе: нет ответов");
      return {
        dropoutAt: "question",
        dropoutIndex: 0,
        dropoutQuestionNumber: 1,
        dropoutReason: "no_answer",
        questionsCount,
        answersCount: 0,
      };
    }

    // Подсчитываем количество ответов в answer
    // answer может быть объектом с ключами-ответами или массивом
    let answersCount = 0;

    if (Array.isArray(answer)) {
      // Для массива считаем количество непустых элементов
      answersCount = answer.filter(
        (a) => a !== null && a !== undefined && a !== "",
      ).length;
      logger.debug("Подсчет ответов из массива", {
        totalLength: answer.length,
        answersCount,
      });
    } else if (typeof answer === "object") {
      // Для объекта считаем количество непустых значений
      // Важно: ответы могут быть сохранены по ключам, соответствующим индексам вопросов
      const allValues = Object.values(answer);
      answersCount = allValues.filter(
        (v) => v !== null && v !== undefined && v !== "",
      ).length;
      logger.debug("Подсчет ответов из объекта", {
        totalKeys: Object.keys(answer).length,
        answersCount,
        answerKeys: Object.keys(answer).slice(0, 10), // Первые 10 ключей для примера
      });
    }

    logger.debug("Сравнение количества ответов и вопросов", {
      questionsCount,
      answersCount,
    });

    // Если количество ответов совпадает с количеством вопросов или больше
    // значит отвал произошел на странице контактов
    if (answersCount >= questionsCount) {
      logger.debug("Отвал на странице контактов", {
        questionsCount,
        answersCount,
      });
      return {
        dropoutAt: "contacts",
        dropoutReason: "contacts_page",
        questionsCount,
        answersCount,
      };
    }

    // Отвал произошел на конкретном вопросе
    // Если ответов 4, а вопросов 7, то:
    // - ответил на вопросы с индексами 0, 1, 2, 3 (4 ответа)
    // - отвалился на вопросе с индексом 4 (это 5-й вопрос по счету)
    // dropoutIndex = answersCount (индекс в массиве, начиная с 0)
    // dropoutQuestionNumber = answersCount + 1 (номер вопроса, начиная с 1)
    const dropoutIndex = answersCount;
    const dropoutQuestionNumber = answersCount + 1;

    logger.debug("Отвал на конкретном вопросе", {
      dropoutIndex,
      dropoutQuestionNumber,
      questionsCount,
      answersCount,
    });

    return {
      dropoutAt: "question",
      dropoutIndex,
      dropoutQuestionNumber,
      dropoutReason: "question_not_answered",
      questionsCount,
      answersCount,
    };
  }
}
