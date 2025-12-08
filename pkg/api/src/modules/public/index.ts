import Elysia, { t } from "elysia";
import { logger } from '../../lib/logger';
import { SessionService } from '../../services/session.service';
import { publicQuiz } from './models';
import { PublicService } from './service';

export const publicModule = new Elysia({ prefix: "/public" })
  .get("/quiz/:uid", async (ctx) => {
    const { uid } = ctx.params;
    const bidToken = ctx.cookie.bidToken?.value;

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

    // Увеличиваем счетчик opened, если нужно
    if (shouldIncrementOpened) {
      try {
        await PublicService.incrementQuizOpened(uid);
      } catch (error) {
        logger.error("Failed to increment quiz opened", error as Error, { uid });
      }
    }

    // Возвращаем квиз
    const quiz = await PublicService.getQuizByUid(uid);
    return {
      data: quiz,
    };
  }, {
    params: t.Object({
      uid: t.String(),
    }),
    response: {
      200: t.Object({
        data: publicQuiz,
      }),
      400: t.Object({
        message: t.String(),
        error: t.String(),
      })
    },
  });