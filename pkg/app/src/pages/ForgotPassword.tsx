import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	finalForgotPassword,
	firstStepForgotPassword,
	startForgotPassword,
} from "@/entities/ForgotPassword/forgot-password.type";
import { AuthContext } from '@/entities/User/auth.context';
import http from "@/lib/http";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const st = {
	login: "login",
	code: "code",
	password: "password",
};

type Data = "login" | "code" | "password" | "confirmPassword";

export const ForgotPassword = ({
	className,
	...props
}: React.ComponentProps<"div">) => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const {user} = useContext(AuthContext);

	if (user) {
		navigate({ to: "/" });
	}

	const [stage, setStage] = useState<keyof typeof st>("login");
	const [data, setData] = useState<{
		login: string;
		code?: string;
		password?: string;
		confirmPassword?: string;
	}>({ login: "" });
	const [error, setError] = useState<Record<string, boolean> | undefined>(
		undefined,
	);
	const [loading, setLoading] = useState(false);

	async function sendData() {
		setLoading(true);
		try {
			let body = {};
			let err = {};
			let url = "/v1/auth/forgot-password";
			let nextStage: keyof typeof st | null = null;
			switch (stage) {
				case "login": {
					body = { login: data.login };
					nextStage = "code";
					const { success } = firstStepForgotPassword.safeParse(body);
					if (!success) err = { ...(error ?? {}), login: true };
					break;
				}
				case "code": {
					body = { email: data.login, code: data.code };
					url = "/v1/auth/forgot-password/start";
					nextStage = "password";
					const { success } = startForgotPassword.safeParse(body);
					if (!success) err = { ...(error ?? {}), code: true };
					break;
				}
				case "password": {
					body = {
						email: data.login,
						code: data.code,
						password: data.password,
					};
					url = "/v1/auth/forgot-password/end";
					const { success } = finalForgotPassword.safeParse(body);
					if (!success) err = { ...(error ?? {}), password: true };
					else {
						if (data.password !== data?.confirmPassword)
							err = {
								...(error ?? {}),
								password: true,
								confirmPassword: true,
							};
					}
					break;
				}
				default:
					break;
			}
			if (Object.keys(err).length !== 0) {
				setLoading(false);
				setError(err);
				return;
			}
			console.log(err);
			await http({ url, method: "POST", body });
			setLoading(false);
			if (nextStage) setStage(nextStage);
			else {
				toast.success(t("forgot-password.success"));
				navigate({ to: "/" });
			}
		} catch (err) {
			setLoading(false);
			console.log(err);
		}
	}

	function change(value: string, type: Data) {
		if (error && Object.keys(error).length) {
			const oldErr = { ...error };
			if (type === "confirmPassword") {
				delete oldErr.password;
			}
			if (type === "password") {
				delete oldErr.confirmPassword;
			}
			delete oldErr[type];
			if (Object.keys(oldErr).length === 0) {
				setError(undefined);
			} else setError(oldErr);
		}

		setData({ ...data, [type]: value });
	}

	function reset() {
		setData({ login: data.login });
		setError(undefined);
		setLoading(false);
		setStage("login");
	}

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<div className={cn("flex flex-col gap-6", className)} {...props}>
					<Card>
						<CardHeader>{t("forgot-password.title")}</CardHeader>
						<CardContent>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="email">
										{t("forgot-password.login.label")}
									</FieldLabel>
									<Input
										id="email"
										type="email"
										placeholder={t("forgot-password.login.placeholder")}
										onChange={(e) => change(e.target.value, "login")}
										aria-invalid={error?.login}
										disabled={stage !== "login"}
									/>
								</Field>
								{stage === "code" || stage === "password" ? (
									<Field>
										<FieldLabel htmlFor="code">
											{t("forgot-password.code.label")}
										</FieldLabel>
										<Input
											id="code"
											type="text"
											onChange={(e) => change(e.target.value, "code")}
											disabled={stage !== "code"}
											aria-invalid={error?.code}
										/>
									</Field>
								) : null}
								{stage === "password" ? (
									<>
										<Field>
											<FieldLabel htmlFor="password">
												{t("forgot-password.password.label")}
											</FieldLabel>
											<Input
												id="password"
												type="password"
												onChange={(e) => change(e.target.value, "password")}
												aria-invalid={error?.password}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor="password-confirm">
												{t("forgot-password.password-confirm.label")}
											</FieldLabel>
											<Input
												id="password-confirm"
												type="password"
												aria-invalid={error?.confirmPassword}
												onChange={(e) =>
													change(e.target.value, "confirmPassword")
												}
											/>
										</Field>
									</>
								) : null}
								<Field>
									<Button
										disabled={loading || error !== undefined}
										onClick={sendData}
									>
										{t("forgot-password.button")}
									</Button>
								</Field>
							</FieldGroup>
						</CardContent>
						<CardFooter>
							<div className="flex flex-col gap-2 justify-center items-center w-full">
								<div className="text-xs text-gray-400 text-center">
									{t("forgot-password.description")}
								</div>
								<Link to="/">
									<Button variant={"link"}>{t("forgot-password.goto")}</Button>
								</Link>
								<Button onClick={reset} variant={"ghost"}>
									{t("forgot-password.start-now")}
								</Button>
							</div>
						</CardFooter>
					</Card>
				</div>
			</div>
		</div>
	);
};
