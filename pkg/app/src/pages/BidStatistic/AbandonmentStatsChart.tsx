'use client';

import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { AbandonmentStats } from '@/entities/Bid/statistics.type';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';

interface AbandonmentStatsChartProps {
  data: AbandonmentStats;
}

// Генерация цвета на основе HSL для создания палитры
function generateColor(index: number, total: number): string {
  // Используем HSL для создания плавной палитры
  // Начинаем с оранжевого (30°) и идем к зеленому (120°)
  const hue = 30 + (index / total) * 90;
  const saturation = 70 + (index % 3) * 10; // Вариация насыщенности
  const lightness = 50 - (index % 2) * 5; // Вариация яркости

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function AbandonmentStatsChart({ data }: AbandonmentStatsChartProps) {
  // Определяем максимальное количество вопросов из всех дней
  const maxQuestionNumber = Math.max(
    0,
    ...data.daily.flatMap((item) => item.by_question.map((q) => q.question_number))
  );

  // Создаем динамическую конфигурацию для всех вопросов
  const dropoffChartConfig = useMemo(() => {
    const config: ChartConfig = {
      no_answers: {
        label: 'Без ответов',
        color: '#ef4444',
      },
      completed_no_contacts: {
        label: 'Без контактов',
        color: '#8b5cf6',
      },
    };

    // Добавляем конфигурацию для каждого вопроса
    for (let i = 1; i <= maxQuestionNumber; i++) {
      const questionKey = `question_${i}`;
      config[questionKey] = {
        label: `${i} ${i === 1 ? 'вопрос' : i < 5 ? 'вопроса' : 'вопросов'}`,
        color: generateColor(i - 1, maxQuestionNumber),
      };
    }

    return config;
  }, [maxQuestionNumber]);

  // Форматируем данные для графика
  const chartData = useMemo(() => {
    return data.daily.map((item) => {
      const result: Record<string, number | string> = {
        date: item.date,
        no_answers: item.no_answers,
        completed_no_contacts: item.completed_no_contacts,
      };

      // Добавляем данные для каждого вопроса
      for (let i = 1; i <= maxQuestionNumber; i++) {
        const questionKey = `question_${i}`;
        const count = item.by_question
          .filter((q) => q.question_number === i)
          .reduce((sum, q) => sum + q.count, 0);
        result[questionKey] = count;
      }

      return result;
    });
  }, [data.daily, maxQuestionNumber]);

  // Форматируем дату для отображения (показываем день и месяц)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Статистика по незавершенным квизам</h3>
        <p className="text-sm text-muted-foreground">
          Период: {data.period.start} - {data.period.end}
        </p>
        <p className="text-xs text-muted-foreground">
          Обновлено:{' '}
          {new Date(data.generated_at).toLocaleString('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
      </div>

      {/* График отвалов по вопросам */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium">Отвал на вопросах</h4>
            <p className="text-sm text-muted-foreground">
              Пользователи, которые вышли на разных этапах прохождения
            </p>
          </div>
          <ChartContainer config={dropoffChartConfig} className="min-h-[350px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="fillNoAnswers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-no_answers)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-no_answers)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillCompletedNoContacts" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-completed_no_contacts)"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-completed_no_contacts)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                {/* Градиенты для каждого вопроса */}
                {Array.from({ length: maxQuestionNumber }, (_, i) => {
                  const questionNumber = i + 1;
                  const questionKey = `question_${questionNumber}`;
                  return (
                    <linearGradient
                      key={`gradient-${questionKey}`}
                      id={`fill${questionKey}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={`var(--color-${questionKey})`}
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="95%"
                        stopColor={`var(--color-${questionKey})`}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="no_answers"
                stroke="var(--color-no_answers)"
                fill="url(#fillNoAnswers)"
                strokeWidth={2}
              />
              {/* Рендерим области для каждого вопроса */}
              {Array.from({ length: maxQuestionNumber }, (_, i) => {
                const questionNumber = i + 1;
                const questionKey = `question_${questionNumber}`;
                return (
                  <Area
                    key={questionKey}
                    type="monotone"
                    dataKey={questionKey}
                    stroke={`var(--color-${questionKey})`}
                    fill={`url(#fill${questionKey})`}
                    strokeWidth={1.5}
                  />
                );
              })}
              {/* Область для отвала на контактах */}
              <Area
                type="monotone"
                dataKey="completed_no_contacts"
                stroke="var(--color-completed_no_contacts)"
                fill="url(#fillCompletedNoContacts)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </Card>
    </div>
  );
}
