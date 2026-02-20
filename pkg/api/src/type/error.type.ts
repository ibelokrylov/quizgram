import { t } from 'elysia';

export const ErrorType = t.Object({
  message: t.String(),
  error: t.Any(),
});

export type ErrorType = typeof ErrorType.static;
