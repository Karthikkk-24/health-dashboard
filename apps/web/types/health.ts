export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type MetricStatus =
  | 'normal'
  | 'borderline'
  | 'out_of_range'
  | 'needs_attention';

export type ActionPriority =
  | 'immediate_consult'
  | 'discuss_soon'
  | 'self_care';

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

export interface ActionPlanItem {
  title: string;
  detail: string;
  addresses: string[];
  timeframe: string;
  priority: ActionPriority;
}

export interface HealthMetric {
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

export interface HealthAnalysis {
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
  risk_scores?: RiskScores;
  created_at: string;
}

export interface HealthReport {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_hash: string | null;
  report_date: string;
  uploaded_at: string;
  processing_status: ProcessingStatus;
  raw_text: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  health_score?: number | null;
}

export interface UserProfile {
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

export interface MetricAlert {
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

export interface ReportChatMessage {
  id: string;
  report_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DashboardData {
  stats: {
    totalReports: number;
    latestHealthScore: number | null;
    lastReportDate: string | null;
    reportsThisMonth: number;
  };
  bloodPressureTrend: Array<{
    date: string;
    systolic: number | null;
    diastolic: number | null;
  }>;
  cholesterolBreakdown: {
    ldl: number | null;
    hdl: number | null;
    total: number | null;
    triglycerides: number | null;
  };
  glucoseTrend: Array<{
    date: string;
    value: number | null;
    unit: string | null;
    name: string;
  }>;
  healthScoreTrend: Array<{ date: string; score: number | null }>;
  latestAnalysis: {
    summary: string | null;
    risks: string[];
    overall_health_score: number | null;
    report_id: string;
    report_date: string | null;
    action_plan?: ActionPlanItem[];
    risk_scores?: RiskScores;
  } | null;
  profileComplete?: boolean;
}

export interface MetricDiff {
  metric_name: string;
  category: string;
  old_value: number | null;
  new_value: number | null;
  unit: string | null;
  change_percent: number | null;
  direction: 'improved' | 'worsened' | 'stable' | 'unknown';
}

export interface ComparisonResult {
  id: string;
  user_id: string;
  report_a_id: string;
  report_b_id: string;
  comparison_data: {
    report_a: { id: string; report_date: string; file_name: string };
    report_b: { id: string; report_date: string; file_name: string };
    metrics: MetricDiff[];
    improved_count: number;
    worsened_count: number;
  };
  overall_trend: 'improved' | 'declined' | 'stable';
  narrative: string | null;
  created_at: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
