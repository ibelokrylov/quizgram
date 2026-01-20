import { PaymentSuccessPage } from "@/pages/Payment/Success";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/payment/success")({
  component: PaymentSuccessPage,
});
