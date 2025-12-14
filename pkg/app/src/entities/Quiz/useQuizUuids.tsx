import http from '@/lib/http';
import { useQuery } from '@tanstack/react-query';

export interface QuizUuidItem {
  uid: string;
  name: string;
}

interface QuizUuidsResponse {
  message: string;
  data: {
    uuids: QuizUuidItem[];
  };
}

async function fetchQuizUuids(): Promise<QuizUuidItem[]> {
  const response = await http<QuizUuidsResponse>({
    url: '/v1/quiz/uuids',
  });
  return response.data.uuids;
}

export const useQuizUuids = () => {
  return useQuery({
    queryKey: ['quiz-uuids'],
    queryFn: fetchQuizUuids,
    staleTime: 20 * 1000, // 20 секунд (соответствует кэшу на сервере)
    retry: false,
    refetchOnWindowFocus: false,
  });
};
