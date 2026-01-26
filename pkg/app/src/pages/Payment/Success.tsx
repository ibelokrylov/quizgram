import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/loader";
import http from "@/lib/http";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

export const PaymentSuccessPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "pending" | "paid" | "failed">("loading");
  const [paymentId, setPaymentId] = useState<number | null>(null);

  useEffect(() => {
    const storedPaymentId = localStorage.getItem("pendingPaymentId");

    if (!storedPaymentId) {
      setStatus("failed");
      return;
    }

    const pid = Number(storedPaymentId);
    if (isNaN(pid)) {
      localStorage.removeItem("pendingPaymentId");
      setStatus("failed");
      return;
    }

    setPaymentId(pid);

    const checkPaymentStatus = async () => {
      try {
        const response = await http<{
          id: number;
          status: string;
          amount: number;
          currency: string;
          createdAt: string;
          updatedAt: string;
        }>({
          url: `/v1/payment/status/${pid}`,
        });

        if (response.data) {
          const { status: paymentStatus } = response.data;

          if (paymentStatus === "paid") {
            setStatus("paid");
            localStorage.removeItem("pendingPaymentId");
            queryClient.invalidateQueries({ queryKey: ["user"] });
            queryClient.invalidateQueries({ queryKey: ["user-plan"] });
          } else if (["failed", "expired", "underpaid"].includes(paymentStatus)) {
            setStatus("failed");
            localStorage.removeItem("pendingPaymentId");
          } else {
            setStatus("pending");
          }
        }
      } catch (error) {
        console.error("Ошибка при проверке статуса платежа", error);
        setStatus("failed");
        localStorage.removeItem("pendingPaymentId");
      }
    };

    checkPaymentStatus();

    const interval = setInterval(checkPaymentStatus, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleGoToApp = () => {
    navigate({ to: "/app" });
  };

  const handleBackToPayment = () => {
    navigate({ to: "/app/payment" });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "pending" && paymentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500">
              <Loader className="h-6 w-6 text-white" />
            </div>
            <CardTitle>{t("payment.waiting.title")}</CardTitle>
            <CardDescription>{t("payment.waiting.checking")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBackToPayment} className="w-full">
              {t("payment.waiting.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
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
            <CardTitle>{t("payment.result.success.title")}</CardTitle>
            <CardDescription>{t("payment.result.success.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoToApp} className="w-full">
              {t("payment.result.success.button")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500">
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
          <CardTitle>{t("payment.result.failure.title")}</CardTitle>
          <CardDescription>{t("payment.result.failure.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackToPayment} variant="outline" className="w-full">
            {t("payment.result.failure.button")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
