import { useContext, useEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useInfiniteBids } from "@/entities/Bid/useBids";
import { useQuizUuids } from "@/entities/Quiz/useQuizUuids";
import { AuthContext } from "@/entities/User/auth.context";
import { Card } from "@/components/ui/card";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { BidsTableFree } from "./BidsTableFree";
import { BidsTableBase } from "./BidsTableBase";
import type { BidsListFilters } from "@/entities/Bid/bid.type";

export function BidsReportPage() {
  // Получаем search params из URL
  const search = useSearch({ from: "/app/bid/report" });
  const navigate = useNavigate({ from: "/app/bid/report" });
  const { user } = useContext(AuthContext);
  
  // Проверяем, является ли план FREE (planId === 1)
  const isFreePlan = user?.planId === 1;

  // Используем search params как источник истины для фильтров
  const filters: Omit<BidsListFilters, 'offset'> = {
    quiz_uid: search.quiz_uid,
    status: search.status,
    isFull: search.isFull === "true" ? true : search.isFull === "false" ? false : undefined,
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
  const { data: quizUuids = [], isLoading: isLoadingQuizzes } = useQuizUuids();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteBids(filters);

  // Intersection Observer для бесконечного скролла
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleFilterChange = (key: keyof BidsListFilters, value: string | boolean | number | undefined) => {
    let newValue: string | number | undefined = value === "" ? undefined : value;
    
    // Для boolean значений конвертируем в строку для URL
    if (key === "isFull" && typeof newValue === "boolean") {
      newValue = String(newValue);
    }
    
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

  // Преобразуем список квизов в опции для Combobox
  const quizOptions = quizUuids.map((quiz) => ({
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
    return (
      <div className="p-4">
        <Card className="p-4">
          <p className="text-destructive">
            Ошибка при загрузке заявок: {error instanceof Error ? error.message : "Неизвестная ошибка"}
          </p>
        </Card>
      </div>
    );
  }

  const bids = data?.pages.flatMap((page) => page.data) || [];
  const total = data?.pages[0]?.total || 0;
  const totalNotFull = data?.pages[0]?.totalNotFull || 0;

  return (
    <div className="p-4 flex flex-col md:flex-row gap-6 items-start">
      {/* Фильтры - сверху на мобильных, справа на десктопе */}
      <Card className="p-4 w-full md:w-[300px] shrink-0 md:sticky md:top-4 md:mt-[2.5rem] order-1 md:order-2">
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Фильтры</h2>
          
          {/* Фильтр по quiz_uid */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Квиз</label>
            <Combobox
              options={quizOptions}
              value={filters.quiz_uid}
              onValueChange={(value) => handleFilterChange("quiz_uid", value)}
              placeholder="Выберите квиз..."
              searchPlaceholder="Поиск по названию..."
              emptyText="Квизы не найдены"
            />
          </div>

          {/* Фильтр по status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Статус</label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) => handleFilterChange("status", value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="create">Создано</SelectItem>
                <SelectItem value="in_progress">В процессе</SelectItem>
                <SelectItem value="rejected">Отклонено</SelectItem>
                <SelectItem value="success">Успешно</SelectItem>
                <SelectItem value="completed">Завершено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Фильтр по isFull - только для планов отличных от FREE */}
          {!isFreePlan && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Пройден</label>
              <Select
                value={
                  filters.isFull === undefined 
                    ? "true" 
                    : filters.isFull === true 
                      ? "true" 
                      : "false"
                }
                onValueChange={(value) =>
                  handleFilterChange("isFull", value === "all" ? undefined : value === "true")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Да" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="true">Да</SelectItem>
                  <SelectItem value="false">Нет</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Кнопки управления фильтрами */}
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={handleResetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        </div>
      </Card>

      {/* Левая колонка: Список заявок */}
      <div className="flex-1 space-y-4 w-full order-2 md:order-1">
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground">Завершено: {total}</p>
          {!isFreePlan && (
            <p className="text-muted-foreground">Не завершено: {totalNotFull}</p>
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
    </div>
  );
}
