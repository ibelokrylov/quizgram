import { Button } from "@/components/ui/button";
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
  planNameRaw?: string; // Оригинальное имя плана (для проверки Pro+)
  selectedUpLimitId?: number | null; // Выбранный upLimit (передаётся с страницы Payment)
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
  const { query: upLimitsQuery } = useUpLimits();
  const { query: userPlanQuery } = useUserPlan();

  const isProPlus = planNameRaw === "PRO_PLUS";
  const isFreePlan = planPrice === 0;

  // Рассчитываем итоговую цену
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

  // Проверяем, является ли выбранный план понижением (дешевле текущего)
  const isDowngrade = React.useMemo(() => {
    if (!userPlanQuery.data) return false;

    const currentPlanPrice = userPlanQuery.data.price;

    // Если выбранный план дешевле текущего - это понижение
    // Бесплатный план всегда считается понижением, если текущий платный
    return totalPrice < currentPlanPrice || (isFreePlan && currentPlanPrice > 0);
  }, [userPlanQuery.data, totalPrice, isFreePlan]);

  const handleFreePlan = async () => {
    setIsCreating(true);
    try {
      const response = await http<{ planId: number; planName: string }>({
        url: `/v1/payment/${planId}`,
        method: "POST",
      });

      if (response.data) {
        // Закрываем Drawer
        onOpenChange(false);

        // Обновляем кэш пользователя и плана
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

  const handleCryptoPay = async () => {
    setIsCreating(true);
    try {
      const response = await http<{ paymentId: number; invoiceUrl: string }>({
        url: `/v1/payment/${planId}/create`,
        method: "POST",
        body:
          isProPlus && selectedUpLimitId !== null && selectedUpLimitId !== undefined
            ? { upLimitId: selectedUpLimitId }
            : undefined,
      });

      if (response.data) {
        // Закрываем Drawer
        onOpenChange(false);

        // Если invoiceUrl пустой (dev-режим), план уже обновлён
        if (!response.data.invoiceUrl || response.data.invoiceUrl === "") {
          // Обновляем кэш пользователя и плана
          queryClient.invalidateQueries({ queryKey: ["user-plan"] });
          queryClient.invalidateQueries({ queryKey: ["user"] });
          queryClient.invalidateQueries({ queryKey: ["plans"] });

          toast.success(t("payment.success", { plan: planName }));
        } else {
          // Production: редиректим на страницу оплаты
          window.location.href = response.data.invoiceUrl;
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("payment.create.error"));
    } finally {
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
        <div className="p-4 space-y-4">
          {isDowngrade && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t("payment.downgrade.warning")}
              </p>
            </div>
          )}
          {isFreePlan ? (
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
          ) : (
            <>
              <Button onClick={handleCryptoPay} disabled={isCreating} className="w-full" size="lg">
                {isCreating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    {t("payment.waiting.checking")}
                  </>
                ) : (
                  <>
                    {t("payment.method.crypto_pay")} {isProPlus && `(${totalPrice} ₽)`}
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {t("payment.method.crypto_pay.description")}
              </p>
            </>
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
