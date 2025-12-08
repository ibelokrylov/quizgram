import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthContext } from "@/entities/User/auth.context";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

type PlanFeatures = {
  quiz_limit: string;
  lead_limit: string;
  lead_delivery: string;
  analytics: string;
  broadcasts: string;
  bot_in_miniapp: string;
  integrations: string;
  phone_verification: string;
  exports_reports: string;
  result_tab: string;
  quizgram_logo: string;
  target_audience: string;
};

type Plan = {
  plan: string;
  icon: string;
  price: string;
  features: PlanFeatures;
};

const plans: Plan[] = [
  {
    plan: "Free",
    icon: "🧩",
    price: "0 ₽ / навсегда",
    features: {
      quiz_limit: "♾️ Без лимита",
      lead_limit: "до 10 заявок в месяц",
      lead_delivery: "только в личку от бота",
      analytics: "✖ нет",
      broadcasts: "✖ нет",
      bot_in_miniapp: "❌ Только бот Quizgram (единый стиль и логотип проекта)",
      integrations: "✖ нет",
      phone_verification: "✖ нет",
      exports_reports: "✖ нет",
      result_tab: "✖ нет",
      quizgram_logo: "отображается",
      target_audience: "чтобы попробовать и получить первые 10 лидов",
    },
  },
  {
    plan: "Pro",
    icon: "⚡",
    price: "899 ₽ / мес",
    features: {
      quiz_limit: "♾️ Без лимита",
      lead_limit: "до 100 заявок в месяц",
      lead_delivery: "бот / группа / канал",
      analytics: "✅ базовая (по вопросам и отвалам)",
      broadcasts: "✖ нет",
      bot_in_miniapp: "❌ Только бот Quizgram (единый стиль и логотип проекта)",
      integrations: "✖ нет",
      phone_verification: "✖ нет",
      exports_reports: "✅ CSV/Excel",
      result_tab: "стандартный финальный экран",
      quizgram_logo: "отсутствует",
      target_audience:
        "для малого бизнеса и маркетологов с рекламой в Telegram",
    },
  },
];

export const PlansPage = () => {
  const { t } = useTranslation();
  const ctx = useContext(AuthContext);
  const navigate = useNavigate();

  const handleBuy = () => {
    if (ctx.isAuth) {
      navigate({ to: "/payment" });
    } else {
      navigate({ to: "/app" });
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("plans.title")}</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto w-full">
        {plans.map((plan) => (
          <Card key={plan.plan} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{plan.icon}</span>
                  <CardTitle className="text-2xl">{plan.plan}</CardTitle>
                </div>
              </div>
              <CardDescription className="text-lg font-semibold text-foreground mt-4">
                {plan.price}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.quiz_limit")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.quiz_limit}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.lead_limit")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.lead_limit}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.lead_delivery")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.lead_delivery}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.analytics")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.analytics}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.broadcasts")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.broadcasts}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.bot_in_miniapp")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.bot_in_miniapp}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.integrations")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.integrations}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.phone_verification")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.phone_verification}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.exports_reports")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.exports_reports}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.result_tab")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.result_tab}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.quizgram_logo")}:
                  </span>
                  <span className="text-sm font-medium text-right">
                    {plan.features.quizgram_logo}
                  </span>
                </div>
                <div className="flex justify-between items-start pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {t("plans.features.target_audience")}:
                  </span>
                  <span className="text-sm font-medium text-right max-w-[60%]">
                    {plan.features.target_audience}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleBuy}
                className="w-full"
                variant={plan.plan === "Pro" ? "default" : "outline"}
              >
                {t("plans.buy")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
