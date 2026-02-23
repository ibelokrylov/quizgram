import z from 'zod';

export const firstStepForgotPassword = z.object({
  login: z.email(),
});

export const startForgotPassword = z.object({
  email: z.email(),
  code: z.string().length(6).regex(/^\d+$/, 'Код должен содержать только цифры'),
});

export const finalForgotPassword = z.object({
  email: z.email(),
  code: z.string().length(6).regex(/^\d+$/, 'Код должен содержать только цифры'),
  password: z.string().min(8),
});
