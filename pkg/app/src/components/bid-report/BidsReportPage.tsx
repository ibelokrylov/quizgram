import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BidsListFilters } from "@/entities/Bid/bid.type";
import {
  useBidDetails,
  useInfiniteBids,
  useMarkBidAsRead,
} from "@/entities/Bid/useBids";
import { useQuizFilters } from "@/entities/Quiz/useQuizFilters";
import { hasAccessToPaidContent } from "@/entities/User/access-control";
import { AuthContext } from "@/entities/User/auth.context";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslatedError } from "@/lib/error-mapper";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Download, Info } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BidDetailsDrawer } from "./BidDetailsDrawer";
import { BidInfoDrawer } from "./BidInfoDrawer";
import { BidsTableBase } from "./BidsTableBase";
import { BidsTableFree } from "./BidsTableFree";
import { ExportDialog } from "./ExportDialog";

export function BidsReportPage() {
  const { t } = useTranslation("common");
  // Получаем search params из URL
  const search = useSearch({ from: "/app/bid/report" });
  const navigate = useNavigate({ from: "/app/bid/report" });
  const { user } = useContext(AuthContext);
  const isMobile = useIsMobile();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const hasAccess = hasAccessToPaidContent(user);

  // Используем search params как источник истины для фильтров
  const filters: Omit<BidsListFilters, "offset"> = {
    quiz_uid: search.quiz_uid,
    status: search.status,
    isFull:
      search.isFull === "true"
        ? true
        : search.isFull === "false"
          ? false
          : search.isFull === "all"
            ? undefined
            : undefined,
    isRead:
      search.isRead === "true"
        ? true
        : search.isRead === "false"
          ? false
          : undefined,
    limit: search.limit ?? 10,
  };

  // Устанавливаем дефолтное значение isFull=true при первой загрузке (только для не-FREE планов)
  // Срабатывает только если в URL вообще нет параметров фильтрации
  const hasAnyFilters =
    search.quiz_uid || search.status || search.isFull || search.isRead;
  useEffect(() => {
    if (hasAccess && !hasAnyFilters) {
      navigate({
        search: (prev) => ({
          ...prev,
          isFull: "true",
        }),
        replace: true,
      });
    }
  }, []);

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

  // Получаем детали заявки для основного drawer
  // Благодаря кешированию (staleTime: 60s), повторные запросы будут использовать кеш
  const {
    data: bidDetails,
    isLoading: isLoadingBidDetails,
    isError: isErrorBidDetails,
  } = useBidDetails(search.key);

  // Получаем дополнительную информацию о заявке для info drawer
  // Если key === infoKey, данные возьмутся из кеша без повторного запроса
  const {
    data: bidInfoDetails,
    isLoading: isLoadingBidInfoDetails,
    isError: isErrorBidInfoDetails,
  } = useBidDetails(search.infoKey);

  // Обновляем isRead в кэше после успешной загрузки деталей заявки
  const markBidAsRead = useMarkBidAsRead();
  useEffect(() => {
    if (bidDetails && search.key) {
      markBidAsRead(search.key);
    }
  }, [bidDetails, search.key]);

  // Управление состоянием Drawer
  const isDrawerOpen = !!search.key;
  const isInfoDrawerOpen = !!search.infoKey;

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
    navigate({
      search: {
        limit: 10,
        ...(hasAccess ? { isFull: "true" } : {}),
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

  const handleInfoDrawerOpenChange = (open: boolean) => {
    if (!open) {
      // Закрываем Info Drawer, удаляя параметр infoKey из URL
      navigate({
        search: (prev) => {
          const { infoKey, ...rest } = prev as any;
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
            {t("bids.error.load")} {translatedError}
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
  const hasMoreBeyondLimit = data?.pages[0]?.hasMoreBeyondLimit || false;
  const shownBidsCount = bids.length;

  const isLimitExceeded = !hasAccess && beyondLimitCount > 0;
  const shouldShowUpgradeBanner =
    hasAccess && (hasMoreBeyondLimit || beyondLimitCount > 0);

  return (
    <div className="p-4 flex flex-col md:flex-row gap-6 items-start">
      {/* Фильтры - сверху на мобильных, справа на десктопе */}
      <Card className="p-4 w-full md:w-[300px] shrink-0 md:sticky md:top-4 md:mt-10 order-1 md:order-2">
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
            className={`flex flex-col gap-4 ${isMobile && !isFiltersExpanded ? "hidden" : ""}`}
          >
            {/* Фильтр по quiz_uid */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("bids.quiz")}</label>

              <Combobox
                items={quizOptions}
                itemToStringValue={(item) => item.label}
                value={
                  quizOptions.find((q) => q.value === filters.quiz_uid) ?? null
                }
                onValueChange={(value) =>
                  handleFilterChange("quiz_uid", value?.value)
                }
              >
                <ComboboxInput
                  placeholder={t("bids.quiz.select")}
                  showClear={!!filters.quiz_uid}
                />
                <ComboboxContent>
                  <ComboboxEmpty>{t("bids.quiz.notFound")}</ComboboxEmpty>
                  <ComboboxList>
                    {(item: { label: string; value: string }) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
                  <SelectItem value="create">
                    {t("bids.status.create")}
                  </SelectItem>
                  <SelectItem value="in_progress">
                    {t("bids.status.in_progress")}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t("bids.status.rejected")}
                  </SelectItem>
                  <SelectItem value="success">
                    {t("bids.status.success")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("bids.status.completed")}
                  </SelectItem>
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

            {hasAccess && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("bids.completed")}
                </label>
                <Select
                  value={
                    search.isFull === "all"
                      ? "all"
                      : search.isFull === "false"
                        ? "false"
                        : "true" // По умолчанию или явный "true"
                  }
                  onValueChange={(value) =>
                    handleFilterChange(
                      "isFull",
                      value === "all" ? "all" : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("bids.completed.yes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("bids.completed.all")}
                    </SelectItem>
                    <SelectItem value="true">
                      {t("bids.completed.yes")}
                    </SelectItem>
                    <SelectItem value="false">
                      {t("bids.completed.no")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-2 space-y-2">
              {hasAccess && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setIsExportDialogOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("bids.export.button")}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResetFilters}
              >
                {t("bids.filters.reset")}
              </Button>
            </div>
            <div></div>
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
                  <p>
                    {t("bids.deleted.inLimit", { count: deletedInLimitFull })}
                  </p>
                )}
                {!hasAccess && (
                  <>
                    <p>
                      {t("bids.available.inLimit", { count: maxAvailableFull })}
                    </p>
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
          {hasAccess && (
            <p className="text-muted-foreground">
              {t("bids.notCompleted.count", { count: totalNotFull })}
            </p>
          )}
        </div>

        {/* Плашка для бесплатного плана - показываем при превышении лимита */}
        {!hasAccess && isLimitExceeded && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-base">
                  {t("bids.buy.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("bids.buy.description", { count: beyondLimitCount })}
                </p>
              </div>
              <Button variant="default" className="shrink-0" asChild>
                <Link to="/app/payment">{t("plans.buy")}</Link>
              </Button>
            </div>
          </Card>
        )}

        {shouldShowUpgradeBanner && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-base">
                  {t("bids.upgrade.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("bids.upgrade.description", { count: beyondLimitCount })}
                </p>
              </div>
              <Button variant="default" className="shrink-0" asChild>
                <Link to="/app/payment">{t("bids.upgrade")}</Link>
              </Button>
            </div>
          </Card>
        )}

        {!hasAccess ? (
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
      {bidDetails ? (
        <BidDetailsDrawer
          open={isDrawerOpen}
          onOpenChange={handleDrawerOpenChange}
          bidDetails={bidDetails}
          isLoading={isLoadingBidDetails}
          isError={isErrorBidDetails}
        />
      ) : null}

      {/* Drawer с дополнительной информацией */}
      <BidInfoDrawer
        open={isInfoDrawerOpen}
        onOpenChange={handleInfoDrawerOpenChange}
        bidDetails={bidInfoDetails}
        isLoading={isLoadingBidInfoDetails}
        isError={isErrorBidInfoDetails}
      />

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        filters={filters}
      />
    </div>
  );
}
