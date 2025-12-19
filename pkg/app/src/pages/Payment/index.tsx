import { Loader } from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { usePlans } from "@/entities/User/usePlans";
import { useUserPlan } from "@/entities/User/useUserPlan";
import http from "@/lib/http";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const PaymentPage = () => {
	const { t } = useTranslation();
	const { query } = usePlans();
	const { query: userPlanQuery } = useUserPlan();
	const queryClient = useQueryClient();
	const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);

	const handlePlanSelect = async (planId: number) => {
		// Не обновляем, если это уже текущий план
		if (userPlanQuery.data?.id === planId) {
			return;
		}

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
			toast.error(
				error instanceof Error
					? error.message
					: t("payment.error")
			);
		} finally {
			setLoadingPlanId(null);
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
					<p className="text-red-500">
						{t("plans.error.load")}
					</p>
				</div>
			</div>
		);
	}

	const plans = query.data;

	// Форматируем название плана для отображения
	const getDisplayPlanName = (planName: string) => {
		if (planName === "FREE") {
			return t("plans.price.free");
		}
		if (planName === "BASE") {
			return "Pro";
		}
		return planName;
	};

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
	const getPlanFeatures = (plan: typeof plans[0]) => {
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
			features.push(
				`${t("plans.features.lead_limit")}: ${plan.bidMonthLimit} ${t("plans.perMonth")}`
			);
			features.push(t("plans.features.lead_delivery.paid"));
			features.push(t("plans.features.exports_reports.paid"));
			features.push(t("plans.features.analytics.paid"));
		}

		return features;
	};

	return (
		<div className="flex flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto">
			<div className="text-center space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">
					{t("payment.title")}
				</h1>
				<p className="text-sm text-muted-foreground max-w-xl mx-auto">
					{t("plans.description")}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{plans.map((plan) => {
					const features = getPlanFeatures(plan);
					const paid = isPaidPlan(plan.name);
					const isCurrentPlan =
						userPlanQuery.data?.id === plan.id;

					const isLoading = loadingPlanId === plan.id;

					return (
						<Card
							key={plan.id}
							onClick={() => !isLoading && handlePlanSelect(plan.id)}
							className={`flex flex-col border-border/70 transition-all hover:border-primary hover:shadow-md relative cursor-pointer ${paid ? "border-primary/50" : ""
								} ${isLoading ? "opacity-50 cursor-wait" : ""}`}
						>
							{isCurrentPlan && (
								<div className="absolute -top-4 left-3 z-10">
									<Badge variant="secondary">
										{t("plans.current_plan")}
									</Badge>
								</div>
							)}
							<CardHeader className="space-y-2">
								<div>
									<CardTitle className="text-lg">
										{getDisplayPlanName(plan.name)}
									</CardTitle>
									<CardDescription className="text-base text-foreground mt-1">
										{formatPrice(plan.price, plan.name)}
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="flex-1 space-y-3">
								{paid && (
									<p className="text-sm text-muted-foreground">
										{plan.name === "BASE"
											? t("plans.features.target_audience.paid")
											: ""}
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
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
};
