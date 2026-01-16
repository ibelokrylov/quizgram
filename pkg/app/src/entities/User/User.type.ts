import { z } from "zod";

export const userZod = z.object({
  uid: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  login: z.email(),
  isVerification: z.boolean(),
  name: z.string(),
  planId: z.number(),
  language: z.string().optional(),
  telegramId: z.string().nullable().optional(),
  isAdmin: z.boolean(),
});

export type User = z.infer<typeof userZod>;

export const userRegistrationZod = z.object({
  login: z.email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
  name: z.string(),
  referralCode: z.string().optional(),
});
export type UserRegistration = z.infer<typeof userRegistrationZod>;

// Тип плана пользователя
export const userPlanZod = z.object({
  id: z.number(),
  name: z.string(), // "FREE" или "BASE"
  price: z.number(),
  bidMonthLimit: z.number(),
});
export type UserPlan = z.infer<typeof userPlanZod>;
