-- Migration: Harden RLS Policies for Production
-- Created: 2025-12-30 20:00:00 UTC
-- Purpose:
--   1. Add is_admin() helper function for admin access checks
--   2. Fix blogs policies (ADMIN-only write, public read)
--   3. Add report_runs policies (owner access)
--   4. Add stripe payment visibility (payment_methods, payment_intents, charges, refunds)
-- Security Model:
--   - OWNER: Property owners who manage properties and receive rent
--   - TENANT: Tenants who pay rent and submit maintenance requests
--   - ADMIN: Platform administrators with elevated access

-- ============================================================================
-- PART 1: ADMIN HELPER FUNCTION
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid())
    and user_type = 'ADMIN'
  )
$$;

comment on function public.is_admin() is
  'Returns true if the current authenticated user has ADMIN user_type. SECURITY DEFINER for performance.';

grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- PART 2: FIX BLOGS POLICIES
-- ============================================================================
-- Blogs are created by ADMIN (or service_role from n8n automation)
-- Public/authenticated users can read published blogs

-- Remove overly permissive INSERT policy
drop policy if exists "authenticated_can_insert_blogs" on public.blogs;
drop policy if exists "Enable insert for authenticated users only" on public.blogs;

-- Admin can INSERT blogs
create policy "blogs_insert_admin" on public.blogs
for insert to authenticated
with check ((select public.is_admin()));

-- Admin can UPDATE blogs
create policy "blogs_update_admin" on public.blogs
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Admin can DELETE blogs
create policy "blogs_delete_admin" on public.blogs
for delete to authenticated
using ((select public.is_admin()));

-- Keep existing SELECT policy for published blogs (anon + authenticated)
-- blogs_select_published already exists

-- ============================================================================
-- PART 3: REPORT_RUNS POLICIES
-- ============================================================================
-- Owners can view report runs for their own reports

create policy "report_runs_select_owner" on public.report_runs
for select to authenticated
using (
  report_id in (
    select id from public.reports
    where owner_user_id = (select public.get_current_owner_user_id())
  )
);

-- Service role handles INSERT/UPDATE/DELETE (backend generates reports)

-- ============================================================================
-- PART 4: STRIPE PAYMENT VISIBILITY
-- ============================================================================
-- Users (both owners and tenants) can view their own payment data
-- Uses the existing private.get_my_stripe_customer_id() for owners
-- Need to also support tenants via tenants.stripe_customer_id

-- Helper function to get current user's stripe customer ID (owner OR tenant)
create or replace function private.get_user_stripe_customer_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  -- First check if user is an owner with stripe_customer_id
  select coalesce(
    -- Owner's stripe customer ID
    (select stripe_customer_id from public.users where id = (select auth.uid())),
    -- Tenant's stripe customer ID
    (select stripe_customer_id from public.tenants where user_id = (select auth.uid()))
  )
$$;

comment on function private.get_user_stripe_customer_id() is
  'Returns the stripe_customer_id for the current user (from users table for owners, tenants table for tenants). SECURITY DEFINER for RLS performance.';

grant execute on function private.get_user_stripe_customer_id() to authenticated;

-- PAYMENT_METHODS: Users can view their saved payment methods
drop policy if exists "payment_methods_select_own" on stripe.payment_methods;
create policy "payment_methods_select_own" on stripe.payment_methods
for select to authenticated
using (customer = (select private.get_user_stripe_customer_id()));

-- PAYMENT_INTENTS: Users can view their payment intents
drop policy if exists "payment_intents_select_own" on stripe.payment_intents;
create policy "payment_intents_select_own" on stripe.payment_intents
for select to authenticated
using (customer = (select private.get_user_stripe_customer_id()));

-- CHARGES: Users can view their charges
drop policy if exists "charges_select_own" on stripe.charges;
create policy "charges_select_own" on stripe.charges
for select to authenticated
using (customer = (select private.get_user_stripe_customer_id()));

-- REFUNDS: Users can view refunds on their charges
-- Refunds link to charges via charge field, need to check charge ownership
drop policy if exists "refunds_select_own" on stripe.refunds;
create policy "refunds_select_own" on stripe.refunds
for select to authenticated
using (
  charge in (
    select id from stripe.charges
    where customer = (select private.get_user_stripe_customer_id())
  )
);

-- ============================================================================
-- PART 5: PERFORMANCE INDEXES
-- ============================================================================

-- Index for report_runs lookup by report_id
create index if not exists idx_report_runs_report_id on public.report_runs (report_id);

-- Index for refunds lookup by charge
create index if not exists idx_stripe_refunds_charge on stripe.refunds (charge);
