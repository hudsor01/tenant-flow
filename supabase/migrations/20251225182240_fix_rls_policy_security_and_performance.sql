-- Migration: Fix RLS Policy Security Gaps and Performance Issues
-- Date: 2025-12-25
--
-- This migration addresses issues identified in comprehensive RLS audit:
--
-- CRITICAL SECURITY FIXES (5 issues):
--   UPDATE policies missing WITH CHECK clause allow users to potentially
--   change ownership columns during UPDATE operations.
--
--   Per PostgreSQL documentation:
--   "Any rows whose updated values do not pass the WITH CHECK expression
--    will cause an error, and the entire command will be aborted."
--
--   Per Supabase documentation:
--   "The using clause represents the condition that must be true for the
--    update to be allowed, and with check clause ensures that the updates
--    made adhere to the policy constraints."
--
-- PERFORMANCE FIXES (16 issues):
--   Policies using auth.uid() without wrapping in (SELECT ...) cause
--   per-row function evaluation instead of once per statement.
--
--   Per Supabase documentation:
--   "Wrap function calls in SELECT statements for significant speed gains...
--    This technique allows Postgres to cache results per-statement rather
--    than executing functions on every row, yielding improvements up to
--    99.9% in benchmarks."
--
-- References:
-- - https://supabase.com/docs/guides/database/postgres/row-level-security
-- - https://www.postgresql.org/docs/current/sql-createpolicy.html
-- - https://docs.postgrest.org/en/latest/references/auth.html

-- ============================================================================
-- PART 1: CRITICAL SECURITY FIXES - UPDATE policies missing WITH CHECK
-- ============================================================================

-- 1.1 Fix notifications UPDATE policy
-- Risk: User could change user_id to access/modify other users' notifications
drop policy if exists "notifications_update_own" on public.notifications;

create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on policy "notifications_update_own" on public.notifications is
  'Security: Users can only update their own notifications. WITH CHECK prevents changing user_id to another user.';

-- 1.2 Fix stripe_connected_accounts UPDATE policy
-- Risk: User could change user_id to take over another user's Stripe Connect account
drop policy if exists "property_owners_update_own" on public.stripe_connected_accounts;
drop policy if exists "stripe_connected_accounts_update_own" on public.stripe_connected_accounts;

create policy "stripe_connected_accounts_update_own"
on public.stripe_connected_accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on policy "stripe_connected_accounts_update_own" on public.stripe_connected_accounts is
  'Security: Users can only update their own Stripe Connect account. WITH CHECK prevents ownership transfer attacks.';

-- 1.3 Fix tenants UPDATE policy
-- Risk: User could change user_id to impersonate another tenant
drop policy if exists "tenants_update_own" on public.tenants;

create policy "tenants_update_own"
on public.tenants
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on policy "tenants_update_own" on public.tenants is
  'Security: Tenants can only update their own profile. WITH CHECK prevents tenant impersonation attacks.';

-- 1.4 Fix user_preferences UPDATE policy
-- Risk: User could change user_id to modify another user's preferences
drop policy if exists "user_preferences_update_own" on public.user_preferences;

create policy "user_preferences_update_own"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on policy "user_preferences_update_own" on public.user_preferences is
  'Security: Users can only update their own preferences. WITH CHECK prevents cross-user preference modification.';

-- 1.5 Fix users UPDATE policy
-- Risk: User could change id to take over another user's account
drop policy if exists "users_update_own_record" on public.users;

create policy "users_update_own_record"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

comment on policy "users_update_own_record" on public.users is
  'Security: Users can only update their own user record. WITH CHECK prevents account takeover attacks.';

-- ============================================================================
-- PART 2: PERFORMANCE FIXES - Wrap auth.uid() in (SELECT ...) for caching
-- ============================================================================

-- 2.1 Fix activity policies
drop policy if exists "activity_insert_own" on public.activity;
drop policy if exists "activity_delete_own" on public.activity;
drop policy if exists "activity_update_own" on public.activity;

create policy "activity_insert_own"
on public.activity
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "activity_delete_own"
on public.activity
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "activity_update_own"
on public.activity
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- 2.2 Fix notification_settings policies
drop policy if exists "notification_settings_select_own" on public.notification_settings;
drop policy if exists "notification_settings_insert_own" on public.notification_settings;
drop policy if exists "notification_settings_update_own" on public.notification_settings;
drop policy if exists "notification_settings_delete_own" on public.notification_settings;

create policy "notification_settings_select_own"
on public.notification_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notification_settings_insert_own"
on public.notification_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "notification_settings_update_own"
on public.notification_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "notification_settings_delete_own"
on public.notification_settings
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 2.3 Fix notifications INSERT and DELETE policies (UPDATE already fixed above)
drop policy if exists "notifications_insert_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_insert_own"
on public.notifications
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 2.4 Fix tenant_invitations SELECT policy
drop policy if exists "tenant_invitations_select" on public.tenant_invitations;

create policy "tenant_invitations_select"
on public.tenant_invitations
for select
to authenticated
using (
  (select auth.uid()) = owner_user_id
  OR email = (select auth.email())
);

-- 2.5 Fix user_errors SELECT policy
drop policy if exists "user_errors_select_own" on public.user_errors;

create policy "user_errors_select_own"
on public.user_errors
for select
to authenticated
using ((select auth.uid()) = user_id);

-- 2.6 Fix stripe schema policies with performance optimization
-- These policies match the existing pattern but wrap auth.uid() in (select ...)

drop policy if exists "customers_select_own" on stripe.customers;

create policy "customers_select_own"
on stripe.customers
for select
to authenticated
using (
  (email in (
    select users.email
    from auth.users
    where users.id = (select auth.uid())
  ))
  or (((metadata ->> 'user_id'::text))::uuid = (select auth.uid()))
);

drop policy if exists "invoices_select_own" on stripe.invoices;

create policy "invoices_select_own"
on stripe.invoices
for select
to authenticated
using (
  customer in (
    select customers.id
    from stripe.customers
    where (
      (customers.email in (
        select users.email
        from auth.users
        where users.id = (select auth.uid())
      ))
      or (((customers.metadata ->> 'user_id'::text))::uuid = (select auth.uid()))
    )
  )
);

drop policy if exists "payment_methods_select_own" on stripe.payment_methods;

create policy "payment_methods_select_own"
on stripe.payment_methods
for select
to authenticated
using (
  customer in (
    select customers.id
    from stripe.customers
    where (
      (customers.email in (
        select users.email
        from auth.users
        where users.id = (select auth.uid())
      ))
      or (((customers.metadata ->> 'user_id'::text))::uuid = (select auth.uid()))
    )
  )
);

drop policy if exists "subscriptions_select_own" on stripe.subscriptions;

create policy "subscriptions_select_own"
on stripe.subscriptions
for select
to authenticated
using (
  customer in (
    select customers.id
    from stripe.customers
    where (
      (customers.email in (
        select users.email
        from auth.users
        where users.id = (select auth.uid())
      ))
      or (((customers.metadata ->> 'user_id'::text))::uuid = (select auth.uid()))
    )
  )
);

drop policy if exists "subscription_items_select_own" on stripe.subscription_items;

create policy "subscription_items_select_own"
on stripe.subscription_items
for select
to authenticated
using (
  subscription in (
    select subscriptions.id
    from stripe.subscriptions
    where subscriptions.customer in (
      select customers.id
      from stripe.customers
      where (
        (customers.email in (
          select users.email
          from auth.users
          where users.id = (select auth.uid())
        ))
        or (((customers.metadata ->> 'user_id'::text))::uuid = (select auth.uid()))
      )
    )
  )
);

-- ============================================================================
-- PART 3: Add performance indexes for RLS policy columns
-- ============================================================================

-- These indexes improve RLS policy evaluation performance
-- Only create if they don't already exist

do $$
begin
  -- Index for notifications.user_id
  if not exists (select 1 from pg_indexes where indexname = 'idx_notifications_user_id') then
    create index idx_notifications_user_id on public.notifications(user_id);
  end if;

  -- Index for notification_settings.user_id
  if not exists (select 1 from pg_indexes where indexname = 'idx_notification_settings_user_id') then
    create index idx_notification_settings_user_id on public.notification_settings(user_id);
  end if;

  -- Index for activity.user_id
  if not exists (select 1 from pg_indexes where indexname = 'idx_activity_user_id') then
    create index idx_activity_user_id on public.activity(user_id);
  end if;

  -- Index for user_errors.user_id
  if not exists (select 1 from pg_indexes where indexname = 'idx_user_errors_user_id') then
    create index idx_user_errors_user_id on public.user_errors(user_id);
  end if;

  -- Index for tenant_invitations.owner_user_id
  if not exists (select 1 from pg_indexes where indexname = 'idx_tenant_invitations_owner_user_id') then
    create index idx_tenant_invitations_owner_user_id on public.tenant_invitations(owner_user_id);
  end if;

  -- Index for tenant_invitations.email
  if not exists (select 1 from pg_indexes where indexname = 'idx_tenant_invitations_email') then
    create index idx_tenant_invitations_email on public.tenant_invitations(email);
  end if;
end
$$;

-- ============================================================================
-- PART 4: Verification queries (run manually to verify)
-- ============================================================================

-- To verify the migration, run these queries after applying:
--
-- 1. Check all UPDATE policies have WITH CHECK:
--    SELECT tablename, policyname, cmd, qual IS NOT NULL as has_using, with_check IS NOT NULL as has_with_check
--    FROM pg_policies
--    WHERE cmd = 'UPDATE' AND schemaname = 'public' AND 'authenticated' = ANY(roles);
--
-- 2. Check all policies use (select auth.uid()) pattern:
--    SELECT tablename, policyname
--    FROM pg_policies
--    WHERE schemaname IN ('public', 'stripe')
--      AND (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
--      OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%');
