-- Migration: Remove Old Webhook System & Consolidate to Stripe Sync Engine
-- Created: 2025-10-18
-- Purpose: Consolidate dual webhook systems into single Stripe Sync Engine approach
-- Impact: Removes public.subscription table, processed_stripe_events (using stripe.* schema as single source of truth)

-- ============================================================================
-- STEP 1: Archive old subscription data (if table exists)
-- ============================================================================

DO $$
BEGIN
  -- Check if subscription table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'subscription'
  ) THEN
    -- Create archive table with timestamp
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS public.subscription_archive_%s AS
      SELECT *, NOW() as archived_at
      FROM public.subscription
    ', TO_CHAR(NOW(), 'YYYYMMDD'));

    RAISE NOTICE 'Archived % rows from public.subscription',
      (SELECT COUNT(*) FROM public.subscription);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop old webhook tables (legacy custom implementation)
-- ============================================================================

-- Drop subscription table (replaced by stripe.subscriptions)
DROP TABLE IF EXISTS public.subscription CASCADE;

-- Drop processed events table (using Stripe Sync Engine idempotency instead)
DROP TABLE IF EXISTS public.processed_stripe_events CASCADE;

-- ============================================================================
-- STEP 3: Drop user_access_log if exists (referenced by old webhook handlers)
-- ============================================================================

-- This table was used by StripeEventProcessor to log subscription status changes
-- No longer needed with Stripe Sync Engine (query stripe.subscriptions directly)
DROP TABLE IF EXISTS public.user_access_log CASCADE;

-- ============================================================================
-- STEP 4: Clean up any orphaned indexes
-- ============================================================================

DROP INDEX IF EXISTS public.idx_subscription_user_id;
DROP INDEX IF EXISTS public.idx_subscription_stripe_subscription_id;
DROP INDEX IF EXISTS public.idx_processed_stripe_events_event_id;
DROP INDEX IF EXISTS public.idx_processed_stripe_events_created_at;
DROP INDEX IF EXISTS public.idx_user_access_log_user_id;

-- ============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================================

-- Verify subscription table is gone
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription';
-- Expected: 0 rows

-- Verify stripe.subscriptions exists (created by Stripe Sync Engine)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'stripe' AND tablename = 'subscriptions';
-- Expected: 1 row

-- Check archive was created
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'subscription_archive_%';
-- Expected: 1 row with today's date

-- Count archived subscriptions
-- SELECT COUNT(*), MAX(archived_at) FROM public.subscription_archive_20251018;
-- Expected: Row count and timestamp

COMMENT ON TABLE public.subscription_archive_20251018 IS
  'Archived data from old custom webhook system before migration to Stripe Sync Engine. Safe to delete after verifying stripe.subscriptions has all data.';
