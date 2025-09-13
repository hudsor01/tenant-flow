-- Fix health check RPC permissions for service role access
-- This resolves the "permission denied for schema public" error when Railway tries to health check

-- Grant execute permissions on the health_check function to service role
GRANT EXECUTE ON FUNCTION public.health_check() TO service_role;
GRANT EXECUTE ON FUNCTION public.health_check() TO postgres;
GRANT EXECUTE ON FUNCTION public.health_check() TO anon;

-- Ensure the public schema has proper permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;

-- Also grant select on any tables that might be used for health checks
-- This ensures the fallback table ping will work
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO postgres;
