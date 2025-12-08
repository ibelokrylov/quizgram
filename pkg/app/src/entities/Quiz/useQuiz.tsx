import http from '@/lib/http';
import { useQuery } from '@tanstack/react-query';
import type { Quiz } from './quiz.type';

export const useQuiz = (uid: string) => {
  async function _fetch(): Promise<Quiz | undefined> {
    const { data } = await http<Quiz>({
      url: `/v1/quiz/${uid}`,
    });
    return data;
  }
  const query = useQuery({
    queryKey: ['quiz', uid],
    queryFn: _fetch,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!uid,
  });

  return { query };
};

