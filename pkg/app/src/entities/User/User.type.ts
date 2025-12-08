import { z } from 'zod';

export const userZod = z.object({
  uid: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  login: z.email(),
  isVerification: z.boolean(),
  name: z.string(),
  planId: z.number(),
  // referral_id: z.number(),
});

export type User = z.infer<typeof userZod>;

export const userRegistrationZod = z.object({
  login: z.email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
  name: z.string(),
});
export type UserRegistration = z.infer<typeof userRegistrationZod>;
