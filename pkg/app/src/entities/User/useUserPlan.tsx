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
		refetchOnWindowFocus: false,
	});

	return { query };
};
