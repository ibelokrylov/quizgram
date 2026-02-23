import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbandonmentStats, useDailyStats } from '@/entities/Bid/useStatistics';
import { useQuizFilters } from '@/entities/Quiz/useQuizFilters';
import { Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AbandonmentStatsChart } from './AbandonmentStatsChart';
import { DailyStatsChart } from './DailyStatsChart';

export function BidStatisticPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const search = useSearch({ from: '/app/bid/statistic' });

  // Используем значения из URL как источник истины
  const selectedQuizUid = search.quiz_uid || '';
  const startDate = search.start || '';
  const endDate = search.end || '';

  // Получаем список квизов для фильтра
  const { data: quizFilters } = useQuizFilters();

  // Формируем параметры для запроса статистики
  const statsParams = selectedQuizUid
    ? {
        quiz_uid: selectedQuizUid,
        ...(startDate ? { start: startDate } : {}),
        ...(endDate ? { end: endDate } : {}),
      }
    : null;

  // Получаем статистику
  const {
    data: dailyStats,
    isLoading: isLoadingDaily,
    error: dailyError,
  } = useDailyStats(statsParams);
  const {
    data: abandonmentStats,
    isLoading: isLoadingAbandonment,
    error: abandonmentError,
  } = useAbandonmentStats(statsParams);

  // Опции для Combobox
  const quizOptions =
    quizFilters?.map((quiz) => ({
      value: quiz.uid,
      label: quiz.name,
    })) || [];

  // Обработчики изменений
  const handleQuizChange = (value: string | undefined) => {
    // Навигируем на страницу с новым quiz_uid в URL
    navigate({
      to: '/app/bid/statistic',
      search: {
        quiz_uid: value || undefined,
        start: startDate || undefined,
        end: endDate || undefined,
      },
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    // Обновляем URL при изменении даты
    navigate({
      to: '/app/bid/statistic',
      search: {
        quiz_uid: selectedQuizUid || undefined,
        start: newStartDate || undefined,
        end: endDate || undefined,
      },
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    // Обновляем URL при изменении даты
    navigate({
      to: '/app/bid/statistic',
      search: {
        quiz_uid: selectedQuizUid || undefined,
        start: startDate || undefined,
        end: newEndDate || undefined,
      },
    });
  };

  const handleClearFilters = () => {
    // Очищаем URL параметры
    navigate({
      to: '/app/bid/statistic',
      search: {},
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold">{t('bids.statistic.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('bids.statistic.description')}</p>
      </div>

      {/* Фильтры */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('bids.statistic.filters')}</h2>
            {selectedQuizUid ? (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8">
                <X className="h-4 w-4 mr-2" />
                {t('bids.statistic.clearFilters')}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Выбор квиза */}
            <Field>
              <FieldLabel>{t('bids.quiz')}</FieldLabel>
              <Combobox
                options={quizOptions}
                value={selectedQuizUid}
                onValueChange={handleQuizChange}
                placeholder={t('bids.quiz.select')}
                searchPlaceholder={t('bids.quiz.search')}
                emptyText={t('bids.quiz.notFound')}
              />
            </Field>

            {/* Дата начала */}
            <Field>
              <FieldLabel>{t('bids.statistic.startDate')}</FieldLabel>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  disabled={!selectedQuizUid}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </Field>

            {/* Дата окончания */}
            <Field>
              <FieldLabel>{t('bids.statistic.endDate')}</FieldLabel>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  disabled={!selectedQuizUid}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </Field>
          </div>
        </div>
      </Card>

      {/* Графики */}
      {selectedQuizUid ? (
        <div className="flex flex-col gap-6">
          {/* Общая статистика */}
          {isLoadingDaily ? (
            <Card className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-[300px] w-full" />
              </div>
            </Card>
          ) : dailyError ? (
            <Card className="p-6">
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-destructive">{t('bids.statistic.errorLoadingDaily')}</p>
              </div>
            </Card>
          ) : dailyStats ? (
            <DailyStatsChart data={dailyStats} />
          ) : null}

          {/* Статистика по незавершенным */}
          {isLoadingAbandonment ? (
            <Card className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-[300px] w-full" />
              </div>
            </Card>
          ) : abandonmentError ? (
            <Card className="p-6">
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-destructive">{t('bids.statistic.errorLoadingAbandonment')}</p>
              </div>
            </Card>
          ) : abandonmentStats ? (
            <AbandonmentStatsChart data={abandonmentStats} />
          ) : null}
        </div>
      ) : (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('bids.statistic.selectQuiz')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('bids.statistic.selectQuizDescription')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
