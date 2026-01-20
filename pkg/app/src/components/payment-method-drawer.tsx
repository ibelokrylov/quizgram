import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Loader } from "@/components/loader";
import { useUpLimits } from "@/entities/User/useUpLimits";
import { useUserPlan } from "@/entities/User/useUserPlan";
import http from "@/lib/http";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

interface PaymentMethodDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  planName: string;
  planPrice: number;
  planNameRaw?: string;
  selectedUpLimitId?: number | null;
}

export const PaymentMethodDrawer = ({
  open,
  onOpenChange,
  planId,
  planName,
  planPrice,
  planNameRaw,
  selectedUpLimitId,
}: PaymentMethodDrawerProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [agreedToPayment, setAgreedToPayment] = React.useState(false);
  const { query: upLimitsQuery } = useUpLimits();
  const { query: userPlanQuery } = useUserPlan();

  const isProPlus = planNameRaw === "PRO_PLUS";
  const isFreePlan = planPrice === 0;

  const totalPrice = React.useMemo(() => {
    if (
      isProPlus &&
      selectedUpLimitId !== null &&
      selectedUpLimitId !== undefined &&
      upLimitsQuery.data
    ) {
      const selectedUpLimit = upLimitsQuery.data.find((ul) => ul.id === selectedUpLimitId);
      if (selectedUpLimit) {
        return planPrice + selectedUpLimit.price;
      }
    }
    return planPrice;
  }, [isProPlus, selectedUpLimitId, planPrice, upLimitsQuery.data]);

  const isDowngrade = React.useMemo(() => {
    if (!userPlanQuery.data) return false;

    const currentPlanPrice = userPlanQuery.data.price;

    return totalPrice < currentPlanPrice || (isFreePlan && currentPlanPrice > 0);
  }, [userPlanQuery.data, totalPrice, isFreePlan]);

  const canPay = agreedToTerms && agreedToPayment && !isFreePlan;

  const bidLimit = React.useMemo(() => {
    if (isProPlus && selectedUpLimitId && upLimitsQuery.data) {
      const selectedUpLimit = upLimitsQuery.data.find((ul) => ul.id === selectedUpLimitId);
      if (selectedUpLimit) {
        return 200 + selectedUpLimit.bid;
      }
    }
    if (isProPlus) return 200;
    if (isFreePlan) return 10;
    return 100;
  }, [isProPlus, selectedUpLimitId, upLimitsQuery.data, isFreePlan]);

  const serviceName = React.useMemo(() => {
    if (isProPlus && selectedUpLimitId && upLimitsQuery.data) {
      const selectedUpLimit = upLimitsQuery.data.find((ul) => ul.id === selectedUpLimitId);
      if (selectedUpLimit) {
        return t("payment.drawer.service_name.pro_plus", { limit: bidLimit });
      }
    }
    if (isProPlus) {
      return t("payment.drawer.service_name.pro_plus", { limit: 200 });
    }
    if (!isFreePlan) {
      return t("payment.drawer.service_name.pro");
    }
    return "";
  }, [isProPlus, selectedUpLimitId, upLimitsQuery.data, bidLimit, isFreePlan, t]);

  const handleFreePlan = async () => {
    setIsCreating(true);
    try {
      const response = await http<{ planId: number; planName: string }>({
        url: `/v1/payment/${planId}`,
        method: "POST",
      });

      if (response.data) {
        onOpenChange(false);

        queryClient.invalidateQueries({ queryKey: ["user-plan"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["plans"] });

        const displayPlanName = planName;
        toast.success(t("payment.success", { plan: displayPlanName }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("payment.error"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreatePayment = async () => {
    setIsCreating(true);
    try {
      const response = await http<{
        paymentId: number;
        paymentUrl: string;
      }>({
        url: "/v1/payment/create",
        method: "POST",
        body: {
          planId,
          upLimitId: selectedUpLimitId ?? undefined,
        },
      });

      if (response.data) {
        const { paymentId, paymentUrl } = response.data;

        localStorage.setItem("pendingPaymentId", paymentId.toString());

        window.location.href = paymentUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("payment.create.error"));
      setIsCreating(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {isFreePlan ? t("payment.confirm.title") : t("payment.method.select")}
          </DrawerTitle>
          <DrawerDescription>
            {isFreePlan
              ? t("payment.confirm.description", { plan: planName })
              : `${t("payment.method.select")} для тарифа ${planName}`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {isDowngrade && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t("payment.downgrade.warning")}
              </p>
            </div>
          )}

          {!isFreePlan && (
            <>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t("payment.drawer.info.plan")}</span>
                  <span className="text-sm font-semibold">{planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t("payment.drawer.info.price")}</span>
                  <span className="text-sm font-semibold">
                    {totalPrice} ₽ / {t("payment.drawer.info.per_month")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t("payment.drawer.info.limit")}</span>
                  <span className="text-sm font-semibold">{bidLimit}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms-agreement"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <label htmlFor="terms-agreement" className="text-sm leading-tight cursor-pointer">
                    {t("payment.drawer.agreement.checkbox1")}{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      {t("payment.drawer.agreement.terms")}
                    </a>{" "}
                    и{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      {t("payment.drawer.agreement.privacy")}
                    </a>
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="payment-agreement"
                    checked={agreedToPayment}
                    onCheckedChange={(checked) => setAgreedToPayment(checked === true)}
                  />
                  <label
                    htmlFor="payment-agreement"
                    className="text-sm leading-tight cursor-pointer"
                  >
                    {t("payment.drawer.agreement.checkbox2", {
                      price: totalPrice,
                      serviceName,
                    })}
                  </label>
                </div>

                {!canPay && (agreedToTerms || agreedToPayment) && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t("payment.drawer.agreement.required")}
                  </p>
                )}
              </div>

              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleCreatePayment}
                  disabled={!canPay || isCreating}
                  className="w-full max-w-md"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader className="mr-2 h-4 w-4" />
                      {t("payment.processing")}
                    </>
                  ) : (
                    t("payment.drawer.pay_button")
                  )}
                </Button>
              </div>
            </>
          )}

          {isFreePlan && (
            <div className="flex justify-center">
              <Button onClick={handleFreePlan} disabled={isCreating} className="w-full" size="lg">
                {isCreating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    {t("payment.processing")}
                  </>
                ) : (
                  t("payment.confirm.button")
                )}
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{t("resizeImage.cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
