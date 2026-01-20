import { PaymentFailurePage } from "@/pages/Payment/Failure";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/payment/failure")({
  component: PaymentFailurePage,
});
