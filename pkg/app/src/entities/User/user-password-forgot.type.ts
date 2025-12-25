import z from "zod";

export const userPasswordForgotZod = z.object({
	email: z.email(),
});

export const userPasswordForgotStartZod = z.object({
	code: z.string().length(6).regex(/^\d+$/, "Код должен содержать только цифры"),
	email: z.email(),
});

export const userPasswordForgotEndZod = z.object({
	code: z.string().length(6).regex(/^\d+$/, "Код должен содержать только цифры"),
	email: z.email(),
	password: z.string().min(8),
});

export type UserPasswordForgot = z.infer<typeof userPasswordForgotZod>;
export type UserPasswordForgotStart = z.infer<
	typeof userPasswordForgotStartZod
>;
export type UserPasswordForgotEnd = z.infer<typeof userPasswordForgotEndZod>;
