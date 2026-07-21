import {
  findMetricValue,
  METRIC_PATTERNS,
  type MetricLike,
} from './metric-lookup';

export type RiskProfileInputs = {
  age_years: number | null;
  sex: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  bmi: number | null;
  smoker: boolean | null;
  has_diabetes: boolean | null;
  on_bp_medication: boolean | null;
};

export type IncompleteRisk = {
  status: 'incomplete';
  missing: string[];
};

export type AscvdResult =
  | IncompleteRisk
  | {
      status: 'ok';
      ten_year_pct: number;
      risk_band: 'low' | 'borderline' | 'intermediate' | 'high';
      note: string;
    };

export type MetabolicFlag = {
  key: string;
  label: string;
  present: boolean;
  detail: string;
};

export type MetabolicResult = {
  status: 'ok' | 'incomplete';
  present: boolean | null;
  criteria_met: number;
  criteria_needed: number;
  flags: MetabolicFlag[];
  missing: string[];
  note: string;
};

export type RiskScoresPayload = {
  ascvd: AscvdResult;
  metabolic: MetabolicResult;
  computed_at: string;
};

/** ATP III–style metabolic syndrome screening (proxy rules). */
export function computeMetabolicSyndrome(
  metrics: MetricLike[],
  profile: RiskProfileInputs,
): MetabolicResult {
  const missing: string[] = [];
  const flags: MetabolicFlag[] = [];

  const bmi = profile.bmi;
  const waistProxy = bmi != null && bmi >= 30;
  if (bmi == null) {
    missing.push('BMI (height/weight)');
  }
  flags.push({
    key: 'central_obesity',
    label: 'Central obesity (BMI ≥ 30 proxy)',
    present: waistProxy,
    detail:
      bmi != null
        ? `BMI ${bmi.toFixed(1)}`
        : 'Waist circumference unavailable; BMI not set',
  });

  const trig = findMetricValue(metrics, [...METRIC_PATTERNS.triglycerides]);
  if (trig == null) missing.push('Triglycerides');
  flags.push({
    key: 'triglycerides',
    label: 'Triglycerides ≥ 150 mg/dL',
    present: trig != null && trig >= 150,
    detail: trig != null ? `${trig} mg/dL` : 'Not in report',
  });

  const hdl = findMetricValue(metrics, [...METRIC_PATTERNS.hdl]);
  const sex = profile.sex;
  const hdlThreshold = sex === 'female' ? 50 : 40;
  if (hdl == null) missing.push('HDL');
  if (sex !== 'male' && sex !== 'female') {
    missing.push('Sex (for HDL threshold)');
  }
  flags.push({
    key: 'hdl',
    label:
      sex === 'female'
        ? 'HDL < 50 mg/dL'
        : sex === 'male'
          ? 'HDL < 40 mg/dL'
          : 'Low HDL (sex-specific)',
    present:
      hdl != null &&
      (sex === 'male' || sex === 'female') &&
      hdl < hdlThreshold,
    detail: hdl != null ? `${hdl} mg/dL` : 'Not in report',
  });

  const sbp = findMetricValue(metrics, [...METRIC_PATTERNS.systolic]);
  const onBpMeds = profile.on_bp_medication === true;
  if (sbp == null && !onBpMeds) missing.push('Systolic BP');
  flags.push({
    key: 'blood_pressure',
    label: 'BP ≥ 130 systolic or on BP medication',
    present: onBpMeds || (sbp != null && sbp >= 130),
    detail: onBpMeds
      ? 'On BP medication'
      : sbp != null
        ? `SBP ${sbp} mmHg`
        : 'Not in report',
  });

  const glucose = findMetricValue(metrics, [...METRIC_PATTERNS.fastingGlucose]);
  const hba1c = findMetricValue(metrics, [...METRIC_PATTERNS.hba1c]);
  const glucoseFlag =
    (glucose != null && glucose >= 100) ||
    (hba1c != null && hba1c >= 5.7) ||
    profile.has_diabetes === true;
  if (glucose == null && hba1c == null && profile.has_diabetes == null) {
    missing.push('Fasting glucose, HbA1c, or diabetes status');
  }
  flags.push({
    key: 'glucose',
    label: 'Fasting glucose ≥ 100, HbA1c ≥ 5.7, or diabetes',
    present: glucoseFlag,
    detail: profile.has_diabetes
      ? 'Diabetes flagged in profile'
      : glucose != null
        ? `Glucose ${glucose}`
        : hba1c != null
          ? `HbA1c ${hba1c}%`
          : 'Not available',
  });

  const criteriaMet = flags.filter((f) => f.present).length;
  const present = criteriaMet >= 3;

  return {
    status: missing.length >= 3 ? 'incomplete' : 'ok',
    present: missing.length >= 3 ? null : present,
    criteria_met: criteriaMet,
    criteria_needed: 3,
    flags,
    missing,
    note: present
      ? 'Metabolic syndrome criteria (≥3) may be met — discuss with your clinician.'
      : 'Fewer than 3 metabolic syndrome criteria flagged from available data.',
  };
}

/**
 * Pooled Cohort Equation–style 10-year ASCVD estimate (White coefficients).
 * Race is not collected; White coefficients are used as a transparent default.
 * Source: Goff et al. 2013 ACC/AHA guideline equations (simplified presentation).
 */
export function computeAscvd10Year(
  metrics: MetricLike[],
  profile: RiskProfileInputs,
): AscvdResult {
  const missing: string[] = [];
  const age = profile.age_years;
  const sex = profile.sex;

  if (age == null || age < 40 || age > 79) {
    missing.push(
      age == null
        ? 'Age (date of birth)'
        : 'Age must be 40–79 for this calculator',
    );
  }
  if (sex !== 'male' && sex !== 'female') {
    missing.push('Sex (male/female)');
  }

  const totalChol = findMetricValue(metrics, [...METRIC_PATTERNS.totalChol]);
  const hdl = findMetricValue(metrics, [...METRIC_PATTERNS.hdl]);
  const sbp = findMetricValue(metrics, [...METRIC_PATTERNS.systolic]);

  if (totalChol == null) missing.push('Total cholesterol');
  if (hdl == null) missing.push('HDL');
  if (sbp == null) missing.push('Systolic BP');
  if (profile.smoker == null) missing.push('Smoking status');
  if (profile.has_diabetes == null) missing.push('Diabetes status');

  if (
    missing.length > 0 ||
    age == null ||
    (sex !== 'male' && sex !== 'female') ||
    totalChol == null ||
    hdl == null ||
    sbp == null ||
    profile.smoker == null ||
    profile.has_diabetes == null
  ) {
    return { status: 'incomplete', missing };
  }

  const treated = profile.on_bp_medication === true;
  const smoker = profile.smoker ? 1 : 0;
  const diabetes = profile.has_diabetes ? 1 : 0;
  const lnAge = Math.log(age);
  const lnTc = Math.log(totalChol);
  const lnHdl = Math.log(hdl);
  const lnSbp = Math.log(sbp);

  // White race coefficients from 2013 PCE
  let individualSum: number;
  let meanCoeff: number;
  let baselineSurvival: number;

  if (sex === 'female') {
    const coefAge = 17.114;
    const coefTc = 0.94;
    const coefHdl = -18.92;
    const coefAgeHdl = 4.605;
    const coefSbpTreated = 29.291;
    const coefSbpUntreated = 27.82;
    const coefAgeSbpT = -6.432;
    const coefAgeSbpU = -6.087;
    const coefSmoker = 0.691;
    const coefDiabetes = 0.874;

    individualSum =
      coefAge * lnAge +
      coefTc * lnTc +
      coefHdl * lnHdl +
      coefAgeHdl * lnAge * lnHdl +
      (treated ? coefSbpTreated : coefSbpUntreated) * lnSbp +
      (treated ? coefAgeSbpT : coefAgeSbpU) * lnAge * lnSbp +
      coefSmoker * smoker +
      coefDiabetes * diabetes;

    meanCoeff = -29.18;
    baselineSurvival = 0.9665;
  } else {
    const coefAge = 12.344;
    const coefTc = 11.853;
    const coefAgeTc = -2.664;
    const coefHdl = -7.99;
    const coefAgeHdl = 1.769;
    const coefSbpTreated = 1.797;
    const coefSbpUntreated = 1.764;
    const coefSmoker = 7.837;
    const coefAgeSmoker = -1.795;
    const coefDiabetes = 0.658;

    individualSum =
      coefAge * lnAge +
      coefTc * lnTc +
      coefAgeTc * lnAge * lnTc +
      coefHdl * lnHdl +
      coefAgeHdl * lnAge * lnHdl +
      (treated ? coefSbpTreated : coefSbpUntreated) * lnSbp +
      coefSmoker * smoker +
      coefAgeSmoker * lnAge * smoker +
      coefDiabetes * diabetes;

    meanCoeff = 61.18;
    baselineSurvival = 0.9144;
  }

  const risk =
    1 - Math.pow(baselineSurvival, Math.exp(individualSum - meanCoeff));
  const tenYearPct = Math.max(0, Math.min(100, Math.round(risk * 1000) / 10));

  let risk_band: 'low' | 'borderline' | 'intermediate' | 'high' = 'low';
  if (tenYearPct >= 20) risk_band = 'high';
  else if (tenYearPct >= 7.5) risk_band = 'intermediate';
  else if (tenYearPct >= 5) risk_band = 'borderline';

  return {
    status: 'ok',
    ten_year_pct: tenYearPct,
    risk_band,
    note: 'Estimated 10-year ASCVD risk (Pooled Cohort–style). Not a diagnosis — for clinician discussion.',
  };
}

export function computeRiskScores(
  metrics: MetricLike[],
  profile: RiskProfileInputs,
): RiskScoresPayload {
  return {
    ascvd: computeAscvd10Year(metrics, profile),
    metabolic: computeMetabolicSyndrome(metrics, profile),
    computed_at: new Date().toISOString(),
  };
}
