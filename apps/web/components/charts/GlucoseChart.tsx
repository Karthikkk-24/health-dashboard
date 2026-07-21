'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '@/lib/chart-theme';
import { ChartTooltip } from './ChartTooltip';

export function GlucoseChart({
  data,
}: {
  data: Array<{
    date: string;
    value: number | null;
    unit: string | null;
    name: string;
  }>;
}) {
  const theme = useChartTheme();
  const chartData = data.filter((item) => item.value != null);

  if (chartData.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted">
        No glucose data yet
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="glucoseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.success} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={theme.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke={theme.muted}
            tick={{ fill: theme.muted, fontSize: 12 }}
            axisLine={{ stroke: theme.border }}
            tickLine={false}
          />
          <YAxis
            stroke={theme.muted}
            tick={{ fill: theme.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: theme.border, strokeWidth: 1 }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={theme.success}
            fill="url(#glucoseFill)"
            strokeWidth={2}
            activeDot={{ r: 4, fill: theme.success }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
