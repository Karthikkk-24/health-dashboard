/** Shared metric name matching for risk calculators and trend alerts. */

export function metricMatches(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

export type MetricLike = {
  metric_name: string;
  metric_value: number | null;
  status?: string | null;
};

export function findMetricValue(
  metrics: MetricLike[],
  patterns: RegExp[],
): number | null {
  const hit = metrics.find(
    (m) =>
      m.metric_value != null &&
      !Number.isNaN(Number(m.metric_value)) &&
      metricMatches(m.metric_name, patterns),
  );
  return hit?.metric_value != null ? Number(hit.metric_value) : null;
}

export const METRIC_PATTERNS = {
  totalChol: [/total.?cholesterol|cholesterol.?total|^cholesterol$/i],
  hdl: [/\bhdl\b/i],
  ldl: [/\bldl\b/i],
  triglycerides: [/triglyceride/i],
  fastingGlucose: [/fasting.?glucose|fasting.?blood.?sugar|\bfbs\b|^glucose$/i],
  hba1c: [/hba1c|a1c|glycated.?hemoglobin/i],
  systolic: [/systolic|bp.?sys/i],
  diastolic: [/diastolic|bp.?dia/i],
  tsh: [/\btsh\b/i],
  alt: [/\balt\b|alanine.?amino/i],
  ast: [/\bast\b|aspartate.?amino/i],
  vitaminD: [/vitamin.?d|25.?oh.?d|25.?hydroxy/i],
} as const;
