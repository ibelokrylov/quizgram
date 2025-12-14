import { createFileRoute } from "@tanstack/react-router";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "@/entities/User/auth.context";
import { PlanInfo } from "@/components/plan-info";

export const Route = createFileRoute("/app/bid/statistic")({
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation("common");
	const { user } = useContext(AuthContext);
	const isFreePlan = user?.planId === 1;

	return (
		<div className="p-4">
			{isFreePlan ? (
				<div className="max-w-md">
					<PlanInfo />
				</div>
			) : (
				<div className="text-center text-muted-foreground">
					{t("bids.statistic.placeholder")}
				</div>
			)}
		</div>
	);
}
