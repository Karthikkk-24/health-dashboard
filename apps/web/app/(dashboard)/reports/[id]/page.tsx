'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportDetailView } from '@/components/reports/ReportDetailView';
import { useReport, useRetryReport } from '@/lib/queries';

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const { data: detail, isPending, isError, error, refetch } =
    useReport(reportId);
  const retry = useRetryReport();

  if (isPending && !detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <EmptyState
        title="Report not found"
        description={
          error instanceof Error
            ? error.message
            : 'This report may have been deleted.'
        }
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
            disabled={retry.isPending}
            onClick={() =>
              void retry.mutateAsync(detail.report.id).then(() => refetch())
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
