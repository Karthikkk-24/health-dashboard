'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import type {
  ComparisonResult,
  HealthAnalysis,
  HealthMetric,
  HealthReport,
} from '@/types/health';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReportCard } from '@/components/reports/ReportCard';
import { ComparisonView } from '@/components/reports/ComparisonView';
import { RiskBadge } from '@/components/reports/RiskBadge';
import { StatusBadge } from '@/components/reports/StatusBadge';
import { ActionPlanView } from '@/components/reports/ActionPlanView';
import { formatDate, scoreColor } from '@/lib/utils';
import Link from 'next/link';

export default function ReportsPage() {
  const { getToken } = useAuth();
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    report: HealthReport;
    metrics: HealthMetric[];
    analysis: HealthAnalysis | null;
    downloadUrl: string | null;
  } | null>(null);
  const [reportAId, setReportAId] = useState('');
  const [reportBId, setReportBId] = useState('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const completedReports = useMemo(
    () => reports.filter((report) => report.processing_status === 'completed'),
    [reports],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getReports(() => getToken());
      setReports(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void api
      .getReport(() => getToken(), selectedId)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load report.'),
      );
  }, [getToken, selectedId]);

  const runComparison = async () => {
    if (!reportAId || !reportBId) return;
    setComparing(true);
    setError(null);
    try {
      const result = await api.createComparison(
        () => getToken(),
        reportAId,
        reportBId,
      );
      setComparison(result.comparison);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Comparison failed.',
      );
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
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
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {completedReports.length >= 2 ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Compare reports</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted">Earlier / Report A</span>
              <select
                value={reportAId}
                onChange={(event) => setReportAId(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface2 px-4 py-3"
              >
                <option value="">Select report</option>
                {completedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {formatDate(report.report_date)} · {report.file_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted">Later / Report B</span>
              <select
                value={reportBId}
                onChange={(event) => setReportBId(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface2 px-4 py-3"
              >
                <option value="">Select report</option>
                {completedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {formatDate(report.report_date)} · {report.file_name}
                  </option>
                ))}
              </select>
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
          <ReportCard
            key={report.id}
            report={report}
            onView={() => setSelectedId(report.id)}
          />
        ))}
      </div>

      <Modal
        open={Boolean(selectedId && detail)}
        onClose={() => setSelectedId(null)}
        title={detail?.report.file_name ?? 'Report'}
      >
        {detail ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">
                  Report date {formatDate(detail.report.report_date)}
                </p>
                <p
                  className={`mt-2 font-mono text-4xl font-bold ${scoreColor(
                    detail.analysis?.overall_health_score ?? null,
                  )}`}
                >
                  {detail.analysis?.overall_health_score ?? '—'}
                </p>
              </div>
              {detail.downloadUrl ? (
                <a
                  href={detail.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent-glow hover:text-accent"
                >
                  Download original PDF
                </a>
              ) : null}
            </div>

            <section>
              <h3 className="mb-2 font-semibold">Summary</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {detail.analysis?.summary ?? 'No summary available.'}
              </p>
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Things to watch</h3>
              <div className="flex flex-wrap gap-2">
                {(detail.analysis?.risks ?? []).map((risk) => (
                  <RiskBadge key={risk} risk={risk} />
                ))}
              </div>
            </section>

            <ActionPlanView items={detail.analysis?.action_plan ?? []} />

            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Current focus areas</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                  {(detail.analysis?.current_issues ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Keep an eye on</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                  {(detail.analysis?.potential_issues ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2">
                <h3 className="mb-2 font-semibold">Looking good</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                  {(detail.analysis?.positive_indicators ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-semibold">Metrics</h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface2 text-muted">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Value</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.metrics.map((metric) => (
                      <tr key={metric.id} className="border-t border-border">
                        <td className="px-3 py-2">{metric.metric_name}</td>
                        <td className="px-3 py-2 font-mono">
                          {metric.metric_value ?? '—'} {metric.metric_unit}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted">
                          {metric.reference_min != null ||
                          metric.reference_max != null
                            ? `${metric.reference_min ?? '—'} – ${metric.reference_max ?? '—'}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2">{metric.metric_category}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={metric.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
