import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, planTable, quizBidTable, quizTable, userPaymentTable, userTable } from "../../db";
import { logger } from "../../lib/logger";
import { MailService } from "../../services/mail.service";

export abstract class SchedulerService {
  /**
   * Обрабатывает незавершенные заявки для платных пользователей
   * Находит quiz_bid с isFull=false, info=null, обновленные минимум N минут назад (из SCHEDULER_BIDS_MINUTES, по умолчанию 5)
   * Анализирует отвал и записывает информацию в info
   */
  static async processIncompleteBids() {
    const startTime = Date.now();
    logger.info("Начало обработки незавершенных заявок");

    try {
      // Читаем количество минут из переменной окружения, по умолчанию 5
      const env = typeof Bun !== "undefined" ? Bun.env : process.env;
      const minutes = env.SCHEDULER_BIDS_MINUTES
        ? parseInt(env.SCHEDULER_BIDS_MINUTES, 10)
        : 5;

      // Вычисляем время N минут назад
      const minutesAgo = new Date(Date.now() - minutes * 60 * 1000);
      logger.debug("Время отсечки для обработки заявок", {
        minutes,
        minutesAgo: minutesAgo.toISOString(),
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
      // - обновлены минимум N минут назад (из SCHEDULER_BIDS_MINUTES)
      // - принадлежат квизам платных пользователей
      logger.debug("Поиск заявок для обработки", {
        conditions: {
          isFull: false,
          infoIsNull: true,
          minutes,
          updatedAtBefore: minutesAgo.toISOString(),
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
            lt(quizBidTable.updatedAt, minutesAgo),
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

  /**
   * Обрабатывает платежи пользователей:
   * - Отправляет письмо за 2 дня до окончания подписки (если extended=true)
   * - Продлевает подписку автоматически, если она закончилась
   */
  static async processPayments() {
    const startTime = Date.now();
    logger.info("Начало обработки платежей");

    try {
      const now = new Date();
      // Устанавливаем время на 00:00:00 для текущей даты
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      // Дата через 2 дня (для проверки окончания подписки)
      const twoDaysLater = new Date(today);
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);
      twoDaysLater.setHours(23, 59, 59, 999);

      logger.debug("Проверка платежей", {
        now: now.toISOString(),
        today: today.toISOString(),
        twoDaysLater: twoDaysLater.toISOString(),
      });

      // Находим всех не удаленных пользователей с платными планами и user_payment
      const usersWithPayments = await db
        .select({
          userId: userTable.id,
          userLogin: userTable.login,
          userLanguage: userTable.language,
          userPaymentId: userPaymentTable.id,
          planId: userPaymentTable.planId,
          finalDayAt: userPaymentTable.finalDayAt,
          extended: userPaymentTable.extended,
          limit: userPaymentTable.limit,
          currentLimit: userPaymentTable.currentLimit,
          planName: planTable.name,
          planBidMonthLimit: planTable.bidMonthLimit,
        })
        .from(userPaymentTable)
        .innerJoin(userTable, eq(userPaymentTable.userId, userTable.id))
        .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
        .where(
          and(
            isNull(userTable.deletedAt), // Только не удаленные пользователи
            sql`${userPaymentTable.planId} != 1`, // Только платные планы
          ),
        );

      if (usersWithPayments.length === 0) {
        logger.debug("Нет пользователей с платными планами для обработки");
        return;
      }

      logger.info("Найдено пользователей с платными планами", {
        count: usersWithPayments.length,
      });

      let emailsSent = 0;
      let subscriptionsExtended = 0;
      let errors = 0;

      for (const userPayment of usersWithPayments) {
        try {
          const finalDayAt = new Date(userPayment.finalDayAt);

          // Проверяем, заканчивается ли подписка через 2 дня и extended=true
          if (
            userPayment.extended &&
            finalDayAt >= today &&
            finalDayAt <= twoDaysLater
          ) {
            // Отправляем письмо о предстоящем списании
            try {
              const userLanguage = userPayment.userLanguage || "ru";
              await MailService.sendPaymentReminder(
                userPayment.userLogin,
                userLanguage,
              );

              logger.info("Отправлено письмо о предстоящем списании", {
                userId: userPayment.userId,
                email: userPayment.userLogin,
                finalDayAt: finalDayAt.toISOString(),
              });

              emailsSent++;
            } catch (emailError) {
              logger.error(
                "Ошибка при отправке письма о предстоящем списании",
                emailError instanceof Error
                  ? emailError
                  : new Error(String(emailError)),
                {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                },
              );
              errors++;
            }
          }

          // Проверяем, закончилась ли подписка
          if (finalDayAt < today) {
            // Продлеваем подписку на 30 дней и обновляем лимиты
            const newFinalDayAt = new Date(today);
            newFinalDayAt.setDate(newFinalDayAt.getDate() + 30);
            newFinalDayAt.setHours(23, 59, 0, 0);

            // Обновляем user_payment
            await db
              .update(userPaymentTable)
              .set({
                finalDayAt: newFinalDayAt,
                limit: userPayment.planBidMonthLimit, // Обновляем лимит из плана
                currentLimit: 0, // Сбрасываем текущий лимит
                extended: true,
                month: 1,
              })
              .where(eq(userPaymentTable.id, userPayment.userPaymentId));

            // Обновляем план пользователя
            await db
              .update(userTable)
              .set({
                planId: userPayment.planId,
                updatedAt: new Date(),
              })
              .where(eq(userTable.id, userPayment.userId));

            logger.info("Подписка продлена автоматически", {
              userId: userPayment.userId,
              planId: userPayment.planId,
              oldFinalDayAt: finalDayAt.toISOString(),
              newFinalDayAt: newFinalDayAt.toISOString(),
              newLimit: userPayment.planBidMonthLimit,
            });

            subscriptionsExtended++;
          }
        } catch (error) {
          logger.error(
            "Ошибка при обработке платежа пользователя",
            error instanceof Error ? error : new Error(String(error)),
            {
              userId: userPayment.userId,
              userPaymentId: userPayment.userPaymentId,
            },
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info("Обработка платежей завершена", {
        total: usersWithPayments.length,
        emailsSent,
        subscriptionsExtended,
        errors,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        "Ошибка при обработке платежей",
        error instanceof Error ? error : new Error(String(error)),
        {
          durationMs: duration,
        },
      );
    }
  }
}
