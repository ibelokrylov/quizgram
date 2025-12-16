import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	useInfiniteBids,
	useBidDetails,
	useMarkBidAsRead,
} from "@/entities/Bid/useBids";
import { useQuizFilters } from "@/entities/Quiz/useQuizFilters";
import { AuthContext } from "@/entities/User/auth.context";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { getTranslatedError } from "@/lib/error-mapper";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { BidsTableFree } from "./BidsTableFree";
import { BidsTableBase } from "./BidsTableBase";
import { BidDetailsDrawer } from "./BidDetailsDrawer";
import type { BidsListFilters } from "@/entities/Bid/bid.type";

export function BidsReportPage() {
	const { t } = useTranslation("common");
	// Получаем search params из URL
	const search = useSearch({ from: "/app/bid/report" });
	const navigate = useNavigate({ from: "/app/bid/report" });
	const { user } = useContext(AuthContext);
	const isMobile = useIsMobile();
	const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

	// Проверяем, является ли план FREE (planId === 1)
	const isFreePlan = user?.planId === 1;

	// Используем search params как источник истины для фильтров
	const filters: Omit<BidsListFilters, "offset"> = {
		quiz_uid: search.quiz_uid,
		status: search.status,
		isFull:
			search.isFull === "true"
				? true
				: search.isFull === "false"
					? false
					: undefined,
		isRead:
			search.isRead === "true"
				? true
				: search.isRead === "false"
					? false
					: undefined,
		limit: search.limit ?? 10,
	};

	// Устанавливаем значение по умолчанию для isFull (только для не-FREE планов)
	useEffect(() => {
		if (!isFreePlan && search.isFull === undefined) {
			navigate({
				search: (prev) => ({
					...prev,
					isFull: "true",
				}),
				replace: true,
			});
		}
	}, [isFreePlan, search.isFull, navigate]);

	// Получаем список квизов для фильтра
	const { data: quizFilters = [] } = useQuizFilters();

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		error,
	} = useInfiniteBids(filters);

	// Получаем детали заявки, если указан параметр key
	const {
		data: bidDetails,
		isLoading: isLoadingBidDetails,
		isError: isErrorBidDetails,
	} = useBidDetails(search.key);

	// Обновляем isRead в кэше после успешной загрузки деталей заявки
	const markBidAsRead = useMarkBidAsRead();
	useEffect(() => {
		if (bidDetails && search.key) {
			markBidAsRead(search.key);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bidDetails, search.key]);

	// Управление состоянием Drawer
	const isDrawerOpen = !!search.key;

	// Intersection Observer для бесконечного скролла
	const observerTarget = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const element = observerTarget.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1, rootMargin: "100px" },
		);

		observer.observe(element);

		return () => {
			observer.unobserve(element);
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleFilterChange = (
		key: keyof BidsListFilters,
		value: string | boolean | number | undefined,
	) => {
		// Для boolean значений конвертируем в строку для URL
		if (typeof value === "boolean") {
			const stringValue = String(value);
			navigate({
				search: (prev) => ({
					...prev,
					[key]: stringValue,
				}),
				replace: true,
			});
			return;
		}

		let newValue: string | number | undefined =
			value === "" ? undefined : value;

		// Обновляем URL с новыми параметрами
		navigate({
			search: (prev) => {
				const newSearch: any = { ...prev };

				// Если значение undefined, удаляем ключ из search params
				if (newValue === undefined) {
					delete newSearch[key];
				} else {
					// Сохраняем новое значение
					newSearch[key] = newValue;
				}

				return newSearch;
			},
			replace: true, // Заменяем текущую запись в истории, не создаем новую
		});
	};

	const handleResetFilters = () => {
		// Очищаем все search params, оставляем только limit
		navigate({
			search: {
				limit: 10,
			},
			replace: true,
		});
	};

	const handleDrawerOpenChange = (open: boolean) => {
		if (!open) {
			// Закрываем Drawer, удаляя параметр key из URL
			navigate({
				search: (prev) => {
					const { key, ...rest } = prev as any;
					return rest;
				},
				replace: true,
			});
		}
	};

	// Преобразуем список квизов в опции для Combobox
	const quizOptions = quizFilters.map((quiz) => ({
		value: quiz.uid,
		label: quiz.name,
	}));

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader />
			</div>
		);
	}

	if (isError) {
		const errorMessage = error instanceof Error ? error.message : undefined;
		const translatedError = getTranslatedError(errorMessage, t);
		
		return (
			<div className="p-4">
				<Card className="p-4">
					<p className="text-destructive">
						{t("bids.error.load")}{" "}
						{translatedError}
					</p>
				</Card>
			</div>
		);
	}

	const bids = data?.pages.flatMap((page) => page.data) || [];
	const total = data?.pages[0]?.total || 0;
	const totalNotFull = data?.pages[0]?.totalNotFull || 0;
	const beyondLimitCount = data?.pages[0]?.beyondLimitCount || 0;
	const maxAvailableFull = data?.pages[0]?.maxAvailableFull || 0;
	const deletedInLimitFull = data?.pages[0]?.deletedInLimitFull || 0;
	const shownBidsCount = bids.length;

	// Проверяем, превышен ли лимит для FREE плана
	const isLimitExceeded = isFreePlan && beyondLimitCount > 0;

	return (
		<div className="p-4 flex flex-col md:flex-row gap-6 items-start">
			{/* Фильтры - сверху на мобильных, справа на десктопе */}
			<Card className="p-4 w-full md:w-[300px] shrink-0 md:sticky md:top-4 md:mt-[2.5rem] order-1 md:order-2">
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-lg">{t("bids.filters")}</h2>
						{isMobile && (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
								aria-label={
									isFiltersExpanded
										? t("bids.filters.collapse")
										: t("bids.filters.expand")
								}
							>
								{isFiltersExpanded ? (
									<ChevronUp className="h-4 w-4" />
								) : (
									<ChevronDown className="h-4 w-4" />
								)}
							</Button>
						)}
					</div>

					{/* Содержимое фильтров - скрывается на мобильных, когда свернуто */}
					<div
						className={`flex flex-col gap-4 ${
							isMobile && !isFiltersExpanded ? "hidden" : ""
						}`}
					>

					{/* Фильтр по quiz_uid */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("bids.quiz")}</label>
						<Combobox
							options={quizOptions}
							value={filters.quiz_uid}
							onValueChange={(value) => handleFilterChange("quiz_uid", value)}
							placeholder={t("bids.quiz.select")}
							searchPlaceholder={t("bids.quiz.search")}
							emptyText={t("bids.quiz.notFound")}
						/>
					</div>

					{/* Фильтр по status */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("bids.status")}</label>
						<Select
							value={filters.status || "all"}
							onValueChange={(value) =>
								handleFilterChange(
									"status",
									value === "all" ? undefined : value,
								)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("bids.status.all")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("bids.status.all")}</SelectItem>
								<SelectItem value="create">{t("bids.status.create")}</SelectItem>
								<SelectItem value="in_progress">{t("bids.status.in_progress")}</SelectItem>
								<SelectItem value="rejected">{t("bids.status.rejected")}</SelectItem>
								<SelectItem value="success">{t("bids.status.success")}</SelectItem>
								<SelectItem value="completed">{t("bids.status.completed")}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Фильтр по isRead - Все/Новые */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("bids.list")}</label>
						<Select
							value={
								filters.isRead === undefined
									? "all"
									: filters.isRead === false
										? "new"
										: "read"
							}
							onValueChange={(value) =>
								handleFilterChange(
									"isRead",
									value === "all"
										? undefined
										: value === "new"
											? false
											: true,
								)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("bids.list.all")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("bids.list.all")}</SelectItem>
								<SelectItem value="new">{t("bids.list.new")}</SelectItem>
								<SelectItem value="read">{t("bids.list.read")}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Фильтр по isFull - только для планов отличных от FREE */}
					{!isFreePlan && (
						<div className="space-y-2">
							<label className="text-sm font-medium">{t("bids.completed")}</label>
							<Select
								value={
									filters.isFull === undefined
										? "true"
										: filters.isFull === true
											? "true"
											: "false"
								}
								onValueChange={(value) =>
									handleFilterChange(
										"isFull",
										value === "all" ? undefined : value === "true",
									)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder={t("bids.completed.yes")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{t("bids.completed.all")}</SelectItem>
									<SelectItem value="true">{t("bids.completed.yes")}</SelectItem>
									<SelectItem value="false">{t("bids.completed.no")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Кнопки управления фильтрами */}
					<div className="pt-2">
						<Button
							variant="outline"
							className="w-full"
							onClick={handleResetFilters}
						>
							{t("bids.filters.reset")}
						</Button>
					</div>
					</div>
				</div>
			</Card>

			{/* Левая колонка: Список заявок */}
			<div className="flex-1 space-y-4 w-full order-2 md:order-1">
				<div className="flex items-center gap-4 flex-wrap">
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="flex items-center gap-2 text-muted-foreground cursor-help">
								<Info className="h-4 w-4" />
								<p>{t("bids.completed.count", { total })}</p>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<div className="space-y-1">
								<p>{t("bids.completed.total", { total })}</p>
								<p>{t("bids.shown.count", { count: shownBidsCount })}</p>
								{deletedInLimitFull > 0 && (
									<p>{t("bids.deleted.inLimit", { count: deletedInLimitFull })}</p>
								)}
								{isFreePlan && (
									<>
										<p>{t("bids.available.inLimit", { count: maxAvailableFull })}</p>
										{beyondLimitCount > 0 && (
											<p className="text-destructive">
												{t("bids.exceeded.limit", { count: beyondLimitCount })}
											</p>
										)}
									</>
								)}
							</div>
						</TooltipContent>
					</Tooltip>
					{!isFreePlan && (
						<p className="text-muted-foreground">
							{t("bids.notCompleted.count", { count: totalNotFull })}
						</p>
					)}
					{isLimitExceeded && (
						<Button
							variant="default"
							className="ml-auto"
							asChild
						>
							<Link to="/plans">
								{t("bids.subscribe")}
							</Link>
						</Button>
					)}
				</div>

				{isFreePlan ? (
					<BidsTableFree
						bids={bids}
						isFetchingNextPage={isFetchingNextPage}
						hasNextPage={hasNextPage ?? false}
						fetchNextPage={fetchNextPage}
						observerTarget={observerTarget}
					/>
				) : (
					<BidsTableBase
						bids={bids}
						isFetchingNextPage={isFetchingNextPage}
						hasNextPage={hasNextPage ?? false}
						fetchNextPage={fetchNextPage}
						observerTarget={observerTarget}
					/>
				)}
			</div>

			{/* Drawer с деталями заявки */}
			<BidDetailsDrawer
				open={isDrawerOpen}
				onOpenChange={handleDrawerOpenChange}
				bidDetails={bidDetails}
				isLoading={isLoadingBidDetails}
				isError={isErrorBidDetails}
			/>
		</div>
	);
}
