import http from "@/lib/http";
import { useQuery } from "@tanstack/react-query";

export type UpLimit = {
  id: number;
  bid: number;
  price: number;
};

export const useUpLimits = () => {
  async function _fetch(): Promise<UpLimit[]> {
    const { data } = await http<UpLimit[]>({
      url: "/v1/payment/up-limits",
    });
    return data ?? [];
  }

  const query = useQuery({
    queryKey: ["up-limits"],
    queryFn: _fetch,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { query };
};
