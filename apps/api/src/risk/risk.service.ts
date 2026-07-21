import { Injectable } from '@nestjs/common';
import { DbUser } from '../common/dto/database.types';
import { enrichProfile } from '../pdf/health-insights';
import {
  computeRiskScores,
  RiskProfileInputs,
  RiskScoresPayload,
} from './risk-calculators';
import type { MetricLike } from './metric-lookup';

@Injectable()
export class RiskService {
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

  compute(
    metrics: MetricLike[],
    user: DbUser,
  ): RiskScoresPayload {
    return computeRiskScores(metrics, this.buildProfileInputs(user));
  }
}
