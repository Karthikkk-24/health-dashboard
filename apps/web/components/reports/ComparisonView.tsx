'use client';

import { ComparisonResult } from '@/types/health';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, formatDate } from '@/lib/utils';

const TREND_STYLES = {
  improved: 'bg-success/15 text-success',
  declined: 'bg-danger/15 text-danger',
  stable: 'bg-muted/20 text-muted',
} as const;

export function ComparisonView({ comparison }: { comparison: ComparisonResult }) {
  const data = comparison.comparison_data;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Comparison result</h3>
            <p className="mt-1 text-sm text-muted">
              {formatDate(data.report_a.report_date)} →{' '}
              {formatDate(data.report_b.report_date)}
            </p>
          </div>
          <Badge className={TREND_STYLES[comparison.overall_trend]}>
            {comparison.overall_trend === 'improved'
              ? 'Health Improved'
              : comparison.overall_trend === 'declined'
                ? 'Health Declined'
                : 'Stable'}
          </Badge>
        </div>
        {comparison.narrative ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {comparison.narrative}
          </p>
        ) : null}
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Metric</th>
              <th className="px-4 py-3 font-medium">Old</th>
              <th className="px-4 py-3 font-medium">New</th>
              <th className="px-4 py-3 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((metric) => (
              <tr key={metric.metric_name} className="border-b border-border/60">
                <td className="px-4 py-3">
                  <div className="font-medium">{metric.metric_name}</div>
                  <div className="text-xs text-muted">{metric.category}</div>
                </td>
                <td className="px-4 py-3 font-mono">
                  {metric.old_value ?? '—'} {metric.unit ?? ''}
                </td>
                <td className="px-4 py-3 font-mono">
                  {metric.new_value ?? '—'} {metric.unit ?? ''}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 font-mono',
                    metric.direction === 'improved' && 'text-success',
                    metric.direction === 'worsened' && 'text-danger',
                    metric.direction === 'stable' && 'text-muted',
                  )}
                >
                  {metric.direction === 'improved'
                    ? '↑'
                    : metric.direction === 'worsened'
                      ? '↓'
                      : '→'}{' '}
                  {metric.change_percent != null
                    ? `${metric.change_percent}%`
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
