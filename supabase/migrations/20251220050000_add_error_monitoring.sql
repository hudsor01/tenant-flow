-- Migration: Add User Error Monitoring
-- Created: 2025-12-20 05:00:00 UTC
-- Purpose: Track user errors for monitoring, debugging, and support
-- Impact: Production readiness - enables real-time error tracking

-- ============================================================================
-- USER ERROR TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL, -- 'authorization', 'validation', 'application', 'database'
  error_code text,
  error_message text NOT NULL,
  error_stack text,
  context jsonb DEFAULT '{}'::jsonb, -- Additional context (endpoint, table, operation)
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,

  -- Constraints
  CONSTRAINT valid_error_type CHECK (
    error_type IN ('authorization', 'validation', 'application', 'database', 'network', 'timeout')
  )
);

COMMENT ON TABLE public.user_errors IS
'Tracks user-facing errors for monitoring, debugging, and support. Backend logs errors via log_user_error() function.';

COMMENT ON COLUMN public.user_errors.error_type IS
'Category: authorization, validation, application, database, network, timeout';

COMMENT ON COLUMN public.user_errors.context IS
'JSON context: {endpoint, method, table, operation, component, etc.}';

-- ============================================================================
-- INDEXES FOR FAST QUERYING
-- ============================================================================

-- User-specific error history
CREATE INDEX idx_user_errors_user_id
ON public.user_errors(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Error type filtering (dashboard views)
CREATE INDEX idx_user_errors_type
ON public.user_errors(error_type, created_at DESC);

-- Unresolved errors (active issues)
CREATE INDEX idx_user_errors_unresolved
ON public.user_errors(created_at DESC)
WHERE resolved_at IS NULL;

-- Context search (find errors by endpoint, table, etc.)
CREATE INDEX idx_user_errors_context_gin
ON public.user_errors USING gin(context);

-- Error message pattern search
CREATE INDEX idx_user_errors_message_trgm
ON public.user_errors USING gin(error_message gin_trgm_ops);

COMMENT ON INDEX idx_user_errors_user_id IS
'Fast lookup of user error history';

COMMENT ON INDEX idx_user_errors_unresolved IS
'Fast filtering of active/unresolved errors';

COMMENT ON INDEX idx_user_errors_context_gin IS
'Fast search within error context JSON (endpoint, component, etc.)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.user_errors ENABLE ROW LEVEL SECURITY;

-- Service role can manage all errors (backend logging)
CREATE POLICY "user_errors_service_role" ON public.user_errors
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "user_errors_service_role" ON public.user_errors IS
'Backend (service_role) can log and manage all errors';

-- Users can view their own errors (helpful for support)
CREATE POLICY "user_errors_select_own" ON public.user_errors
FOR SELECT TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "user_errors_select_own" ON public.user_errors IS
'Users can view their own error history';

-- ============================================================================
-- LOGGING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_user_error(
  p_error_type text,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_error_stack text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_user_agent text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  error_id uuid;
BEGIN
  INSERT INTO public.user_errors (
    user_id,
    error_type,
    error_code,
    error_message,
    error_stack,
    context,
    user_agent,
    ip_address
  ) VALUES (
    auth.uid(),
    p_error_type,
    p_error_code,
    COALESCE(p_error_message, 'Unknown error'),
    p_error_stack,
    p_context,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO error_id;

  RETURN error_id;
END;
$$;

COMMENT ON FUNCTION public.log_user_error IS
'Logs user errors with context. Called from backend when errors occur. Returns error UUID.';

-- ============================================================================
-- ANALYTICS FUNCTIONS
-- ============================================================================

-- Get error summary for dashboard
CREATE OR REPLACE FUNCTION public.get_error_summary(
  hours_back integer DEFAULT 24
)
RETURNS TABLE (
  error_type text,
  error_count bigint,
  unique_users bigint,
  last_occurrence timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_occurrence
  FROM public.user_errors
  WHERE created_at >= NOW() - (hours_back || ' hours')::interval
  GROUP BY error_type
  ORDER BY error_count DESC;
$$;

COMMENT ON FUNCTION public.get_error_summary IS
'Returns error summary by type for the last N hours (default 24)';

-- Get most common errors
CREATE OR REPLACE FUNCTION public.get_common_errors(
  hours_back integer DEFAULT 24,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  error_message text,
  error_type text,
  occurrences bigint,
  affected_users bigint,
  last_occurrence timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    error_message,
    error_type,
    COUNT(*) as occurrences,
    COUNT(DISTINCT user_id) as affected_users,
    MAX(created_at) as last_occurrence
  FROM public.user_errors
  WHERE created_at >= NOW() - (hours_back || ' hours')::interval
  GROUP BY error_message, error_type
  ORDER BY occurrences DESC
  LIMIT limit_count;
$$;

COMMENT ON FUNCTION public.get_common_errors IS
'Returns most common errors in the last N hours with user impact';

-- Get users with most errors (potential issues)
CREATE OR REPLACE FUNCTION public.get_error_prone_users(
  hours_back integer DEFAULT 24,
  min_errors integer DEFAULT 5
)
RETURNS TABLE (
  user_id uuid,
  error_count bigint,
  error_types text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ue.user_id,
    COUNT(*) as error_count,
    array_agg(DISTINCT ue.error_type) as error_types
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
    AND ue.user_id IS NOT NULL
  GROUP BY ue.user_id
  HAVING COUNT(*) >= min_errors
  ORDER BY error_count DESC;
$$;

COMMENT ON FUNCTION public.get_error_prone_users IS
'Returns users experiencing high error rates (may need support)';

-- ============================================================================
-- CRITICAL ERROR NOTIFICATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_critical_error()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Check for error spike (>10 same errors in 5 minutes)
  SELECT COUNT(*) INTO recent_count
  FROM public.user_errors
  WHERE error_message = NEW.error_message
    AND created_at >= NOW() - INTERVAL '5 minutes';

  -- Notify if authorization error OR error spike detected
  IF NEW.error_type = 'authorization' OR recent_count > 10 THEN
    PERFORM pg_notify(
      'critical_error',
      json_build_object(
        'error_id', NEW.id,
        'user_id', NEW.user_id,
        'error_type', NEW.error_type,
        'error_message', NEW.error_message,
        'error_count', recent_count,
        'created_at', NEW.created_at
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER critical_error_notification
AFTER INSERT ON public.user_errors
FOR EACH ROW
EXECUTE FUNCTION notify_critical_error();

COMMENT ON TRIGGER critical_error_notification ON public.user_errors IS
'Sends pg_notify for critical errors (authorization failures, error spikes)';

-- ============================================================================
-- AUTO-CLEANUP OLD ERRORS (30 days retention)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_errors()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.user_errors
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND resolved_at IS NOT NULL; -- Only delete resolved errors

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old resolved errors', deleted_count;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_errors IS
'Deletes resolved errors older than 30 days. Run via cron job.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ User error monitoring table created';
  RAISE NOTICE '✅ Logging function: log_user_error()';
  RAISE NOTICE '✅ Analytics functions: get_error_summary(), get_common_errors(), get_error_prone_users()';
  RAISE NOTICE '✅ Critical error notifications enabled (pg_notify)';
  RAISE NOTICE '✅ Auto-cleanup function created';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Next Steps:';
  RAISE NOTICE '  1. Add error logging to backend (NestJS exception filter)';
  RAISE NOTICE '  2. Add frontend error boundary';
  RAISE NOTICE '  3. Create admin error monitoring dashboard';
  RAISE NOTICE '  4. Set up Slack/Discord webhook for critical errors';
  RAISE NOTICE '';
  RAISE NOTICE 'See: USER_ERROR_MONITORING_PLAN.md for implementation details';
END $$;
