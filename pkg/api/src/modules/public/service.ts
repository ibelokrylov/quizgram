import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db, quizContactTable, quizQuestionTable, quizTable, quizThxPageTable } from '../../db';
import { logger } from '../../lib/logger';
import { PublicQuiz } from './models';

export abstract class PublicService {
  static async getQuizByUid(uid: string): Promise<PublicQuiz> {
    const quiz = await db.select()
      .from(quizTable)
      .where(eq(quizTable.uid, uid))
      .leftJoin(quizThxPageTable, eq(quizTable.id, quizThxPageTable.quizId))
      .limit(1);
    if (!quiz || quiz.length === 0 || !quiz[0].quiz) {
      throw new Error("Quiz not found");
    }

    const contacts = await db
      .select()
      .from(quizContactTable)
      .where(eq(quizContactTable.quizId, quiz[0].quiz?.id));

    const questions = await db
      .select({
        type: quizQuestionTable.type,
        uid: quizQuestionTable.uid,
        order: quizQuestionTable.order,
        content: quizQuestionTable.content,
      })
      .from(quizQuestionTable)
      .where(and(eq(quizQuestionTable.quizId, quiz[0].quiz?.id), isNotNull(quizQuestionTable.type)))
      .orderBy(asc(quizQuestionTable.order));

    return {
      uid: quiz[0].quiz?.uid,
      name: quiz[0].quiz?.name,
      startPage: quiz[0].quiz?.startPage,
      questionTitle: quiz[0].quiz?.questionTitle ?? undefined,
      question: questions,
      contact: contacts,
      thxPage: quiz[0]?.quiz_thx_page,
    };
  }

  /**
   * Увеличивает счетчик opened у квиза на 1
   */
  static async incrementQuizOpened(uid: string): Promise<void> {
    try {
      await db
        .update(quizTable)
        .set({ opened: sql`${quizTable.opened} + 1` })
        .where(eq(quizTable.uid, uid));

      logger.debug("Quiz opened counter incremented", { uid });
    } catch (error) {
      logger.error("Failed to increment quiz opened counter", error as Error, { uid });
      throw error;
    }
  }
}