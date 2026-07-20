'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '@/lib/chart-theme';

export function CholesterolChart({
  data,
}: {
  data: {
    ldl: number | null;
    hdl: number | null;
    total: number | null;
    triglycerides: number | null;
  };
}) {
  const theme = useChartTheme();
  const chartData = [
    { name: 'LDL', value: data.ldl },
    { name: 'HDL', value: data.hdl },
    { name: 'Total', value: data.total },
    { name: 'Triglycerides', value: data.triglycerides },
  ].filter((item) => item.value != null);

  if (chartData.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted">
        No cholesterol data yet
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke={theme.muted} tick={{ fontSize: 12 }} />
          <YAxis stroke={theme.muted} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              color: theme.text,
            }}
          />
          <Bar dataKey="value" fill={theme.accent} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
