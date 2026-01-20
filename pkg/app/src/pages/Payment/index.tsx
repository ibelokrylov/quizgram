import { Loader } from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentMethodDrawer } from "@/components/payment-method-drawer";
import { usePlans } from "@/entities/User/usePlans";
import { useUpLimits } from "@/entities/User/useUpLimits";
import { useUserPlan } from "@/entities/User/useUserPlan";
import http from "@/lib/http";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const PaymentPage = () => {
  const { t } = useTranslation();
  const { query } = usePlans();
  const { query: userPlanQuery } = useUserPlan();
  const { query: upLimitsQuery } = useUpLimits();
  const queryClient = useQueryClient();
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    id: number;
    name: string;
    price: number;
  } | null>(null);
  const [selectedUpLimitId, setSelectedUpLimitId] = useState<number | null>(null);
  const [initialUpLimitSet, setInitialUpLimitSet] = useState(false);

  // Форматируем название плана для отображения
  const getDisplayPlanName = (planName: string) => {
    if (planName === "FREE") {
      return t("plans.price.free");
    }
    if (planName === "BASE") {
      return "Pro";
    }
    if (planName === "PRO_PLUS") {
      return "Pro+";
    }
    return planName;
  };

  // Устанавливаем текущий вариант Pro+ по умолчанию на основе плана пользователя
  useEffect(() => {
    if (
      !initialUpLimitSet &&
      userPlanQuery.data &&
      userPlanQuery.data.name === "PRO_PLUS" &&
      upLimitsQuery.data &&
      upLimitsQuery.data.length > 0
    ) {
      // Определяем, какой upLimit соответствует текущему bidMonthLimit пользователя
      const currentLimit = userPlanQuery.data.bidMonthLimit; // 5000
      const baseLimit = 200; // Базовый лимит Pro+
      const additionalBids = currentLimit - baseLimit; // 4800

      if (additionalBids > 0) {
        // Ищем upLimit с соответствующим количеством дополнительных заявок
        const matchingUpLimit = upLimitsQuery.data.find((ul) => ul.bid === additionalBids);
        if (matchingUpLimit) {
          setSelectedUpLimitId(matchingUpLimit.id);
        } else {
          // Если не нашли точное совпадение, оставляем базовый вариант (null)
          setSelectedUpLimitId(null);
        }
      } else {
        // Базовый вариант (null) для 200 заявок
        setSelectedUpLimitId(null);
      }
      setInitialUpLimitSet(true);
    }
  }, [userPlanQuery.data, upLimitsQuery.data, initialUpLimitSet]);

  const handleCancelSubscription = async () => {
    try {
      const response = await http<{ planId: number; planName: string }>({
        url: "/v1/payment/cancel-subscription",
        method: "POST",
      });

      if (response.data) {
        toast.success(t("payment.cancel_subscription.success"));
        setShowCancelDialog(false);
        queryClient.invalidateQueries({ queryKey: ["user-plan"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("payment.error"));
    }
  };

  const handlePlanSelect = async (planId: number) => {
    if (!query.data) {
      return;
    }

    const plan = query.data.find((p) => p.id === planId);
    if (!plan) {
      return;
    }

    // Проверяем, является ли выбранный вариант текущим
    if (isCurrentVariant(plan)) {
      return;
    }

    // Если план бесплатный и текущий план тоже бесплатный, сразу обновляем
    if (plan.price === 0 && userPlanQuery.data?.price === 0) {
      setLoadingPlanId(planId);
      try {
        const response = await http<{ planId: number; planName: string }>({
          url: `/v1/payment/${planId}`,
          method: "POST",
        });

        if (response.data) {
          const displayPlanName = getDisplayPlanName(response.data.planName);
          toast.success(t("payment.success", { plan: displayPlanName }));
          // Инвалидируем кэш плана пользователя, чтобы обновить данные
          queryClient.invalidateQueries({ queryKey: ["user-plan"] });
          queryClient.invalidateQueries({ queryKey: ["user"] });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("payment.error"));
      } finally {
        setLoadingPlanId(null);
      }
    } else {
      // Для всех планов (включая бесплатный при переходе с платного) открываем Drawer
      setSelectedPlan({
        id: plan.id,
        name: plan.name,
        price: plan.price,
      });
      setDrawerOpen(true);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">{t("payment.title")}</h1>
          <p className="text-red-500">{t("plans.error.load")}</p>
        </div>
      </div>
    );
  }

  const plans = query.data;

  // Определяем, является ли план платным
  const isPaidPlan = (planName: string) => planName !== "FREE";

  // Форматируем цену
  const formatPrice = (price: number, planName: string) => {
    if (planName === "FREE") {
      return t("plans.price.free");
    }
    return `${price} ₽ / ${t("plans.price.perMonth")}`;
  };

  // Получаем преимущества для плана
  const getPlanFeatures = (plan: (typeof plans)[0]) => {
    const features: string[] = [];

    if (plan.name === "FREE") {
      features.push(t("plans.features.quiz_unlimited"));
      features.push(
        `${t("plans.features.lead_limit")}: ${plan.bidMonthLimit} ${t("plans.perMonth")}`
      );
      features.push(t("plans.features.lead_delivery.free"));
    } else {
      // Для платных планов
      features.push(t("plans.features.quiz_unlimited"));
      // Для Pro+ не добавляем "Лимит заявок" в список, т.к. он отображается над Tabs
      if (plan.name !== "PRO_PLUS") {
        features.push(
          `${t("plans.features.lead_limit")}: ${plan.bidMonthLimit} ${t("plans.perMonth")}`
        );
      }
      features.push(t("plans.features.lead_delivery.paid"));
      features.push(t("plans.features.exports_reports.paid"));
      features.push(t("plans.features.analytics.paid"));
    }

    return features;
  };

  // Рассчитываем итоговую цену для Pro+ с учётом выбранного upLimit
  const getTotalPrice = (plan: (typeof plans)[0]) => {
    if (plan.name === "PRO_PLUS") {
      // Если выбран базовый вариант (selectedUpLimitId === null), возвращаем базовую цену
      if (selectedUpLimitId === null) {
        return plan.price;
      }
      // Если выбран дополнительный лимит, добавляем его цену
      if (selectedUpLimitId && upLimitsQuery.data) {
        const selectedUpLimit = upLimitsQuery.data.find((ul) => ul.id === selectedUpLimitId);
        if (selectedUpLimit) {
          return plan.price + selectedUpLimit.price;
        }
      }
    }
    return plan.price;
  };

  // Рассчитываем лимит для конкретного плана с учётом выбранного upLimit
  const getPlanLimit = (plan: (typeof plans)[0], upLimitId: number | null) => {
    if (plan.name === "PRO_PLUS") {
      if (upLimitId === null) {
        return plan.bidMonthLimit; // 200
      }
      if (upLimitId && upLimitsQuery.data) {
        const upLimit = upLimitsQuery.data.find((ul) => ul.id === upLimitId);
        if (upLimit) {
          return plan.bidMonthLimit + upLimit.bid;
        }
      }
    }
    return plan.bidMonthLimit;
  };

  // Проверяем, является ли выбранный вариант текущим
  const isCurrentVariant = (plan: (typeof plans)[0]) => {
    if (!userPlanQuery.data) return false;

    // Для Pro+ проверяем и план, и лимит
    if (plan.name === "PRO_PLUS" && userPlanQuery.data.name === "PRO_PLUS") {
      const currentLimit = userPlanQuery.data.bidMonthLimit;
      const selectedLimit = getPlanLimit(plan, selectedUpLimitId);
      return userPlanQuery.data.id === plan.id && currentLimit === selectedLimit;
    }

    // Для других планов проверяем только ID
    return userPlanQuery.data.id === plan.id;
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("payment.title")}</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t("plans.description")}</p>
      </div>

      {userPlanQuery.data && userPlanQuery.data.price > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowCancelDialog(true)}
            className="text-red-600 hover:text-red-700 hover:border-red-600"
          >
            {t("payment.cancel_subscription")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const features = getPlanFeatures(plan);
          const paid = isPaidPlan(plan.name);
          const isCurrentVariantPlan = isCurrentVariant(plan);
          const isProPlus = plan.name === "PRO_PLUS";
          const isLoading = loadingPlanId === plan.id;
          const totalPrice = getTotalPrice(plan);

          return (
            <Card
              key={plan.id}
              className={`flex flex-col border-border/70 transition-all hover:border-primary hover:shadow-md relative ${
                paid ? "border-primary/50" : ""
              } ${isLoading ? "opacity-50 cursor-wait" : ""}`}
            >
              {isCurrentVariantPlan && (
                <div className="absolute -top-4 left-3 z-10">
                  <Badge variant="secondary">{t("plans.current_plan")}</Badge>
                </div>
              )}
              <CardHeader className="space-y-2">
                <div>
                  <CardTitle className="text-lg">{getDisplayPlanName(plan.name)}</CardTitle>
                  <CardDescription className="text-base text-foreground mt-1">
                    {isProPlus
                      ? `${totalPrice} ₽ / ${t("plans.price.perMonth")}`
                      : formatPrice(plan.price, plan.name)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3">
                {isProPlus && upLimitsQuery.data && upLimitsQuery.data.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("plans.features.lead_limit")}</p>
                    <Tabs
                      value={selectedUpLimitId === null ? "base" : selectedUpLimitId.toString()}
                      onValueChange={(value) => {
                        if (value === "base") {
                          setSelectedUpLimitId(null);
                        } else {
                          setSelectedUpLimitId(Number(value));
                        }
                      }}
                      className="w-fit"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <TabsList className="inline-flex h-auto">
                        {/* Базовый вариант: 200 заявок */}
                        <TabsTrigger
                          value="base"
                          className="text-xs py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {plan.bidMonthLimit}
                        </TabsTrigger>
                        {/* Дополнительные лимиты */}
                        {upLimitsQuery.data.map((upLimit) => (
                          <TabsTrigger
                            key={upLimit.id}
                            value={upLimit.id.toString()}
                            className="text-xs py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {plan.bidMonthLimit + upLimit.bid}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                )}
                {paid && !isProPlus && (
                  <p className="text-sm text-muted-foreground">
                    {plan.name === "BASE" ? t("plans.features.target_audience.paid") : ""}
                  </p>
                )}
                {!paid && (
                  <p className="text-sm text-muted-foreground">
                    {t("plans.features.target_audience.free")}
                  </p>
                )}
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isLoading && handlePlanSelect(plan.id)}
                  disabled={isLoading || isCurrentVariantPlan}
                  className="w-full mt-auto py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader className="h-4 w-4 mr-2" />
                      {t("payment.processing")}
                    </div>
                  ) : isCurrentVariantPlan ? (
                    t("plans.current_plan")
                  ) : (
                    t("payment.select_plan")
                  )}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPlan && (
        <PaymentMethodDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          planId={selectedPlan.id}
          planName={getDisplayPlanName(selectedPlan.name)}
          planPrice={selectedPlan.price}
          planNameRaw={selectedPlan.name}
          selectedUpLimitId={selectedUpLimitId}
        />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payment.cancel_subscription.confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("payment.cancel_subscription.confirm_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("payment.cancel_subscription.cancel_button")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("payment.cancel_subscription.confirm_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
