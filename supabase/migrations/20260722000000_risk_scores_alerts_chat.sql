-- Risk profile fields, risk_scores, metric_alerts, report_chat_messages
-- Idempotent snapshot matching remote migration risk_scores_alerts_chat

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS smoker BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS has_diabetes BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS on_bp_medication BOOLEAN NULL;

ALTER TABLE health_analyses
  ADD COLUMN IF NOT EXISTS risk_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS metric_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high')),
  old_value NUMERIC NULL,
  new_value NUMERIC NULL,
  delta_pct NUMERIC NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_alerts_user_created
  ON metric_alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_alerts_user_unread
  ON metric_alerts (user_id)
  WHERE read_at IS NULL;

ALTER TABLE metric_alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS report_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_chat_report_created
  ON report_chat_messages (report_id, created_at ASC);

ALTER TABLE report_chat_messages ENABLE ROW LEVEL SECURITY;
