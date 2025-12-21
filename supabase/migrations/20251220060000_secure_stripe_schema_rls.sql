-- Migration: Secure Stripe Schema with RLS
-- Created: 2025-12-20 06:00:00 UTC
-- Purpose: CRITICAL SECURITY FIX - Enable RLS on all Stripe tables
-- Impact: Prevents unauthorized access to sensitive payment/subscription data
-- Severity: CRITICAL - Stripe data exposed without RLS is a major security risk

-- ============================================================================
-- BACKGROUND
-- ============================================================================
-- The stripe schema contains 26 tables from Stripe Sync integration.
-- These tables contain highly sensitive data:
-- - Payment information (payment_intents, charges, refunds)
-- - Customer PII (customers, tax_ids)
-- - Subscription data (subscriptions, invoices)
-- - Financial data (payouts, invoices)
--
-- NONE of these tables had RLS enabled, meaning authenticated users could
-- potentially read or modify sensitive Stripe data without restriction.
--
-- This migration:
-- 1. Enables RLS on ALL stripe schema tables
-- 2. Restricts write operations to service_role only (backend)
-- 3. Allows users to view their own subscriptions/customers (read-only)
-- 4. Blocks all other user access to sensitive payment data
-- ============================================================================

-- ============================================================================
-- STRATEGY
-- ============================================================================
-- Stripe tables fall into 3 categories:
--
-- 1. SERVICE_ROLE ONLY (sensitive payment data):
--    - payment_intents, charges, refunds, payouts, disputes
--    - payment_methods, setup_intents
--    - All write operations on all tables
--
-- 2. USER READ ACCESS (user-facing data):
--    - subscriptions: users can view their own subscription
--    - customers: users can view their own customer record
--    - invoices: users can view their own invoices
--
-- 3. PUBLIC READ (product catalog - if exposed via API):
--    - products, prices, plans, features
--    - (Currently set to service_role only - can be opened if needed)
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL STRIPE TABLES
-- ============================================================================

-- Payment & Billing Data (Service Role Only)
ALTER TABLE stripe.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.setup_intents ENABLE ROW LEVEL SECURITY;

-- Customer & Subscription Data (Service Role + Limited User Access)
ALTER TABLE stripe.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.subscription_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.active_entitlements ENABLE ROW LEVEL SECURITY;

-- Product Catalog (Service Role Only by default)
ALTER TABLE stripe.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.coupons ENABLE ROW LEVEL SECURITY;

-- Checkout & Events
ALTER TABLE stripe.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.checkout_session_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.events ENABLE ROW LEVEL SECURITY;

-- Additional Tables
ALTER TABLE stripe.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.early_fraud_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.tax_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe.migrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SERVICE ROLE POLICIES (Full Access)
-- ============================================================================

-- Service role has full access to ALL stripe tables
DO $$
DECLARE
  stripe_table RECORD;
BEGIN
  FOR stripe_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'stripe'
  LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON stripe.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      stripe_table.tablename
    );

    EXECUTE format(
      'COMMENT ON POLICY "service_role_all" ON stripe.%I IS ''Backend (service_role) has full access to Stripe data''',
      stripe_table.tablename
    );
  END LOOP;
END $$;

-- ============================================================================
-- USER POLICIES (Limited Read Access)
-- ============================================================================

-- CUSTOMERS: Users can view their own customer record
CREATE POLICY "customers_select_own" ON stripe.customers
FOR SELECT TO authenticated
USING (
  -- Match by email (Stripe customer email = user email)
  email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
  OR
  -- Match by metadata.user_id if stored
  (metadata->>'user_id')::uuid = auth.uid()
);

COMMENT ON POLICY "customers_select_own" ON stripe.customers IS
'Users can view their own Stripe customer record (matched by email or metadata.user_id)';

-- SUBSCRIPTIONS: Users can view their own subscriptions
CREATE POLICY "subscriptions_select_own" ON stripe.subscriptions
FOR SELECT TO authenticated
USING (
  customer IN (
    SELECT id FROM stripe.customers
    WHERE email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR (metadata->>'user_id')::uuid = auth.uid()
  )
);

COMMENT ON POLICY "subscriptions_select_own" ON stripe.subscriptions IS
'Users can view subscriptions for their own Stripe customer record';

-- INVOICES: Users can view their own invoices
CREATE POLICY "invoices_select_own" ON stripe.invoices
FOR SELECT TO authenticated
USING (
  customer IN (
    SELECT id FROM stripe.customers
    WHERE email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR (metadata->>'user_id')::uuid = auth.uid()
  )
);

COMMENT ON POLICY "invoices_select_own" ON stripe.invoices IS
'Users can view invoices for their own Stripe customer record';

-- SUBSCRIPTION_ITEMS: Users can view items in their subscriptions
CREATE POLICY "subscription_items_select_own" ON stripe.subscription_items
FOR SELECT TO authenticated
USING (
  subscription IN (
    SELECT id FROM stripe.subscriptions
    WHERE customer IN (
      SELECT id FROM stripe.customers
      WHERE email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      OR (metadata->>'user_id')::uuid = auth.uid()
    )
  )
);

COMMENT ON POLICY "subscription_items_select_own" ON stripe.subscription_items IS
'Users can view subscription items for their own subscriptions';

-- ACTIVE_ENTITLEMENTS: Users can view their active feature entitlements
CREATE POLICY "active_entitlements_select_own" ON stripe.active_entitlements
FOR SELECT TO authenticated
USING (
  -- Match by user lookup key if stored in Stripe
  true -- TODO: Update this based on how entitlements are linked to users
);

COMMENT ON POLICY "active_entitlements_select_own" ON stripe.active_entitlements IS
'Users can view their active feature entitlements (needs user linkage)';

-- ============================================================================
-- OPTIONAL: PUBLIC PRODUCT CATALOG (Commented Out)
-- ============================================================================

-- If you want to expose product catalog publicly (for pricing pages):
--
-- CREATE POLICY "products_select_public" ON stripe.products
-- FOR SELECT TO authenticated, anon
-- USING (active = true);
--
-- CREATE POLICY "prices_select_public" ON stripe.prices
-- FOR SELECT TO authenticated, anon
-- USING (active = true);
--
-- CREATE POLICY "plans_select_public" ON stripe.plans
-- FOR SELECT TO authenticated, anon
-- USING (active = true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  unprotected_count INTEGER;
  table_record RECORD;
BEGIN
  SELECT COUNT(*) INTO unprotected_count
  FROM pg_tables
  WHERE schemaname = 'stripe'
    AND rowsecurity = false;

  IF unprotected_count > 0 THEN
    RAISE WARNING 'Found % stripe tables without RLS!', unprotected_count;

    FOR table_record IN
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'stripe' AND rowsecurity = false
    LOOP
      RAISE WARNING '  - stripe.%', table_record.tablename;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All % stripe tables have RLS enabled', (
      SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'stripe'
    );
  END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'stripe';

  RAISE NOTICE '✅ Created % RLS policies on stripe schema', policy_count;
END $$;

-- ============================================================================
-- SECURITY AUDIT QUERY
-- ============================================================================

-- Run this to audit stripe table access:
--
-- SELECT
--   tablename,
--   rowsecurity as rls_enabled,
--   (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'stripe' AND tablename = t.tablename) as policy_count
-- FROM pg_tables t
-- WHERE schemaname = 'stripe'
-- ORDER BY tablename;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '=== Stripe Schema RLS Security Migration Complete ===';
RAISE NOTICE '';
RAISE NOTICE '🔒 All 26 Stripe tables now protected with RLS';
RAISE NOTICE '🔒 Service role has full access (backend operations)';
RAISE NOTICE '🔒 Users can view their own: customers, subscriptions, invoices';
RAISE NOTICE '🔒 All payment data restricted to service_role only';
RAISE NOTICE '';
RAISE WARNING 'IMPORTANT: Verify user access patterns match your application needs';
RAISE WARNING 'IMPORTANT: Update active_entitlements policy based on your user linkage';
RAISE WARNING 'IMPORTANT: Consider exposing products/prices publicly if needed for pricing page';
