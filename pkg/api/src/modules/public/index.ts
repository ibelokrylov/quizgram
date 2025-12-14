import Elysia, { t } from "elysia";
import { logger } from '../../lib/logger';
import { SessionService } from '../../services/session.service';
import { IpLocationService } from '../../services/ip-location.service';
import { publicQuiz, quizAnswer, quizAnswersArray, quizAnswerFormData, quizContacts } from './models';
import { PublicService } from './service';

export const publicModule = new Elysia({ prefix: "/public" })
  .post("/quiz/:uid", async (ctx) => {
    const { uid } = ctx.params;
    const { body } = ctx;
    const bidToken = ctx.cookie.bidToken?.value;
    const initData = body?.initData;

    let session: { quizUIDs: string[] } | null = null;
    let shouldIncrementOpened = false;

    // Проверяем валидность bidToken, если он есть
    if (bidToken) {
      try {
        session = SessionService.parseBidToken(bidToken.toString());
        // Проверяем, есть ли текущий quizUID в массиве
        if (!session.quizUIDs.includes(uid)) {
          // Добавляем quizUID в токен
          const updatedToken = SessionService.addQuizUIDToToken(bidToken.toString(), uid);
          ctx.cookie.bidToken.set({
            value: updatedToken,
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60, // 30 дней
            path: "/",
          });
          shouldIncrementOpened = true;
        }
      } catch (error) {
        logger.debug("Invalid or expired bidToken", { uid, error: error instanceof Error ? error.message : String(error) });
        // Токен невалиден, создаем новый
        session = null;
      }
    }

    // Если токена нет или он невалиден - создаем новый
    if (!session) {
      // Генерируем JWT с массивом quizUIDs (содержащим текущий uid)
      const token = SessionService.generateBidToken([uid]);

      // Устанавливаем cookie с токеном
      ctx.cookie.bidToken.set({
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60, // 30 дней
        path: "/",
      });

      shouldIncrementOpened = true;
    }

    // Увеличиваем счетчики opened
    // Если shouldIncrementOpened = true - увеличиваем и openedUnique и opened (первое открытие)
    // Если shouldIncrementOpened = false - увеличиваем только opened (повторное открытие)
    try {
      await PublicService.incrementQuizOpened(uid, shouldIncrementOpened);
    } catch (error) {
      logger.error("Failed to increment quiz opened", error as Error, { uid, shouldIncrementOpened });
    }

    // Генерируем UUID key для последующего сохранения ответов
    const key = crypto.randomUUID();

    // Определяем, первый ли это запрос квиза (если квиза не было в cookie, то first = true)
    const isFirst = shouldIncrementOpened;

    // Получаем IP адрес и определяем геолокацию
    let ipLocation = null;
    try {
      logger.debug('Starting IP location determination', { 
        uid, 
        url: ctx.request.url,
        headers: {
          'x-forwarded-for': ctx.request.headers.get('x-forwarded-for'),
          'x-real-ip': ctx.request.headers.get('x-real-ip'),
          'cf-connecting-ip': ctx.request.headers.get('cf-connecting-ip'),
        }
      });
      
      ipLocation = await IpLocationService.getLocationFromRequest(ctx.request, ctx.server);
      
      logger.info('IP location determined successfully', { 
        uid, 
        ipLocation,
        hasCountry: !!ipLocation?.country,
        hasCity: !!ipLocation?.city,
        hasIp: !!ipLocation?.ip
      });
    } catch (error) {
      logger.error('Failed to get IP location', error instanceof Error ? error : new Error(String(error)), { 
        uid,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        url: ctx.request.url
      });
      // Продолжаем выполнение даже если не удалось определить геолокацию
    }

    // Получаем квиз и сохраняем userInfo и questions (из самого квиза)
    const quiz = await PublicService.getQuizByUidAndSaveUserInfo(uid, key, initData, isFirst, ipLocation);

    return {
      data: quiz,
      key,
    };
  }, {
    body: t.Object({
      initData: t.Optional(t.String()), // Telegram WebApp initData
    }),
    params: t.Object({
      uid: t.String(),
    }),
    response: {
      200: t.Object({
        data: publicQuiz,
        key: t.String(),
      }),
      400: t.Object({
        message: t.String(),
        error: t.String(),
      })
    },
  })
  .post("/quiz/:uid/answer", async (ctx) => {
    const { uid } = ctx.params;
    const { body, query } = ctx;
    const bidToken = ctx.cookie.bidToken?.value;
    const finalQuestion = query.final_question === 'true';

    try {
      // Обрабатываем разные типы запросов
      let answersToProcess: any[] = [];
      let userKey: string | undefined;

      if (body instanceof FormData) {
        // Обработка FormData (для загрузки файлов)
        const answerFile = body.get('answer') as File;
        const questionUid = body.get('question_uid') as string;
        const keyFromBody = body.get('key') as string | null;
        let questionData;

        try {
          const questionStr = body.get('question') as string;
          questionData = questionStr ? JSON.parse(questionStr) : '';
        } catch {
          questionData = '';
        }

        const answerData = {
          question_uid: questionUid,
          answer: answerFile,
          question: questionData,
          final_question: finalQuestion,
        };

        answersToProcess = [answerData];
        // Используем key из body, если он есть
        userKey = keyFromBody || undefined;

        logger.debug("Processing FormData answer", { uid, questionUid, fileName: answerFile.name, key: userKey, finalQuestion });
      } else if (Array.isArray(body)) {
        // Обработка массива ответов (quizAnswersArray)
        // Извлекаем key из первого элемента массива, если он есть
        userKey = body[0]?.key || undefined;
        
        // Обрабатываем каждый элемент массива
        answersToProcess = body.map((item) => {
          const { key: _, ...answerDataWithoutKey } = item;
          return {
            ...answerDataWithoutKey,
            final_question: finalQuestion,
          };
        });

        logger.debug("Processing array of answers", { 
          uid, 
          answersCount: answersToProcess.length, 
          key: userKey, 
          finalQuestion 
        });
      } else {
        // Обработка одного JSON ответа
        // Извлекаем key из body и удаляем его из answerData
        userKey = body.key || undefined;
        const { key: _, ...answerDataWithoutKey } = body;

        // Проверяем, является ли answer массивом (question_group)
        if (Array.isArray(body.answer)) {
          // Обрабатываем question_group - каждый элемент массива становится отдельным ответом
          answersToProcess = body.answer.map((subAnswer: any) => ({
            question_uid: subAnswer.question_uid,
            answer: subAnswer.answer,
            question: subAnswer.question,
            final_question: finalQuestion,
            // Сохраняем информацию о родительском вопросе группы
            parent_question_uid: body.question_uid,
            parent_question: body.question,
          }));

          logger.debug("Processing question_group answer", { 
            uid, 
            parentQuestionUid: body.question_uid,
            subAnswersCount: answersToProcess.length,
            key: userKey, 
            finalQuestion 
          });
        } else {
          // Обычный одиночный ответ
          const answerData = {
            ...answerDataWithoutKey,
            final_question: finalQuestion,
          };

          answersToProcess = [answerData];

          logger.debug("Processing single JSON answer", { 
            uid, 
            questionUid: body.question_uid, 
            key: userKey, 
            finalQuestion 
          });
        }
      }

      // Используем key из запроса приоритетно, иначе используем bidToken
      const sessionKey: string | undefined = userKey || (bidToken ? String(bidToken) : undefined);

      if (!sessionKey) {
        throw new Error("Session key is required. Please provide 'key' in request body or ensure bidToken cookie is set.");
      }

      // Сохраняем все ответы (каждый ответ дополняет существующую запись)
      // Для question_group сохраняем каждый под-ответ отдельно
      for (const answerData of answersToProcess) {
        try {
          await PublicService.saveQuizAnswer(uid, answerData, sessionKey);
        } catch (error) {
          logger.error("Failed to save individual answer", error as Error, {
            uid,
            questionUid: answerData.question_uid,
            sessionKey,
          });
          throw error;
        }
      }

      return {
        success: true,
        message: "Answer saved successfully",
      };
    } catch (error) {
      logger.error("Failed to save quiz answer", error as Error, { uid, body });

      ctx.set.status = 500;
      return {
        success: false,
        message: "Failed to save answer",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, {
    body: t.Union([
      quizAnswer,
      quizAnswersArray,
      quizAnswerFormData,
    ]),
    params: t.Object({
      uid: t.String(),
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
      }),
      400: t.Object({
        success: t.Boolean(),
        message: t.String(),
        error: t.String(),
      }),
      500: t.Object({
        success: t.Boolean(),
        message: t.String(),
        error: t.String(),
      }),
    },
  })
  .post("/quiz/:uid/contacts", async (ctx) => {
    const { uid } = ctx.params;
    const { body } = ctx;
    const bidToken = ctx.cookie.bidToken?.value;

    try {
      // Используем key из body приоритетно, иначе используем bidToken
      const userKey: string | undefined = body.key || (bidToken ? String(bidToken) : undefined);

      // Удаляем key из body перед передачей в сервис
      const { key: _, ...contactsDataWithoutKey } = body;

      // Сохраняем контакты и обновляем статус сессии
      await PublicService.saveQuizContacts(uid, contactsDataWithoutKey, userKey);

      return {
        success: true,
        message: "Contacts saved successfully",
      };
    } catch (error) {
      logger.error("Failed to save quiz contacts", error as Error, { uid, body });

      ctx.set.status = 500;
      return {
        success: false,
        message: "Failed to save contacts",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, {
    body: quizContacts,
    params: t.Object({
      uid: t.String(),
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
      }),
      400: t.Object({
        success: t.Boolean(),
        message: t.String(),
        error: t.String(),
      }),
      500: t.Object({
        success: t.Boolean(),
        message: t.String(),
        error: t.String(),
      }),
    },
  });
