-- Enforce one report per user+hash+date (fixes #25 TOCTOU).
-- Prefer the oldest upload when duplicates already exist.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, file_hash, report_date
      ORDER BY uploaded_at ASC NULLS LAST, created_at ASC
    ) AS rn
  FROM public.health_reports
  WHERE file_hash IS NOT NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.report_comparisons
WHERE report_a_id IN (SELECT id FROM dupes)
   OR report_b_id IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, file_hash, report_date
      ORDER BY uploaded_at ASC NULLS LAST, created_at ASC
    ) AS rn
  FROM public.health_reports
  WHERE file_hash IS NOT NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.health_reports
WHERE id IN (SELECT id FROM dupes);

CREATE UNIQUE INDEX IF NOT EXISTS health_reports_user_hash_date_uidx
  ON public.health_reports (user_id, file_hash, report_date)
  WHERE file_hash IS NOT NULL;
