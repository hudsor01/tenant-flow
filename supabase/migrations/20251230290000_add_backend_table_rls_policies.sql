-- Migration: Add RLS Policies for Backend-Only Tables
-- Created: 2025-12-30 29:00:00 UTC
-- Purpose: Add service_role-only policies to tables that have RLS enabled but no policies
-- Security Impact: MEDIUM - Ensures backend tables are only accessible via service_role
--
-- These tables are internal/backend-only and should never be accessed by frontend clients

-- ============================================================================
-- PART 1: PUBLIC SCHEMA BACKEND TABLES
-- ============================================================================

-- processed_internal_events - tracks processed webhook events for idempotency
create policy "service_role_only" on public.processed_internal_events
for all to service_role using (true) with check (true);

-- security_audit_log - security event logging
create policy "service_role_only" on public.security_audit_log
for all to service_role using (true) with check (true);

-- user_access_log - user access tracking
create policy "service_role_only" on public.user_access_log
for all to service_role using (true) with check (true);

-- webhook_attempts - webhook delivery attempts
create policy "service_role_only" on public.webhook_attempts
for all to service_role using (true) with check (true);

-- webhook_events - webhook event storage
create policy "service_role_only" on public.webhook_events
for all to service_role using (true) with check (true);

-- webhook_metrics - webhook performance metrics
create policy "service_role_only" on public.webhook_metrics
for all to service_role using (true) with check (true);

-- ============================================================================
-- PART 2: STRIPE SCHEMA BACKEND TABLES (Only run if stripe schema exists)
-- ============================================================================
-- These are managed by the Stripe Supabase integration and should only be
-- accessed by service_role (the sync engine) or via specific user-facing policies
-- Note: Stripe schema is created by Stripe Sync Engine in production only

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    -- checkout_session_line_items
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.checkout_session_line_items FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- checkout_sessions
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.checkout_sessions FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- coupons
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.coupons FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- credit_notes
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.credit_notes FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- disputes
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.disputes FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- early_fraud_warnings
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.early_fraud_warnings FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- events (stripe webhook events)
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.events FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- features (product features)
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.features FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- migrations (stripe sync migrations)
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.migrations FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- payouts
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.payouts FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- plans
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.plans FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- reviews
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.reviews FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- subscription_schedules
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.subscription_schedules FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- tax_ids
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.tax_ids FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- webhook_events (stripe webhook events)
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true)';

    -- webhook_failures
    EXECUTE 'CREATE POLICY "service_role_only" ON stripe.webhook_failures FOR ALL TO service_role USING (true) WITH CHECK (true)';

    RAISE NOTICE 'Applied stripe schema backend table policies';
  ELSE
    RAISE NOTICE 'Skipping stripe schema backend table policies - stripe schema does not exist (local dev)';
  END IF;
END $$;
