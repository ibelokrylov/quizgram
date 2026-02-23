import z from 'zod';

export const verificationEmailZod = z.object({
  code: z.string().length(6).regex(/^\d+$/, 'Код должен содержать только цифры'),
});

export type VerificationEmail = z.infer<typeof verificationEmailZod>;
