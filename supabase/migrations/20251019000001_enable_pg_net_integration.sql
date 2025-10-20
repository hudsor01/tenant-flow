-- Enable pg_net integration for database-triggered webhooks and external API calls
-- This migration grants necessary permissions for service_role to use pg_net extension

-- Grant usage on extensions schema functions
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO service_role;

-- Grant net schema access
GRANT USAGE ON SCHEMA net TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA net TO service_role;

-- Future tables in net schema
ALTER DEFAULT PRIVILEGES IN SCHEMA net GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- Set search_path for service role
ALTER ROLE service_role SET search_path TO public, extensions, stripe, net;

-- Verify pg_net is installed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net extension not found. Please enable it first.';
  ELSE
    RAISE NOTICE 'pg_net extension present.';
  END IF;
END $$;
