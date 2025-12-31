-- Migration: Optimize Stripe Schema RLS Policies
-- Created: 2025-12-30 19:00:00 UTC
-- Purpose: Improve stripe RLS performance with helper function
-- NOTE: This migration was SUPERSEDED by 20251230191000_simplify_rls_policies.sql
--       The function created here was replaced with a better approach using private schema.

-- ============================================================================
-- HELPER FUNCTION (SUPERSEDED)
-- ============================================================================
-- This function was replaced by private.get_my_stripe_customer_id() in the next migration
-- for better performance (O(1) lookup via stripe_customer_id column vs O(n) email scan)

create or replace function stripe.get_current_user_customer_ids()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from stripe.customers c
  where c.email = (
    select email from auth.users where id = (select auth.uid())
  )
  or (c.metadata->>'user_id')::uuid = (select auth.uid())
$$;

comment on function stripe.get_current_user_customer_ids() is
  'DEPRECATED: Replaced by private.get_my_stripe_customer_id() in migration 20251230191000';

grant execute on function stripe.get_current_user_customer_ids() to authenticated;

-- ============================================================================
-- POLICIES (SUPERSEDED)
-- ============================================================================
-- These policies were replaced in the next migration with optimized versions
-- using private.get_my_stripe_customer_id() instead.

drop policy if exists "customers_select_own" on stripe.customers;
create policy "customers_select_own" on stripe.customers
for select to authenticated
using (id in (select stripe.get_current_user_customer_ids()));

drop policy if exists "subscriptions_select_own" on stripe.subscriptions;
create policy "subscriptions_select_own" on stripe.subscriptions
for select to authenticated
using (customer in (select stripe.get_current_user_customer_ids()));

drop policy if exists "invoices_select_own" on stripe.invoices;
create policy "invoices_select_own" on stripe.invoices
for select to authenticated
using (customer in (select stripe.get_current_user_customer_ids()));

drop policy if exists "subscription_items_select_own" on stripe.subscription_items;
create policy "subscription_items_select_own" on stripe.subscription_items
for select to authenticated
using (
  subscription in (
    select s.id from stripe.subscriptions s
    where s.customer in (select stripe.get_current_user_customer_ids())
  )
);

drop policy if exists "active_entitlements_select_own" on stripe.active_entitlements;
create policy "active_entitlements_select_own" on stripe.active_entitlements
for select to authenticated
using (customer in (select stripe.get_current_user_customer_ids()));
