import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	userPasswordForgotStartZod,
	userPasswordForgotZod,
} from "@/entities/User/user-password-forgot.type";
import { verificationEmailZod } from "@/entities/User/Verification.email.type";
import http from "@/lib/http";
import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { queryClinet } from "@/app/query-client";

type FormType = "email" | "password";

export function OTPForm({
	formType = "email",
	payload = undefined,
	...props
}: React.ComponentProps<typeof Card> & {
	formType: FormType;
	payload?: Record<string, never>;
}) {
	const [code, setCode] = useState("");
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(false);

	const { t } = useTranslation();

	async function email() {
		setError(false);
		setLoading(true);
		try {
			verificationEmailZod.parse({ code });
			await http({
				url: "/v1/user/verification-email",
				method: "POST",
				body: { code },
			});
			queryClinet.invalidateQueries({ queryKey: ["user"] });
		} catch (err) {
			console.log(err);
			setError(true);
			setLoading(false);
		}
	}

	async function password() {
		setError(false);
		setLoading(true);
		try {
			if (!payload?.email) throw new Error("Email required");
			userPasswordForgotZod.parse({ code });
			await http({
				url: "/v1/auth/forgot-password/start",
				body: { code, email: payload?.email },
				method: "POST",
			});
		} catch (err) {
			console.log(err);
			setError(true);
			setLoading(false);
		}
	}

	async function emailResend() {
		setError(false);
		setCode("");
		try {
			await http({ url: "/v1/user/resend-verification" });
			toast.success("OK");
		} catch (err) {
			console.log(err);
			toast.error("some error");
		}
	}

	async function passwordResend() {
		if (!payload?.email) throw new Error("Email required");
		try {
			userPasswordForgotStartZod.parse({ code, login: payload.email });
			await http({
				url: "/v1/auth/forgot-password",
				method: "POST",
				body: { login: payload.email },
			});
			setLoading(false);
		} catch (err) {
			console.log(err);
			setLoading(false);
		}
	}

	const resend: Record<FormType, () => void> = {
		email: emailResend,
		password: passwordResend,
	};

	const sendCode: Record<FormType, () => void> = {
		email: email,
		password: password,
	};

	function change(e: ChangeEvent<HTMLInputElement>) {
		setError(false);
		setCode(e.target.value);
	}

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-xs">
				<Card {...props}>
					<CardHeader>
						<CardTitle>{t(`verification.${formType}.title`)}</CardTitle>
						<CardDescription>
							{t(`verification.${formType}.description`)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="otp">
									{t(`verification.${formType}.code`)}
								</FieldLabel>
								<Input value={code} aria-invalid={error} onChange={change} />
							</Field>
							<FieldGroup>
								<Button
									onClick={sendCode[formType]}
									disabled={code.length === 0 || loading}
								>
									{t(`verification.${formType}.button`)}
								</Button>
								<FieldDescription className="text-center">
									<Button variant={"link"} onClick={resend[formType]}>
										{t(`verification.${formType}.resend`)}
									</Button>
								</FieldDescription>
							</FieldGroup>
						</FieldGroup>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
