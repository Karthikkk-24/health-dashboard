'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '@/lib/chart-theme';
import { ChartTooltip, barHoverCursor } from './ChartTooltip';

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

  const barColors = [
    theme.accent,
    theme.accentGlow,
    theme.accent,
    theme.success,
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="28%">
          <CartesianGrid
            stroke={theme.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="name"
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
            cursor={barHoverCursor(theme.accent)}
            content={<ChartTooltip />}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={barColors[index % barColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
