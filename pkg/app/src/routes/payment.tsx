import { PaymentPage } from "@/pages/Payment";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/payment")({
	component: PaymentPage,
});
