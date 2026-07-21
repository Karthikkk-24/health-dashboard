'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '@/lib/chart-theme';
import { ChartTooltip } from './ChartTooltip';

export function BloodPressureChart({
  data,
}: {
  data: Array<{
    date: string;
    systolic: number | null;
    diastolic: number | null;
  }>;
}) {
  const theme = useChartTheme();
  const chartData = data.filter(
    (item) => item.systolic != null || item.diastolic != null,
  );

  if (chartData.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted">
        No blood pressure data yet
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
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
          <Legend
            wrapperStyle={{ color: theme.muted, fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="systolic"
            stroke={theme.accent}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: theme.accent }}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            stroke={theme.accentGlow}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: theme.accentGlow }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
