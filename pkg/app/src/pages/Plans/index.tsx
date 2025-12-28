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
import { useNavigate } from "@tanstack/react-router";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

type Plan = {
  id: "free" | "pro" | "custom";
  name: string;
  price: string;
  description: string;
  details: string[];
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "0 ₽ / навсегда",
    description: "Для первых тестов и 10 лидов в месяц.",
    details: ["Квизов без лимита", "до 10 заявок в месяц", "заявки только в личку от бота"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "899 ₽ / мес",
    description: "Для малого бизнеса и маркетологов с рекламой в Telegram.",
    details: ["Квизов без лимита", "до 100 заявок в месяц", "экспорт заявок в CSV/Excel"],
  },
  {
    id: "custom",
    name: "Custom",
    price: "по запросу",
    description: "Индивидуальный тариф под ваши задачи и объёмы.",
    details: [
      "кастомные лимиты по квизам и заявкам",
      "интеграции и дополнительные отчёты",
      "выделенная поддержка",
    ],
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

  const handleContact = () => {
    // Простой способ связаться — открыть почтовый клиент
    window.location.href = "mailto:hello@quizgram.site?subject=Quizgram%20Custom%20plan";
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("plans.title")}</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t("plans.description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className="flex flex-col border-border/70 transition-all hover:border-primary hover:shadow-md cursor-pointer"
          >
            <CardHeader className="space-y-2">
              <div>
                <CardTitle className="text-lg">
                  {plan.name === "FREE"
                    ? t("plans.price.free")
                    : plan.name === "BASE"
                      ? "Pro"
                      : plan.name}
                </CardTitle>
                <CardDescription className="text-base text-foreground mt-1">
                  {plan.price}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {plan.details.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.id === "custom" ? (
                <Button className="w-full" variant="outline" onClick={handleContact}>
                  {t("plans.contact")}
                </Button>
              ) : (
                <Button
                  onClick={handleBuy}
                  className="w-full"
                  variant={plan.id === "pro" ? "default" : "outline"}
                >
                  {t("plans.buy")}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
