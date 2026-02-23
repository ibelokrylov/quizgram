import { PlanInfo } from '@/components/plan-info';
import { AuthContext } from '@/entities/User/auth.context';
import { hasAccessToPaidContent } from '@/entities/User/access-control';
import { BidStatisticPage } from '@/pages/BidStatistic';
import { createFileRoute } from '@tanstack/react-router';
import { useContext } from 'react';
import { z } from 'zod';

const statisticSearchSchema = z.object({
  quiz_uid: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const Route = createFileRoute('/app/bid/statistic')({
  component: RouteComponent,
  validateSearch: (search) => statisticSearchSchema.parse(search),
});

function RouteComponent() {
  const { user } = useContext(AuthContext);
  const hasAccess = hasAccessToPaidContent(user);

  return (
    <div>
      {hasAccess ? (
        <BidStatisticPage />
      ) : (
        <div className="p-4">
          <div className="max-w-md">
            <PlanInfo />
          </div>
        </div>
      )}
    </div>
  );
}
