-- Migration: Fix function search_path security vulnerability
-- Date: 2025-01-11
--
-- SECURITY FIX: Add search_path to 23 functions
-- Supabase Security Advisory: Functions without SET search_path are vulnerable
-- to privilege escalation attacks via search_path manipulation
--
-- Solution: Add `SET search_path TO 'public', 'pg_temp'` to all affected functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ============================================================================
-- Dashboard and Stats Functions
-- ============================================================================

-- 1. get_dashboard_stats_optimized
ALTER FUNCTION public.get_dashboard_stats_optimized(text, text)
SET search_path TO 'public', 'pg_temp';

-- 2. get_dashboard_stats_fast
ALTER FUNCTION public.get_dashboard_stats_fast(text)
SET search_path TO 'public', 'pg_temp';

-- 3. create_dashboard_stats_snapshot
ALTER FUNCTION public.create_dashboard_stats_snapshot()
SET search_path TO 'public', 'pg_temp';

-- 4. get_occupancy_change
ALTER FUNCTION public.get_occupancy_change(text, integer)
SET search_path TO 'public', 'pg_temp';

-- 5. cleanup_dashboard_history
ALTER FUNCTION public.cleanup_dashboard_history()
SET search_path TO 'public', 'pg_temp';

-- 6. get_dashboard_time_series
ALTER FUNCTION public.get_dashboard_time_series(text, text, integer)
SET search_path TO 'public', 'pg_temp';

-- 7. get_metric_trend
ALTER FUNCTION public.get_metric_trend(text, text, text)
SET search_path TO 'public', 'pg_temp';

-- 8. refresh_dashboard_stats_mv
ALTER FUNCTION public.refresh_dashboard_stats_mv()
SET search_path TO 'public', 'pg_temp';

-- ============================================================================
-- Stripe and Webhook Functions
-- ============================================================================

-- 9. record_stripe_event
ALTER FUNCTION public.record_stripe_event(text, text)
SET search_path TO 'public', 'pg_temp';

-- 10. check_event_processed
ALTER FUNCTION public.check_event_processed(text)
SET search_path TO 'public', 'pg_temp';

-- 11. cleanup_old_stripe_events
ALTER FUNCTION public.cleanup_old_stripe_events(integer)
SET search_path TO 'public', 'pg_temp';

-- 12. get_events_pending_recovery
ALTER FUNCTION public.get_events_pending_recovery(integer, integer)
SET search_path TO 'public', 'pg_temp';

-- 13. update_stripe_event_retry
ALTER FUNCTION public.update_stripe_event_retry(text, integer)
SET search_path TO 'public', 'pg_temp';

-- 14. mark_stripe_event_failed
ALTER FUNCTION public.mark_stripe_event_failed(text, text)
SET search_path TO 'public', 'pg_temp';

-- 15. get_webhook_statistics
ALTER FUNCTION public.get_webhook_statistics()
SET search_path TO 'public', 'pg_temp';

-- 16. detect_webhook_health_issues
ALTER FUNCTION public.detect_webhook_health_issues()
SET search_path TO 'public', 'pg_temp';

-- 17. cleanup_old_webhook_data
ALTER FUNCTION public.cleanup_old_webhook_data()
SET search_path TO 'public', 'pg_temp';

-- ============================================================================
-- Analytics and Reporting Functions
-- ============================================================================

-- 18. get_occupancy_trends
ALTER FUNCTION public.get_occupancy_trends(uuid, integer)
SET search_path TO 'public', 'pg_temp';

-- 19. get_revenue_trends
ALTER FUNCTION public.get_revenue_trends(uuid, integer)
SET search_path TO 'public', 'pg_temp';

-- ============================================================================
-- Property Image Functions
-- ============================================================================

-- 20. ensure_single_primary_image
ALTER FUNCTION public.ensure_single_primary_image()
SET search_path TO 'public', 'pg_temp';

-- 21. auto_set_first_image_primary
ALTER FUNCTION public.auto_set_first_image_primary()
SET search_path TO 'public', 'pg_temp';

-- ============================================================================
-- Comments for Verification
-- ============================================================================

COMMENT ON FUNCTION public.get_dashboard_stats_optimized IS 'SECURITY FIX 2025-01-11: Added search_path protection against privilege escalation';
COMMENT ON FUNCTION public.record_stripe_event IS 'SECURITY FIX 2025-01-11: Added search_path protection against privilege escalation';
COMMENT ON FUNCTION public.ensure_single_primary_image IS 'SECURITY FIX 2025-01-11: Added search_path protection against privilege escalation';
