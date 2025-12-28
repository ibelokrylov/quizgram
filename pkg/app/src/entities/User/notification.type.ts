import { z } from "zod";

export const notificationZod = z.object({
  telegram: z.boolean(),
  email: z.boolean(),
});

export type Notification = z.infer<typeof notificationZod>;
