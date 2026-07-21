'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type { ComparisonResult } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReportCard } from '@/components/reports/ReportCard';
import { ComparisonView } from '@/components/reports/ComparisonView';
import { SelectField } from '@/components/ui/SelectField';
import { formatDate } from '@/lib/utils';
import { useReports } from '@/lib/queries';

export default function ReportsPage() {
  const { getToken } = useAuth();
  const { data, isPending, isError, error, refetch } = useReports();
  const reports = data?.items ?? [];
  const [reportAId, setReportAId] = useState('');
  const [reportBId, setReportBId] = useState('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const completedReports = useMemo(
    () => reports.filter((report) => report.processing_status === 'completed'),
    [reports],
  );

  const runComparison = async () => {
    if (!reportAId || !reportBId) return;
    setComparing(true);
    setLocalError(null);
    try {
      const result = await api.createComparison(
        () => getToken(),
        reportAId,
        reportBId,
      );
      setComparison(result.comparison);
    } catch (err) {
      setLocalError(
        err instanceof ApiError ? err.message : 'Comparison failed.',
      );
    } finally {
      setComparing(false);
    }
  };

  if (isPending && !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    );
  }

  if (isError && !data) {
    return (
      <EmptyState
        title="Could not load reports"
        description={error instanceof Error ? error.message : 'Unknown error'}
        action={
          <Button variant="secondary" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No reports yet"
        description="Upload a medical PDF to generate your first analysis."
        action={
          <Link href="/upload">
            <Button>Go to upload</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {localError ? <p className="text-sm text-danger">{localError}</p> : null}

      {completedReports.length >= 2 ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Compare reports</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted">Earlier / Report A</span>
              <SelectField
                value={reportAId}
                onChange={(event) => setReportAId(event.target.value)}
              >
                <option value="">Select report</option>
                {completedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {formatDate(report.report_date)} · {report.file_name}
                  </option>
                ))}
              </SelectField>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted">Later / Report B</span>
              <SelectField
                value={reportBId}
                onChange={(event) => setReportBId(event.target.value)}
              >
                <option value="">Select report</option>
                {completedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {formatDate(report.report_date)} · {report.file_name}
                  </option>
                ))}
              </SelectField>
            </label>
          </div>
          <Button
            onClick={() => void runComparison()}
            disabled={!reportAId || !reportBId || comparing}
          >
            {comparing ? 'Comparing…' : 'Compare reports'}
          </Button>
          {comparison ? <ComparisonView comparison={comparison} /> : null}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}
