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
import { scoreColor } from '@/lib/utils';

export function TrendChart({
  data,
}: {
  data: Array<{ date: string; score: number | null }>;
}) {
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
          <CartesianGrid stroke="#1f2d45" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #1f2d45',
              borderRadius: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#60a5fa"
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
    <div className="flex flex-col items-center justify-center py-4">
      <div
        className={`font-mono text-5xl font-bold ${scoreColor(score)}`}
      >
        {score ?? '—'}
      </div>
      <p className="mt-2 text-sm text-muted">Overall health score</p>
    </div>
  );
}
