import type { HealthAnalysis, HealthMetric, HealthReport } from '@/types/health';
import { Card } from '@/components/ui/Card';
import { RiskBadge } from '@/components/reports/RiskBadge';
import { StatusBadge } from '@/components/reports/StatusBadge';
import { ActionPlanView } from '@/components/reports/ActionPlanView';
import { RiskScoresCard } from '@/components/reports/RiskScoresCard';
import { ReportChatPanel } from '@/components/reports/ReportChatPanel';
import { formatDate, scoreColor } from '@/lib/utils';

export function ReportDetailView({
  report,
  metrics,
  analysis,
  downloadUrl,
  onDownloadClinicianPdf,
  clinicianPdfLoading = false,
}: {
  report: HealthReport;
  metrics: HealthMetric[];
  analysis: HealthAnalysis | null;
  downloadUrl: string | null;
  onDownloadClinicianPdf?: () => void;
  clinicianPdfLoading?: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {report.file_name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Report date {formatDate(report.report_date)}
            </p>
            <p
              className={`mt-4 font-mono text-5xl font-bold ${scoreColor(
                analysis?.overall_health_score ?? null,
              )}`}
            >
              {analysis?.overall_health_score ?? '—'}
            </p>
            <p className="mt-1 text-xs text-muted">Health score</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-accent-glow hover:text-accent"
              >
                Download original PDF
              </a>
            ) : null}
            {onDownloadClinicianPdf ? (
              <button
                type="button"
                onClick={onDownloadClinicianPdf}
                disabled={clinicianPdfLoading}
                className="text-sm font-medium text-accent-glow hover:text-accent disabled:opacity-50"
              >
                {clinicianPdfLoading
                  ? 'Preparing summary…'
                  : 'Download clinician summary'}
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <RiskScoresCard riskScores={analysis?.risk_scores} />

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Summary</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {analysis?.summary ?? 'No summary available.'}
        </p>
      </Card>

      {(analysis?.risks?.length ?? 0) > 0 ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Things to watch</h2>
          <div className="flex flex-wrap gap-2">
            {(analysis?.risks ?? []).map((risk) => (
              <RiskBadge key={risk} risk={risk} />
            ))}
          </div>
        </Card>
      ) : null}

      <ActionPlanView items={analysis?.action_plan ?? []} />

      <ReportChatPanel reportId={report.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Current focus areas</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {(analysis?.current_issues ?? []).length > 0 ? (
              (analysis?.current_issues ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))
            ) : (
              <li>None flagged</li>
            )}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Keep an eye on</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {(analysis?.potential_issues ?? []).length > 0 ? (
              (analysis?.potential_issues ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))
            ) : (
              <li>Nothing extra to track</li>
            )}
          </ul>
        </Card>
        <Card className="md:col-span-2">
          <h2 className="mb-3 font-semibold">Looking good</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {(analysis?.positive_indicators ?? []).length > 0 ? (
              (analysis?.positive_indicators ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))
            ) : (
              <li>No positive notes yet</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Metrics</h2>
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
              {metrics.map((metric) => (
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
      </Card>
    </div>
  );
}
