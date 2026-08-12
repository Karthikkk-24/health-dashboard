-- Prevent duplicate analyses per report (fixes #20).
-- Keep the newest row when duplicates already exist.
DELETE FROM public.health_analyses a
USING public.health_analyses b
WHERE a.report_id = b.report_id
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS health_analyses_report_id_uidx
  ON public.health_analyses (report_id);
