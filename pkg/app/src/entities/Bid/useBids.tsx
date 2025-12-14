import http from "@/lib/http";
import {
	useQuery,
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { BidsListData, BidsListFilters, BidDetails } from "./bid.type";

async function fetchBids(filters: BidsListFilters = {}): Promise<BidsListData> {
	const params = new URLSearchParams();
	if (filters.quiz_uid) params.append("quiz_uid", filters.quiz_uid);
	if (filters.status) params.append("status", filters.status);
	if (filters.isFull !== undefined)
		params.append("isFull", String(filters.isFull));
	if (filters.isRead !== undefined)
		params.append("isRead", String(filters.isRead));
	if (filters.limit) params.append("limit", String(filters.limit));
	if (filters.offset !== undefined)
		params.append("offset", String(filters.offset));

	const queryString = params.toString();
	const url = `/v1/bids${queryString ? `?${queryString}` : ""}`;

	const response = await http<BidsListData>({
		url,
	});
	return response.data;
}

export const useBids = (filters?: BidsListFilters) => {
	const query = useQuery({
		queryKey: ["bids", filters],
		queryFn: () => fetchBids(filters),
		retry: false,
		retryOnMount: false,
		refetchOnWindowFocus: false,
	});

	return { query };
};

export const useInfiniteBids = (filters?: Omit<BidsListFilters, "offset">) => {
	const limit = filters?.limit || 10;

	return useInfiniteQuery({
		queryKey: ["bids", "infinite", filters],
		queryFn: ({ pageParam = 0 }) =>
			fetchBids({ ...filters, offset: pageParam as number, limit }),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (!lastPage.hasMore) return undefined;
			// Calculate next offset based on number of items fetched so far
			const totalFetched = allPages.reduce(
				(acc, page) => acc + page.data.length,
				0,
			);
			return totalFetched;
		},
		retry: false,
		refetchOnWindowFocus: false,
	});
};

async function deleteBid(key: string): Promise<void> {
	await http({
		url: `/v1/bids/${key}`,
		method: "DELETE",
	});
}

export const useDeleteBid = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteBid,
		onSuccess: () => {
			// Инвалидируем все запросы заявок, чтобы обновить список
			queryClient.invalidateQueries({ queryKey: ["bids"] });
		},
	});
};

async function fetchBidDetails(key: string): Promise<BidDetails> {
	const response = await http<{ message: string; data: BidDetails }>({
		url: `/v1/bids/${key}`,
	});
	return response.data.data;
}

export const useBidDetails = (key: string | undefined) => {
	return useQuery({
		queryKey: ["bids", "details", key],
		queryFn: () => fetchBidDetails(key!),
		enabled: !!key,
		retry: false,
		retryOnMount: false,
		refetchOnWindowFocus: false,
	});
};

// Хук для обновления isRead в кэше после просмотра заявки
export const useMarkBidAsRead = () => {
	const queryClient = useQueryClient();

	return (key: string) => {
		queryClient.setQueriesData(
			{ queryKey: ["bids", "infinite"] },
			(oldData: any) => {
				if (!oldData) return oldData;

				return {
					...oldData,
					pages: oldData.pages.map((page: any) => ({
						...page,
						data: page.data.map((bid: any) =>
							bid.key === key ? { ...bid, isRead: true } : bid,
						),
					})),
				};
			},
		);
	};
};
