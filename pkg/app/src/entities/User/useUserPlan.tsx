import http from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import type { UserPlan } from "./User.type";

export const useUserPlan = () => {
  async function _fetch(): Promise<UserPlan | undefined> {
    const { data } = await http<UserPlan>({
      url: "/v1/user/plan",
    });
    return data;
  }
  const query = useQuery({
    queryKey: ["user-plan"],
    queryFn: _fetch,
    retry: false,
    retryOnMount: false,
    // План пользователя меняется редко, поэтому считаем данные «свежими»
    // и не дёргаем эндпоинт повторно при маунте нескольких компонентов.
    staleTime: 1000 * 60 * 5, // 5 минут
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return { query };
};
