import { PlansPage } from '@/pages/Plans';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/plans')({
  component: PlansPage,
});
