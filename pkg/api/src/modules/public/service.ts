import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db, quizBidTable, quizContactTable, quizOpenTable, quizQuestionTable, quizTable, quizThxPageTable } from '../../db';
import { logger } from '../../lib/logger';
import { QuizFileService } from '../../services/quiz-file.service';
import { TelegramService, TelegramUserInfo } from '../../services/telegram.service';
import { PublicQuiz } from './models';

export abstract class PublicService {
  static async getQuizByUid(uid: string): Promise<PublicQuiz> {
    const quiz = await db.select()
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
      .where(and(eq(quizQuestionTable.quizId, quiz[0].id), isNotNull(quizQuestionTable.type)))
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

    return {
      uid: quiz[0].uid,
      name: quiz[0].name,
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
    ipLocation?: { country: string | null; city: string | null; ip: string | null } | null
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
    const contactsForm = quiz.contact && quiz.contact.length > 0 
      ? quiz.contact[0].form || null 
      : null;

    // Проверяем, существует ли уже запись с таким key
    const existingRecord = await db
      .select()
      .from(quizBidTable)
      .where(
        and(
          eq(quizBidTable.quizId, quizRecord[0].id),
          eq(quizBidTable.key, userKey)
        )
      )
      .limit(1);

    // Если запись уже существует, не создаем новую
    if (existingRecord.length > 0) {
      logger.debug('Quiz session already exists', { quizUid, userKey });
      return quiz;
    }

    // Создаем начальный массив ответов
    const initialAnswer: any[] = [];

    // Если передан initData, верифицируем и сохраняем данные Telegram
    if (initData) {
      try {
        // Верифицируем initData и получаем userInfo
        const userInfo = await TelegramService.validateInitData(initData);
        logger.info('Telegram user data verified', { userId: userInfo.id, quizUid });

        await db.insert(quizBidTable).values({
          quizId: quizRecord[0].id,
          key: userKey,
          answer: initialAnswer,
          questions: questions.length > 0 ? questions : null,
          contactsForm: contactsForm,
          first: isFirst,
          status: 'create',
          info: null, // Поле info теперь свободно для других целей
          initData: initData, // Сохраняем initData как строку
          userInfo: userInfo, // Сохраняем верифицированные данные пользователя
          ipLocation: ipLocation || null,
          updatedAt: new Date(),
        });

        logger.debug('Created new quiz session with Telegram data', {
          quizUid,
          userKey,
          userId: userInfo.id,
          questionsCount: questions.length,
        });
      } catch (error) {
        logger.error('Failed to verify Telegram initData', error instanceof Error ? error : new Error(String(error)));
        // Если верификация не удалась, создаем запись без данных Telegram
        await db.insert(quizBidTable).values({
          quizId: quizRecord[0].id,
          key: userKey,
          answer: initialAnswer,
          questions: questions.length > 0 ? questions : null,
          contactsForm: contactsForm,
          first: isFirst,
          status: 'create',
          info: null,
          initData: null,
          userInfo: null,
          ipLocation: ipLocation || null,
          updatedAt: new Date(),
        });

        logger.warn('Created quiz session without Telegram data due to verification error', { quizUid, userKey });
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
        status: 'create',
        info: null,
        initData: null,
        userInfo: null,
        ipLocation: ipLocation || null,
        updatedAt: new Date(),
      });

      logger.debug('Created new quiz session without Telegram data', { quizUid, userKey });
    }

    return quiz;
  }

  /**
   * Увеличивает счетчики opened и openedUnique в таблице quiz_open
   * @param quizUid - UID квиза
   * @param incrementUnique - если true, увеличивает и openedUnique, и opened; если false - только opened
   */
  static async incrementQuizOpened(quizUid: string, incrementUnique: boolean = false): Promise<void> {
    try {
      const updateSet: Record<string, any> = {
        opened: sql`${quizOpenTable.opened} + 1`,
      };

      if (incrementUnique) {
        updateSet.openedUnique = sql`${quizOpenTable.openedUnique} + 1`;
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

      logger.debug("Quiz opened counters incremented", { uid: quizUid, incrementUnique });
    } catch (error) {
      logger.error("Failed to increment quiz opened counters", error as Error, { uid: quizUid, incrementUnique });
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
            full: sql`${quizOpenTable.full} + 1`,
          },
        });

      logger.debug("Quiz full counter incremented", { uid: quizUid });
    } catch (error) {
      logger.error("Failed to increment quiz full counter", error as Error, { uid: quizUid });
      throw error;
    }
  }

  /**
   * Сохраняет ответ на вопрос квиза
   * @param quizUid - UID квиза
   * @param answerData - данные ответа
   * @param sessionToken - токен сессии для идентификации пользователя
   */
  static async saveQuizAnswer(
    quizUid: string,
    answerData: any,
    sessionToken?: string
  ): Promise<void> {
    // Извлекаем специальные поля из answerData
    // questions больше не обрабатывается здесь - они сохраняются при получении квиза
    const { final_question, ...cleanAnswerData } = answerData;

    try {
      // Получаем ID квиза
      const quiz = await db
        .select({ id: quizTable.id })
        .from(quizTable)
        .where(eq(quizTable.uid, quizUid))
        .limit(1);

      if (!quiz || quiz.length === 0) {
        throw new Error(`Quiz with uid ${quizUid} not found`);
      }

      // Используем токен сессии как ключ для идентификации пользователя
      // Если токена нет, генерируем временный ключ
      const userKey = sessionToken || crypto.randomUUID();

      // Обработка файла, если ответ является файлом
      let processedAnswer = answerData.answer;
      if (answerData.answer instanceof File) {
        try {
          // Загружаем файл в S3 через QuizFileService
          const uploadResult = await QuizFileService.uploadQuizFile(
            answerData.answer,
            quiz[0].id,
            userKey
          );

          // Заменяем файл на URL загруженного файла
          processedAnswer = {
            type: 'file',
            fileName: answerData.answer.name,
            fileSize: answerData.answer.size,
            fileType: answerData.answer.type,
            url: uploadResult.fileURL,
            s3Key: uploadResult.fileKey
          };

          logger.info("File uploaded successfully for quiz answer", {
            quizUid,
            fileName: answerData.answer.name,
            fileURL: uploadResult.fileURL
          });
        } catch (fileError) {
          logger.error("Failed to upload file for quiz answer", fileError as Error, {
            quizUid,
            fileName: answerData.answer.name
          });
          throw new Error(`Failed to upload file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }

      // Ищем существующую запись для этого квиза и пользователя
      const existingRecord = await db
        .select()
        .from(quizBidTable)
        .where(
          and(
            eq(quizBidTable.quizId, quiz[0].id),
            eq(quizBidTable.key, userKey)
          )
        )
        .limit(1);

      // Текущая дата для ответа
      const timestamp = new Date().toISOString();

      // Обновляем данные ответа с временным штампом
      const answerWithTimestamp = {
        ...cleanAnswerData,
        answer: processedAnswer, // Используем обработанный ответ (с URL файла)
        timestamp,
        final_question, // Сохраняем флаг последнего вопроса
      };

      if (existingRecord.length > 0 && existingRecord[0]) {
        // Обновляем существующую запись
        const existingAnswers = (existingRecord[0].answer as any[]) || [];

        // Проверяем, есть ли уже ответ на этот вопрос
        const existingAnswerIndex = existingAnswers.findIndex(
          (ans: any) => ans.question_uid === cleanAnswerData.question_uid
        );

        let updatedAnswers: any[];
        if (existingAnswerIndex >= 0) {
          // Обновляем существующий ответ
          updatedAnswers = [...existingAnswers];
          updatedAnswers[existingAnswerIndex] = answerWithTimestamp;
          logger.debug("Updating existing answer", {
            quizUid,
            userKey,
            questionUid: cleanAnswerData.question_uid,
          });
        } else {
          // Добавляем новый ответ в массив
          updatedAnswers = [...existingAnswers, answerWithTimestamp];
          logger.debug("Adding new answer to existing session", {
            quizUid,
            userKey,
            questionUid: cleanAnswerData.question_uid,
          });
        }

        // Обновляем запись
        await db
          .update(quizBidTable)
          .set({
            answer: updatedAnswers,
            updatedAt: new Date(), // Обновляем время
          })
          .where(eq(quizBidTable.id, existingRecord[0].id));

        logger.debug("Quiz answer updated in existing session", {
          quizUid,
          userKey,
          questionUid: cleanAnswerData.question_uid,
          totalAnswers: updatedAnswers.length,
          finalQuestion: final_question,
        });
      } else {
        // Если записи нет, пытаемся создать её (fallback на случай, если квиз был получен без создания сессии)
        logger.warn("Quiz session not found, creating new session", {
          quizUid,
          userKey,
          questionUid: cleanAnswerData.question_uid,
        });

        // Создаем новую запись
        // questions должны быть уже сохранены при получении квиза
        const newAnswer = [answerWithTimestamp];

        await db.insert(quizBidTable).values({
          quizId: quiz[0].id,
          key: userKey,
          answer: newAnswer,
          contacts: null,
          contactsForm: null,
          first: true,
          status: 'create',
          info: null,
          initData: null,
          userInfo: null,
          updatedAt: new Date(),
        });

        logger.debug("Created new quiz session for answer", {
          quizUid,
          userKey,
          questionUid: cleanAnswerData.question_uid,
        });
      }

      // Если это последний вопрос, можно увеличить счетчик full (если нужно)
      if (final_question) {
        logger.debug("Final question answered", {
          quizUid,
          userKey,
          questionUid: cleanAnswerData.question_uid,
        });
        // Здесь можно добавить дополнительную логику для обработки последнего вопроса
        // Например, изменение статуса сессии на 'completed' (если контакты не обязательны)
      }
    } catch (error) {
      logger.error("Failed to save quiz answer", error as Error, { quizUid, answerData });
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
    sessionToken?: string
  ): Promise<void> {

    try {
      // Получаем ID квиза
      const quiz = await db
        .select({ id: quizTable.id })
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
            eq(quizBidTable.key, userKey)
          )
        )
        .limit(1);

      if (existingRecord.length > 0 && existingRecord[0]) {
        // Обновляем существующую запись: сохраняем только answers в contacts
        // form уже сохранен в contactsForm при получении квиза
        const existingAnswers = (existingRecord[0].answer as any[]) || [];

        await db
          .update(quizBidTable)
          .set({
            answer: existingAnswers, // Сохраняем массив ответов
            contacts: contactData.answers, // Сохраняем только answers пользователя
            // Статус не обновляем - он остается 'create', администратор обновит его вручную
            isFull: true, // Помечаем как полностью заполненный
            updatedAt: new Date(),
          })
          .where(eq(quizBidTable.id, existingRecord[0].id));

        logger.debug("Quiz contacts saved", {
          quizUid,
          userKey,
          isFull: true,
          contactsCount: Object.keys(contactData.answers).length,
        });
      } else {
        // Если записи нет, это ошибка - она должна быть создана при получении квиза
        logger.error("Quiz session not found for contacts - should be created when quiz is loaded", {
          quizUid,
          userKey,
        });
        throw new Error("Session not found. Please reload the quiz.");
      }

      // Увеличиваем счётчик full
      await this.incrementQuizFull(quizUid);
    } catch (error) {
      logger.error("Failed to save quiz contacts", error as Error, { quizUid, contactData });
      throw error;
    }
  }
}