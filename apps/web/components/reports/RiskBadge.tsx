import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const RISK_STYLES: Record<string, string> = {
  attention: 'bg-danger/15 text-danger',
  watch: 'bg-warning/15 text-warning',
  info: 'bg-accent/15 text-accent-glow',
};

function inferTone(risk: string): keyof typeof RISK_STYLES {
  const lower = risk.toLowerCase();
  if (
    lower.includes('needs a timely') ||
    lower.includes('clinician review') ||
    lower.includes('doctor')
  ) {
    return 'attention';
  }
  if (lower.includes('slightly') || lower.includes('borderline') || lower.includes('eye on')) {
    return 'watch';
  }
  return 'info';
}

export function RiskBadge({ risk }: { risk: string }) {
  const tone = inferTone(risk);
  return (
    <Badge className={cn('max-w-full text-left whitespace-normal', RISK_STYLES[tone])}>
      {risk}
    </Badge>
  );
}
