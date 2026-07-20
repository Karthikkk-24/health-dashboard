import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const RISK_STYLES: Record<string, string> = {
  low: 'bg-success/15 text-success',
  moderate: 'bg-warning/15 text-warning',
  high: 'bg-danger/15 text-danger',
  critical: 'bg-danger/25 text-danger',
};

function inferLevel(risk: string): keyof typeof RISK_STYLES {
  const lower = risk.toLowerCase();
  if (lower.includes('critical') || lower.includes('severe')) return 'critical';
  if (lower.includes('high') || lower.includes('elevated')) return 'high';
  if (lower.includes('moderate') || lower.includes('borderline')) return 'moderate';
  return 'low';
}

export function RiskBadge({ risk }: { risk: string }) {
  const level = inferLevel(risk);
  return (
    <Badge className={cn('max-w-full truncate', RISK_STYLES[level])}>
      {risk}
    </Badge>
  );
}
