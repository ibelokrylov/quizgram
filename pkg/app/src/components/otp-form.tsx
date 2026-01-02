import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthContext } from "@/entities/User/auth.context";
import { userPasswordForgotZod } from "@/entities/User/user-password-forgot.type";
import { verificationEmailZod } from "@/entities/User/Verification.email.type";
import http from "@/lib/http";
import { getTranslatedError } from "@/lib/error-mapper";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState, useEffect, useRef, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const autoSubmitRef = useRef(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setIsAuth, setUser } = useContext(AuthContext);

  async function email() {
    if (code.length !== 6 || loading) return;

    setError(false);
    setLoading(true);
    autoSubmitRef.current = false;
    try {
      verificationEmailZod.parse({ code });
      await http({
        url: "/v1/user/verification-email",
        method: "POST",
        body: { code },
      });
      queryClinet.invalidateQueries({ queryKey: ["user"] });
      toast.success(t("verification.email.success") || "Email verified successfully");
    } catch (err: any) {
      setError(true);
      setLoading(false);
    }
  }

  async function password() {
    if (code.length !== 6 || loading) return;

    setError(false);
    setLoading(true);
    autoSubmitRef.current = false;
    try {
      if (!payload?.email) throw new Error("Email required");
      userPasswordForgotZod.parse({ code });
      await http({
        url: "/v1/auth/forgot-password/start",
        body: { code, email: payload?.email },
        method: "POST",
      });
      toast.success(t("forgot-password.code.success") || "Code verified successfully");
    } catch (err: any) {
      setError(true);
      setLoading(false);
    }
  }

  async function emailResend() {
    setError(false);
    setCode("");
    try {
      await http({ url: "/v1/user/resend-verification" });
      toast.success(t("verification.email.resendSuccess") || "Verification code sent");
    } catch (err: any) {
      const errorMessage = err?.error || err?.message || "error.unknown";
      const translatedError = getTranslatedError(errorMessage, t);
      toast.error(translatedError);
    }
  }

  async function passwordResend() {
    if (!payload?.email) throw new Error("Email required");
    setError(false);
    setCode("");
    try {
      await http({
        url: "/v1/auth/forgot-password",
        method: "POST",
        body: { login: payload.email },
      });
      toast.success(t("forgot-password.code.resendSuccess") || "Code sent");
    } catch (err: any) {
      const errorMessage = err?.error || err?.message || "error.unknown";
      const translatedError = getTranslatedError(errorMessage, t);
      toast.error(translatedError);
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

  function handleCodeChange(value: string) {
    setError(false);
    setCode(value);
    // Сбрасываем флаг автоматической отправки при изменении кода
    if (value.length < 6) {
      autoSubmitRef.current = false;
    }
  }

  // Автоматическая отправка при вводе всех 6 цифр
  useEffect(() => {
    if (code.length === 6 && !loading && !error && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      sendCode[formType]();
    }
  }, [code.length, loading, error, formType]);

  const handleLogout = async () => {
    try {
      await http({
        url: "/v1/auth/logout",
        method: "POST",
      });

      // Очищаем состояние аутентификации
      setIsAuth(false);
      setUser(undefined);

      // Очищаем sessionStorage
      sessionStorage.removeItem("userPlan");

      // Редирект на страницу входа
      navigate({ to: "/" });
    } catch (error) {
      console.error("Ошибка при выходе:", error);
      // Даже при ошибке очищаем состояние и делаем редирект
      setIsAuth(false);
      setUser(undefined);
      sessionStorage.removeItem("userPlan");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xs">
        <Card {...props}>
          <CardHeader>
            <CardTitle>{t(`verification.${formType}.title`)}</CardTitle>
            <CardDescription>{t(`verification.${formType}.description`)}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>{t(`verification.${formType}.code`)}</FieldLabel>
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={handleCodeChange}
                  pattern={REGEXP_ONLY_DIGITS}
                  aria-invalid={error}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </Field>
              <FieldGroup>
                <Button
                  onClick={sendCode[formType]}
                  disabled={code.length !== 6 || loading || error}
                  loading={loading}
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
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                {t("nav.user.logout")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
