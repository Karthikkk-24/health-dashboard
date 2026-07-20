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
  status: 'normal' | 'low' | 'high' | 'critical' | null;
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
