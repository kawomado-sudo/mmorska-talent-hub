-- Expose hr schema in PostgREST (Data API)
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, business_os, hr';

-- Reload PostgREST configuration
NOTIFY pgrst, 'reload config';

-- Ensure service_role used by edge functions can access hr schema
GRANT USAGE ON SCHEMA hr TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;