import z from "zod";

export const verificationEmailZod = z.object({
	code: z.string().min(10),
});

export type VerificationEmail = z.infer<typeof verificationEmailZod>;
