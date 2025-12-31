-- Migration: Complete Stripe RLS Policies
-- Created: 2025-12-30 23:00:00 UTC
-- Purpose: Add remaining stripe policies based on property management payment flow
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

-- ============================================================================
-- SETUP_INTENTS: Users can view their setup intents (for saving payment methods)
-- ============================================================================
drop policy if exists "setup_intents_select_own" on stripe.setup_intents;
create policy "setup_intents_select_own" on stripe.setup_intents
for select to authenticated
using (customer = (select private.get_user_stripe_customer_id()));

-- ============================================================================
-- PRICES: Public read for platform pricing display
-- ============================================================================
drop policy if exists "prices_select_public" on stripe.prices;
create policy "prices_select_public" on stripe.prices
for select to authenticated, anon
using (active = true);

-- ============================================================================
-- PRODUCTS: Public read for platform product catalog
-- ============================================================================
drop policy if exists "products_select_public" on stripe.products;
create policy "products_select_public" on stripe.products
for select to authenticated, anon
using (active = true);

-- ============================================================================
-- Index for setup_intents customer lookup
-- ============================================================================
create index if not exists idx_stripe_setup_intents_customer on stripe.setup_intents (customer);
