import http from "@/lib/http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "./notification.type";

export const useNotification = () => {
  async function _fetch(): Promise<Notification | undefined> {
    const { data } = await http<Notification>({
      url: "/v1/user/notification",
    });
    return data;
  }

  const query = useQuery({
    queryKey: ["notification"],
    queryFn: _fetch,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { query };
};

export const useUpdateNotification = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (settings: Partial<Notification>) => {
      const { data } = await http<Notification>({
        url: "/v1/user/notification",
        method: "PUT",
        body: settings,
      });
      return data;
    },
    onSuccess: (data) => {
      // Обновляем кэш напрямую данными из ответа сервера, избегая лишнего запроса
      if (data) {
        queryClient.setQueryData(["notification"], data);
      }
    },
  });

  return { mutation };
};
