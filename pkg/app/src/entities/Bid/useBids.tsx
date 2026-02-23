import http from '@/lib/http';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { BidsListData, BidsListFilters, BidDetails } from './bid.type';

async function fetchBids(filters: BidsListFilters = {}): Promise<BidsListData> {
  const params = new URLSearchParams();
  if (filters.quiz_uid) params.append('quiz_uid', filters.quiz_uid);
  if (filters.status) params.append('status', filters.status);
  if (filters.isFull !== undefined) params.append('isFull', String(filters.isFull));
  if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
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

async function deleteBid(key: string): Promise<void> {
  await http({
    url: `/v1/bids/${key}`,
    method: 'DELETE',
  });
}

export const useDeleteBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBid,
    onSuccess: () => {
      // Инвалидируем все запросы заявок, чтобы обновить список
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
};

async function fetchBidDetails(key: string): Promise<BidDetails> {
  const response = await http<BidDetails>({
    url: `/v1/bids/${key}`,
  });
  return response.data;
}

export const useBidDetails = (key: string | undefined) => {
  return useQuery({
    queryKey: ['bids', 'details', key],
    queryFn: () => fetchBidDetails(key!),
    enabled: !!key,
    retry: false,
    retryOnMount: true, // Всегда загружаем данные при монтировании, даже если они в кеше
    refetchOnWindowFocus: false,
    staleTime: 30000, // Данные считаются актуальными 30 секунд (было 60)
    gcTime: 300000, // Кеш хранится 5 минут после того, как никто не использует данные
    refetchOnMount: true, // Всегда обновляем данные при монтировании компонента
  });
};

// Хук для обновления isRead в кэше после просмотра заявки
export const useMarkBidAsRead = () => {
  const queryClient = useQueryClient();

  return (key: string) => {
    queryClient.setQueriesData({ queryKey: ['bids', 'infinite'] }, (oldData: any) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.map((bid: any) => (bid.key === key ? { ...bid, isRead: true } : bid)),
        })),
      };
    });
  };
};

// Хук для обновления статуса заявки
export const useUpdateBidStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, status }: { key: string; status: string }) => {
      await http({
        url: '/v1/bids/status',
        method: 'PUT',
        body: { key, status },
      });
    },
    onSuccess: (_, variables) => {
      // Обновляем кеш деталей заявки
      queryClient.setQueryData(
        ['bids', 'details', variables.key],
        (oldData: BidDetails | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, status: variables.status };
        }
      );

      // Обновляем кеш списка заявок
      queryClient.setQueriesData({ queryKey: ['bids', 'infinite'] }, (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((bid: any) =>
              bid.key === variables.key ? { ...bid, status: variables.status } : bid
            ),
          })),
        };
      });
    },
  });
};

// Хук для экспорта заявок
export const useExportBids = () => {
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: async ({
      filters,
      format,
    }: {
      filters: Omit<BidsListFilters, 'limit' | 'offset'>;
      format: 'csv' | 'excel';
    }) => {
      // Формируем query параметры
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.quiz_uid) params.append('quiz_uid', filters.quiz_uid);
      if (filters.status) params.append('status', filters.status);
      if (filters.isFull !== undefined) params.append('isFull', String(filters.isFull));
      if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));

      const queryString = params.toString();
      const url = `/v1/bids/export${queryString ? `?${queryString}` : ''}`;

      // Делаем запрос для получения файла
      const apiUrl = import.meta.env.VITE_PUBLIC_API_URL + url;
      const response = await fetch(apiUrl, {
        credentials: 'include',
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to export bids');
      }

      // Получаем файл как Blob
      const blob = await response.blob();

      // Определяем имя файла из заголовка Content-Disposition или генерируем
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `bids_report_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // Создаем временную ссылку и скачиваем файл
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(t('bids.export.success'));
    },
    onError: (error: Error) => {
      toast.error(t('bids.export.error'), {
        description: error.message,
      });
    },
  });
};
