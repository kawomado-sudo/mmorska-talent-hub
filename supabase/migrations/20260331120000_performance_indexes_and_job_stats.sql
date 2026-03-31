-- Indexes for common hr-api query patterns (previously no indexes on FK/filter columns)
CREATE INDEX IF NOT EXISTS idx_applications_job_id_created_at
  ON hr.applications (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_job_id_status_created_at
  ON hr.applications (job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_assigned_reviewer
  ON hr.applications (assigned_reviewer_id)
  WHERE assigned_reviewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_application_status_log_application_id
  ON hr.application_status_log (application_id, changed_at DESC);

-- Aggregated counts + reviewer ids per job (avoids loading entire applications table in Edge Function)
CREATE OR REPLACE FUNCTION hr.job_application_stats()
RETURNS TABLE (
  job_id uuid,
  application_count bigint,
  reviewer_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hr, public
AS $$
  SELECT
    a.job_id,
    COUNT(*)::bigint AS application_count,
    COALESCE(
      array_agg(DISTINCT a.assigned_reviewer_id) FILTER (WHERE a.assigned_reviewer_id IS NOT NULL),
      ARRAY[]::uuid[]
    ) AS reviewer_ids
  FROM hr.applications a
  GROUP BY a.job_id;
$$;

GRANT EXECUTE ON FUNCTION hr.job_application_stats() TO service_role;
