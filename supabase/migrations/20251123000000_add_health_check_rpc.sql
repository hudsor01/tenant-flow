-- Add health_check RPC function for backend health monitoring
-- This function bypasses RLS and provides a simple health check endpoint

CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('ok', true, 'timestamp', NOW());
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION public.health_check() TO anon, authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.health_check() IS 'Health check endpoint for backend monitoring - returns {ok: true} if database is accessible';
