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

const tooltipStyle = {
  background: '#111827',
  border: '1px solid #1f2d45',
  borderRadius: 12,
};

export function BloodPressureChart({
  data,
}: {
  data: Array<{
    date: string;
    systolic: number | null;
    diastolic: number | null;
  }>;
}) {
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
          <CartesianGrid stroke="#1f2d45" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey="systolic"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
