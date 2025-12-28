"use client";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyStats } from "@/entities/Bid/statistics.type";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface DailyStatsChartProps {
  data: DailyStats;
}

const viewsChartConfig = {
  total_opens: {
    label: "Всего открытий",
    color: "#8884d8",
  },
  unique_opens: {
    label: "Уникальных открытий",
    color: "#82ca9d",
  },
  repeated_opens: {
    label: "Неуникальных открытий",
    color: "#ffc658",
  },
} satisfies ChartConfig;

const completionChartConfig = {
  completed: {
    label: "Пройденных",
    color: "#10b981",
  },
  not_completed: {
    label: "Не пройденных",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function DailyStatsChart({ data }: DailyStatsChartProps) {
  // Форматируем данные для графика
  const chartData = data.daily.map((item) => ({
    date: item.date,
    total_opens: item.total_opens,
    unique_opens: item.unique_opens,
    repeated_opens: item.repeated_opens,
    completed: item.completed,
    not_completed: item.not_completed,
  }));

  // Форматируем дату для отображения (показываем день и месяц)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Общая статистика по дням</h3>
        <p className="text-sm text-muted-foreground">
          Период: {data.period.start} - {data.period.end}
        </p>
        <p className="text-xs text-muted-foreground">
          Обновлено:{" "}
          {new Date(data.generated_at).toLocaleString("ru-RU", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>
      </div>

      {/* График просмотров */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium">Просмотры квизов</h4>
            <p className="text-sm text-muted-foreground">Динамика открытий квиза</p>
          </div>
          <ChartContainer config={viewsChartConfig} className="min-h-[350px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="fillTotalOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total_opens)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-total_opens)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillUniqueOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-unique_opens)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-unique_opens)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillRepeatedOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-repeated_opens)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-repeated_opens)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="total_opens"
                stroke="var(--color-total_opens)"
                fill="url(#fillTotalOpens)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="unique_opens"
                stroke="var(--color-unique_opens)"
                fill="url(#fillUniqueOpens)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="repeated_opens"
                stroke="var(--color-repeated_opens)"
                fill="url(#fillRepeatedOpens)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </Card>

      {/* График завершения */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium">Завершение квизов</h4>
            <p className="text-sm text-muted-foreground">
              Соотношение пройденных и незавершенных квизов
            </p>
          </div>
          <ChartContainer config={completionChartConfig} className="min-h-[350px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillNotCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-not_completed)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-not_completed)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="var(--color-completed)"
                fill="url(#fillCompleted)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="not_completed"
                stroke="var(--color-not_completed)"
                fill="url(#fillNotCompleted)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </Card>
    </div>
  );
}
