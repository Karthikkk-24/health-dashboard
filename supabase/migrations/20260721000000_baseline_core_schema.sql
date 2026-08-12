-- Baseline core schema + storage (idempotent). Fixes #14.
-- Matches the live app model (Clerk + service_role API), not only documentation.md snapshots.
-- Safe to apply on empty DBs and on environments that already have these objects.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  notification_preferences JSONB NOT NULL DEFAULT '{"email":false,"report_ready":false}'::jsonb,
  date_of_birth DATE,
  sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level TEXT CHECK (
    activity_level IS NULL OR activity_level IN ('sedentary', 'light', 'moderate', 'active')
  ),
  smoker BOOLEAN,
  has_diabetes BOOLEAN,
  on_bp_medication BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"email":false,"report_ready":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS smoker BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_diabetes BOOLEAN,
  ADD COLUMN IF NOT EXISTS on_bp_medication BOOLEAN,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_hash TEXT,
  report_date DATE NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  raw_text TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_reports
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.health_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_unit TEXT,
  metric_category TEXT NOT NULL,
  reference_min NUMERIC,
  reference_max NUMERIC,
  status TEXT CHECK (
    status IS NULL OR status IN ('normal', 'borderline', 'out_of_range', 'needs_attention')
  ),
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.health_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.health_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  overall_health_score INTEGER CHECK (overall_health_score BETWEEN 0 AND 100),
  summary TEXT,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  potential_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  positive_indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_analyses
  ADD COLUMN IF NOT EXISTS action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.report_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_a_id UUID NOT NULL REFERENCES public.health_reports(id),
  report_b_id UUID NOT NULL REFERENCES public.health_reports(id),
  comparison_data JSONB NOT NULL,
  overall_trend TEXT CHECK (overall_trend IN ('improved', 'declined', 'stable')),
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_comparisons
  ADD COLUMN IF NOT EXISTS narrative TEXT;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_health_reports_user_id ON public.health_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_report_date ON public.health_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_report_id ON public.health_metrics(report_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON public.health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_category ON public.health_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_health_analyses_report_id ON public.health_analyses(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_user_id ON public.report_comparisons(user_id);

-- ---------------------------------------------------------------------------
-- RLS (API uses service_role; policies protect accidental client access)
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comparisons ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.health_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics FORCE ROW LEVEL SECURITY;
ALTER TABLE public.health_analyses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.report_comparisons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own profile" ON public.users;
CREATE POLICY "Users see own profile" ON public.users
  FOR ALL
  USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users see own reports" ON public.health_reports;
CREATE POLICY "Users see own reports" ON public.health_reports
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

DROP POLICY IF EXISTS "Users see own metrics" ON public.health_metrics;
CREATE POLICY "Users see own metrics" ON public.health_metrics
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

DROP POLICY IF EXISTS "Users see own analyses" ON public.health_analyses;
CREATE POLICY "Users see own analyses" ON public.health_analyses
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

DROP POLICY IF EXISTS "Users see own comparisons" ON public.report_comparisons;
CREATE POLICY "Users see own comparisons" ON public.report_comparisons
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.health_reports FROM anon, authenticated;
REVOKE ALL ON TABLE public.health_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.health_analyses FROM anon, authenticated;
REVOKE ALL ON TABLE public.report_comparisons FROM anon, authenticated;

GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.health_reports TO service_role;
GRANT ALL ON TABLE public.health_metrics TO service_role;
GRANT ALL ON TABLE public.health_analyses TO service_role;
GRANT ALL ON TABLE public.report_comparisons TO service_role;

-- ---------------------------------------------------------------------------
-- Private storage bucket + folder-scoped policies (Clerk id as first path segment)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-reports',
  'health-reports',
  false,
  20971520,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own reports" ON storage.objects;
CREATE POLICY "Users upload own reports" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'health-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own reports" ON storage.objects;
CREATE POLICY "Users read own reports" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'health-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own reports" ON storage.objects;
CREATE POLICY "Users delete own reports" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'health-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
