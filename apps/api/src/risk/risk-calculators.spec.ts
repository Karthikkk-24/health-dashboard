import {
  computeAscvd10Year,
  computeMetabolicSyndrome,
} from './risk-calculators';

describe('risk calculators', () => {
  it('returns incomplete ASCVD when profile fields are missing', () => {
    const result = computeAscvd10Year(
      [
        { metric_name: 'Total Cholesterol', metric_value: 200 },
        { metric_name: 'HDL', metric_value: 50 },
        { metric_name: 'Systolic BP', metric_value: 120 },
      ],
      {
        age_years: 55,
        sex: 'male',
        bmi: 26,
        smoker: null,
        has_diabetes: false,
        on_bp_medication: false,
      },
    );
    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') {
      expect(result.missing).toContain('Smoking status');
    }
  });

  it('computes ASCVD when inputs are complete', () => {
    const result = computeAscvd10Year(
      [
        { metric_name: 'Total Cholesterol', metric_value: 210 },
        { metric_name: 'HDL Cholesterol', metric_value: 45 },
        { metric_name: 'Systolic Blood Pressure', metric_value: 128 },
      ],
      {
        age_years: 55,
        sex: 'male',
        bmi: 26,
        smoker: false,
        has_diabetes: false,
        on_bp_medication: false,
      },
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.ten_year_pct).toBeGreaterThanOrEqual(0);
      expect(result.ten_year_pct).toBeLessThanOrEqual(100);
    }
  });

  it('flags metabolic syndrome when enough criteria present', () => {
    const result = computeMetabolicSyndrome(
      [
        { metric_name: 'Triglycerides', metric_value: 180 },
        { metric_name: 'HDL', metric_value: 35 },
        { metric_name: 'Fasting Glucose', metric_value: 110 },
        { metric_name: 'Systolic BP', metric_value: 135 },
      ],
      {
        age_years: 50,
        sex: 'male',
        bmi: 32,
        smoker: false,
        has_diabetes: false,
        on_bp_medication: false,
      },
    );
    expect(result.present).toBe(true);
    expect(result.criteria_met).toBeGreaterThanOrEqual(3);
  });
});
