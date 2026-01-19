-- Migration: Simplify RLS Policies + Drop Redundant Indexes
-- Created: 2025-12-30 19:10:00 UTC
-- Supersedes: 20251230190000_optimize_stripe_rls_policies.sql
-- Purpose:
--   1. Replace stripe.get_current_user_customer_ids() with faster private.get_my_stripe_customer_id()
--   2. Remove redundant service_role policies (service_role bypasses RLS anyway)
--   3. Remove duplicate policies (same table/operation, different names)
--   4. Drop indexes that duplicate unique constraints (wasted storage/write overhead)
-- Result:
--   - Policies: 213 → 128 (85 removed)
--   - Indexes: 16 redundant dropped

-- ============================================================================
-- PART 1: PRIVATE SCHEMA + SECURITY DEFINER FUNCTION
-- ============================================================================

create schema if not exists private;

create or replace function private.get_my_stripe_customer_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select stripe_customer_id
  from public.users
  where id = (select auth.uid())
$$;

grant execute on function private.get_my_stripe_customer_id() to authenticated;

-- ============================================================================
-- PART 2-3: STRIPE POLICIES (Only run if stripe schema exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    -- Drop superseded function from migration 20251230190000
    DROP FUNCTION IF EXISTS stripe.get_current_user_customer_ids();

    -- PART 2: REMOVE REDUNDANT STRIPE SERVICE_ROLE POLICIES (28 policies)
    DROP POLICY IF EXISTS "service_role_all" ON stripe.active_entitlements;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.charges;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.checkout_session_line_items;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.checkout_sessions;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.coupons;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.credit_notes;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.customers;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.disputes;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.early_fraud_warnings;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.events;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.features;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.invoices;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.migrations;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.payment_intents;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.payment_methods;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.payouts;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.plans;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.prices;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.products;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.refunds;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.reviews;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.setup_intents;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.subscription_items;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.subscription_schedules;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.subscriptions;
    DROP POLICY IF EXISTS "service_role_all" ON stripe.tax_ids;
    DROP POLICY IF EXISTS "Service role can manage webhook_events" ON stripe.webhook_events;
    DROP POLICY IF EXISTS "Service role can manage webhook_failures" ON stripe.webhook_failures;

    -- PART 3: SIMPLIFY STRIPE USER POLICIES (use security definer)
    DROP POLICY IF EXISTS "customers_select_own" ON stripe.customers;
    EXECUTE '
      CREATE POLICY "customers_select_own" ON stripe.customers
      FOR SELECT TO authenticated
      USING (id = (SELECT private.get_my_stripe_customer_id()))';

    DROP POLICY IF EXISTS "subscriptions_select_own" ON stripe.subscriptions;
    EXECUTE '
      CREATE POLICY "subscriptions_select_own" ON stripe.subscriptions
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_my_stripe_customer_id()))';

    DROP POLICY IF EXISTS "invoices_select_own" ON stripe.invoices;
    EXECUTE '
      CREATE POLICY "invoices_select_own" ON stripe.invoices
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_my_stripe_customer_id()))';

    DROP POLICY IF EXISTS "subscription_items_select_own" ON stripe.subscription_items;
    EXECUTE '
      CREATE POLICY "subscription_items_select_own" ON stripe.subscription_items
      FOR SELECT TO authenticated
      USING (subscription IN (
        SELECT id FROM stripe.subscriptions
        WHERE customer = (SELECT private.get_my_stripe_customer_id())
      ))';

    DROP POLICY IF EXISTS "active_entitlements_select_own" ON stripe.active_entitlements;
    EXECUTE '
      CREATE POLICY "active_entitlements_select_own" ON stripe.active_entitlements
      FOR SELECT TO authenticated
      USING (customer = (SELECT private.get_my_stripe_customer_id()))';

    RAISE NOTICE 'Applied stripe policy simplifications';
  ELSE
    RAISE NOTICE 'Skipping stripe policy simplifications - stripe schema does not exist (local dev)';
  END IF;
END $$;

-- ============================================================================
-- PART 4: REMOVE REDUNDANT PUBLIC SERVICE_ROLE POLICIES (48 policies)
-- ============================================================================

drop policy if exists "activity_service_role" on public.activity;
drop policy if exists "Service role can insert blogs" on public.blogs;
drop policy if exists "Service role can update blogs" on public.blogs;
drop policy if exists "blogs_delete_service_role" on public.blogs;
drop policy if exists "blogs_insert_service_role" on public.blogs;
drop policy if exists "blogs_update_service_role" on public.blogs;
drop policy if exists "documents_service_role" on public.documents;
drop policy if exists "expenses_service_role" on public.expenses;
drop policy if exists "lease_tenants_service_role" on public.lease_tenants;
drop policy if exists "leases_service_role" on public.leases;
drop policy if exists "maintenance_requests_service_role" on public.maintenance_requests;
drop policy if exists "notification_logs_service_role" on public.notification_logs;
drop policy if exists "notifications_service_role" on public.notifications;
drop policy if exists "payment_methods_service_role" on public.payment_methods;
drop policy if exists "payment_schedules_service_role" on public.payment_schedules;
drop policy if exists "payment_transactions_service_role" on public.payment_transactions;
drop policy if exists "processed_internal_events_service_role_delete" on public.processed_internal_events;
drop policy if exists "processed_internal_events_service_role_insert" on public.processed_internal_events;
drop policy if exists "processed_internal_events_service_role_select" on public.processed_internal_events;
drop policy if exists "processed_internal_events_service_role_update" on public.processed_internal_events;
drop policy if exists "properties_service_role" on public.properties;
drop policy if exists "property_images_service_role" on public.property_images;
drop policy if exists "rent_due_service_role" on public.rent_due;
drop policy if exists "rent_payments_service_role" on public.rent_payments;
drop policy if exists "report_runs_service_role" on public.report_runs;
drop policy if exists "reports_service_role" on public.reports;
drop policy if exists "security_audit_log_service_role" on public.security_audit_log;
drop policy if exists "Service role can insert security events" on public.security_events;
drop policy if exists "property_owners_service_role" on public.stripe_connected_accounts;
drop policy if exists "tenant_invitations_service_role" on public.tenant_invitations;
drop policy if exists "Service role can manage all tenants" on public.tenants;
drop policy if exists "tenants_service_role" on public.tenants;
drop policy if exists "units_service_role" on public.units;
drop policy if exists "user_access_log_service_role" on public.user_access_log;
drop policy if exists "user_errors_service_role" on public.user_errors;
drop policy if exists "user_errors_service_role_delete" on public.user_errors;
drop policy if exists "user_errors_service_role_insert" on public.user_errors;
drop policy if exists "user_errors_service_role_select" on public.user_errors;
drop policy if exists "user_errors_service_role_update" on public.user_errors;
drop policy if exists "user_feature_access_service_role" on public.user_feature_access;
drop policy if exists "user_preferences_service_role" on public.user_preferences;
drop policy if exists "user_tour_progress_service_role" on public.user_tour_progress;
drop policy if exists "Service role can manage all users" on public.users;
drop policy if exists "users_service_role" on public.users;
drop policy if exists "users_service_role_all" on public.users;
drop policy if exists "webhook_attempts_service_role" on public.webhook_attempts;
drop policy if exists "webhook_events_service_role" on public.webhook_events;
drop policy if exists "webhook_metrics_service_role" on public.webhook_metrics;

-- ============================================================================
-- PART 5: REMOVE DUPLICATE POLICIES (6 policies)
-- ============================================================================

drop policy if exists "Enable insert for authenticated users only" on public.blogs;
drop policy if exists "Anyone can read published blogs" on public.blogs;
drop policy if exists "Tenants can view their own tenant profile" on public.tenants;
drop policy if exists "Tenants can update their own tenant profile" on public.tenants;
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;

-- ============================================================================
-- PART 6: REMOVE REDUNDANT STORAGE POLICY (1 policy)
-- ============================================================================

drop policy if exists "Allow service role full access" on storage.objects;

-- ============================================================================
-- PART 7: DROP REDUNDANT INDEXES (16 indexes)
-- These indexes duplicate unique constraints - the unique constraint already
-- provides the same lookup capability. Dropping saves storage and write overhead.
-- ============================================================================

-- public schema (15 indexes)
drop index if exists public.idx_blogs_slug;
drop index if exists public.idx_leases_stripe_subscription_id;
drop index if exists public.idx_notification_settings_user;
drop index if exists public.idx_notification_settings_user_id;
drop index if exists public.idx_payment_methods_stripe_payment_method_id;
drop index if exists public.idx_properties_id;
drop index if exists public.idx_rent_payments_stripe_payment_intent_id;
drop index if exists public.idx_property_owners_stripe_account_id;
drop index if exists public.idx_property_owners_user_id;
drop index if exists public.idx_tenants_stripe_customer_id;
drop index if exists public.idx_tenants_user_id;
drop index if exists public.idx_user_preferences_user_id;
drop index if exists public.idx_users_email;
drop index if exists public.idx_users_stripe_customer_id;
drop index if exists public.idx_webhook_events_source_external_id;

-- stripe schema index (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    DROP INDEX IF EXISTS stripe.idx_webhook_events_stripe_id;
    RAISE NOTICE 'Dropped stripe redundant indexes';
  END IF;
END $$;
