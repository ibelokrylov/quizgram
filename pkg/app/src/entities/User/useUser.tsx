import http from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import type { User } from "./User.type";

export const useUser = () => {
  async function _fetch(): Promise<User | undefined> {
    const { data } = await http<User>({
      url: "/v1/user",
    });
    return data;
  }
  const query = useQuery({
    queryKey: ["user"],
    queryFn: _fetch,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { query };
};
