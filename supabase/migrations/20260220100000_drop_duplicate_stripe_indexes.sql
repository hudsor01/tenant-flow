-- =============================================================================
-- Migration: Drop duplicate indexes on Stripe schema tables
-- Created: 2026-02-20
-- Purpose: Our migrations in 20251230200000 and 20251230230000 created indexes
--          on stripe.refunds and stripe.setup_intents that duplicate indexes
--          already created by the Supabase Stripe integration.
-- Affected:
--   stripe.refunds.charge        → idx_stripe_refunds_charge
--   stripe.setup_intents.customer → idx_stripe_setup_intents_customer
-- =============================================================================

-- Drop duplicate index on stripe.refunds(charge)
-- Created by: 20251230200000_harden_rls_policies.sql
-- Duplicates an existing index from the Stripe integration
do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'stripe'
      and tablename = 'refunds'
      and indexname = 'idx_stripe_refunds_charge'
  ) then
    drop index stripe.idx_stripe_refunds_charge;
  end if;
end $$;

-- Drop duplicate index on stripe.setup_intents(customer)
-- Created by: 20251230230000_complete_stripe_rls.sql
-- Duplicates an existing index from the Stripe integration
do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'stripe'
      and tablename = 'setup_intents'
      and indexname = 'idx_stripe_setup_intents_customer'
  ) then
    drop index stripe.idx_stripe_setup_intents_customer;
  end if;
end $$;
