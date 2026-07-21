'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '@/lib/chart-theme';
import { scoreColor } from '@/lib/utils';
import { ChartTooltip } from './ChartTooltip';

export function TrendChart({
  data,
}: {
  data: Array<{ date: string; score: number | null }>;
}) {
  const theme = useChartTheme();
  const chartData = data.filter((item) => item.score != null);

  if (chartData.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted">
        No health score trend yet
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
            domain={[0, 100]}
            stroke={theme.muted}
            tick={{ fill: theme.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: theme.border, strokeWidth: 1 }}
            content={<ChartTooltip />}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={theme.accentGlow}
            strokeWidth={2}
            dot={{ r: 3, fill: theme.accentGlow, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: theme.accent }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HealthScoreCard({ score }: { score: number | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-2 text-center">
      <p className="text-sm text-muted">Overall health score</p>
      <div className={`mt-3 font-mono text-5xl font-bold ${scoreColor(score)}`}>
        {score ?? '—'}
      </div>
    </div>
  );
}
