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
    where property_owner_id = (select public.get_current_owner_user_id())
  )
);

-- Service role handles INSERT/UPDATE/DELETE (backend generates reports)

-- ============================================================================
-- PART 4: STRIPE PAYMENT VISIBILITY (Only run if stripe schema exists)
-- ============================================================================

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

-- Stripe payment policies (conditional - only run if stripe schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    -- PAYMENT_METHODS: Users can view their saved payment methods
    DROP POLICY IF EXISTS "payment_methods_select_own" ON stripe.payment_methods;
    EXECUTE '
      CREATE POLICY "payment_methods_select_own" ON stripe.payment_methods
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_user_stripe_customer_id()))';

    -- PAYMENT_INTENTS: Users can view their payment intents
    DROP POLICY IF EXISTS "payment_intents_select_own" ON stripe.payment_intents;
    EXECUTE '
      CREATE POLICY "payment_intents_select_own" ON stripe.payment_intents
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_user_stripe_customer_id()))';

    -- CHARGES: Users can view their charges
    DROP POLICY IF EXISTS "charges_select_own" ON stripe.charges;
    EXECUTE '
      CREATE POLICY "charges_select_own" ON stripe.charges
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_user_stripe_customer_id()))';

    -- REFUNDS: Users can view refunds on their charges
    DROP POLICY IF EXISTS "refunds_select_own" ON stripe.refunds;
    EXECUTE '
      CREATE POLICY "refunds_select_own" ON stripe.refunds
      FOR SELECT TO authenticated
      USING (
        charge IN (
          SELECT id FROM stripe.charges
          WHERE customer = (SELECT private.get_user_stripe_customer_id())
        )
      )';

    -- Index for refunds lookup by charge
    CREATE INDEX IF NOT EXISTS idx_stripe_refunds_charge ON stripe.refunds (charge);

    RAISE NOTICE 'Applied stripe payment visibility policies';
  ELSE
    RAISE NOTICE 'Skipping stripe payment policies - stripe schema does not exist (local dev)';
  END IF;
END $$;

-- ============================================================================
-- PART 5: PERFORMANCE INDEXES (public schema only)
-- ============================================================================

-- Index for report_runs lookup by report_id
create index if not exists idx_report_runs_report_id on public.report_runs (report_id);
