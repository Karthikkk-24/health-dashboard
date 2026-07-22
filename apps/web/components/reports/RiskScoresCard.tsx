import Link from 'next/link';
import type { RiskScores } from '@/types/health';
import { Card } from '@/components/ui/Card';

export function RiskScoresCard({
  riskScores,
  compact = false,
}: {
  riskScores?: RiskScores | null;
  compact?: boolean;
}) {
  const ascvd = riskScores?.ascvd;
  const metabolic = riskScores?.metabolic;
  const empty = !ascvd && !metabolic;

  const needsProfile =
    empty ||
    (ascvd?.status === 'incomplete' && (ascvd.missing?.length ?? 0) > 0) ||
    (metabolic?.status === 'incomplete' &&
      (metabolic.missing?.length ?? 0) > 0);

  return (
    <Card className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={compact ? 'font-semibold' : 'text-lg font-semibold'}>
          Risk scores
        </h2>
        {needsProfile ? (
          <Link
            href="/settings"
            className="text-xs text-accent-glow hover:text-accent"
          >
            Complete profile
          </Link>
        ) : null}
      </div>

      <div className={compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-2'}>
        <div className="rounded-xl border border-border bg-surface2/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            10-year ASCVD
          </p>
          {ascvd?.status === 'ok' ? (
            <>
              <p className="mt-2 font-mono text-3xl font-bold">
                {ascvd.ten_year_pct}%
              </p>
              <p className="mt-1 text-sm capitalize text-muted">
                {ascvd.risk_band} risk band
              </p>
              {!compact ? (
                <p className="mt-2 text-xs text-muted">{ascvd.note}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">Needs profile / labs</p>
              <p className="mt-1 text-xs text-muted">
                Missing:{' '}
                {ascvd?.status === 'incomplete'
                  ? ascvd.missing.join(', ')
                  : 'smoking, diabetes, BP meds, age, sex, lipids, SBP'}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface2/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            Metabolic syndrome
          </p>
          {metabolic?.present === true ? (
            <p className="mt-2 text-lg font-semibold text-warning">
              Criteria met ({metabolic.criteria_met}/
              {metabolic.criteria_needed})
            </p>
          ) : metabolic?.present === false ? (
            <p className="mt-2 text-lg font-semibold">
              Not met ({metabolic.criteria_met}/{metabolic.criteria_needed})
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">Needs more inputs</p>
              {metabolic?.missing?.length ? (
                <p className="mt-1 text-xs text-muted">
                  Missing: {metabolic.missing.join(', ')}
                </p>
              ) : null}
            </>
          )}
          {!compact && metabolic ? (
            <p className="mt-2 text-xs text-muted">{metabolic.note}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
