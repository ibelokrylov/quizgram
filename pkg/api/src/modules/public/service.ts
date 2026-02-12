import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import {
  db,
  planTable,
  quizBidTable,
  quizContactTable,
  quizOpenTable,
  quizQuestionTable,
  quizTable,
  quizThxPageTable,
  userPaymentTable,
  userTable,
} from "../../db";
import { logger } from "../../lib/logger";
import { MailService } from "../../services/mail.service";
import {
  BaseTelegramBotService,
  type InlineKeyboardMarkup,
} from "../../services/base-telegram-bot.service";
import { QuizFileService } from "../../services/quiz-file.service";
import { TelegramService } from "../../services/telegram.service";
import { UserService } from "../user/service";
import { Answer, BodyAnswer, PublicQuiz } from "./models";

// Типы для ответов квиза
type AnswerValue =
  | string
  | number
  | boolean
  | File
  | Blob
  | { type: string; [key: string]: unknown }
  | null;
type StoredAnswer = {
  question_uid: string;
  answer: AnswerValue;
  timestamp?: string;
  [key: string]: unknown;
};
type StoredAnswerArray = StoredAnswer[];

export abstract class PublicService {
  private static async processFiles(
    files: Array<{ fileName: string; file: File }>,
    quizId: number,
    userKey: string,
    questionUid: string,
  ): Promise<Array<{ url: string; fileName: string }>> {
    if (files.length > 10) {
      throw new Error("Maximum 10 files allowed per answer");
    }

    const [question] = await db
      .select()
      .from(quizQuestionTable)
      .where(eq(quizQuestionTable.uid, questionUid))
      .limit(1);

    if (!question) throw new Error("Question not found");

    const uploadedFiles = [];

    //@ts-ignore
    if (Array.isArray(question.content?.questions)) {
      for (const { file, fileName } of files) {
        const uploadResult = await QuizFileService.uploadQuizFile(
          file,
          quizId,
          userKey,
          {
            manyFiles: true,
            required: true,
            title: "New title",
            type: "all",
          },
        );
        uploadedFiles.push({ url: uploadResult.fileURL, fileName });
      }
    } else {
      const content = question.content as {
        manyFiles: boolean;
        required: boolean;
        title: string;
        type: "all" | "image" | "docs" | "video";
      };

      for (const { file, fileName } of files) {
        const uploadResult = await QuizFileService.uploadQuizFile(
          file,
          quizId,
          userKey,
          content,
        );
        uploadedFiles.push({ url: uploadResult.fileURL, fileName });
      }
    }

    return uploadedFiles;
  }

  static async getQuizByUid(uid: string): Promise<PublicQuiz> {
    const quiz = await db
      .select()
      .from(quizTable)
      .where(eq(quizTable.uid, uid))
      .limit(1);
    if (!quiz || quiz.length === 0 || !quiz[0]) {
      throw new Error("Quiz not found");
    }

    const contacts = await db
      .select({
        uid: quizContactTable.uid,
        title: quizContactTable.title,
        description: quizContactTable.description,
        form: quizContactTable.form,
        background: quizContactTable.background,
      })
      .from(quizContactTable)
      .where(eq(quizContactTable.quizId, quiz[0].id));

    const questions = await db
      .select({
        type: quizQuestionTable.type,
        uid: quizQuestionTable.uid,
        order: quizQuestionTable.order,
        content: quizQuestionTable.content,
      })
      .from(quizQuestionTable)
      .where(
        and(
          eq(quizQuestionTable.quizId, quiz[0].id),
          isNotNull(quizQuestionTable.type),
        ),
      )
      .orderBy(asc(quizQuestionTable.order));

    const thxPage = await db
      .select({
        uid: quizThxPageTable.uid,
        title: quizThxPageTable.title,
        description: quizThxPageTable.description,
        buttons: quizThxPageTable.buttons,
        social: quizThxPageTable.social,
      })
      .from(quizThxPageTable)
      .where(eq(quizThxPageTable.quizId, quiz[0].id))
      .limit(1);

    // Проверяем, есть ли у владельца квиза активная платная подписка
    let hasPaidSubscription = false;
    const isShowLogoFromDb = quiz[0].isShowLogo ?? true;

    // Если is_show_logo=false, проверяем платную подписку
    if (isShowLogoFromDb === false) {
      const userPayment = await db
        .select({
          planPrice: planTable.price,
        })
        .from(userPaymentTable)
        .innerJoin(planTable, eq(userPaymentTable.planId, planTable.id))
        .where(
          and(
            eq(userPaymentTable.userId, quiz[0].userId),
            eq(userPaymentTable.isActive, true),
          ),
        )
        .limit(1);

      // Платная подписка = план с ценой > 0
      hasPaidSubscription =
        userPayment.length > 0 && userPayment[0].planPrice > 0;
    }

    // Если is_show_logo=false, но нет платной подписки - возвращаем true
    const isShowLogo =
      isShowLogoFromDb === false && !hasPaidSubscription
        ? true
        : isShowLogoFromDb;

    return {
      uid: quiz[0].uid,
      name: quiz[0].name,
      isShowLogo,
      startPage: quiz[0].startPage,
      questionTitle: quiz[0].questionTitle ?? undefined,
      question: questions.length > 0 ? questions : undefined,
      contact: contacts.length > 0 ? contacts : undefined,
      thxPage: thxPage.length > 0 ? thxPage[0] : undefined,
    };
  }

  /**
   * Получает квиз по UID и сохраняет запись с initData, userInfo и questions
   * questions берется из самого квиза, полученного из БД
   * @param quizUid - UID квиза
   * @param userKey - ключ пользователя
   * @param initData - Telegram WebApp initData для верификации
   * @param isFirst - true если это первый запрос квиза (квиза не было в cookie), false если повторный
   * @param ipLocation - геолокация по IP: { country, city, ip }
   */
  static async getQuizByUidAndSaveUserInfo(
    quizUid: string,
    userKey: string,
    initData?: string,
    isFirst: boolean = true,
    ipLocation?: {
      country: string | null;
      city: string | null;
      ip: string | null;
    } | null,
  ): Promise<PublicQuiz> {
    // Получаем ID квиза
    const quizRecord = await db
      .select({ id: quizTable.id })
      .from(quizTable)
      .where(eq(quizTable.uid, quizUid))
      .limit(1);

    if (quizRecord.length === 0) {
      throw new Error(`Quiz with uid ${quizUid} not found`);
    }

    // Получаем квиз (включая вопросы)
    const quiz = await this.getQuizByUid(quizUid);

    // Извлекаем вопросы из полученного квиза
    const questions = quiz.question || [];

    // Извлекаем форму контактов из квиза
    const contactsForm =
      quiz.contact && quiz.contact.length > 0
        ? quiz.contact[0].form || null
        : null;

    // Проверяем, существует ли уже запись с таким key
    const existingRecord = await db
      .select()
      .from(quizBidTable)
      .where(
        and(
          eq(quizBidTable.quizId, quizRecord[0].id),
          eq(quizBidTable.key, userKey),
        ),
      )
      .limit(1);

    // Если запись уже существует, не создаем новую
    if (existingRecord.length > 0) {
      logger.debug("Quiz session already exists", { quizUid, userKey });
      return quiz;
    }

    // Создаем начальный массив ответов
    const initialAnswer: any[] = [];

    // Если передан initData (не пустая строка), верифицируем и сохраняем данные Telegram
    if (initData && initData.trim().length > 0) {
      try {
        // Верифицируем initData и получаем userInfo
        const userInfo = await TelegramService.validateInitData(
          initData,
          "quiz",
        );
        logger.info("Telegram user data verified", {
          userId: userInfo.id,
          quizUid,
        });

        await db.insert(quizBidTable).values({
          quizId: quizRecord[0].id,
          key: userKey,
          answer: initialAnswer,
          questions: questions.length > 0 ? questions : null,
          contactsForm: contactsForm,
          first: isFirst,
          status: "create",
          info: null, // Поле info теперь свободно для других целей
          initData: initData, // Сохраняем initData как строку
          userInfo: userInfo, // Сохраняем верифицированные данные пользователя
          ipLocation: ipLocation || null,
          updatedAt: new Date(),
        });

        logger.debug("Created new quiz session with Telegram data", {
          quizUid,
          userKey,
          userId: userInfo.id,
          questionsCount: questions.length,
        });
      } catch (error) {
        logger.error(
          "Failed to verify Telegram initData",
          error instanceof Error ? error : new Error(String(error)),
        );
        // Если верификация не удалась, всё равно сохраняем initData (но без userInfo)
        await db.insert(quizBidTable).values({
          quizId: quizRecord[0].id,
          key: userKey,
          answer: initialAnswer,
          questions: questions.length > 0 ? questions : null,
          contactsForm: contactsForm,
          first: isFirst,
          status: "create",
          info: null,
          initData: initData, // Всегда сохраняем initData, даже если верификация не удалась
          userInfo: null, // userInfo не сохраняем, так как верификация не удалась
          ipLocation: ipLocation || null,
          updatedAt: new Date(),
        });

        logger.warn(
          "Created quiz session with initData but without verified userInfo due to verification error",
          { quizUid, userKey },
        );
      }
    } else {
      // Если initData нет, создаем запись без данных Telegram
      await db.insert(quizBidTable).values({
        quizId: quizRecord[0].id,
        key: userKey,
        answer: initialAnswer,
        questions: questions.length > 0 ? questions : null,
        contactsForm: contactsForm,
        first: isFirst,
        status: "create",
        info: null,
        initData: null,
        userInfo: null,
        ipLocation: ipLocation || null,
        updatedAt: new Date(),
      });

      logger.debug("Created new quiz session without Telegram data", {
        quizUid,
        userKey,
      });
    }

    return quiz;
  }

  /**
   * Увеличивает счетчики opened и openedUnique в таблице quiz_open
   * @param quizUid - UID квиза
   * @param incrementUnique - если true, увеличивает и openedUnique, и opened; если false - только opened
   */
  static async incrementQuizOpened(
    quizUid: string,
    incrementUnique: boolean = false,
  ): Promise<void> {
    try {
      const updateSet: Record<string, ReturnType<typeof sql>> = {
        opened: sql`${quizOpenTable.opened}
        + 1`,
      };

      if (incrementUnique) {
        updateSet.openedUnique = sql`${quizOpenTable.openedUnique}
        + 1`;
      }

      await db
        .insert(quizOpenTable)
        .values({
          quizUid,
          opened: 1,
          openedUnique: incrementUnique ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: quizOpenTable.quizUid,
          set: updateSet,
        });

      logger.debug("Quiz opened counters incremented", {
        uid: quizUid,
        incrementUnique,
      });
    } catch (error) {
      logger.error("Failed to increment quiz opened counters", error as Error, {
        uid: quizUid,
        incrementUnique,
      });
      throw error;
    }
  }

  /**
   * Увеличивает счетчик full в таблице quiz_open (завершённые квизы)
   * @param quizUid - UID квиза
   */
  static async incrementQuizFull(quizUid: string): Promise<void> {
    try {
      await db
        .insert(quizOpenTable)
        .values({
          quizUid,
          full: 1,
        })
        .onConflictDoUpdate({
          target: quizOpenTable.quizUid,
          set: {
            full: sql`${quizOpenTable.full}
            + 1`,
          },
        });

      logger.debug("Quiz full counter incremented", { uid: quizUid });
    } catch (error) {
      logger.error("Failed to increment quiz full counter", error as Error, {
        uid: quizUid,
      });
      throw error;
    }
  }

  /**
   * Сохраняет ответ на вопрос квиза
   * @param quizUid - UID квиза
   * @param body - данные ответа
   * @param final_question
   * @param traceId - для логирования, опционален
   */
  static async saveQuizAnswer(
    quizUid: string,
    body: BodyAnswer,
    final_question: boolean,
    traceId?: string,
  ): Promise<void> {
    // Логируем входящие данные для отладки
    logger.debug(
      "saveQuizAnswer called",
      {
        quizUid,
        answerData: body,
      },
      traceId,
    );

    try {
      // Получаем ID квиза
      const [quiz] = await db
        .select({ id: quizTable.id })
        .from(quizTable)
        .where(eq(quizTable.uid, quizUid))
        .limit(1);

      if (!quiz) {
        throw new Error(`Quiz with uid ${quizUid} not found`);
      }

      const parsedAnswer = JSON.parse(body.answer) as Answer;

      const urls = [];
      if (body.files) {
        const files = Array.isArray(body.files) ? body.files : [body.files];

        const uploadFiles = await this.processFiles(
          files.map((file) => ({ fileName: file.name, file })),
          quiz.id,
          body.key,
          body.question_uid,
        );
        urls.push(...uploadFiles);
      }

      let processedAnswer = { answer: parsedAnswer, files: urls };

      // Ищем существующую запись для этого квиза и пользователя
      const [existingRecord] = await db
        .select()
        .from(quizBidTable)
        .where(
          and(eq(quizBidTable.quizId, quiz.id), eq(quizBidTable.key, body.key)),
        )
        .limit(1);

      // Текущая дата для ответа
      const timestamp = new Date().toISOString();

      // Обновляем данные ответа с временным штампом
      // Для question_group сохраняем один ответ с массивом подвопросов
      const answerWithTimestamp = {
        ...body,
        answer: processedAnswer, // Используем обработанный ответ (с URL файла или массив для question_group)
        timestamp,
        final_question, // Сохраняем флаг последнего вопроса
      };

      logger.debug(
        "Prepared answer data for saving",
        {
          quizUid,
          questionUid: body.question_uid,
          answerType: typeof processedAnswer,
          isFileAnswer:
            processedAnswer &&
            typeof processedAnswer === "object" &&
            "type" in processedAnswer &&
            processedAnswer.type === "file",
          answerKeys:
            processedAnswer && typeof processedAnswer === "object"
              ? Object.keys(processedAnswer)
              : [],
          finalQuestion: final_question,
        },
        traceId,
      );

      if (existingRecord) {
        // Обновляем существующую запись
        const existingAnswers =
          (existingRecord.answer as unknown as StoredAnswerArray) || [];

        // Проверяем, есть ли уже ответ на этот вопрос
        const existingAnswerIndex = existingAnswers.findIndex(
          (ans: any) => ans.question_uid === body.question_uid,
        );

        let updatedAnswers: any[];
        if (existingAnswerIndex >= 0) {
          // Обновляем существующий ответ
          updatedAnswers = [...existingAnswers];
          updatedAnswers[existingAnswerIndex] = answerWithTimestamp;
          logger.debug(
            "Updating existing answer",
            {
              quizUid,
              userKey: body.key,
              questionUid: body.question_uid,
            },
            traceId,
          );
        } else {
          // Добавляем новый ответ в массив
          updatedAnswers = [...existingAnswers, answerWithTimestamp];
          logger.debug(
            "Adding new answer to existing session",
            {
              quizUid,
              userKey: body.key,
              questionUid: body.question_uid,
            },
            traceId,
          );
        }

        // Обновляем запись
        await db
          .update(quizBidTable)
          .set({
            answer: updatedAnswers,
            updatedAt: new Date(), // Обновляем время
          })
          .where(eq(quizBidTable.id, existingRecord.id));

        logger.info(
          "Quiz answer updated in existing session",
          {
            quizUid,
            userKey: body.key,
            questionUid: body.question_uid,
            totalAnswers: updatedAnswers.length,
            finalQuestion: final_question,
            lastAnswerType:
              typeof updatedAnswers[updatedAnswers.length - 1]?.answer,
            lastAnswerIsFile:
              updatedAnswers[updatedAnswers.length - 1]?.answer &&
              typeof updatedAnswers[updatedAnswers.length - 1].answer ===
                "object" &&
              "type" in updatedAnswers[updatedAnswers.length - 1].answer &&
              updatedAnswers[updatedAnswers.length - 1].answer.type === "file",
          },
          traceId,
        );
      } else {
        // Если записи нет, пытаемся создать её (fallback на случай, если квиз был получен без создания сессии)
        logger.warn(
          "Quiz session not found, creating new session",
          {
            quizUid,
            userKey: body.key,
            questionUid: body.question_uid,
          },
          traceId,
        );

        // Создаем новую запись
        // questions должны быть уже сохранены при получении квиза
        const newAnswer = [answerWithTimestamp];

        await db.insert(quizBidTable).values({
          quizId: quiz.id,
          key: body.key,
          answer: newAnswer,
          contacts: null,
          contactsForm: null,
          first: true,
          status: "create",
          info: null,
          initData: null,
          userInfo: null,
          updatedAt: new Date(),
        });

        logger.info(
          "Created new quiz session for answer",
          {
            quizUid,
            userKey: body.key,
            questionUid: body.question_uid,
            answerType: typeof newAnswer[0]?.answer,
            answerIsFile:
              newAnswer[0]?.answer &&
              typeof newAnswer[0].answer === "object" &&
              "type" in newAnswer[0].answer &&
              newAnswer[0].answer.type === "file",
          },
          traceId,
        );
      }

      // Если это последний вопрос, можно увеличить счетчик full (если нужно)
      if (final_question) {
        logger.debug(
          "Final question answered",
          {
            quizUid,
            userKey: body.key,
            questionUid: body.question_uid,
          },
          traceId,
        );
        // Здесь можно добавить дополнительную логику для обработки последнего вопроса
        // Например, изменение статуса сессии на 'completed' (если контакты не обязательны)
      }
    } catch (error) {
      logger.error(
        "Failed to save quiz answer",
        error as Error,
        { quizUid, answerData: body },
        traceId,
      );
      throw error;
    }
  }

  /**
   * Сохраняет контактные данные
   * Статус остается 'create' - его обновляет администратор вручную
   * @param quizUid - UID квиза
   * @param contactData - данные контактов (answers и form, но form не сохраняется - он уже в contactsForm)
   * @param sessionToken - токен сессии для идентификации пользователя
   */
  static async saveQuizContacts(
    quizUid: string,
    contactData: { answers: Record<string, string>; form?: any[] },
    sessionToken?: string,
  ): Promise<void> {
    try {
      // Получаем ID квиза и userId владельца
      const quiz = await db
        .select({ id: quizTable.id, userId: quizTable.userId })
        .from(quizTable)
        .where(eq(quizTable.uid, quizUid))
        .limit(1);

      if (!quiz || quiz.length === 0) {
        throw new Error(`Quiz with uid ${quizUid} not found`);
      }

      // Используем токен сессии как ключ для идентификации пользователя
      const userKey = sessionToken || crypto.randomUUID();

      // Ищем существующую запись для этого квиза и пользователя
      const existingRecord = await db
        .select()
        .from(quizBidTable)
        .where(
          and(
            eq(quizBidTable.quizId, quiz[0].id),
            eq(quizBidTable.key, userKey),
          ),
        )
        .limit(1);

      if (existingRecord.length > 0 && existingRecord[0]) {
        // Обновляем существующую запись: сохраняем только answers в contacts
        // form уже сохранен в contactsForm при получении квиза
        const existingAnswers =
          (existingRecord[0].answer as unknown as StoredAnswerArray) || [];

        const quizOwnerResult = await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, quiz[0].userId))
          .limit(1);

        const owner = quizOwnerResult[0];
        const isOwnerAdmin = owner?.isAdmin ?? false;

        // Проверяем лимит платежа перед сохранением контактов
        let isEqualPaymentLimit = false;
        if (isOwnerAdmin) {
          isEqualPaymentLimit = true;
        } else {
          try {
            // Получаем активную запись user_payment для владельца квиза
            const userPayments = await db
              .select()
              .from(userPaymentTable)
              .where(
                and(
                  eq(userPaymentTable.userId, quiz[0].userId),
                  eq(userPaymentTable.isActive, true),
                ),
              )
              .limit(1);

            if (userPayments.length > 0 && userPayments[0]) {
              const userPayment = userPayments[0];

              // Проверяем, что currentLimit меньше limit
              if (userPayment.currentLimit < userPayment.limit) {
                // Увеличиваем currentLimit
                await db
                  .update(userPaymentTable)
                  .set({
                    currentLimit: sql`${userPaymentTable.currentLimit}
                    + 1`,
                  })
                  .where(eq(userPaymentTable.id, userPayment.id));

                isEqualPaymentLimit = true;

                logger.info("Лимит платежа увеличен при сохранении контактов", {
                  userId: quiz[0].userId,
                  userPaymentId: userPayment.id,
                  currentLimit: userPayment.currentLimit + 1,
                  limit: userPayment.limit,
                  quizBidId: existingRecord[0].id,
                });
              } else {
                logger.debug("Лимит платежа достигнут, не увеличиваем", {
                  userId: quiz[0].userId,
                  currentLimit: userPayment.currentLimit,
                  limit: userPayment.limit,
                });
              }
            } else {
              logger.debug("Запись user_payment не найдена для пользователя", {
                userId: quiz[0].userId,
              });
            }
          } catch (paymentError) {
            logger.error(
              "Ошибка при проверке лимита платежа",
              paymentError instanceof Error
                ? paymentError
                : new Error(String(paymentError)),
              { userId: quiz[0].userId, quizUid },
            );
            // Не прерываем сохранение контактов, если проверка лимита не удалась
          }
        }

        await db
          .update(quizBidTable)
          .set({
            answer: existingAnswers, // Сохраняем массив ответов
            contacts: contactData.answers, // Сохраняем только answers пользователя
            // Статус не обновляем - он остается 'create', администратор обновит его вручную
            isFull: true, // Помечаем как полностью заполненный
            isEqualPaymentLimit, // Устанавливаем флаг, если лимит был увеличен
            updatedAt: new Date(),
          })
          .where(eq(quizBidTable.id, existingRecord[0].id));

        logger.debug("Quiz contacts saved", {
          quizUid,
          userKey,
          isFull: true,
          isEqualPaymentLimit,
          contactsCount: Object.keys(contactData.answers).length,
        });

        // Увеличиваем счётчик full
        await this.incrementQuizFull(quizUid);

        // Отправляем уведомление владельцу квиза только если isEqualPaymentLimit = true
        if (!isEqualPaymentLimit) {
          logger.debug(
            "Уведомление не отправляется: isEqualPaymentLimit = false",
            {
              quizUid,
              userKey,
              ownerId: quiz[0].userId,
            },
          );
          return;
        }

        // Отправляем уведомление владельцу квиза
        try {
          if (owner) {
            // Получаем настройки уведомлений владельца
            try {
              const notificationSettings =
                await UserService.getNotificationSettings(owner.id);

              // Формируем URL для ссылки на ответ в CRM
              // Используем универсальный подход: Bun.env работает в Bun, process.env в Node.js
              const env = typeof Bun !== "undefined" ? Bun.env : process.env;
              const crmUrl = (env.CRM_URL || "").trim();
              // Убираем завершающий слеш из CRM_URL, если он есть
              const baseUrl = crmUrl.endsWith("/")
                ? crmUrl.slice(0, -1)
                : crmUrl;
              const reportUrl = `${baseUrl}/app/bid/report?limit=10&isFull=true&key=${userKey}`;

              if (!crmUrl) {
                logger.warn("CRM_URL не установлен в переменных окружения", {
                  quizUid,
                  ownerId: owner.id,
                });
              }

              logger.debug("Формирование уведомления для владельца квиза", {
                quizUid,
                ownerId: owner.id,
                ownerEmail: owner.login,
                ownerTelegramId: owner.telegramId,
                notificationSettings: {
                  email: notificationSettings.email,
                  telegram: notificationSettings.telegram,
                },
                crmUrl,
                reportUrl,
              });

              // Отправляем email уведомление, если включено
              if (notificationSettings.email) {
                try {
                  const ownerLanguage = owner.language || "ru";
                  await MailService.sendNewBidNotification(
                    owner.login,
                    reportUrl,
                    ownerLanguage,
                  );
                  logger.info("Email уведомление отправлено владельцу квиза", {
                    quizUid,
                    ownerId: owner.id,
                    ownerEmail: owner.login,
                  });
                } catch (emailError) {
                  logger.error(
                    "Ошибка при отправке email уведомления владельцу квиза",
                    emailError instanceof Error
                      ? emailError
                      : new Error(String(emailError)),
                    { quizUid, ownerId: owner.id, ownerEmail: owner.login },
                  );
                  // Не прерываем выполнение, если email не отправился
                }
              }

              // Отправляем Telegram уведомление, если включено
              if (notificationSettings.telegram && owner.telegramId) {
                try {
                  // Преобразуем telegramId в число (chatId)
                  const chatId = parseInt(owner.telegramId, 10);
                  if (!isNaN(chatId)) {
                    const ownerLanguage = owner.language || "ru";

                    // Формируем текст сообщения без ссылки (будут кнопки)
                    const messageText =
                      ownerLanguage === "en"
                        ? `🎉 <b>New quiz response received</b>\n\nYou have received a new response to your quiz.`
                        : `🎉 <b>Получен новый ответ на квиз</b>\n\nВы получили новый ответ на ваш квиз.`;

                    // Извлекаем путь и параметры из reportUrl (без хоста)
                    const urlObj = new URL(reportUrl);
                    const pathWithQuery = urlObj.pathname + urlObj.search; // Например: /app/bid/report?limit=10&isFull=true&key=...

                    // Кодируем путь в base64url (Telegram разрешает только A-Z, a-z, 0-9, _, -)
                    // base64url: заменяем + на -, / на _, убираем =
                    const base64 =
                      Buffer.from(pathWithQuery).toString("base64");
                    const base64url = base64
                      .replace(/\+/g, "-")
                      .replace(/\//g, "_")
                      .replace(/=/g, "");

                    // Формируем URL для Telegram Mini App с base64url путем в startapp
                    const tgAppUrl = `https://t.me/${process.env.ENV === "production" ? "Quiz_gramm_bot" : "tg_union_bot"}?startapp=${base64url}`;

                    // Проверяем, не localhost ли URL (Telegram не поддерживает localhost в кнопках)
                    const isLocalhost =
                      reportUrl.includes("localhost") ||
                      reportUrl.includes("127.0.0.1");

                    // Создаем inline keyboard
                    const inlineKeyboardButtons = [
                      [
                        {
                          text:
                            ownerLanguage === "en"
                              ? "📱 Open in Telegram App"
                              : "📱 Открыть в Telegram App",
                          url: tgAppUrl,
                        },
                      ],
                    ];

                    // Добавляем кнопку Web только если URL не localhost
                    if (!isLocalhost) {
                      inlineKeyboardButtons.push([
                        {
                          text:
                            ownerLanguage === "en"
                              ? "🌐 Open in Web"
                              : "🌐 Открыть в Web",
                          url: reportUrl,
                        },
                      ]);
                    }

                    const keyboard: InlineKeyboardMarkup = {
                      inline_keyboard: inlineKeyboardButtons,
                    };

                    await BaseTelegramBotService.sendMessage(
                      "BOT_CRM_TOKEN",
                      chatId,
                      messageText,
                      "HTML",
                      true,
                      keyboard,
                    );

                    logger.info(
                      "Telegram уведомление отправлено владельцу квиза",
                      {
                        quizUid,
                        ownerId: owner.id,
                        chatId,
                        reportUrl,
                        tgAppUrl,
                      },
                    );
                  } else {
                    logger.warn("Не удалось преобразовать telegramId в число", {
                      quizUid,
                      ownerId: owner.id,
                      telegramId: owner.telegramId,
                    });
                  }
                } catch (telegramError) {
                  logger.error(
                    "Ошибка при отправке Telegram уведомления владельцу квиза",
                    telegramError instanceof Error
                      ? telegramError
                      : new Error(String(telegramError)),
                    {
                      quizUid,
                      ownerId: owner.id,
                      telegramId: owner.telegramId,
                    },
                  );
                  // Не прерываем выполнение, если Telegram не отправился
                }
              }
            } catch (notificationError) {
              logger.error(
                "Ошибка при получении настроек уведомлений или отправке уведомления",
                notificationError instanceof Error
                  ? notificationError
                  : new Error(String(notificationError)),
                { quizUid, ownerId: owner.id },
              );
              // Не прерываем выполнение, если уведомление не отправилось
            }
          }
        } catch (ownerError) {
          logger.error(
            "Ошибка при получении владельца квиза для отправки уведомления",
            ownerError instanceof Error
              ? ownerError
              : new Error(String(ownerError)),
            { quizUid, userId: quiz[0].userId },
          );
          // Не прерываем выполнение, если не удалось отправить уведомление
        }
      } else {
        // Если записи нет, это ошибка - она должна быть создана при получении квиза
        logger.error(
          "Quiz session not found for contacts - should be created when quiz is loaded",
          {
            quizUid,
            userKey,
          },
        );
        throw new Error("Session not found. Please reload the quiz.");
      }
    } catch (error) {
      logger.error("Failed to save quiz contacts", error as Error, {
        quizUid,
        contactData,
      });
      throw error;
    }
  }
}
