import { Loader } from '@/components/loader';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import http from '@/lib/http';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/app/import/$uid')({
  component: RouteComponent,
  loader: async ({ params }) => {
    try {
      const { uid } = params;
      const { data } = await http<Quiz>({
        url: '/v1/quiz/is-shared/' + uid,
        method: 'POST',
      });
      return { quiz: data, isLoadToSever: true };
    } catch (err) {
      console.error(err);
      return { quiz: undefined, isLoadToServer: true };
    }
  },
});

function RouteComponent() {
  const { quiz } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!quiz) {
      // navigate({ to: '/app' });
    } else {
      navigate({ to: '/app/quiz/' + quiz.uid });
    }
  }, [quiz]);
  return (
    <div className={'flex flex-col items-center justify-center h-[calc(100vh-100px)]'}>
      <Loader />
    </div>
  );
}
