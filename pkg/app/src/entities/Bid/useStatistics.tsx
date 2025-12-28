import http from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import type { AbandonmentStats, DailyStats } from "./statistics.type";

interface StatisticsParams {
  quiz_uid: string;
  start?: string;
  end?: string;
}

// Получение общей статистики по дням
async function fetchDailyStats(params: StatisticsParams): Promise<DailyStats> {
  const searchParams = new URLSearchParams({
    quiz_uid: params.quiz_uid,
    ...(params.start ? { start: params.start } : {}),
    ...(params.end ? { end: params.end } : {}),
  });

  const response = await http<DailyStats>({
    url: `/v1/statistics/daily?${searchParams.toString()}`,
  });

  return response.data;
}

// Получение статистики по незавершенным квизам
async function fetchAbandonmentStats(params: StatisticsParams): Promise<AbandonmentStats> {
  const searchParams = new URLSearchParams({
    quiz_uid: params.quiz_uid,
    ...(params.start ? { start: params.start } : {}),
    ...(params.end ? { end: params.end } : {}),
  });

  const response = await http<AbandonmentStats>({
    url: `/v1/statistics/abandonment?${searchParams.toString()}`,
  });

  return response.data;
}

// Хук для получения общей статистики
export const useDailyStats = (params: StatisticsParams | null) => {
  return useQuery({
    queryKey: ["daily-stats", params],
    queryFn: () => fetchDailyStats(params!),
    enabled: !!params?.quiz_uid,
    staleTime: 5 * 60 * 1000, // 5 минут (соответствует TTL кеша на сервере)
    refetchOnWindowFocus: false,
  });
};

// Хук для получения статистики по незавершенным квизам
export const useAbandonmentStats = (params: StatisticsParams | null) => {
  return useQuery({
    queryKey: ["abandonment-stats", params],
    queryFn: () => fetchAbandonmentStats(params!),
    enabled: !!params?.quiz_uid,
    staleTime: 5 * 60 * 1000, // 5 минут (соответствует TTL кеша на сервере)
    refetchOnWindowFocus: false,
  });
};
