'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type { HealthAnalysis, HealthMetric, HealthReport } from '@/types/health';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportDetailView } from '@/components/reports/ReportDetailView';

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    report: HealthReport;
    metrics: HealthMetric[];
    analysis: HealthAnalysis | null;
    downloadUrl: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getReport(() => getToken(), reportId);
      setDetail(result);
    } catch (err) {
      setDetail(null);
      setError(
        err instanceof ApiError ? err.message : 'Failed to load report.',
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <EmptyState
        title="Report not found"
        description={error ?? 'This report may have been deleted.'}
        action={
          <Link href="/reports">
            <Button>Back to reports</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/reports"
          className="text-sm text-muted transition-colors hover:text-text"
        >
          ← All reports
        </Link>
        {detail.report.processing_status === 'failed' ? (
          <Button
            variant="ghost"
            onClick={() =>
              void api
                .retryReport(() => getToken(), detail.report.id)
                .then(load)
            }
          >
            Retry analysis
          </Button>
        ) : null}
      </div>

      <ReportDetailView
        report={detail.report}
        metrics={detail.metrics}
        analysis={detail.analysis}
        downloadUrl={detail.downloadUrl}
      />
    </div>
  );
}
