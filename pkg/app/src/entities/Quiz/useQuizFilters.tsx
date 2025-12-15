import http from "@/lib/http";
import { useQuery } from "@tanstack/react-query";

export interface QuizFilterItem {
	uid: string;
	name: string;
}

interface QuizFiltersData {
	filters: QuizFilterItem[];
}

async function fetchQuizFilters(): Promise<QuizFilterItem[]> {
	const response = await http<QuizFiltersData>({
		url: "/v1/quiz/filters",
	});
	return response.data.filters;
}

export const useQuizFilters = () => {
	return useQuery({
		queryKey: ["quiz-filters"],
		queryFn: fetchQuizFilters,
		staleTime: 20 * 1000, // 20 секунд (соответствует кэшу на сервере)
		retry: false,
		refetchOnWindowFocus: false,
	});
};
