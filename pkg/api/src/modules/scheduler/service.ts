import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, paymentTable, planTable, quizBidTable, quizTable, upLimitTable, userPaymentProTable, userPaymentTable, userTable } from "../../db";
import * as DateUtils from "../../lib/date-utils";
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
      const minutesAgo = DateUtils.now().minus({ minutes });
      logger.debug("Время отсечки для обработки заявок", {
        minutes,
        minutesAgo: DateUtils.toISO(minutesAgo),
      });

      // Находим всех платных пользователей (planId !== 1)
      logger.debug("Поиск платных пользователей");
      const paidUsers = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(sql`${userTable.planId} != 1 OR isAdmin = true`);

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
          updatedAtBefore: DateUtils.toISO(minutesAgo),
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
            lt(quizBidTable.updatedAt, DateUtils.toJSDate(minutesAgo)),
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
      const firstQuestion = questions[0];
      logger.debug("Отвал на первом вопросе: нет ответов");
      return {
        dropoutAt: "question",
        dropoutIndex: 0,
        dropoutQuestionNumber: 1,
        dropoutQuestionUid: firstQuestion?.uid || null,
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
    const dropoutQuestion = questions[dropoutIndex];

    logger.debug("Отвал на конкретном вопросе", {
      dropoutIndex,
      dropoutQuestionNumber,
      dropoutQuestionUid: dropoutQuestion?.uid,
      questionsCount,
      answersCount,
    });

    return {
      dropoutAt: "question",
      dropoutIndex,
      dropoutQuestionNumber,
      dropoutQuestionUid: dropoutQuestion?.uid || null,
      dropoutReason: "question_not_answered",
      questionsCount,
      answersCount,
    };
  }

  /**
   * Обрабатывает платежи пользователей:
   * - Отправляет письмо за 2 дня до окончания подписки (если extended=true)
   * - Продлевает подписку автоматически, если она закончилась
   * @param skipTimeCheck - Пропустить проверку временных рамок (для тестов)
   */
  static async processPayments(skipTimeCheck: boolean = false) {
    const startTime = Date.now();
    logger.info("Начало обработки платежей");

    try {
      const now = DateUtils.now();
      const today = DateUtils.startOfToday();
      const twoDaysLater = DateUtils.calculateDatePlusDaysEndOfDay(2);

      logger.debug("Проверка платежей", {
        now: DateUtils.toISO(now),
        today: DateUtils.toISO(today),
        twoDaysLater: DateUtils.toISO(twoDaysLater),
      });

      // Находим всех не удаленных пользователей с платными планами и активными user_payment
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
          planPrice: planTable.price,
          paymentId: userPaymentTable.paymentId,
          paymentMethod: paymentTable.method,
          paymentInvoiceUrl: paymentTable.invoiceUrl,
          paymentAttempts: userPaymentTable.paymentAttempts,
          lastPaymentAttemptAt: userPaymentTable.lastPaymentAttemptAt,
          maxPaymentAttempts: userPaymentTable.maxPaymentAttempts,
        })
        .from(userPaymentTable)
        .innerJoin(userTable, eq(userPaymentTable.userId, userTable.id))
        .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
        .leftJoin(paymentTable, eq(userPaymentTable.paymentId, paymentTable.id))
        .where(
          and(
            isNull(userTable.deletedAt), // Только не удаленные пользователи
            sql`${userPaymentTable.planId} != 1`, // Только платные планы
            eq(userPaymentTable.isActive, true), // Только активные записи user_payment
          ),
        );

      if (usersWithPayments.length === 0) {
        logger.debug("Нет пользователей с платными планами для обработки");
        return;
      }

      logger.info("Найдено пользователей с платными планами", {
        count: usersWithPayments.length,
      });

      // Находим отсроченные планы, которые должны начаться сегодня
      const scheduledPayments = await db
        .select({
          userPaymentId: userPaymentTable.id,
          userId: userPaymentTable.userId,
          planId: userPaymentTable.planId,
          scheduledPlanId: userPaymentTable.scheduledPlanId,
          startsAt: userPaymentTable.startsAt,
          isPaid: userPaymentTable.isPaid,
          paymentId: userPaymentTable.paymentId,
        })
        .from(userPaymentTable)
        .innerJoin(userTable, eq(userPaymentTable.userId, userTable.id))
        .where(
          and(
            isNull(userTable.deletedAt),
            eq(userPaymentTable.isActive, false), // Неактивные записи (отсроченные)
            sql`DATE(${userPaymentTable.startsAt}) = DATE(${sql.raw("CURRENT_DATE")})`, // Начинаются сегодня
          ),
        );

      logger.info("Найдено отсроченных планов для активации", {
        count: scheduledPayments.length,
      });

      let emailsSent = 0;
      let subscriptionsExtended = 0;
      let scheduledPlansActivated = 0;
      let errors = 0;

      // Обрабатываем отсроченные планы
      for (const scheduledPayment of scheduledPayments) {
        try {
          const { PaymentService } = await import("../payment/service");

          // Если план не оплачен, создаем платеж
          if (!scheduledPayment.isPaid && scheduledPayment.paymentId) {
            // Платеж уже создан, просто активируем план
            await PaymentService.activateScheduledPlan(
              scheduledPayment.userPaymentId,
            );
          } else if (!scheduledPayment.isPaid) {
            // Платеж не создан, нужно создать его сейчас
            // Это не должно происходить, но на всякий случай обрабатываем
            logger.warn("Отсроченный план без платежа", {
              userPaymentId: scheduledPayment.userPaymentId,
              userId: scheduledPayment.userId,
            });
          } else {
            // План уже оплачен, просто активируем
            await PaymentService.activateScheduledPlan(
              scheduledPayment.userPaymentId,
            );
          }

          logger.info("Отсроченный план активирован", {
            userId: scheduledPayment.userId,
            planId: scheduledPayment.planId,
            userPaymentId: scheduledPayment.userPaymentId,
          });

          scheduledPlansActivated++;
        } catch (error) {
          logger.error(
            "Ошибка при активации отсроченного плана",
            error instanceof Error ? error : new Error(String(error)),
            {
              userId: scheduledPayment.userId,
              userPaymentId: scheduledPayment.userPaymentId,
            },
          );
          errors++;
        }
      }

      for (const userPayment of usersWithPayments) {
        try {
          const finalDayAt = DateUtils.fromJSDate(userPayment.finalDayAt);

          // Проверяем, заканчивается ли подписка через 2 дня
          if (DateUtils.isBetweenInclusive(finalDayAt, today, twoDaysLater)) {
            try {
              const userLanguage = userPayment.userLanguage || "ru";

              if (userPayment.extended) {
                // Если extended=true, отправляем письмо о предстоящем списании
                await MailService.sendPaymentReminder(
                  userPayment.userLogin,
                  userLanguage,
                );

                logger.info("Отправлено письмо о предстоящем списании", {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                  finalDayAt: DateUtils.toISO(finalDayAt),
                });
              } else {
                // Если extended=false, отправляем письмо о переходе на FREE план
                await MailService.sendPlanExpirationNotice(
                  userPayment.userLogin,
                  DateUtils.formatDate(finalDayAt),
                  userLanguage,
                  userPayment.planName,
                );

                logger.info("Отправлено письмо о переходе на FREE план", {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                  currentPlan: userPayment.planName,
                  finalDayAt: DateUtils.toISO(finalDayAt),
                });
              }

              emailsSent++;
            } catch (emailError) {
              logger.error(
                "Ошибка при отправке письма",
                emailError instanceof Error
                  ? emailError
                  : new Error(String(emailError)),
                {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                  extended: userPayment.extended,
                },
              );
              errors++;
            }
          }

          // Проверяем, закончилась ли подписка
          if (DateUtils.isBefore(finalDayAt, today)) {
            // Если extended=false, просто деактивируем подписку и переводим на FREE план
            if (!userPayment.extended) {
              logger.info("Подписка истекла (extended=false), перевод на FREE план", {
                userId: userPayment.userId,
                planId: userPayment.planId,
              });

              // Получаем FREE план (id=1)
              const freePlans = await db
                .select()
                .from(planTable)
                .where(eq(planTable.id, 1))
                .limit(1);

              if (freePlans.length === 0) {
                logger.error(
                  "FREE план не найден",
                  new Error("FREE plan not found"),
                  { userId: userPayment.userId }
                );
                errors++;
                continue;
              }

              // Деактивируем текущую подписку
              await db
                .update(userPaymentTable)
                .set({
                  isActive: false,
                })
                .where(eq(userPaymentTable.id, userPayment.userPaymentId));

              // Обновляем план пользователя на FREE
              await db
                .update(userTable)
                .set({
                  planId: freePlans[0].id,
                  updatedAt: DateUtils.toJSDate(DateUtils.now()),
                })
                .where(eq(userTable.id, userPayment.userId));

              subscriptionsExtended++;
              continue;
            }

            // Если нет paymentId, используем старую логику автоматического продления
            if (!userPayment.paymentId) {
              // Автоматически продлеваем подписку (старая логика)
              const newFinalDayAt = DateUtils.calculateSubscriptionEndDate(today);

              // Для Pro+ проверяем наличие дополнительного лимита
              let totalLimit = userPayment.planBidMonthLimit;

              if (userPayment.planName === "PRO_PLUS") {
                const userPaymentPro = await db
                  .select({
                    upLimitId: userPaymentProTable.upLimitId,
                    additionalLimit: upLimitTable.bid,
                  })
                  .from(userPaymentProTable)
                  .innerJoin(upLimitTable, eq(userPaymentProTable.upLimitId, upLimitTable.id))
                  .where(eq(userPaymentProTable.userId, userPayment.userId))
                  .limit(1);

                if (userPaymentPro.length > 0) {
                  totalLimit = userPayment.planBidMonthLimit + userPaymentPro[0].additionalLimit;

                  logger.debug("Найден дополнительный лимит для Pro+", {
                    userId: userPayment.userId,
                    baseLimit: userPayment.planBidMonthLimit,
                    additionalLimit: userPaymentPro[0].additionalLimit,
                    totalLimit,
                  });
                }
              }

              // Обновляем user_payment
              await db
                .update(userPaymentTable)
                .set({
                  finalDayAt: DateUtils.toJSDate(newFinalDayAt),
                  limit: totalLimit,
                  currentLimit: 0,
                  extended: true,
                  month: 1,
                })
                .where(eq(userPaymentTable.id, userPayment.userPaymentId));

              // Обновляем план пользователя
              await db
                .update(userTable)
                .set({
                  planId: userPayment.planId,
                  updatedAt: DateUtils.toJSDate(DateUtils.now()),
                })
                .where(eq(userTable.id, userPayment.userId));

              logger.info("Подписка продлена автоматически (без paymentId)", {
                userId: userPayment.userId,
                planId: userPayment.planId,
                oldFinalDayAt: DateUtils.toISO(finalDayAt),
                newFinalDayAt: DateUtils.toISO(newFinalDayAt),
                totalLimit,
              });

              subscriptionsExtended++;
              continue;
            }

            // Проверяем, превышено ли максимальное количество попыток оплаты
            if (userPayment.paymentAttempts >= userPayment.maxPaymentAttempts) {
              // Переводим пользователя на бесплатный план
              logger.info("Превышено максимальное количество попыток оплаты, перевод на FREE план", {
                userId: userPayment.userId,
                paymentAttempts: userPayment.paymentAttempts,
                maxPaymentAttempts: userPayment.maxPaymentAttempts,
              });

              // Получаем FREE план (id=1)
              const freePlans = await db
                .select()
                .from(planTable)
                .where(eq(planTable.id, 1))
                .limit(1);

              if (freePlans.length === 0) {
                logger.error(
                  "FREE план не найден",
                  new Error("FREE plan not found"),
                  { userId: userPayment.userId }
                );
                errors++;
                continue;
              }

              const freePlan = freePlans[0];

              // Деактивируем текущую подписку
              await db
                .update(userPaymentTable)
                .set({
                  isActive: false,
                })
                .where(eq(userPaymentTable.id, userPayment.userPaymentId));

              // Обновляем план пользователя на FREE
              await db
                .update(userTable)
                .set({
                  planId: freePlan.id,
                  updatedAt: DateUtils.toJSDate(DateUtils.now()),
                })
                .where(eq(userTable.id, userPayment.userId));

              // Отправляем уведомление о переводе на FREE план
              try {
                const userLanguage = userPayment.userLanguage || "ru";
                const expirationDate = DateUtils.formatDate(DateUtils.now());
                await MailService.sendPlanExpirationNotice(
                  userPayment.userLogin,
                  expirationDate,
                  userLanguage,
                );

                logger.info("Отправлено письмо о переводе на FREE план после неудачных попыток оплаты", {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                });
              } catch (emailError) {
                logger.error(
                  "Ошибка при отправке письма о переводе на FREE план",
                  emailError instanceof Error
                    ? emailError
                    : new Error(String(emailError)),
                  {
                    userId: userPayment.userId,
                    email: userPayment.userLogin,
                  },
                );
              }

              subscriptionsExtended++;
              continue;
            }

            // Определяем способ оплаты
            const paymentMethod = userPayment.paymentMethod || "crypto_pay";

            if (paymentMethod === "crypto_pay") {
              // Для crypto_pay отправляем письмо со ссылкой на оплату
              try {
                const userLanguage = userPayment.userLanguage || "ru";

                // Если платёж не создан, создаём его
                let invoiceUrl = userPayment.paymentInvoiceUrl;
                if (!userPayment.paymentId || !invoiceUrl) {
                  const { PaymentService } = await import("../payment/service");
                  const { payment, invoiceUrl: newInvoiceUrl } = await PaymentService.createPayment(
                    userPayment.userId,
                    userPayment.planId,
                    undefined,
                    false, // payNow = false, оплата отложена
                  );

                  // Обновляем user_payment с новым paymentId
                  await db
                    .update(userPaymentTable)
                    .set({
                      paymentId: payment.id,
                    })
                    .where(eq(userPaymentTable.id, userPayment.userPaymentId));

                  invoiceUrl = newInvoiceUrl;

                  logger.info("Создан платёж для crypto_pay", {
                    userId: userPayment.userId,
                    paymentId: payment.id,
                    invoiceUrl,
                  });
                }

                // Отправляем письмо со ссылкой на оплату
                await MailService.sendPaymentReminder(
                  userPayment.userLogin,
                  userLanguage,
                  invoiceUrl,
                );

                // Увеличиваем счётчик попыток
                await db
                  .update(userPaymentTable)
                  .set({
                    paymentAttempts: userPayment.paymentAttempts + 1,
                    lastPaymentAttemptAt: new Date(),
                  })
                  .where(eq(userPaymentTable.id, userPayment.userPaymentId));

                logger.info("Отправлено письмо для crypto_pay с ссылкой на оплату", {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                  paymentAttempts: userPayment.paymentAttempts + 1,
                  invoiceUrl,
                });

                emailsSent++;
              } catch (error) {
                logger.error(
                  "Ошибка при обработке crypto_pay платежа",
                  error instanceof Error ? error : new Error(String(error)),
                  {
                    userId: userPayment.userId,
                    email: userPayment.userLogin,
                  },
                );
                errors++;
              }
            } else {
              // Для других способов оплаты (card, bank_transfer) пытаемся списать средства
              // Проверяем, находимся ли мы в временных рамках 00:00-02:00
              if (!skipTimeCheck) {
                const isWithinPaymentWindow = DateUtils.isWithinHourRange(0, 2);

                if (!isWithinPaymentWindow) {
                  // Вне временных рамок - пропускаем попытку списания
                  logger.debug("Пропуск попытки списания: вне временных рамок 00:00-02:00", {
                    userId: userPayment.userId,
                    paymentMethod,
                    currentTime: DateUtils.toISO(DateUtils.now()),
                  });
                  continue;
                }
              }

              try {
                // TODO: Реализовать списание с карты/банковского счета
                // Пока просто логируем и увеличиваем счётчик попыток
                logger.info("Попытка списания средств для способа оплаты", {
                  userId: userPayment.userId,
                  paymentMethod,
                  paymentAttempts: userPayment.paymentAttempts + 1,
                  timeWindow: "00:00-02:00",
                });

                // Здесь должна быть логика списания средств через платёжный шлюз
                // const paymentSuccessful = await processCardPayment(userPayment);

                // Для примера считаем, что оплата не прошла
                const paymentSuccessful = false;

                if (paymentSuccessful) {
                  // Если оплата прошла успешно, продлеваем подписку
                  const newFinalDayAt = DateUtils.calculateSubscriptionEndDate(today);

                  // Для Pro+ проверяем наличие дополнительного лимита
                  let totalLimit = userPayment.planBidMonthLimit;

                  if (userPayment.planName === "PRO_PLUS") {
                    const userPaymentPro = await db
                      .select({
                        upLimitId: userPaymentProTable.upLimitId,
                        additionalLimit: upLimitTable.bid,
                      })
                      .from(userPaymentProTable)
                      .innerJoin(upLimitTable, eq(userPaymentProTable.upLimitId, upLimitTable.id))
                      .where(eq(userPaymentProTable.userId, userPayment.userId))
                      .limit(1);

                    if (userPaymentPro.length > 0) {
                      totalLimit = userPayment.planBidMonthLimit + userPaymentPro[0].additionalLimit;
                    }
                  }

                  await db
                    .update(userPaymentTable)
                    .set({
                      finalDayAt: DateUtils.toJSDate(newFinalDayAt),
                      limit: totalLimit,
                      currentLimit: 0,
                      extended: true,
                      month: 1,
                      paymentAttempts: 0, // Сбрасываем счётчик попыток
                      lastPaymentAttemptAt: DateUtils.toJSDate(DateUtils.now()),
                    })
                    .where(eq(userPaymentTable.id, userPayment.userPaymentId));

                  logger.info("Подписка продлена после успешной оплаты", {
                    userId: userPayment.userId,
                    planId: userPayment.planId,
                    paymentMethod,
                  });

                  subscriptionsExtended++;
                } else {
                  // Если оплата не прошла, увеличиваем счётчик попыток
                  await db
                    .update(userPaymentTable)
                    .set({
                      paymentAttempts: userPayment.paymentAttempts + 1,
                      lastPaymentAttemptAt: DateUtils.toJSDate(DateUtils.now()),
                    })
                    .where(eq(userPaymentTable.id, userPayment.userPaymentId));

                  logger.warn("Неудачная попытка списания средств", {
                    userId: userPayment.userId,
                    paymentMethod,
                    paymentAttempts: userPayment.paymentAttempts + 1,
                  });
                }
              } catch (error) {
                logger.error(
                  "Ошибка при попытке списания средств",
                  error instanceof Error ? error : new Error(String(error)),
                  {
                    userId: userPayment.userId,
                    paymentMethod,
                  },
                );
                errors++;
              }
            }
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
        scheduledPlans: scheduledPayments.length,
        emailsSent,
        subscriptionsExtended,
        scheduledPlansActivated,
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
