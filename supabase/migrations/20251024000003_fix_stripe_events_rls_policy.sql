-- Migration: Fix RLS Policy for stripe_processed_events
-- Date: 2025-01-24
-- Description: Adds proper RLS policy for stripe_processed_events table

-- =====================================================
-- RLS POLICY FOR stripe_processed_events
-- =====================================================
-- The stripe_processed_events table only tracks webhook event IDs and processing status
-- It doesn't contain user-specific data, so the policy is simple:
-- - Service role can manage all events (for webhook processing)
-- - Regular users shouldn't access this table directly

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_processed_events;
DROP POLICY IF EXISTS "Users can view their own stripe events" ON public.stripe_processed_events;

-- Service role can manage all events (backend webhook processing)
CREATE POLICY "Service role can manage stripe events"
ON public.stripe_processed_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- No policy for authenticated users - they don't need direct access
-- They can access their Stripe data via the Stripe foreign data wrapper
-- which is protected by service_role-only permissions

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run to verify RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'stripe_processed_events';
