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
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2d45" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #1f2d45',
              borderRadius: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            fill="url(#glucoseFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
