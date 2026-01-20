import Elysia, { t } from "elysia";
import { logger } from '../../lib/logger';
import { IpLocationService } from '../../services/ip-location.service';
import { SessionService } from '../../services/session.service';
import { publicQuiz, quizContacts } from './models';
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
        session = await SessionService.parseBidToken(bidToken.toString());
        // Проверяем, есть ли текущий quizUID в массиве
        if (!session.quizUIDs.includes(uid)) {
          // Добавляем quizUID в токен
          const updatedToken = await SessionService.addQuizUIDToToken(bidToken.toString(), uid);
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
      const token = await SessionService.generateBidToken([uid]);

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
      // Логируем тип body для отладки
      logger.debug("Received request to save quiz answer", {
        uid,
        bodyType: typeof body,
        isFormData: body instanceof FormData,
        bodyConstructor: body?.constructor?.name,
        bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        finalQuestion,
      });

      // Обрабатываем разные типы запросов
      let answersToProcess: any[] = [];
      let userKey: string | undefined;

      if (body instanceof FormData) {
        const questionUid = body.get('question_uid') as string;
        const keyFromBody = body.get('key') as string | null;
        const isQuestionGroup = body.get('is_question_group') === 'true';
        const answerValue = body.get('answer');

        // Используем key из body, если он есть
        userKey = keyFromBody || undefined;

        if (isQuestionGroup && answerValue && typeof answerValue === 'string') {
          // Обработка question_group с файлами
          try {
            const answerArray = JSON.parse(answerValue) as any[];

            // Собираем все файлы из FormData
            const files: Map<number, File | Blob> = new Map();
            for (const [key, value] of body.entries()) {
              if (key.startsWith('file_')) {
                const index = parseInt(key.replace('file_', ''), 10);
                const valueAsAny = value as any;
                if (valueAsAny instanceof File || valueAsAny instanceof Blob) {
                  files.set(index, valueAsAny);
                }
              }
            }

            // Заменяем плейсхолдеры файлов на реальные файлы
            const processedArray = answerArray.map((item) => {
              if (item && typeof item === 'object' && item.__isFile === true && item.__fileIndex !== undefined) {
                const file = files.get(item.__fileIndex);
                if (file) {
                  // question_uid должен быть сохранен в плейсхолдере
                  return {
                    question_uid: item.question_uid,
                    answer: file,
                  };
                }
              }
              // Если item - это обычный объект с question_uid и answer, возвращаем как есть
              return item;
            });

            // Для question_group сохраняем один ответ с массивом подвопросов
            answersToProcess = [{
              question_uid: questionUid, // UID родительского вопроса группы
              answer: processedArray, // Массив ответов на подвопросы
              final_question: finalQuestion,
            }];

            logger.debug("Processing question_group with files from FormData", {
              uid,
              parentQuestionUid: questionUid,
              subAnswersCount: processedArray.length,
              filesCount: files.size,
              key: userKey,
              finalQuestion,
            });
          } catch (parseError) {
            logger.error("Failed to parse question_group answer array", parseError as Error, {
              uid,
              questionUid,
              answerValue,
            });
            throw new Error("Failed to parse question_group answer array");
          }
        } else {
          // Обработка обычного файла (не question_group)
          // Проверяем, что файл действительно получен
          // Используем более гибкую проверку, как в user/index.ts
          let fileToProcess: File | Blob | null = null;
          const answerValueAsAny = answerValue as any;
          if (answerValueAsAny instanceof File) {
            fileToProcess = answerValueAsAny;
          } else if (answerValueAsAny instanceof Blob) {
            fileToProcess = answerValueAsAny;
          } else if (answerValue && typeof answerValue === "object" && "size" in answerValue) {
            // Обрабатываем объект с признаками файла (может быть из Elysia)
            fileToProcess = answerValue as Blob;
          }

          if (!fileToProcess) {
            logger.error("File not found in FormData or invalid file type", {
              uid,
              questionUid,
              answerFileType: typeof answerValue,
              isFile: answerValue instanceof File,
              isBlob: answerValue instanceof Blob,
              hasSize: answerValue && typeof answerValue === "object" && "size" in answerValue,
            });
            throw new Error("File not found in FormData or invalid file type");
          }

          const answerData = {
            question_uid: questionUid,
            answer: fileToProcess,
            final_question: finalQuestion,
          };

          answersToProcess = [answerData];

          const fileName = fileToProcess instanceof File ? fileToProcess.name : 'file';
          logger.debug("Processing FormData answer", {
            uid,
            questionUid,
            fileName,
            fileSize: fileToProcess.size,
            fileType: fileToProcess.type,
            key: userKey,
            finalQuestion
          });
        }
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
        // Проверяем, что body является объектом
        if (!body || typeof body !== 'object' || body instanceof FormData) {
          throw new Error("Invalid body type: expected object");
        }
        
        // Используем более точный тип вместо Record<string, any>
        type AnswerBody = {
          question_uid: string;
          answer: unknown;
          question?: unknown;
          key?: string;
          final_question?: boolean;
          [key: string]: unknown;
        };
        
        const bodyAsRecord = body as AnswerBody;
        
        // Извлекаем key из body и удаляем его из answerData
        userKey = bodyAsRecord.key || undefined;
        const { key: _, ...answerDataWithoutKey } = bodyAsRecord;

        // Проверяем, является ли answer массивом (question_group)
        if (Array.isArray(bodyAsRecord.answer)) {
          // Логируем входящие данные для отладки
          logger.debug("Processing question_group - input data", {
            uid,
            parentQuestionUid: bodyAsRecord.question_uid,
            answerArrayLength: bodyAsRecord.answer.length,
            firstSubAnswer: bodyAsRecord.answer[0],
            allSubAnswers: bodyAsRecord.answer.map((sa: any) => ({
              hasQuestionUid: 'question_uid' in (sa || {}),
              hasAnswer: 'answer' in (sa || {}),
              questionUid: sa?.question_uid,
              answerType: typeof sa?.answer,
            })),
          });

          // Для question_group сохраняем один ответ с массивом подвопросов
          answersToProcess = [{
            question_uid: bodyAsRecord.question_uid, // UID родительского вопроса группы
            answer: bodyAsRecord.answer, // Массив ответов на подвопросы
            final_question: finalQuestion,
          }];

          logger.debug("Processing question_group answer", {
            uid,
            parentQuestionUid: bodyAsRecord.question_uid,
            subAnswersCount: bodyAsRecord.answer.length,
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
            questionUid: bodyAsRecord.question_uid,
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
      // Для question_group сохраняем один ответ с массивом подвопросов
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
    // НЕ указываем body - Elysia автоматически определит тип (JSON или FormData)
    // Указываем type для поддержки multipart/form-data
    type: 'multipart',
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
