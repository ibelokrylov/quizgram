import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { verificationEmailZod } from "@/entities/User/Verification.email.type";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import http from "@/lib/http";
import { queryClinet } from "@/app/query-client";

type EmailVerificationProps = {
  onSuccess: () => void;
  onResend?: () => Promise<void>;
};

export function EmailVerification({ onSuccess, onResend }: EmailVerificationProps) {
  const { t } = useTranslation("common");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError(false);

    // Автоматическая отправка при вводе 6 цифр
    if (value.length === 6) {
      handleSubmit(value);
    }
  };

  const handleSubmit = async (codeValue?: string) => {
    const codeToSubmit = codeValue || code;
    if (codeToSubmit.length !== 6 || loading) return;

    setError(false);
    setLoading(true);

    try {
      // Валидация кода
      verificationEmailZod.parse({ code: codeToSubmit });

      // Отправка запроса на верификацию
      await http({
        url: "/v1/user/verification-email",
        method: "POST",
        body: { code: codeToSubmit },
      });

      // Инвалидируем кэш пользователя
      queryClinet.invalidateQueries({ queryKey: ["user"] });

      toast.success(t("verification.email.success"));
      onSuccess();
    } catch (err: any) {
      setError(true);
      setLoading(false);
      const errorMessage = err?.message || err?.error || t("telegram.auth.verification.error");
      toast.error(errorMessage);
    }
  };

  const handleResend = async () => {
    if (resendLoading || loading) return; // Предотвращаем отправку во время загрузки

    setResendLoading(true);
    setCode("");
    setError(false);

    try {
      if (onResend) {
        await onResend();
      } else {
        // Запрос на повторную отправку кода
        await http({
          url: "/v1/user/resend-verification",
          method: "GET",
        });
      }
      toast.success(t("verification.email.resendSuccess"));
    } catch (err: any) {
      const errorMessage =
        err?.message || err?.error || t("telegram.auth.verification.resendError");
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("telegram.auth.verification.title")}</CardTitle>
        <CardDescription>{t("telegram.auth.verification.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>{t("telegram.auth.verification.code")}</FieldLabel>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              pattern={REGEXP_ONLY_DIGITS}
              aria-invalid={error}
              disabled={loading}
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
              onClick={() => handleSubmit()}
              disabled={code.length !== 6 || loading || error}
              loading={loading}
              className="w-full"
            >
              {t("telegram.auth.verification.button")}
            </Button>
            <FieldDescription className="text-center">
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resendLoading}
                loading={resendLoading}
              >
                {t("telegram.auth.verification.resend")}
              </Button>
            </FieldDescription>
          </FieldGroup>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
