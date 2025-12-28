import { z } from "zod";

export const loginUser = z.object({
  login: z.email(),
  password: z.string().min(8),
});

export type LoginUser = z.infer<typeof loginUser>;
