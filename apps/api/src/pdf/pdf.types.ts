import { z } from 'zod';

export const MetricStatusSchema = z.enum(['normal', 'low', 'high', 'critical']);

export const ExtractedMetricSchema = z.object({
  name: z.string(),
  value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  category: z.string(),
  reference_min: z.number().nullable().optional(),
  reference_max: z.number().nullable().optional(),
  status: MetricStatusSchema.nullable().optional(),
});

export const GeminiAnalysisSchema = z.object({
  metrics: z.array(ExtractedMetricSchema),
  summary: z.string(),
  risks: z.array(z.string()).default([]),
  current_issues: z.array(z.string()).default([]),
  potential_issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  positive_indicators: z.array(z.string()).default([]),
  overall_health_score: z.number().min(0).max(100),
});

export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;
export type ExtractedMetric = z.infer<typeof ExtractedMetricSchema>;

export const GEMINI_EXTRACTION_PROMPT = `You are an expert medical data analyst. Your task is to extract all health
metrics and provide clinical analysis from the provided medical report text.
You must respond ONLY with valid JSON. No preamble, no markdown, no backticks.

Extract: patient vitals, blood test results, cholesterol levels, glucose, CBC,
liver function, kidney function, thyroid, hormones, urine analysis, and any other
medical metrics present.

For each metric, classify its status as: normal, low, high, or critical based on
standard medical reference ranges.

For risks, list specific, actionable medical risks identified from the data.
For recommendations, be specific and practical.
Overall health score: 0-100 where 0=critical, 50=borderline, 100=optimal.

JSON Schema:
{
  "metrics": [
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "category": "string",
      "reference_min": number | null,
      "reference_max": number | null,
      "status": "normal|low|high|critical"
    }
  ],
  "summary": "string (2-3 paragraph clinical summary)",
  "risks": ["string"],
  "current_issues": ["string"],
  "potential_issues": ["string"],
  "recommendations": ["string"],
  "positive_indicators": ["string"],
  "overall_health_score": number
}`;
