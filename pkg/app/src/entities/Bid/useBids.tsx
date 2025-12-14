import http from '@/lib/http';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { BidsListData, BidsListFilters } from './bid.type';

async function fetchBids(filters: BidsListFilters = {}): Promise<BidsListData> {
  const params = new URLSearchParams();
  if (filters.quiz_uid) params.append('quiz_uid', filters.quiz_uid);
  if (filters.status) params.append('status', filters.status);
  if (filters.isFull !== undefined) params.append('isFull', String(filters.isFull));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset !== undefined) params.append('offset', String(filters.offset));

  const queryString = params.toString();
  const url = `/v1/bids${queryString ? `?${queryString}` : ''}`;

  const response = await http<BidsListData>({
    url,
  });
  return response.data;
}

export const useBids = (filters?: BidsListFilters) => {
  const query = useQuery({
    queryKey: ['bids', filters],
    queryFn: () => fetchBids(filters),
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { query };
};

export const useInfiniteBids = (filters?: Omit<BidsListFilters, 'offset'>) => {
  const limit = filters?.limit || 10;

  return useInfiniteQuery({
    queryKey: ['bids', 'infinite', filters],
    queryFn: ({ pageParam = 0 }) => fetchBids({ ...filters, offset: pageParam as number, limit }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      // Calculate next offset based on number of items fetched so far
      const totalFetched = allPages.reduce((acc, page) => acc + page.data.length, 0);
      return totalFetched;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};
