import { and, eq, gte, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { UserTable } from 'pkg-types';
import { db, mailTable, planTable, quizBidTable, quizTable, userPaymentTable } from '../../db';
import * as DateUtils from '../../lib/date-utils';
import { logger } from '../../lib/logger';
import { MailService } from '../../services/mail.service';

export abstract class SchedulerService {
  /**
   * Обрабатывает незавершенные заявки для платных пользователей
   * Находит quiz_bid с isFull=false, info=null, обновленные минимум N минут назад (из SCHEDULER_BIDS_MINUTES, по умолчанию 5)
   * Анализирует отвал и записывает информацию в info
   */
  static async processIncompleteBids() {
    const startTime = Date.now();
    logger.info('Начало обработки незавершенных заявок');

    try {
      // Читаем количество минут из переменной окружения, по умолчанию 5
      const env = typeof Bun !== 'undefined' ? Bun.env : process.env;
      const minutes = env.SCHEDULER_BIDS_MINUTES ? parseInt(env.SCHEDULER_BIDS_MINUTES, 10) : 5;

      // Вычисляем время N минут назад
      const minutesAgo = DateUtils.now().minus({ minutes });
      logger.debug('Время отсечки для обработки заявок', {
        minutes,
        minutesAgo: DateUtils.toISO(minutesAgo),
      });

      // Находим всех платных пользователей (planId !== 1)
      logger.debug('Поиск платных пользователей');
      const paidUsers = await db
        .select({ id: UserTable.id })
        .from(UserTable)
        .where(or(ne(UserTable.planId, 1), eq(UserTable.isAdmin, true)));

      if (paidUsers.length === 0) {
        logger.debug('Нет платных пользователей для обработки');
        return;
      }

      const userIds = paidUsers.map((u) => u.id);
      logger.debug('Найдено платных пользователей', {
        count: paidUsers.length,
        userIds,
      });

      // Находим все квизы платных пользователей, которые не удалены
      logger.debug('Поиск квизов платных пользователей');
      const quizzes = await db
        .select({
          id: quizTable.id,
          userId: quizTable.userId,
        })
        .from(quizTable)
        .where(and(inArray(quizTable.userId, userIds), isNull(quizTable.deletedAt)));

      if (quizzes.length === 0) {
        logger.debug('Нет квизов для обработки');
        return;
      }

      const quizIds = quizzes.map((q) => q.id);
      logger.debug('Найдено квизов для обработки', {
        count: quizzes.length,
        quizIds: quizIds.slice(0, 10), // Логируем первые 10 для примера
      });

      // Находим quiz_bid с условиями:
      // - isFull = false (незавершенные заявки)
      // - info = null
      // - обновлены минимум N минут назад (из SCHEDULER_BIDS_MINUTES)
      // - принадлежат квизам платных пользователей
      logger.debug('Поиск заявок для обработки', {
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
            sql`${quizBidTable.info}
            IS NULL`,
            lt(quizBidTable.updatedAt, DateUtils.toJSDate(minutesAgo)),
            isNull(quizBidTable.deletedAt)
          )
        );

      if (bidsToProcess.length === 0) {
        logger.debug('Нет заявок для обработки');
        return;
      }

      logger.info('Найдено заявок для обработки', {
        count: bidsToProcess.length,
        bidIds: bidsToProcess.map((b) => b.id).slice(0, 10), // Логируем первые 10
      });

      let processedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const bid of bidsToProcess) {
        try {
          logger.debug('Обработка заявки', {
            bidId: bid.id,
            quizId: bid.quizId,
          });

          const info = this.analyzeBidDropout(bid.answer, bid.questions);

          if (info) {
            logger.debug('Результат анализа отвала', {
              bidId: bid.id,
              info,
            });

            await db
              .update(quizBidTable)
              .set({
                info: info,
              })
              .where(eq(quizBidTable.id, bid.id));

            logger.debug('Заявка успешно обработана', {
              bidId: bid.id,
              dropoutAt: info.dropoutAt,
              dropoutIndex: info.dropoutIndex,
              dropoutQuestionNumber: info.dropoutQuestionNumber,
            });

            processedCount++;
          } else {
            logger.debug('Не удалось определить отвал для заявки', {
              bidId: bid.id,
              hasAnswer: !!bid.answer,
              hasQuestions: !!bid.questions,
            });
            skippedCount++;
          }
        } catch (error) {
          logger.error('Ошибка при обработке заявки', error as Error, {
            bidId: bid.id,
            quizId: bid.quizId,
          });
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Обработка заявок завершена', {
        total: bidsToProcess.length,
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Ошибка при обработке незавершенных заявок', error as Error, {
        durationMs: duration,
      });
    }
  }

  /**
   * Анализирует отвал в заявке
   * @param answer - данные ответов пользователя (поле answer из quiz_bid)
   * @param questions - вопросы квиза (поле questions из quiz_bid)
   * @returns объект info с информацией об отвале или null
   */
  private static analyzeBidDropout(answer: any, questions: any): any | null {
    if (!questions || !Array.isArray(questions)) {
      return null;
    }

    // Подсчитываем количество вопросов
    const questionsCount = questions.length;

    if (!answer || typeof answer !== 'object') {
      // Если нет answer, отвал произошел на первом вопросе (индекс 0, номер вопроса 1)
      const firstQuestion = questions[0];
      return {
        dropoutAt: 'question',
        dropoutIndex: 0,
        dropoutQuestionNumber: 1,
        dropoutQuestionUid: firstQuestion?.uid || null,
        dropoutReason: 'no_answer',
        questionsCount,
        answersCount: 0,
      };
    }

    // Подсчитываем количество ответов в answer
    // answer может быть объектом с ключами-ответами или массивом
    let answersCount = 0;

    if (Array.isArray(answer)) {
      // Для массива считаем количество непустых элементов
      answersCount = answer.filter((a) => a !== null && a !== undefined && a !== '').length;
    } else if (typeof answer === 'object') {
      // Для объекта считаем количество непустых значений
      // Важно: ответы могут быть сохранены по ключам, соответствующим индексам вопросов
      const allValues = Object.values(answer);
      answersCount = allValues.filter((v) => v !== null && v !== undefined && v !== '').length;
    }

    // Если количество ответов совпадает с количеством вопросов или больше
    // значит отвал произошел на странице контактов
    if (answersCount >= questionsCount) {
      return {
        dropoutAt: 'contacts',
        dropoutReason: 'contacts_page',
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

    return {
      dropoutAt: 'question',
      dropoutIndex,
      dropoutQuestionNumber,
      dropoutQuestionUid: dropoutQuestion?.uid || null,
      dropoutReason: 'question_not_answered',
      questionsCount,
      answersCount,
    };
  }

  /**
   * Обрабатывает платежи пользователей:
   * - Отправляет письмо за 2 дня до окончания подписки (для planId != 1)
   * - Переводит пользователей на FREE план при окончании подписки (сразу)
   */
  static async processPayments() {
    const startTime = Date.now();
    logger.info('Начало обработки платежей');

    try {
      const now = DateUtils.now();
      const today = DateUtils.startOfToday();
      const twoDaysLater = DateUtils.calculateDatePlusDaysEndOfDay(2);

      logger.debug('Проверка платежей', {
        now: DateUtils.toISO(now),
        today: DateUtils.toISO(today),
        twoDaysLater: DateUtils.toISO(twoDaysLater),
      });

      // Находим всех не удаленных пользователей с платными планами (planId != 1) и активными user_payment
      const usersWithPayments = await db
        .select({
          userId: UserTable.id,
          userLogin: UserTable.login,
          userLanguage: UserTable.language,
          userPaymentId: userPaymentTable.id,
          planId: userPaymentTable.planId,
          finalDayAt: userPaymentTable.finalDayAt,
          planName: planTable.name,
          planPrice: planTable.price, // Для автосписания
          subscriptionId: userPaymentTable.subscriptionId, // ID подписки UnitPay
          cancelAutoRenew: userPaymentTable.cancelAutoRenew, // Флаг отмены автопродления
          paymentAttempts: userPaymentTable.paymentAttempts, // Количество попыток списания
        })
        .from(userPaymentTable)
        .innerJoin(UserTable, eq(userPaymentTable.userId, UserTable.id))
        .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
        .where(
          and(
            isNull(UserTable.deletedAt), // Только не удаленные пользователи
            sql`${userPaymentTable.planId}
            != 1`, // Только платные планы
            eq(userPaymentTable.isActive, true) // Только активные записи user_payment
          )
        );

      if (usersWithPayments.length === 0) {
        logger.debug('Нет пользователей с платными планами для обработки');
        return;
      }

      logger.info('Найдено пользователей с платными планами', {
        count: usersWithPayments.length,
      });

      // Находим отсроченные планы, которые должны начаться сегодня
      const scheduledPayments = await db
        .select({
          userPaymentId: userPaymentTable.id,
          userId: userPaymentTable.userId,
          planId: userPaymentTable.planId,
          startsAt: userPaymentTable.startsAt,
        })
        .from(userPaymentTable)
        .innerJoin(UserTable, eq(userPaymentTable.userId, UserTable.id))
        .where(
          and(
            isNull(UserTable.deletedAt),
            eq(userPaymentTable.isActive, false), // Неактивные записи (отсроченные)
            sql`DATE(
            ${userPaymentTable.startsAt}
            )
            =
            DATE
            (
            ${sql.raw('CURRENT_DATE')}
            )` // Начинаются сегодня
          )
        );

      logger.info('Найдено отсроченных планов для активации', {
        count: scheduledPayments.length,
      });

      let emailsSent = 0;
      let subscriptionsExtended = 0;
      let scheduledPlansActivated = 0;
      let errors = 0;

      // Обрабатываем отсроченные планы
      for (const scheduledPayment of scheduledPayments) {
        try {
          const { PaymentService } = await import('../payment/service');

          await PaymentService.activateScheduledPlan(scheduledPayment.userPaymentId);

          logger.info('Отсроченный план активирован', {
            userId: scheduledPayment.userId,
            planId: scheduledPayment.planId,
            userPaymentId: scheduledPayment.userPaymentId,
          });

          scheduledPlansActivated++;
        } catch (error) {
          logger.error(
            'Ошибка при активации отсроченного плана',
            error instanceof Error ? error : new Error(String(error)),
            {
              userId: scheduledPayment.userId,
              userPaymentId: scheduledPayment.userPaymentId,
            }
          );
          errors++;
        }
      }

      // Обрабатываем активные подписки
      for (const userPayment of usersWithPayments) {
        try {
          const finalDayAt = DateUtils.fromJSDate(userPayment.finalDayAt);

          // Проверяем, заканчивается ли подписка через 2 дня
          if (
            DateUtils.isBetweenInclusive(finalDayAt, today, twoDaysLater) &&
            !userPayment.cancelAutoRenew
          ) {
            try {
              const userLanguage = userPayment.userLanguage || 'ru';

              const now = new Date();

              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

              const [isFindEmailRemind] = await db
                .select({ id: mailTable.id })
                .from(mailTable)
                .where(
                  and(
                    eq(mailTable.userId, userPayment.userId),
                    gte(mailTable.createdAt, startOfMonth),
                    lt(mailTable.createdAt, startOfNextMonth)
                  )
                )
                .limit(1);

              if (!isFindEmailRemind) {
                // Отправляем письмо о предстоящем окончании подписки
                await MailService.sendPaymentReminder(userPayment.userLogin, userLanguage);

                await db.insert(mailTable).values({
                  type: 'subscribe_send_info_payment_2_days',
                  userId: userPayment.userId,
                });

                logger.info('Отправлено письмо о предстоящем окончании подписки', {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                  finalDayAt: DateUtils.toISO(finalDayAt),
                });

                emailsSent++;
              }
            } catch (emailError) {
              logger.error(
                'Ошибка при отправке письма',
                emailError instanceof Error ? emailError : new Error(String(emailError)),
                {
                  userId: userPayment.userId,
                  email: userPayment.userLogin,
                }
              );
              errors++;
            }
          }

          // Проверяем, закончилась ли подписка
          if (DateUtils.isBefore(finalDayAt, today)) {
            logger.info('Подписка истекла, проверка возможности автопродления', {
              userId: userPayment.userId,
              planId: userPayment.planId,
              subscriptionId: userPayment.subscriptionId,
              cancelAutoRenew: userPayment.cancelAutoRenew,
              paymentAttempts: userPayment.paymentAttempts,
            });

            // Проверяем условия для автопродления:
            // 1. Есть subscriptionId
            // 2. Не отменено автопродление (cancelAutoRenew = false)
            // 3. Еще не было попыток списания (paymentAttempts = 0)
            const canAutoRenew =
              userPayment.subscriptionId &&
              !userPayment.cancelAutoRenew &&
              userPayment.paymentAttempts === 0;

            if (canAutoRenew) {
              logger.info('Попытка автопродления подписки', {
                userId: userPayment.userId,
                subscriptionId: userPayment.subscriptionId,
                planId: userPayment.planId,
                amount: userPayment.planPrice,
              });

              try {
                // Импортируем PaymentService динамически
                const { PaymentService } = await import('../payment/service');

                // Вызываем метод автосписания
                const charged = await PaymentService.chargeSubscription(
                  userPayment.userId,
                  userPayment.planId,
                  userPayment.subscriptionId!,
                  userPayment.planPrice,
                  userPayment.userPaymentId
                );

                if (charged) {
                  logger.info('Автосписание инициировано успешно', {
                    userId: userPayment.userId,
                    subscriptionId: userPayment.subscriptionId,
                  });

                  // НЕ продлеваем подписку здесь!
                  // Продление произойдет в webhook handleUnitpayPay после подтверждения
                  subscriptionsExtended++;
                } else {
                  logger.error('Автосписание не удалось, перевод на FREE план', {
                    userId: userPayment.userId,
                    subscriptionId: userPayment.subscriptionId,
                  });

                  // Переводим на FREE план
                  await this.downgradeToFreePlan(
                    userPayment.userId,
                    userPayment.userPaymentId,
                    userPayment.userLogin,
                    userPayment.userLanguage,
                    userPayment.planName
                  );
                }
              } catch (error) {
                logger.error(
                  'Ошибка при попытке автопродления, перевод на FREE план',
                  error instanceof Error ? error : new Error(String(error)),
                  {
                    userId: userPayment.userId,
                    subscriptionId: userPayment.subscriptionId,
                  }
                );

                // При ошибке переводим на FREE план
                await this.downgradeToFreePlan(
                  userPayment.userId,
                  userPayment.userPaymentId,
                  userPayment.userLogin,
                  userPayment.userLanguage,
                  userPayment.planName
                );
              }
            } else {
              // Нет условий для автопродления - переводим на FREE план
              logger.info('Автопродление невозможно, перевод на FREE план', {
                userId: userPayment.userId,
                hasSubscriptionId: !!userPayment.subscriptionId,
                cancelAutoRenew: userPayment.cancelAutoRenew,
                paymentAttempts: userPayment.paymentAttempts,
              });

              await this.downgradeToFreePlan(
                userPayment.userId,
                userPayment.userPaymentId,
                userPayment.userLogin,
                userPayment.userLanguage,
                userPayment.planName
              );
            }
          }
        } catch (error) {
          logger.error(
            'Ошибка при обработке платежа пользователя',
            error instanceof Error ? error : new Error(String(error)),
            {
              userId: userPayment.userId,
              userPaymentId: userPayment.userPaymentId,
            }
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Обработка платежей завершена', {
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
        'Ошибка при обработке платежей',
        error instanceof Error ? error : new Error(String(error)),
        {
          durationMs: duration,
        }
      );
    }
  }

  /**
   * Переводит пользователя на FREE план при истечении подписки
   */
  private static async downgradeToFreePlan(
    userId: number,
    userPaymentId: number,
    userLogin: string,
    userLanguage: string | null,
    planName: string
  ): Promise<void> {
    logger.info('Начало перевода на FREE план', {
      userId,
      userPaymentId,
      currentPlanName: planName,
    });

    try {
      // Получаем FREE план (id=1)
      const freePlans = await db.select().from(planTable).where(eq(planTable.id, 1)).limit(1);

      if (freePlans.length === 0) {
        logger.error('FREE план не найден в БД', new Error('FREE plan not found'), { userId });
        return;
      }

      const freePlan = freePlans[0];

      // Деактивируем текущую подписку
      await db
        .update(userPaymentTable)
        .set({
          isActive: false,
        })
        .where(eq(userPaymentTable.id, userPaymentId));

      // Обновляем план пользователя на FREE
      await db
        .update(UserTable)
        .set({
          planId: freePlan.id,
          updatedAt: DateUtils.toJSDate(DateUtils.now()),
        })
        .where(eq(UserTable.id, userId));

      logger.info('Пользователь переведен на FREE план', {
        userId,
        userPaymentId,
      });

      // Отправляем уведомление
      try {
        const language = userLanguage || 'ru';
        const expirationDate = DateUtils.formatDate(DateUtils.now());
        await MailService.sendPlanExpirationNotice(userLogin, expirationDate, language, planName);

        logger.info('Отправлено письмо о переводе на FREE план', {
          userId,
          email: userLogin,
        });
      } catch (emailError) {
        logger.error(
          'Ошибка при отправке письма',
          emailError instanceof Error ? emailError : new Error(String(emailError)),
          { userId, email: userLogin }
        );
      }
    } catch (error) {
      logger.error(
        'Ошибка при переводе на FREE план',
        error instanceof Error ? error : new Error(String(error)),
        { userId, userPaymentId }
      );
      throw error;
    }
  }
}
