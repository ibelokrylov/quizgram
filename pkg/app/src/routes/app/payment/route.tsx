import { PaymentPage } from '@/pages/Payment';
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/payment")({
	component: RouteComponent,
});

function RouteComponent() {
	return <PaymentPage />;
}
