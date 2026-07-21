export type MetricStatus =
  | 'normal'
  | 'borderline'
  | 'out_of_range'
  | 'needs_attention';

export type ActionPriority =
  | 'immediate_consult'
  | 'discuss_soon'
  | 'self_care';

export interface ActionPlanItem {
  title: string;
  detail: string;
  addresses: string[];
  timeframe: string;
  priority: ActionPriority;
}

export type AscvdRiskResult =
  | { status: 'incomplete'; missing: string[] }
  | {
      status: 'ok';
      ten_year_pct: number;
      risk_band: 'low' | 'borderline' | 'intermediate' | 'high';
      note: string;
    };

export type MetabolicRiskResult = {
  status: 'ok' | 'incomplete';
  present: boolean | null;
  criteria_met: number;
  criteria_needed: number;
  flags: Array<{
    key: string;
    label: string;
    present: boolean;
    detail: string;
  }>;
  missing: string[];
  note: string;
};

export type RiskScores = {
  ascvd?: AscvdRiskResult;
  metabolic?: MetabolicRiskResult;
  computed_at?: string;
};

export interface DbUser {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  notification_preferences: {
    email: boolean;
    report_ready: boolean;
  };
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  smoker: boolean | null;
  has_diabetes: boolean | null;
  on_bp_medication: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface DbHealthReport {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_hash: string | null;
  report_date: string;
  uploaded_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  raw_text: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbHealthMetric {
  id: string;
  report_id: string;
  user_id: string;
  metric_name: string;
  metric_value: number | null;
  metric_unit: string | null;
  metric_category: string;
  reference_min: number | null;
  reference_max: number | null;
  status: MetricStatus | null;
  recorded_at: string;
  created_at: string;
}

export interface DbHealthAnalysis {
  id: string;
  report_id: string;
  user_id: string;
  overall_health_score: number | null;
  summary: string | null;
  risks: string[];
  current_issues: string[];
  potential_issues: string[];
  recommendations: string[];
  positive_indicators: string[];
  action_plan: ActionPlanItem[];
  risk_scores: RiskScores;
  created_at: string;
}

export interface DbMetricAlert {
  id: string;
  user_id: string;
  report_id: string;
  metric_name: string;
  severity: 'info' | 'warning' | 'high';
  old_value: number | null;
  new_value: number | null;
  delta_pct: number | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface DbReportChatMessage {
  id: string;
  report_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DbReportComparison {
  id: string;
  user_id: string;
  report_a_id: string;
  report_b_id: string;
  comparison_data: unknown;
  overall_trend: 'improved' | 'declined' | 'stable';
  narrative: string | null;
  created_at: string;
}
