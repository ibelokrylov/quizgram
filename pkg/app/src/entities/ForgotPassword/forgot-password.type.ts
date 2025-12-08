import z from "zod";

export const firstStepForgotPassword = z.object({
	login: z.email(),
});

export const startForgotPassword = z.object({
	email: z.email(),
	code: z.string().min(36).max(36),
});

export const finalForgotPassword = z.object({
	email: z.email(),
	code: z.string().min(36).max(36),
	password: z.string().min(8),
});
