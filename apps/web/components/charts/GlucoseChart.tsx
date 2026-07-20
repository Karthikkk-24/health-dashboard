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
              <stop offset="5%" stopColor={theme.success} stopOpacity={0.35} />
              <stop offset="95%" stopColor={theme.success} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="value"
            stroke={theme.success}
            fill="url(#glucoseFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
