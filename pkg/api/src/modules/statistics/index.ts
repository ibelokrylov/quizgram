// Контроллер статистики — обрабатывает HTTP-запросы для получения статистики по квизам

import { Elysia, t } from 'elysia';
import type { User } from '../../db';
import { logger } from '../../lib/logger';
import { AuthService } from '../auth/service';
import { StatisticsModel } from './model';
import { StatisticsService } from './service';

export const statistics = new Elysia({ prefix: '/statistics' })
  .state('user', null as User | null)
  .guard(
    {
      async beforeHandle(ctx) {
        // Проверяем авторизацию
        if (!ctx.cookie.token.value) {
          ctx.set.status = 401;
          return { message: 'Unauthorized' };
        }

        // Получаем пользователя из токена
        const user = await AuthService.getUserFromToken(ctx.cookie.token.value.toString());
        ctx.store.user = (user || null) as User | null;

        // Проверяем, что пользователь платный (planId > 1) или админ
        if (!user || (user.planId <= 1 && !user.isAdmin)) {
          ctx.set.status = 403;
          return {
            message: 'Forbidden',
            error: 'This feature is only available for paid users',
          };
        }
      },
    },
    (app) =>
      app
        // Получить общую статистику по дням
        .get(
          '/daily',
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: 'Unauthorized' };
            }

            const { query, set } = ctx;

            try {
              const response = await StatisticsService.getDailyStats(query);
              return {
                message: 'ok',
                data: response,
              };
            } catch (error) {
              logger.error(
                'Ошибка при получении общей статистики',
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quiz_uid: query.quiz_uid }
              );

              set.status = 400;
              return {
                message: 'get-daily-stats@error',
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
          {
            query: StatisticsModel.queryParams,
            response: {
              200: t.Object({
                message: t.String(),
                data: StatisticsModel.dailyStatsResponse,
              }),
              400: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
              401: t.Object({
                message: t.String(),
              }),
              403: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
            },
          }
        )
        // Получить статистику по незавершенным квизам
        .get(
          '/abandonment',
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: 'Unauthorized' };
            }

            const { query, set } = ctx;

            try {
              const response = await StatisticsService.getAbandonmentStats(query);
              return {
                message: 'ok',
                data: response,
              };
            } catch (error) {
              logger.error(
                'Ошибка при получении статистики по незавершенным квизам',
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quiz_uid: query.quiz_uid }
              );

              set.status = 400;
              return {
                message: 'get-abandonment-stats@error',
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
          {
            query: StatisticsModel.queryParams,
            response: {
              200: t.Object({
                message: t.String(),
                data: StatisticsModel.abandonmentStatsResponse,
              }),
              400: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
              401: t.Object({
                message: t.String(),
              }),
              403: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
            },
          }
        )
        // Очистить кеш статистики (опционально, для администрирования)
        .delete(
          '/cache',
          async (ctx) => {
            const user: User | null = ctx.store.user;
            if (!user) {
              ctx.set.status = 401;
              return { message: 'Unauthorized' };
            }

            const { query } = ctx;

            try {
              StatisticsService.clearCache(query.quiz_uid);

              return {
                message: 'ok',
                data: {
                  cleared: query.quiz_uid ? 'specific' : 'all',
                },
              };
            } catch (error) {
              logger.error(
                'Ошибка при очистке кеша статистики',
                error instanceof Error ? error : new Error(String(error)),
                { userId: user.id, quiz_uid: query.quiz_uid }
              );

              ctx.set.status = 400;
              return {
                message: 'clear-cache@error',
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
          {
            query: t.Object({
              quiz_uid: t.Optional(t.String()),
            }),
            response: {
              200: t.Object({
                message: t.String(),
                data: t.Object({
                  cleared: t.String(),
                }),
              }),
              400: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
              401: t.Object({
                message: t.String(),
              }),
              403: t.Object({
                message: t.String(),
                error: t.Optional(t.String()),
              }),
            },
          }
        )
  );
