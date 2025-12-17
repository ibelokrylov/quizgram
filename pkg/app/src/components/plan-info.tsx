import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserPlan } from "@/entities/User/useUserPlan";
import { Loader } from "@/components/loader";

interface PlanInfoProps {
	className?: string;
}

export function PlanInfo({ className }: PlanInfoProps) {
	const { t } = useTranslation("common");
	const { query: planQuery } = useUserPlan();

	if (planQuery.isLoading) {
		return (
			<Card className={`p-4 ${className || ""}`}>
				<div className="flex items-center justify-center min-h-[100px]">
					<Loader />
				</div>
			</Card>
		);
	}

	if (planQuery.isError || !planQuery.data) {
		return (
			<Card className={`p-4 ${className || ""}`}>
				<div className="text-destructive text-sm">{t("plan.info.error")}</div>
			</Card>
		);
	}

	const plan = planQuery.data;
	const isFreePlan = plan.id === 1;

	return (
		<Card className={`p-4 ${className || ""}`}>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<h3 className="font-semibold text-lg">{t("plan.info.title")}</h3>
						<div className="flex items-center gap-2">
							<Badge
								variant={isFreePlan ? "secondary" : "default"}
								className="text-sm"
							>
								{plan.name}
							</Badge>
							{!isFreePlan && (
								<span className="text-sm text-muted-foreground">
									{t("plan.info.price", { price: plan.price })}
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							{t("plans.features.lead_limit")}:
						</span>
						<span className="font-medium">
							{plan.bidMonthLimit} {t("plan.info.perMonth")}
						</span>
					</div>
				</div>

				<Button
					variant="default"
					className="w-full"
					onClick={() => {
						// TODO: Добавить навигацию на страницу подписки
					}}
				>
					{t("bids.subscribe")}
				</Button>
			</div>
		</Card>
	);
}
