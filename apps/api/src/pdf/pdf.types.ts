import { z } from 'zod';

export const MetricStatusSchema = z.enum([
  'normal',
  'borderline',
  'out_of_range',
  'needs_attention',
]);

export const ActionPrioritySchema = z.enum([
  'immediate_consult',
  'discuss_soon',
  'self_care',
]);

export const ExtractedMetricSchema = z.object({
  name: z.string(),
  value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  category: z.string(),
  reference_min: z.number().nullable().optional(),
  reference_max: z.number().nullable().optional(),
  status: MetricStatusSchema.nullable().optional(),
});

export const ActionPlanItemSchema = z.object({
  title: z.string(),
  detail: z.string(),
  addresses: z.array(z.string()).default([]),
  timeframe: z.string(),
  priority: ActionPrioritySchema,
});

export const GeminiAnalysisSchema = z.object({
  metrics: z.array(ExtractedMetricSchema),
  summary: z.string(),
  risks: z.array(z.string()).default([]),
  current_issues: z.array(z.string()).default([]),
  potential_issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  positive_indicators: z.array(z.string()).default([]),
  action_plan: z.array(ActionPlanItemSchema).default([]),
  overall_health_score: z.number().min(0).max(100),
});

export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;
export type ExtractedMetric = z.infer<typeof ExtractedMetricSchema>;
export type ActionPlanItem = z.infer<typeof ActionPlanItemSchema>;
export type MetricStatus = z.infer<typeof MetricStatusSchema>;

export interface UserHealthProfile {
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  age_years?: number | null;
  bmi?: number | null;
  bmi_category?: string | null;
}

export const GEMINI_EXTRACTION_PROMPT = `You are a calm, practical clinical data analyst. Extract health metrics from the medical report and respond ONLY with valid JSON (no markdown).

Status bands (use these exactly):
- normal: within reference range
- borderline: slightly outside (~5–10% beyond range) — watch, do not alarm
- out_of_range: clearly outside range but not an emergency
- needs_attention: only for true clinical flags (e.g. HbA1c ≥ 6.5, fasting glucose ≥ 126, TSH ≥ 10 or ≤ 0.1, ALT/AST > 3× upper limit, severely low hemoglobin)

Tone rules:
- Plain language, reassuring, never dramatic
- Do NOT use words like critical, severe, dangerous, alarming unless status is needs_attention
- Lead with what looks fine, then what to watch, then what to discuss with a doctor

Also return action_plan: 10–15 concrete improvement steps. Each item:
{
  "title": "short action",
  "detail": "how it helps and what to do",
  "addresses": ["metric or issue names"],
  "timeframe": "start this week | 2–4 weeks | 1–3 months | ongoing",
  "priority": "immediate_consult | discuss_soon | self_care"
}

JSON Schema:
{
  "metrics": [{
    "name": "string",
    "value": number,
    "unit": "string",
    "category": "string",
    "reference_min": number | null,
    "reference_max": number | null,
    "status": "normal|borderline|out_of_range|needs_attention"
  }],
  "summary": "string (2–3 calm paragraphs)",
  "risks": ["string — watch-outs, calm wording"],
  "current_issues": ["string"],
  "potential_issues": ["string"],
  "recommendations": ["string — titles mirrored from action_plan"],
  "positive_indicators": ["string"],
  "action_plan": [{
    "title": "string",
    "detail": "string",
    "addresses": ["string"],
    "timeframe": "string",
    "priority": "immediate_consult|discuss_soon|self_care"
  }],
  "overall_health_score": number
}`;
