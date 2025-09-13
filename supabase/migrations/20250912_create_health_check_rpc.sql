-- Health check RPC for production readiness
-- Provides a minimal, always-available endpoint for PostgREST to verify DB/API availability.
-- This is intentionally simple and SAFE: it does not expose secrets or require user context.

-- up
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS TABLE (ok boolean, at timestamptz)
LANGUAGE sql
STABLE
AS $$
  SELECT true AS ok, now() AS at;
$$;

COMMENT ON FUNCTION public.health_check IS 'Lightweight readiness probe for API/DB connectivity';

