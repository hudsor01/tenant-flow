-- Migration: Optimize Stripe Schema RLS Policies
-- Created: 2025-12-30 19:00:00 UTC
-- Purpose: Improve stripe RLS performance with helper function
-- NOTE: This migration was SUPERSEDED by 20251230191000_simplify_rls_policies.sql
--       The function created here was replaced with a better approach using private schema.
-- NOTE: Only runs if stripe schema exists (created by Stripe Sync Engine in production)

DO $$
BEGIN
  -- Only run if stripe schema exists (production only)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN

    -- HELPER FUNCTION (SUPERSEDED)
    -- This function was replaced by private.get_my_stripe_customer_id() in the next migration
    EXECUTE '
      CREATE OR REPLACE FUNCTION stripe.get_current_user_customer_ids()
      RETURNS setof text
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''''
      AS $fn$
        SELECT c.id
        FROM stripe.customers c
        WHERE c.email = (
          SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
        )
        OR (c.metadata->>''user_id'')::uuid = (SELECT auth.uid())
      $fn$';

    EXECUTE 'COMMENT ON FUNCTION stripe.get_current_user_customer_ids() IS
      ''DEPRECATED: Replaced by private.get_my_stripe_customer_id() in migration 20251230191000''';

    EXECUTE 'GRANT EXECUTE ON FUNCTION stripe.get_current_user_customer_ids() TO authenticated';

    -- POLICIES (SUPERSEDED)
    DROP POLICY IF EXISTS "customers_select_own" ON stripe.customers;
    EXECUTE '
      CREATE POLICY "customers_select_own" ON stripe.customers
      FOR SELECT TO authenticated
      USING (id IN (SELECT stripe.get_current_user_customer_ids()))';

    DROP POLICY IF EXISTS "subscriptions_select_own" ON stripe.subscriptions;
    EXECUTE '
      CREATE POLICY "subscriptions_select_own" ON stripe.subscriptions
      FOR SELECT TO authenticated
      USING (customer IN (SELECT stripe.get_current_user_customer_ids()))';

    DROP POLICY IF EXISTS "invoices_select_own" ON stripe.invoices;
    EXECUTE '
      CREATE POLICY "invoices_select_own" ON stripe.invoices
      FOR SELECT TO authenticated
      USING (customer IN (SELECT stripe.get_current_user_customer_ids()))';

    DROP POLICY IF EXISTS "subscription_items_select_own" ON stripe.subscription_items;
    EXECUTE '
      CREATE POLICY "subscription_items_select_own" ON stripe.subscription_items
      FOR SELECT TO authenticated
      USING (
        subscription IN (
          SELECT s.id FROM stripe.subscriptions s
          WHERE s.customer IN (SELECT stripe.get_current_user_customer_ids())
        )
      )';

    DROP POLICY IF EXISTS "active_entitlements_select_own" ON stripe.active_entitlements;
    EXECUTE '
      CREATE POLICY "active_entitlements_select_own" ON stripe.active_entitlements
      FOR SELECT TO authenticated
      USING (customer IN (SELECT stripe.get_current_user_customer_ids()))';

    RAISE NOTICE 'Applied stripe RLS optimization policies';
  ELSE
    RAISE NOTICE 'Skipping stripe RLS optimization - stripe schema does not exist (local dev)';
  END IF;
END $$;
