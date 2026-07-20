import {
  ActionPlanItem,
  ExtractedMetric,
  GeminiAnalysis,
  GeminiAnalysisSchema,
  MetricStatus,
  UserHealthProfile,
} from './pdf.types';

export function computeAgeYears(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

export function computeBmi(
  heightCm: number | null,
  weightKg: number | null,
): { bmi: number | null; category: string | null } {
  if (!heightCm || !weightKg || heightCm <= 0) {
    return { bmi: null, category: null };
  }
  const meters = heightCm / 100;
  const bmi = Number((weightKg / (meters * meters)).toFixed(1));
  let category = 'healthy range';
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'healthy range';
  else if (bmi < 30) category = 'overweight';
  else category = 'obesity range';
  return { bmi, category };
}

export function enrichProfile(profile?: UserHealthProfile | null): UserHealthProfile {
  const base: UserHealthProfile = {
    date_of_birth: profile?.date_of_birth ?? null,
    sex: profile?.sex ?? null,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
    activity_level: profile?.activity_level ?? null,
  };
  const age = computeAgeYears(base.date_of_birth);
  const { bmi, category } = computeBmi(base.height_cm, base.weight_kg);
  return {
    ...base,
    age_years: age,
    bmi,
    bmi_category: category,
  };
}

function metricKey(name: string): string {
  return name.toLowerCase();
}

/** Metric-specific urgent clinical flags — not crude multipliers. */
export function isNeedsAttention(
  name: string,
  value: number,
  referenceMax: number | null | undefined,
  sex: UserHealthProfile['sex'],
): boolean {
  const key = metricKey(name);

  if (key.includes('hba1c') && value >= 6.5) return true;
  if (
    (key.includes('fasting glucose') || key === 'glucose') &&
    value >= 126
  ) {
    return true;
  }
  if (key.includes('tsh') && (value >= 10 || value <= 0.1)) return true;
  if (
    (key.includes('ast') || key.includes('alt') || key.includes('sgot') || key.includes('sgpt')) &&
    referenceMax != null &&
    value > referenceMax * 3
  ) {
    return true;
  }
  if (key.includes('hemoglobin')) {
    const floor = sex === 'female' ? 7 : 8;
    if (value < floor) return true;
  }
  if (key.includes('creatinine') && value >= 2.0) return true;
  if (key.includes('bilirubin total') && value >= 3.0) return true;
  return false;
}

export function classifyMetricStatus(
  name: string,
  value: number,
  min?: number | null,
  max?: number | null,
  sex: UserHealthProfile['sex'] = null,
): MetricStatus {
  if (isNeedsAttention(name, value, max, sex)) {
    return 'needs_attention';
  }

  if (min == null && max == null) {
    return 'normal';
  }

  const lowEdge = min != null ? min * 0.95 : null;
  const highEdge = max != null ? max * 1.05 : null;

  if (min != null && value < min) {
    if (lowEdge != null && value >= lowEdge) return 'borderline';
    return 'out_of_range';
  }
  if (max != null && value > max) {
    if (highEdge != null && value <= highEdge) return 'borderline';
    return 'out_of_range';
  }
  return 'normal';
}

export function buildCalmSummary(
  metrics: ExtractedMetric[],
  profile: UserHealthProfile,
): string {
  const normals = metrics.filter((m) => m.status === 'normal');
  const borderline = metrics.filter((m) => m.status === 'borderline');
  const out = metrics.filter((m) => m.status === 'out_of_range');
  const attention = metrics.filter((m) => m.status === 'needs_attention');

  const profileBits: string[] = [];
  if (profile.age_years != null) profileBits.push(`${profile.age_years} years old`);
  if (profile.sex && profile.sex !== 'prefer_not_to_say') {
    profileBits.push(profile.sex);
  }
  if (profile.bmi != null) {
    profileBits.push(`BMI ${profile.bmi} (${profile.bmi_category})`);
  }
  const context =
    profileBits.length > 0
      ? `Based on your profile (${profileBits.join(', ')}), here is a calm read of this report.`
      : 'Here is a calm read of this report. Adding height, weight, age, and sex in Settings will make future insights more personal.';

  const parts = [
    context,
    normals.length > 0
      ? `Many values look fine — ${normals.length} metric${normals.length === 1 ? '' : 's'} sit within their usual reference ranges.`
      : 'We compared each extracted metric to its lab reference range.',
  ];

  if (borderline.length > 0) {
    parts.push(
      `A few are only slightly off (${borderline
        .map((m) => m.name)
        .slice(0, 4)
        .join(', ')}). These are worth noticing, not panicking over.`,
    );
  }
  if (out.length > 0) {
    parts.push(
      `Some sit clearly outside the usual range (${out
        .map((m) => m.name)
        .slice(0, 5)
        .join(', ')}). Small, steady habits and a routine check-in with your clinician can help.`,
    );
  }
  if (attention.length > 0) {
    parts.push(
      `A small number of findings deserve a timely conversation with a doctor: ${attention
        .map((m) => m.name)
        .join(', ')}. That does not mean an emergency by itself — it means get professional advice soon.`,
    );
  } else {
    parts.push(
      'Nothing here looks like an emergency from the numbers alone. Use the improvement plan below for practical next steps.',
    );
  }

  return parts.join(' ');
}

function findMetric(
  metrics: ExtractedMetric[],
  matcher: (name: string) => boolean,
): ExtractedMetric | undefined {
  return metrics.find((m) => matcher(metricKey(m.name)));
}

export function buildActionPlan(
  metrics: ExtractedMetric[],
  profile: UserHealthProfile,
): ActionPlanItem[] {
  const plan: ActionPlanItem[] = [];
  const push = (item: ActionPlanItem) => {
    if (plan.length >= 15) return;
    if (plan.some((existing) => existing.title === item.title)) return;
    plan.push(item);
  };

  const attention = metrics.filter((m) => m.status === 'needs_attention');
  for (const metric of attention) {
    push({
      title: `Book a clinician visit about ${metric.name}`,
      detail: `${metric.name} is ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}, which is outside the usual “watch and wait” band. A doctor can confirm context, symptoms, and whether any treatment or retest is needed.`,
      addresses: [metric.name],
      timeframe: 'within 1–2 weeks',
      priority: 'immediate_consult',
    });
  }

  const hba1c = findMetric(metrics, (n) => n.includes('hba1c'));
  const fasting = findMetric(
    metrics,
    (n) => n.includes('fasting glucose') || n === 'glucose',
  );
  const ldl = findMetric(metrics, (n) => n.includes('ldl'));
  const trig = findMetric(metrics, (n) => n.includes('triglyceride'));
  const totalChol = findMetric(
    metrics,
    (n) => n.includes('total cholesterol') || n.includes('cholesterol total'),
  );
  const vitD = findMetric(metrics, (n) => n.includes('vitamin d'));
  const tsh = findMetric(metrics, (n) => n.includes('tsh'));
  const alt = findMetric(metrics, (n) => n.includes('alt') || n.includes('sgpt'));
  const ast = findMetric(metrics, (n) => n.includes('ast') || n.includes('sgot'));
  const hdl = findMetric(metrics, (n) => n.includes('hdl'));

  if (
    hba1c &&
    hba1c.value != null &&
    (hba1c.status === 'borderline' || hba1c.status === 'out_of_range')
  ) {
    push({
      title: 'Ease refined carbs and add a daily walk',
      detail:
        'Steadier blood sugar often responds to fewer sugary drinks/snacks and 20–30 minutes of brisk walking most days. This supports HbA1c without extreme diets.',
      addresses: [hba1c.name, ...(fasting ? [fasting.name] : [])],
      timeframe: 'start this week · reassess in 8–12 weeks',
      priority: 'self_care',
    });
    push({
      title: 'Ask about a follow-up glucose panel',
      detail:
        'Share this report at your next visit so your clinician can decide if lifestyle alone is enough or if earlier retesting is useful.',
      addresses: [hba1c.name],
      timeframe: 'next routine visit (or sooner if symptoms)',
      priority: 'discuss_soon',
    });
  }

  if (fasting && fasting.status === 'out_of_range' && fasting.value != null && fasting.value < 126) {
    push({
      title: 'Keep breakfast protein-forward',
      detail:
        'A protein + fiber breakfast (eggs, dal, yogurt, nuts) can blunt mid-morning glucose swings. Pair with consistent sleep timing.',
      addresses: [fasting.name],
      timeframe: 'start this week · ongoing',
      priority: 'self_care',
    });
  }

  if (
    (ldl && ldl.status !== 'normal') ||
    (trig && trig.status !== 'normal') ||
    (totalChol && totalChol.status !== 'normal')
  ) {
    const names = [ldl, trig, totalChol]
      .filter(Boolean)
      .map((m) => m!.name);
    push({
      title: 'Shift cooking fats and cut deep-fried snacks',
      detail:
        'Prefer olive/mustard oil in moderation, more legumes and vegetables, and fewer bakery/fried foods. Lipid improvements usually show over weeks, not days.',
      addresses: names,
      timeframe: '2–4 weeks to build the habit · recheck in 3 months',
      priority: 'self_care',
    });
    push({
      title: 'Discuss lipids at your next checkup',
      detail:
        'Mildly high cholesterol or triglycerides are common and often managed with food and activity first. Your clinician can set a personal target.',
      addresses: names,
      timeframe: 'next scheduled visit',
      priority: 'discuss_soon',
    });
  }

  if (hdl && hdl.status !== 'normal') {
    push({
      title: 'Add 2–3 strength or brisk cardio sessions weekly',
      detail:
        'Movement that raises your heart rate can support healthier HDL patterns over time, especially with better sleep.',
      addresses: [hdl.name],
      timeframe: 'start this week · ongoing',
      priority: 'self_care',
    });
  }

  if (vitD && vitD.status !== 'normal') {
    push({
      title: 'Safe daylight + food sources of vitamin D',
      detail:
        'Short midday sun exposure on arms/legs when practical, plus fortified milk or fatty fish, can help. Supplements only if a clinician recommends them.',
      addresses: [vitD.name],
      timeframe: 'start this week · recheck in 8–12 weeks if advised',
      priority: 'self_care',
    });
    push({
      title: 'Ask whether a vitamin D plan is right for you',
      detail:
        'Low-ish vitamin D is very common and usually not an emergency. A clinician can decide if diet/sunlight is enough or if a short supplement course is useful.',
      addresses: [vitD.name],
      timeframe: 'next routine visit',
      priority: 'discuss_soon',
    });
  }

  if (tsh && tsh.status !== 'normal' && tsh.status !== 'needs_attention') {
    push({
      title: 'Note energy, weight, and cold sensitivity',
      detail:
        'Thyroid numbers are best interpreted with symptoms. Jot a short symptom list before your next visit so the conversation is concrete.',
      addresses: [tsh.name],
      timeframe: 'before next visit',
      priority: 'discuss_soon',
    });
  }

  if (
    (alt && (alt.status === 'out_of_range' || alt.status === 'borderline')) ||
    (ast && (ast.status === 'out_of_range' || ast.status === 'borderline'))
  ) {
    const names = [alt, ast].filter(Boolean).map((m) => m!.name);
    push({
      title: 'Ease alcohol and ultra-processed food for a few weeks',
      detail:
        'Liver enzymes often settle with less alcohol, fewer sugary drinks, and a bit more sleep. Avoid new supplements unless cleared by a clinician.',
      addresses: names,
      timeframe: '2–4 weeks',
      priority: 'self_care',
    });
    push({
      title: 'Confirm liver enzymes on a follow-up test if advised',
      detail:
        'A repeat panel helps distinguish a temporary bump from something that needs a longer plan.',
      addresses: names,
      timeframe: 'as your clinician recommends (often 4–12 weeks)',
      priority: 'discuss_soon',
    });
  }

  if (profile.bmi != null && profile.bmi >= 25) {
    push({
      title: 'Aim for a gentle weekly activity streak',
      detail: `Your BMI is about ${profile.bmi} (${profile.bmi_category}). A realistic goal is 150 minutes of moderate activity per week — walking counts.`,
      addresses: ['BMI', 'weight'],
      timeframe: 'ongoing',
      priority: 'self_care',
    });
  } else if (profile.bmi == null) {
    push({
      title: 'Add height and weight in Settings',
      detail:
        'BMI and age help tailor advice (for example hemoglobin ranges and activity goals). It takes under a minute and improves every future report.',
      addresses: ['profile completeness'],
      timeframe: 'today',
      priority: 'self_care',
    });
  }

  if (profile.activity_level === 'sedentary' || !profile.activity_level) {
    push({
      title: 'Break up long sitting blocks',
      detail:
        'Stand or stroll 3–5 minutes each hour. Small movement breaks help glucose and energy without a gym membership.',
      addresses: ['activity', ...(fasting ? [fasting.name] : [])],
      timeframe: 'start this week · ongoing',
      priority: 'self_care',
    });
  }

  push({
    title: 'Sleep 7–8 hours on a consistent schedule',
    detail:
      'Sleep debt nudges appetite, glucose, and mood. Keep wake time steady even on weekends when you can.',
    addresses: ['overall recovery'],
    timeframe: 'ongoing',
    priority: 'self_care',
  });

  push({
    title: 'Hydrate steadily through the day',
    detail:
      'Aim for regular water intake rather than large late boluses. It supports kidney markers and energy.',
    addresses: ['hydration', 'kidney health'],
    timeframe: 'ongoing',
    priority: 'self_care',
  });

  push({
    title: 'Save this report and track one habit for 30 days',
    detail:
      'Pick a single habit from this list, mark a calendar, and compare your next lab panel. Progress is clearer with two reports than with one.',
    addresses: ['long-term progress'],
    timeframe: '30 days',
    priority: 'self_care',
  });

  // Ensure 10–15 items
  while (plan.length < 10) {
    push({
      title: 'Eat a colorful vegetable serving at lunch and dinner',
      detail:
        'Fiber-rich plants support lipids, glucose, and gut comfort. Frozen vegetables are fine.',
      addresses: ['nutrition'],
      timeframe: 'ongoing',
      priority: 'self_care',
    });
    push({
      title: 'Schedule your next routine checkup',
      detail:
        'Preventive visits catch trends early. Bring this dashboard printout or PDF.',
      addresses: ['preventive care'],
      timeframe: 'within 3–6 months unless told sooner',
      priority: 'discuss_soon',
    });
    if (plan.length < 10) {
      push({
        title: 'Limit sugary beverages to rare occasions',
        detail:
          'Swapping soda/juice for water or unsweetened tea is one of the highest-leverage daily changes for metabolic health.',
        addresses: ['added sugar', ...(hba1c ? [hba1c.name] : [])],
        timeframe: 'start this week',
        priority: 'self_care',
      });
    }
    break;
  }

  return plan.slice(0, 15);
}

export function finalizeAnalysis(
  metrics: ExtractedMetric[],
  profileInput?: UserHealthProfile | null,
  aiPartial?: Partial<GeminiAnalysis>,
): GeminiAnalysis {
  const profile = enrichProfile(profileInput);
  const classified = metrics.map((metric) => {
    if (metric.value == null) {
      return { ...metric, status: metric.status ?? 'normal' };
    }
    return {
      ...metric,
      status: classifyMetricStatus(
        metric.name,
        metric.value,
        metric.reference_min,
        metric.reference_max,
        profile.sex,
      ),
    };
  });

  const actionPlan =
    aiPartial?.action_plan && aiPartial.action_plan.length >= 8
      ? aiPartial.action_plan.slice(0, 15)
      : buildActionPlan(classified, profile);

  const attention = classified.filter((m) => m.status === 'needs_attention');
  const out = classified.filter((m) => m.status === 'out_of_range');
  const borderline = classified.filter((m) => m.status === 'borderline');
  const score = Math.max(
    35,
    Math.min(
      98,
      92 - attention.length * 12 - out.length * 5 - borderline.length * 2,
    ),
  );

  const summary =
    aiPartial?.summary && !/critical|severe|dangerous|alarming/i.test(aiPartial.summary)
      ? aiPartial.summary
      : buildCalmSummary(classified, profile);

  const risks = [
    ...attention.map(
      (m) =>
        `${m.name} needs a timely clinician review (${m.value}${m.unit ? ` ${m.unit}` : ''}).`,
    ),
    ...out.map(
      (m) =>
        `${m.name} is outside the usual range — worth improving with habits and follow-up.`,
    ),
    ...borderline.map(
      (m) => `${m.name} is only slightly outside range — keep an eye on it.`,
    ),
  ].slice(0, 8);

  return GeminiAnalysisSchema.parse({
    metrics: classified,
    summary,
    risks: aiPartial?.risks?.length ? aiPartial.risks : risks,
    current_issues: [
      ...attention.map((m) => `${m.name} flagged for clinician review`),
      ...out.map((m) => `${m.name} outside reference range`),
    ],
    potential_issues: borderline.map(
      (m) => `${m.name} borderline — monitor on next panel`,
    ),
    recommendations: actionPlan.map((item) => item.title),
    positive_indicators: classified
      .filter((m) => m.status === 'normal')
      .slice(0, 10)
      .map((m) => `${m.name} within reference range`),
    action_plan: actionPlan,
    overall_health_score: aiPartial?.overall_health_score ?? score,
  });
}
