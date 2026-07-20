import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { MetricStatus } from '@/types/health';

const STYLES: Record<MetricStatus, string> = {
  normal: 'bg-success/15 text-success',
  borderline: 'bg-warning/15 text-warning',
  out_of_range: 'bg-accent/15 text-accent-glow',
  needs_attention: 'bg-danger/15 text-danger',
};

const LABELS: Record<MetricStatus, string> = {
  normal: 'Normal',
  borderline: 'Borderline',
  out_of_range: 'Out of range',
  needs_attention: 'Needs attention',
};

export function StatusBadge({ status }: { status: MetricStatus | null }) {
  if (!status) {
    return <Badge className="bg-muted/20 text-muted">—</Badge>;
  }
  return (
    <Badge className={cn(STYLES[status])}>{LABELS[status]}</Badge>
  );
}
