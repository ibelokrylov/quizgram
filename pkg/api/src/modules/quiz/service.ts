// Сервис для работы с квизами
// Обрабатывает бизнес-логику для квизов

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { QuizResult, quizResultTable, UserTable } from 'pkg-types';
import {
  db,
  getDb,
  NewQuiz,
  NewQuizContact,
  NewQuizThxPage,
  quizContactTable,
  QuizOpen,
  quizOpenTable,
  QuizQuestion,
  quizQuestionTable,
  quizTable,
  quizThxPageTable,
  User,
  type Quiz,
  type QuizContact,
  type QuizThxPage,
} from '../../db';
import { buildConflictUpdateColumns } from '../../db/helper';
import { logger } from '../../lib/logger';

// Тип для элемента кэша dashboard
interface DashboardCacheItem {
  quizzes: (Quiz & { quiz_open?: QuizOpen })[];
  expires: number; // timestamp в миллисекундах
}

// Тип для элемента кэша фильтров квизов
interface QuizFiltersCacheItem {
  filters: Array<{ uid: string; name: string }>;
  expires: number; // timestamp в миллисекундах
}

export abstract class QuizService {
  // Кэш для dashboard (аналог sync.Map в Go)
  private static dashboardCache = new Map<string, DashboardCacheItem>();

  // Кэш для фильтров квизов пользователя
  private static quizFiltersCache = new Map<number, QuizFiltersCacheItem>();

  /**
   * Получение всех квизов пользователя для dashboard с пагинацией и кэшированием
   * @param userId - ID пользователя
   * @param limit - Максимальное количество квизов (по умолчанию 10, максимум 10)
   * @param offset - Смещение для пагинации
   * @returns Массив квизов и общее количество
   */
  static async getAllByDashboard(
    userId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ quizzes: (Quiz & { quiz_open?: QuizOpen })[] }> {
    // Ограничиваем limit максимумом 10
    const actualLimit = limit > 10 ? 10 : limit;

    // Создаем ключ кэша
    const cacheKey = `dashboard:${userId}:${actualLimit}:${offset}`;

    // Проверяем кэш
    const cached = this.dashboardCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      logger.debug('Dashboard cache hit', {
        userId,
        limit: actualLimit,
        offset,
      });
      return { quizzes: cached.quizzes };
    }

    // Кэш истек или отсутствует, удаляем его
    if (cached) {
      this.dashboardCache.delete(cacheKey);
    }

    logger.debug('Dashboard cache miss', {
      userId,
      limit: actualLimit,
      offset,
    });

    // Получаем квизы с пагинацией через Drizzle ORM
    const quizzes = await db
      .select()
      .from(quizTable)
      .where(and(eq(quizTable.userId, userId), isNull(quizTable.deletedAt)))
      .orderBy(desc(quizTable.updatedAt))
      .limit(actualLimit)
      .offset(offset);

    const quiz_opens = await db
      .select()
      .from(quizOpenTable)
      .where(
        inArray(
          quizOpenTable.quizUid,
          quizzes.map((quiz) => quiz.uid)
        )
      );

    const quizzesWithOpen: (Quiz & { quiz_open?: QuizOpen })[] = quizzes.map((quiz) => {
      const quiz_open = quiz_opens.find((quiz_open) => quiz_open.quizUid === quiz.uid);
      return {
        ...quiz,
        quiz_open,
      };
    });

    // Сохраняем в кэш с TTL 5 секунд (как в Go API)
    const cacheItem: DashboardCacheItem = {
      quizzes: quizzesWithOpen,
      expires: Date.now() + 5 * 1000, // 5 секунд
    };
    this.dashboardCache.set(cacheKey, cacheItem);

    return { quizzes: quizzesWithOpen };
  }

  /**
   * Получение фильтров квизов (uid и name) всех квизов пользователя (не удаленных) с кэшированием
   * @param userId - ID пользователя
   * @returns Массив объектов с uid и name
   */
  static async getQuizFilters(userId: number): Promise<Array<{ uid: string; name: string }>> {
    // Проверяем кэш
    const cached = this.quizFiltersCache.get(userId);
    if (cached && Date.now() < cached.expires) {
      logger.debug('Quiz filters cache hit', { userId });
      return cached.filters;
    }

    // Кэш истек или отсутствует, удаляем его
    if (cached) {
      this.quizFiltersCache.delete(userId);
    }

    logger.debug('Quiz filters cache miss', { userId });

    // Получаем uid и name всех не удаленных квизов пользователя
    const quizzes = await db
      .select({
        uid: quizTable.uid,
        name: quizTable.name,
      })
      .from(quizTable)
      .where(and(eq(quizTable.userId, userId), isNull(quizTable.deletedAt)));

    const quizList = quizzes.map((quiz) => ({
      uid: quiz.uid,
      name: quiz.name || 'Новый квиз',
    }));

    // Сохраняем в кэш с TTL 20 секунд
    const cacheItem: QuizFiltersCacheItem = {
      filters: quizList,
      expires: Date.now() + 20 * 1000, // 20 секунд
    };
    this.quizFiltersCache.set(userId, cacheItem);

    return quizList;
  }

  /**
   * Получение квиза по UID с загрузкой связанных данных (Contact и ThxPage)
   * @param uid - UID квиза
   * @param userId - ID пользователя
   * @returns Квиз с загруженными Contact и ThxPage
   */
  static async getQuizByUid(
    uid: string,
    userId: number
  ): Promise<{
    quiz: Quiz;
    quiz_contact: QuizContact[] | null;
    quiz_thx_page: QuizThxPage | null;
    quiz_question: QuizQuestion[] | null;
    quiz_result: QuizResult[] | null;
  } | null> {
    // Получаем основной квиз
    const quizResult = await db
      .select()
      .from(quizTable)
      .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)))
      .leftJoin(quizThxPageTable, eq(quizTable.id, quizThxPageTable.quizId));

    if (!quizResult || quizResult.length === 0 || !quizResult[0].quiz) {
      throw new Error('Quiz not found');
    }

    const contacts = await db
      .select()
      .from(quizContactTable)
      .where(eq(quizContactTable.quizId, quizResult[0].quiz?.id));

    const questions = await db
      .select()
      .from(quizQuestionTable)
      .where(eq(quizQuestionTable.quizId, quizResult[0].quiz?.id));

    const results = await db
      .select()
      .from(quizResultTable)
      .where(eq(quizResultTable.quizId, quizResult[0].quiz?.id));

    return {
      quiz: quizResult[0].quiz,
      quiz_contact: contacts,
      quiz_question: questions,
      quiz_thx_page: quizResult[0]?.quiz_thx_page,
      quiz_result: results,
    };
  }

  /**
   * Обновление имени квиза
   * @param uid - UID квиза
   * @param userId - ID пользователя
   * @param name - Новое имя квиза
   * @returns Обновленный квиз
   */
  static async updateQuizName(uid: string, userId: number, name: string): Promise<Quiz> {
    // Находим квиз по UID и проверяем принадлежность пользователю
    const quizzes = await db
      .select()
      .from(quizTable)
      .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)))
      .limit(1);

    const quiz = quizzes[0];
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Обновляем имя квиза
    const updatedQuizzes = await db
      .update(quizTable)
      .set({ name })
      .where(eq(quizTable.id, quiz.id))
      .returning();

    const updatedQuiz = updatedQuizzes[0];
    if (!updatedQuiz) {
      throw new Error('Failed to update quiz name');
    }

    return updatedQuiz;
  }

  /**
   * Удаление квиза по UID
   * @param uid - UID квиза
   * @param userId - ID пользователя
   */
  static async deleteQuiz(uid: string, userId: number): Promise<void> {
    const database = getDb();
    await database.transaction(async (tx) => {
      // В beta версии Drizzle ORM транзакции имеют полный доступ к методам БД
      // Используем type assertion через unknown для обхода проблем с типизацией
      await (tx as unknown as typeof database)
        .update(quizTable)
        .set({ deletedAt: new Date() })
        .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)));
      await (tx as unknown as typeof database)
        .update(UserTable)
        .set({ quizCount: sql`GREATEST(${UserTable.quizCount} - 1, 0)` })
        .where(eq(UserTable.id, userId));
    });
  }

  /**
   * Обновление квиза
   * @param uid - UID квиза
   * @param userId - ID пользователя
   * @param data - Данные для обновления
   */
  static async updateQuiz(
    uid: string,
    userId: number,
    data: {
      startPage?: any;
      questionTitle?: string;
      question?: any;
      contact?: any;
      thxPage?: any;
    },
    planId: number,
    isAdmin: boolean = false
  ): Promise<[string[], string[]]> {
    const ok = new Set<string>([]);
    const errors = new Set<string>([]);

    const quiz = await db
      .select()
      .from(quizTable)
      .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)))
      .limit(1);
    if (!quiz || quiz.length === 0) {
      throw new Error('Quiz not found');
    }

    // Обновляем поля, которые хранятся в таблице quiz
    const updateData: Partial<Quiz> = {};

    if (data.startPage !== undefined) {
      // Для FREE плана (если не админ) принудительно показываем логотип
      if (planId === 1 && !isAdmin) {
        data.startPage.content.show_logo = true;
      }
      updateData.startPage = data.startPage;
    } else if (quiz[0].startPage !== null) {
      // Если startPage не передана в запросе, но есть в БД - удаляем её
      updateData.startPage = null;
    }

    if (data.questionTitle !== undefined) {
      updateData.questionTitle = data.questionTitle;
    }

    // Обработка question, contact, thxPage пока не реализована
    // (требует обновления связанных таблиц)
    // В Go API также есть только проверка на contact != nil, но логика не реализована
    if (data.contact !== undefined) {
      try {
        // Фильтруем контакты с обязательным полем uid и маппим в правильный формат
        const values = (data.contact as QuizContact[])
          .filter((contact) => contact.uid) // Фильтруем записи без uid
          .map((contact) => ({
            quizId: quiz[0].id,
            uid: contact.uid, // Правильное имя поля из схемы
            title: contact.title ?? null,
            description: contact.description ?? null,
            background: contact.background ?? null,
            form: contact.form ?? null,
          }));

        if (values.length > 0) {
          await db
            .insert(quizContactTable)
            .values(values)
            .onConflictDoUpdate({
              target: [quizContactTable.uid],
              set: buildConflictUpdateColumns(quizContactTable, [
                'title',
                'description',
                'background',
                'form',
              ]),
            });
        }

        ok.add('contact');
      } catch (error) {
        logger.error(
          'Failed to update contact',
          error instanceof Error ? error : new Error(String(error)),
          { uid, userId, data: data.contact }
        );
        errors.add('contact');
      }
    }

    if (data.question !== undefined) {
      try {
        // Если массив question пустой - удаляем все вопросы квиза
        if (data.question.length === 0) {
          await db.delete(quizQuestionTable).where(eq(quizQuestionTable.quizId, quiz[0].id));
          ok.add('question');
        } else {
          // Если массив question не пустой - обновляем вопросы
          const questions = data.question as QuizQuestion[];
          const questionUid = new Set<string>(questions.map((question) => question.uid));
          const questionQuiz = await db
            .select()
            .from(quizQuestionTable)
            .where(eq(quizQuestionTable.quizId, quiz[0].id));

          if (questionQuiz.length > 0) {
            const deleteQuestionUid = questionQuiz
              .filter((question) => !questionUid.has(question.uid))
              .map((question) => question.uid);
            if (deleteQuestionUid.length > 0) {
              await db
                .delete(quizQuestionTable)
                .where(
                  and(
                    eq(quizQuestionTable.quizId, quiz[0].id),
                    inArray(quizQuestionTable.uid, deleteQuestionUid)
                  )
                );
            }
          }

          await db
            .insert(quizQuestionTable)
            .values(
              questions.map((question, idx) => ({
                quizId: quiz[0].id,
                type: question.type,
                uid: question.uid,
                order: idx,
                content: question.content,
              }))
            )
            .onConflictDoUpdate({
              target: [quizQuestionTable.uid],
              set: buildConflictUpdateColumns(quizQuestionTable, ['type', 'order', 'content']),
            });
          ok.add('question');
        }
      } catch (err) {
        console.log(err);
        logger.error('Failed to update question', err, { uid, userId, data: data.question });
        errors.add('question');
      }
    }

    if (data.thxPage !== undefined) {
      try {
        const thxPage = data.thxPage as QuizThxPage;
        await db
          .insert(quizThxPageTable)
          .values({
            quizId: quiz[0].id,
            uid: thxPage.uid,
            title: thxPage.title,
            description: thxPage.description,
            buttons: thxPage.buttons,
            social: thxPage.social,
          })
          .onConflictDoUpdate({
            target: [quizThxPageTable.uid],
            set: buildConflictUpdateColumns(quizThxPageTable, [
              'title',
              'description',
              'buttons',
              'social',
            ]),
          });
        ok.add('thxPage');
      } catch (error) {
        logger.error('Failed to update thxPage', error, { uid, userId, data: data.thxPage });
        errors.add('thxPage');
      }
    }
    // Обновляем только если есть изменения
    if (Object.keys(updateData).length > 0) {
      try {
        await db
          .update(quizTable)
          .set(updateData)
          .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)));
        for (const key of Object.keys(updateData)) {
          ok.add(key);
        }
      } catch (error) {
        logger.error('Failed to update quiz', error, { uid, userId, updateData });
        for (const key of Object.keys(updateData)) {
          errors.add(key);
        }
      }
    }

    return [Array.from(ok), Array.from(errors)];
  }

  /**
   * Изменение статуса активности квиза (инвертирует isActive)
   * @param uid - UID квиза
   * @param userId - ID пользователя
   * @returns Новое значение isActive
   */
  static async updateQuizActive(uid: string, userId: number): Promise<boolean> {
    try {
      await db
        .update(quizTable)
        .set({ isActive: sql`NOT ${quizTable.isActive}` })
        .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)));
      return true;
    } catch {
      throw new Error('Failed to update quiz active status');
    }
  }

  /**
   * Обновление поля is_show_logo квиза
   * @param uid - UID квиза
   * @param userId - ID пользователя
   * @param isShowLogo - Новое значение is_show_logo
   * @returns Обновленное значение is_show_logo
   */
  static async updateQuizIsShowLogo(
    uid: string,
    userId: number,
    isShowLogo: boolean
  ): Promise<boolean> {
    // Находим квиз по UID и проверяем принадлежность пользователю
    const quizzes = await db
      .select()
      .from(quizTable)
      .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, userId)))
      .limit(1);

    const quiz = quizzes[0];
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Обновляем is_show_logo
    const updatedQuizzes = await db
      .update(quizTable)
      .set({ isShowLogo })
      .where(eq(quizTable.id, quiz.id))
      .returning();

    const updatedQuiz = updatedQuizzes[0];
    if (!updatedQuiz) {
      throw new Error('Failed to update quiz is_show_logo');
    }

    return updatedQuiz.isShowLogo;
  }

  static async createQuiz(userId: number): Promise<Quiz> {
    const quiz: NewQuiz = {
      userId,
      uid: crypto.randomUUID(),
      startPage: [
        {
          type: 'standard',
          uuid: crypto.randomUUID(),
          content: {
            title: 'Заголовок страницы',
          },
        },
      ],
    };

    const [createdQuiz] = await db.insert(quizTable).values(quiz).returning();

    if (!createdQuiz) {
      throw new Error('Failed to create quiz');
    }

    // Создаем дефолтную запись в quiz_contact
    const quizContact: NewQuizContact = {
      quizId: createdQuiz.id,
      uid: crypto.randomUUID(),
      title: 'Заголовок формы',
      description: 'Описание формы',
      form: [
        {
          type: 'name',
          label: 'Имя',
          placeholder: 'Иван',
          required: true,
          step: 0,
        },
        {
          type: 'email',
          label: 'Email',
          placeholder: 'mail@example.com',
          required: true,
          step: 0,
        },
        {
          type: 'phone',
          label: 'Телефон',
          placeholder: '+7 (999) 999-99-99',
          required: true,
          mask: '+7 (###) ###-##-##',
          step: 0,
        },
      ],
    };

    await db.insert(quizContactTable).values(quizContact);

    // Создаем дефолтную страницу благодарности (thxPage)
    const quizThxPage: NewQuizThxPage = {
      quizId: createdQuiz.id,
      uid: crypto.randomUUID(),
      title: 'Спасибо, [name]!',
      description: 'Здесь может быть любой текст',
      buttons: [],
      social: [],
    };

    await db.insert(quizThxPageTable).values(quizThxPage);

    // Увеличиваем счетчик квизов у пользователя
    await db
      .update(UserTable)
      .set({ quizCount: sql`${UserTable.quizCount} + 1` })
      .where(eq(UserTable.id, userId));

    return createdQuiz;
  }

  static async updateIsSharedQuiz(
    dto: { isShared: boolean },
    uid: string,
    user: User
  ): Promise<boolean> {
    const findQuiz = await db
      .select({
        uid: quizTable.uid,
        isShared: quizTable.isShared,
        userId: quizTable.userId,
        id: quizTable.id,
      })
      .from(quizTable)
      .where(and(eq(quizTable.uid, uid), eq(quizTable.userId, user.id)));

    if (findQuiz.length === 0) throw new Error('Quiz not found');
    const quiz = findQuiz[0];
    const userPaid = user.planId !== 1 || user.isAdmin;

    if (!userPaid && quiz.isShared) {
      // для всех квизов пользователя, если он не админ и бесплатный - грохаем все shared квизы
      await db.update(quizTable).set({ isShared: false }).where(eq(quizTable.userId, user.id));
      throw new Error('Function not available for free plan');
    }

    await db.update(quizTable).set({ isShared: dto.isShared }).where(eq(quizTable.id, quiz.id));

    return dto.isShared;
  }

  static async generateSharedQuiz(
    quizUid: string,
    user: User,
    findQuizUserId?: number,
    findQuiz?: {
      quiz: Quiz;
      quiz_contact: QuizContact[] | null;
      quiz_thx_page: QuizThxPage | null;
      quiz_question: QuizQuestion[] | null;
    } | null
  ): Promise<{
    quiz: Quiz;
    quiz_contact: QuizContact[] | null;
    quiz_thx_page: QuizThxPage | null;
    quiz_question: QuizQuestion[] | null;
  } | null> {
    const [findQuizUser] = findQuizUserId
      ? [{ userId: findQuizUserId }]
      : await db
          .select({ userId: quizTable.userId })
          .from(quizTable)
          .where(and(eq(quizTable.uid, quizUid), eq(quizTable.isShared, true)))
          .limit(1);

    if (!findQuizUser) throw new Error('Quiz not found');

    const quiz = findQuiz ? findQuiz : await this.getQuizByUid(quizUid, findQuizUser.userId);
    logger.info('Start import quiz ' + quizUid, { quiz });

    if (!quiz) throw new Error('Quiz not found');
    const newUid = crypto.randomUUID();
    const [checkFreeUid] = await db
      .select({ uuid: quizTable.uid })
      .from(quizTable)
      .where(eq(quizTable.uid, newUid))
      .limit(1);
    if (checkFreeUid) {
      return this.generateSharedQuiz(quizUid, user, findQuizUser.userId, quiz);
    }

    await db.transaction(async (tx) => {
      const { id, ..._quiz } = quiz.quiz;
      const [newQuiz] = await tx
        .insert(quizTable)
        .values({
          ..._quiz,
          uid: newUid,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          isShared: false,
        })
        .returning({ id: quizTable.id });

      if (quiz.quiz_contact) {
        for (const contact of quiz.quiz_contact) {
          const { id, ...c } = contact;
          await tx
            .insert(quizContactTable)
            .values({ ...c, quizId: newQuiz.id, uid: crypto.randomUUID() });
        }
      }

      if (quiz.quiz_question) {
        for (const question of quiz.quiz_question) {
          const { id, ...questionDeleteId } = question;
          if (questionDeleteId.type === 'question_group') {
            questionDeleteId.content = {
              ...(questionDeleteId.content ?? {}),
              questions: (
                questionDeleteId.content as { title: string; questions: Array<any> }
              )?.questions?.map((item) => ({
                ...item,
                uid: crypto.randomUUID(),
              })),
            };
          }

          await tx
            .insert(quizQuestionTable)
            .values({ ...questionDeleteId, quizId: newQuiz.id, uid: crypto.randomUUID() });
        }
      }
      if (quiz.quiz_thx_page) {
        const { id, ...thxPage } = quiz.quiz_thx_page;
        await tx
          .insert(quizThxPageTable)
          .values({ ...thxPage, quizId: newQuiz.id, uid: crypto.randomUUID() });
      }
    });

    return await this.getQuizByUid(newUid, user.id);
  }
}
