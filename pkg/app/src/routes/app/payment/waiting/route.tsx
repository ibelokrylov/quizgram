import { PaymentWaitingPage } from '@/pages/Payment/Waiting';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/payment/waiting')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      paymentId: search.paymentId ? Number(search.paymentId) : undefined,
    };
  },
});

function RouteComponent() {
  return <PaymentWaitingPage />;
}
