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
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={theme.muted} tick={{ fontSize: 12 }} />
          <YAxis stroke={theme.muted} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              color: theme.text,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="systolic"
            stroke={theme.accent}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            stroke={theme.accentGlow}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
