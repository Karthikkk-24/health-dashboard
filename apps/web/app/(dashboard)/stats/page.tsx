'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, ApiError } from '@/lib/api';
import type { HealthMetric } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function StatsPage() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsResult, categoriesResult] = await Promise.all([
        api.getMetrics(() => getToken(), {
          category: category || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
        api.getCategories(() => getToken()),
      ]);
      setMetrics(metricsResult.metrics);
      setCategories(categoriesResult.categories);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, [category, from, getToken, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartSeries = useMemo(() => {
    const byName = new Map<string, Array<{ date: string; value: number }>>();
    for (const metric of metrics) {
      if (metric.metric_value == null) continue;
      const list = byName.get(metric.metric_name) ?? [];
      list.push({ date: metric.recorded_at, value: Number(metric.metric_value) });
      byName.set(metric.metric_name, list);
    }
    return Array.from(byName.entries()).slice(0, 6);
  }, [metrics]);

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load stats"
        description={error}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (metrics.length === 0 && !category && !from && !to) {
    return (
      <EmptyState
        title="No metrics yet"
        description="Upload and analyze reports to unlock long-term health stats."
        action={
          <Link href="/upload">
            <Button>Upload a report</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="flex-1 space-y-2 text-sm">
          <span className="text-muted">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface2 px-4 py-3"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 space-y-2 text-sm">
          <span className="text-muted">From</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface2 px-4 py-3"
          />
        </label>
        <label className="flex-1 space-y-2 text-sm">
          <span className="text-muted">To</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface2 px-4 py-3"
          />
        </label>
        <div className="flex gap-2">
          <Button
            variant={view === 'chart' ? 'primary' : 'secondary'}
            onClick={() => setView('chart')}
          >
            Chart
          </Button>
          <Button
            variant={view === 'table' ? 'primary' : 'secondary'}
            onClick={() => setView('table')}
          >
            Table
          </Button>
        </div>
      </Card>

      {view === 'chart' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {chartSeries.length === 0 ? (
            <EmptyState
              title="No matching metrics"
              description="Try adjusting category or date filters."
            />
          ) : (
            chartSeries.map(([name, points]) => (
              <Card key={name}>
                <h3 className="mb-4 font-semibold">{name}</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={points}>
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
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.id} className="border-b border-border/60">
                  <td className="px-4 py-3">{metric.recorded_at}</td>
                  <td className="px-4 py-3">{metric.metric_name}</td>
                  <td className="px-4 py-3 font-mono">
                    {metric.metric_value ?? '—'} {metric.metric_unit}
                  </td>
                  <td className="px-4 py-3">{metric.metric_category}</td>
                  <td className="px-4 py-3">{metric.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
