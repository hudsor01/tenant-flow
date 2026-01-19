-- Migration: Complete Stripe RLS Policies
-- Created: 2025-12-30 23:00:00 UTC
-- Purpose: Add remaining stripe policies based on property management payment flow
-- Note: Stripe schema is created by Stripe Sync Engine in production only
--
-- Payment Flow:
--   Tenant pays rent → PaymentIntent (destination charge) → Owner's Connect account
--   Owner pays platform → Subscription → TenantFlow
--
-- Policy Model:
--   - Tenants: payment_methods, payment_intents, charges, refunds, setup_intents
--   - Owners: customers, subscriptions, invoices, subscription_items, active_entitlements
--   - Public: prices, products (platform pricing catalog)
--   - Backend-only: everything else (checkout_sessions, disputes, events, etc.)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    -- ============================================================================
    -- SETUP_INTENTS: Users can view their setup intents (for saving payment methods)
    -- ============================================================================
    DROP POLICY IF EXISTS "setup_intents_select_own" ON stripe.setup_intents;
    EXECUTE '
      CREATE POLICY "setup_intents_select_own" ON stripe.setup_intents
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_user_stripe_customer_id()))';

    -- ============================================================================
    -- PRICES: Public read for platform pricing display
    -- ============================================================================
    DROP POLICY IF EXISTS "prices_select_public" ON stripe.prices;
    EXECUTE '
      CREATE POLICY "prices_select_public" ON stripe.prices
      FOR SELECT TO authenticated, anon
      USING (active = true)';

    -- ============================================================================
    -- PRODUCTS: Public read for platform product catalog
    -- ============================================================================
    DROP POLICY IF EXISTS "products_select_public" ON stripe.products;
    EXECUTE '
      CREATE POLICY "products_select_public" ON stripe.products
      FOR SELECT TO authenticated, anon
      USING (active = true)';

    -- ============================================================================
    -- Index for setup_intents customer lookup
    -- ============================================================================
    CREATE INDEX IF NOT EXISTS idx_stripe_setup_intents_customer ON stripe.setup_intents (customer);

    RAISE NOTICE 'Applied complete stripe RLS policies';
  ELSE
    RAISE NOTICE 'Skipping complete stripe RLS policies - stripe schema does not exist (local dev)';
  END IF;
END $$;
