import { Elysia, t } from 'elysia';
import { User } from 'pkg-types';
import { ErrorType } from '../../type/error.type';
import { AuthService } from '../auth/service';
import { AdminService } from './service';

export const adminRoute = new Elysia({ prefix: '/admin' }).guard(
  {
    async beforeHandle(ctx) {
      if (!ctx.cookie.token.value) {
        ctx.set.status = 401;
        return { message: 'Unauthorized' };
      } else {
        const user = await AuthService.getUserFromToken(ctx.cookie.token.value.toString());
        if (!user?.isAdmin) return { message: 'User not admin' };
      }
    },
  },
  (app) =>
    app.get(
      '/users',
      async (ctx) => {
        const { limit, offset } = ctx.query;
        const user = await AdminService.getAllUsers(limit ? +limit : 10, offset ? +offset - 1 : 0);

        return {
          message: 'ok',
          data: user,
        };
      },
      {
        response: {
          200: t.Object({ message: t.String(), data: t.Array(t.Omit(User, ['password'])) }),
          401: ErrorType,
          500: ErrorType,
          404: ErrorType,
        },
        query: t.Object({
          limit: t.Optional(t.Number()),
          offset: t.Optional(t.Number()),
        }),
      }
    )
);
