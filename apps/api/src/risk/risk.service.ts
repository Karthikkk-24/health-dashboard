import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import {
  DbHealthAnalysis,
  DbHealthMetric,
  DbUser,
  RiskScores,
} from '../common/dto/database.types';
import { enrichProfile } from '../pdf/health-insights';
import {
  computeRiskScores,
  RiskProfileInputs,
  RiskScoresPayload,
} from './risk-calculators';
import type { MetricLike } from './metric-lookup';

export function riskScoresNeedCompute(
  scores: RiskScores | null | undefined,
): boolean {
  if (!scores) return true;
  if (scores.ascvd == null || scores.metabolic == null) return true;
  if (scores.ascvd.status === 'incomplete') return true;
  if (scores.metabolic.status === 'incomplete') return true;
  return false;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: AppCacheService,
  ) {}

  buildProfileInputs(user: DbUser): RiskProfileInputs {
    const enriched = enrichProfile({
      date_of_birth: user.date_of_birth,
      sex: user.sex,
      height_cm: user.height_cm != null ? Number(user.height_cm) : null,
      weight_kg: user.weight_kg != null ? Number(user.weight_kg) : null,
      activity_level: user.activity_level,
    });

    return {
      age_years: enriched.age_years ?? null,
      sex: user.sex,
      bmi: enriched.bmi ?? null,
      smoker: user.smoker,
      has_diabetes: user.has_diabetes,
      on_bp_medication: user.on_bp_medication,
    };
  }

  compute(metrics: MetricLike[], user: DbUser): RiskScoresPayload {
    return computeRiskScores(metrics, this.buildProfileInputs(user));
  }

  async recomputeForReport(
    user: DbUser,
    reportId: string,
  ): Promise<RiskScoresPayload | null> {
    const [{ data: metricsData }, { data: analysis }] = await Promise.all([
      this.supabase.db
        .from('health_metrics')
        .select('metric_name, metric_value, status')
        .eq('report_id', reportId)
        .eq('user_id', user.id),
      this.supabase.db
        .from('health_analyses')
        .select('id')
        .eq('report_id', reportId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!analysis?.id) {
      return null;
    }

    const metrics = (metricsData ?? []) as MetricLike[];
    const riskScores = this.compute(metrics, user);

    const { error } = await this.supabase.db
      .from('health_analyses')
      .update({ risk_scores: riskScores })
      .eq('id', analysis.id);

    if (error) {
      this.logger.warn(
        `Failed to persist risk_scores for report ${reportId}: ${error.message}`,
      );
      return riskScores;
    }

    this.cache.invalidateUser(user.id);
    return riskScores;
  }

  async ensureAnalysisRiskScores(
    user: DbUser,
    analysis: DbHealthAnalysis | null,
    metrics: DbHealthMetric[],
  ): Promise<DbHealthAnalysis | null> {
    if (!analysis) return null;
    if (!riskScoresNeedCompute(analysis.risk_scores)) {
      return analysis;
    }

    const previousJson = JSON.stringify(analysis.risk_scores ?? {});
    const riskScores = this.compute(
      metrics.map((m) => ({
        metric_name: m.metric_name,
        metric_value: m.metric_value,
        status: m.status,
      })),
      user,
    );
    const nextJson = JSON.stringify(riskScores);
    const changed = previousJson !== nextJson;

    if (!changed) {
      return { ...analysis, risk_scores: riskScores };
    }

    const { error } = await this.supabase.db
      .from('health_analyses')
      .update({ risk_scores: riskScores })
      .eq('id', analysis.id);

    if (error) {
      this.logger.warn(
        `Lazy risk_scores persist failed for ${analysis.id}: ${error.message}`,
      );
    } else {
      this.cache.invalidateUser(user.id);
    }

    return { ...analysis, risk_scores: riskScores };
  }

  async recomputeAllForUser(user: DbUser): Promise<void> {
    const { data: reports } = await this.supabase.db
      .from('health_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('processing_status', 'completed');

    const ids = (reports ?? []).map((r: { id: string }) => r.id);
    if (ids.length === 0) return;

    for (const reportId of ids) {
      try {
        await this.recomputeForReport(user, reportId);
      } catch (error) {
        this.logger.warn(
          `recomputeAllForUser failed for ${reportId}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
  }
}
