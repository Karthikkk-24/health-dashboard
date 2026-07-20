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
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={theme.muted} tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} stroke={theme.muted} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              color: theme.text,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={theme.accentGlow}
            strokeWidth={2}
            dot={{ r: 3 }}
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
