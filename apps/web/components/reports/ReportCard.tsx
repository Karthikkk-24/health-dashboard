import Link from 'next/link';
import { HealthReport } from '@/types/health';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate, scoreColor, cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted/20 text-muted',
  processing: 'bg-accent/15 text-accent-glow',
  completed: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
};

export function ReportCard({ report }: { report: HealthReport }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{report.file_name}</h3>
          <p className="mt-1 text-sm text-muted">
            Report date {formatDate(report.report_date)}
          </p>
        </div>
        <Badge className={STATUS_STYLES[report.processing_status]}>
          {report.processing_status}
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted">Health score</p>
          <p
            className={cn(
              'font-mono text-2xl font-bold',
              scoreColor(report.health_score ?? null),
            )}
          >
            {report.health_score ?? '—'}
          </p>
        </div>
        <Link
          href={`/reports/${report.id}`}
          className="text-sm font-medium text-accent-glow hover:text-accent"
        >
          View analysis
        </Link>
      </div>
    </Card>
  );
}
