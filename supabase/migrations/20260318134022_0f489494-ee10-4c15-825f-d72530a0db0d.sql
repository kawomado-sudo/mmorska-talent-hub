-- Keep hr exposed, but make relations discoverable in PostgREST schema cache
-- while preserving data protection through RLS.

-- Ensure the only non-RLS table in hr is protected as well
ALTER TABLE hr.hr_reviewers ENABLE ROW LEVEL SECURITY;

-- Start from a least-privilege baseline for client roles
REVOKE ALL ON SCHEMA hr FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr FROM anon, authenticated;

-- PostgREST schema cache is built from db-anon-role, so grant only read metadata path
GRANT USAGE ON SCHEMA hr TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA hr TO anon;

-- Keep edge-function access via service_role
GRANT USAGE ON SCHEMA hr TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr TO service_role;

-- Future-proof grants
ALTER DEFAULT PRIVILEGES IN SCHEMA hr
REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr
GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr
GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- Refresh PostgREST caches
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';