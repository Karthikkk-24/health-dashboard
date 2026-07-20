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
          <CartesianGrid stroke="#1f2d45" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #1f2d45',
              borderRadius: 12,
            }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
