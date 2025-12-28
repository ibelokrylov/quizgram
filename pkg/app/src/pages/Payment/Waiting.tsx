import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/loader";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const PaymentWaitingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/payment/waiting" }) as {
    paymentId?: number;
  };

  const [status] = useState<"waiting" | "success" | "failed">("waiting");
  const [checking, setChecking] = useState(false);

  // Проверяем статус оплаты периодически
  useEffect(() => {
    if (!search.paymentId || status !== "waiting") {
      return;
    }

    const checkPaymentStatus = async () => {
      setChecking(true);
      try {
        // Здесь можно добавить endpoint для проверки статуса платежа
        // Пока просто ждём webhook
        // В реальности можно сделать polling или websocket
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error("Ошибка при проверке статуса платежа", error);
      } finally {
        setChecking(false);
      }
    };

    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [search.paymentId, status]);

  const handleBack = () => {
    navigate({ to: "/app/payment" });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t("payment.waiting.title")}</CardTitle>
          <CardDescription>{t("payment.waiting.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "waiting" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader />
              <p className="text-sm text-muted-foreground text-center">
                {checking ? t("payment.waiting.checking") : t("payment.waiting.description")}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-center">{t("payment.waiting.success")}</p>
            </div>
          )}

          {status === "failed" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-center text-red-500">
                {t("payment.waiting.failed")}
              </p>
            </div>
          )}

          <Button onClick={handleBack} variant="outline" className="w-full">
            {t("payment.waiting.back")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
