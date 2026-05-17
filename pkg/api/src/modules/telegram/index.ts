import { Elysia, t } from 'elysia';
import { logger } from '../../lib/logger';
import { CrmBotService } from '../../services/crm-bot.service';
import type { TelegramUpdate } from '../../services/quiz-bot.service';
import { QuizBotService } from '../../services/quiz-bot.service';

/**
 * Модуль для обработки webhook'ов от Telegram ботов
 */
export const telegram = new Elysia({ prefix: '/telegram' })
  // Webhook для CRM-бота
  .post(
    '/webhook/crm',
    async (ctx) => {
      try {
        // Логируем весь body для отладки
        logger.info('Получен webhook для CRM-бота', {
          body: ctx.body,
          headers: Object.fromEntries(ctx.request.headers.entries()),
        });

        const update = ctx.body as TelegramUpdate;

        if (!update || !update.update_id) {
          logger.warn('Получен некорректный webhook для CRM-бота', {
            body: ctx.body,
          });
          ctx.set.status = 400;
          return {
            ok: false,
            error: 'Invalid update format',
          };
        }

        logger.debug('Обработка webhook для CRM-бота', {
          updateId: update.update_id,
          hasMessage: !!update.message,
          hasCallbackQuery: !!update.callback_query,
          messageText: update.message?.text,
          callbackData: update.callback_query?.data,
        });

        await CrmBotService.handleUpdate(update);

        return { ok: true };
      } catch (error) {
        logger.error(
          'Ошибка при обработке webhook CRM-бота',
          error instanceof Error ? error : new Error(String(error)),
          {
            body: ctx.body,
          }
        );
        ctx.set.status = 500;
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        update_id: t.Number(),
        message: t.Optional(
          t.Object({
            message_id: t.Number(),
            chat: t.Object({
              id: t.Number(),
              first_name: t.Optional(t.String()),
              username: t.Optional(t.String()),
            }),
            text: t.Optional(t.String()),
          })
        ),
        callback_query: t.Optional(
          t.Object({
            id: t.String(),
            data: t.Optional(t.String()),
            message: t.Optional(
              t.Object({
                message_id: t.Number(),
                chat: t.Object({
                  id: t.Number(),
                  first_name: t.Optional(t.String()),
                  username: t.Optional(t.String()),
                }),
                text: t.Optional(t.String()),
              })
            ),
          })
        ),
      }),
      response: {
        200: t.Object({
          ok: t.Boolean(),
        }),
        500: t.Object({
          ok: t.Boolean(),
          error: t.String(),
        }),
      },
    }
  )
  // Webhook для квиз-бота
  .post(
    '/webhook/quiz',
    async (ctx) => {
      try {
        // Логируем весь body для отладки
        logger.info('Получен webhook для квиз-бота', {
          body: ctx.body,
          headers: Object.fromEntries(ctx.request.headers.entries()),
        });

        const update = ctx.body as TelegramUpdate;

        if (!update || !update.update_id) {
          logger.warn('Получен некорректный webhook для квиз-бота', {
            body: ctx.body,
          });
          ctx.set.status = 400;
          return {
            ok: false,
            error: 'Invalid update format',
          };
        }

        logger.debug('Обработка webhook для квиз-бота', {
          updateId: update.update_id,
          hasMessage: !!update.message,
          messageText: update.message?.text,
        });

        await QuizBotService.handleUpdate(update);

        return { ok: true };
      } catch (error) {
        logger.error(
          'Ошибка при обработке webhook квиз-бота',
          error instanceof Error ? error : new Error(String(error)),
          {
            body: ctx.body,
          }
        );
        ctx.set.status = 500;
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        update_id: t.Number(),
        message: t.Optional(
          t.Object({
            message_id: t.Number(),
            chat: t.Object({
              id: t.Number(),
              first_name: t.Optional(t.String()),
              username: t.Optional(t.String()),
            }),
            text: t.Optional(t.String()),
          })
        ),
      }),
      response: {
        200: t.Object({
          ok: t.Boolean(),
        }),
        500: t.Object({
          ok: t.Boolean(),
          error: t.String(),
        }),
      },
    }
  );
