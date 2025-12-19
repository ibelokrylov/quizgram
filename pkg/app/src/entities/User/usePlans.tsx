import http from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import type { UserPlan } from "./User.type";

export const usePlans = () => {
	async function _fetch(): Promise<UserPlan[]> {
		const { data } = await http<UserPlan[]>({
			url: "/v1/user/plans",
		});
		return data;
	}
	const query = useQuery({
		queryKey: ["plans"],
		queryFn: _fetch,
		retry: false,
		retryOnMount: false,
		staleTime: 1000 * 60 * 5, // 5 минут
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	return { query };
};
