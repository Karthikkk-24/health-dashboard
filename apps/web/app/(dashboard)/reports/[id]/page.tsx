'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportDetailView } from '@/components/reports/ReportDetailView';
import { useReport, useRetryReport } from '@/lib/queries';
import { api, ApiError } from '@/lib/api';

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const { getToken } = useAuth();
  const { data: detail, isPending, isError, error, refetch } =
    useReport(reportId);
  const retry = useRetryReport();
  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadClinicianPdf = async () => {
    if (!reportId) return;
    setPdfLoading(true);
    try {
      const blob = await api.downloadClinicianPdf(
        async () => getToken({ skipCache: true }),
        reportId,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinician-summary-${detail?.report.report_date ?? reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    } finally {
      setPdfLoading(false);
    }
  };

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
        onDownloadClinicianPdf={() => void downloadClinicianPdf()}
        clinicianPdfLoading={pdfLoading}
      />
    </div>
  );
}
