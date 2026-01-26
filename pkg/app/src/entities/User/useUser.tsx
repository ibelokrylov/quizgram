import http from "@/lib/http";
import { isTelegramAvailable } from "@/lib/telegram-sdk";
import { useQuery } from "@tanstack/react-query";
import type { User } from "./User.type";

export const useUser = () => {
  async function _fetch(): Promise<User | undefined> {
    // Если это Telegram окружение и есть initData, используем login
    if (isTelegramAvailable()) {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;

      if (initData) {
        try {
          const res = await http<User>({
            url: "/v1/auth/telegram/login",
            method: "POST",
            body: { initData },
          });

          if (res.data) {
            return res.data;
          }
        } catch (err: any) {
          throw err;
        }
      }
    }

    // Для обычного окружения или если нет initData - используем стандартный запрос
    const { data } = await http<User>({
      url: "/v1/user",
    });
    return data;
  }

  const query = useQuery({
    queryKey: ["user"],
    queryFn: _fetch,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { query };
};
