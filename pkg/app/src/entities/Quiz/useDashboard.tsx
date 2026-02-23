import http from '@/lib/http';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { QuizDashboard } from './quiz.type';

export type DashboardData = { quizzes: QuizDashboard[]; count: number };

type Query = {
  limit?: number;
  page?: number;
};

async function fetchDashboard({ limit = 10, page = 1 }: Query): Promise<DashboardData> {
  const { data } = await http<DashboardData>({
    url: `/v1/quiz/dashboard?limit=${limit}&page=${page}`,
    method: 'GET',
  });
  return data ?? { quizzes: [], count: 0 };
}

export const dashboardQueryOptions = (query: Query = {}) =>
  queryOptions({
    queryKey: ['dashboard', query.limit, query.page],
    queryFn: () => fetchDashboard(query),
    retry: true,
    retryOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useDashboard = (query: Query = {}) => {
  const queryResult = useQuery(dashboardQueryOptions(query));
  return { query: queryResult };
};
