'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type { DashboardData } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BloodPressureChart } from '@/components/charts/BloodPressureChart';
import { CholesterolChart } from '@/components/charts/CholesterolChart';
import { GlucoseChart } from '@/components/charts/GlucoseChart';
import {
  HealthScoreCard,
  TrendChart,
} from '@/components/charts/HealthScoreCard';
import { RiskBadge } from '@/components/reports/RiskBadge';
import { ActionPlanView } from '@/components/reports/ActionPlanView';
import { ProfileIncompleteBanner } from '@/components/layout/ProfileIncompleteBanner';
import { formatDate, scoreColor } from '@/lib/utils';

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await api.getDashboard(() => getToken());
      setData(dashboard);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={error}
        action={
          <Button onClick={() => void load()} variant="secondary">
            Retry
          </Button>
        }
      />
    );
  }

  if (!data || data.stats.totalReports === 0) {
    return (
      <EmptyState
        title="No reports yet"
        description="Upload your first medical PDF to unlock charts, risks, and progress tracking."
        action={
          <Link href="/upload">
            <Button>Upload a report</Button>
          </Link>
        }
      />
    );
  }

  const stats = [
    {
      label: 'Total reports',
      value: String(data.stats.totalReports),
    },
    {
      label: 'Latest health score',
      value: data.stats.latestHealthScore ?? '—',
      className: scoreColor(data.stats.latestHealthScore),
    },
    {
      label: 'Last report date',
      value: formatDate(data.stats.lastReportDate),
    },
    {
      label: 'Reports this month',
      value: String(data.stats.reportsThisMonth),
    },
  ];

  return (
    <div className="space-y-6">
      <ProfileIncompleteBanner show={data.profileComplete === false} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-muted">{stat.label}</p>
            <p
              className={`mt-3 font-mono text-3xl font-bold ${stat.className ?? ''}`}
            >
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Blood pressure trend</h2>
          <BloodPressureChart data={data.bloodPressureTrend} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Cholesterol breakdown</h2>
          <CholesterolChart data={data.cholesterolBreakdown} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Glucose levels</h2>
          <GlucoseChart data={data.glucoseTrend} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Health score trend</h2>
          <TrendChart data={data.healthScoreTrend} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Latest analysis</h2>
            {data.latestAnalysis ? (
              <Link
                href="/reports"
                className="text-sm text-accent-glow hover:text-accent"
              >
                View full report
              </Link>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {data.latestAnalysis?.summary ?? 'No analysis available yet.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(data.latestAnalysis?.risks ?? []).map((risk) => (
              <RiskBadge key={risk} risk={risk} />
            ))}
          </div>
          {(data.latestAnalysis?.action_plan?.length ?? 0) > 0 ? (
            <div className="mt-6 border-t border-border pt-4">
              <ActionPlanView
                items={(data.latestAnalysis?.action_plan ?? []).slice(0, 6)}
              />
              {(data.latestAnalysis?.action_plan?.length ?? 0) > 6 ? (
                <Link
                  href="/reports"
                  className="mt-3 inline-block text-sm text-accent-glow hover:text-accent"
                >
                  See full improvement plan
                </Link>
              ) : null}
            </div>
          ) : null}
        </Card>
        <Card>
          <HealthScoreCard score={data.stats.latestHealthScore} />
        </Card>
      </div>
    </div>
  );
}
