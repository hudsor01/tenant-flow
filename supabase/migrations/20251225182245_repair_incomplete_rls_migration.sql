-- Migration: Repair incomplete RLS migration
-- Created: 2025-12-25 18:22:45 UTC
-- Purpose: Complete the changes that failed in 20251225182240

-- The previous migration failed at stripe_connected_accounts_update_own
-- This migration completes the remaining changes

-- 1.2 Fix stripe_connected_accounts UPDATE policy (this is where it failed)
drop policy if exists "stripe_connected_accounts_update_own" on public.stripe_connected_accounts;
drop policy if exists "property_owners_update_own" on public.stripe_connected_accounts;

create policy "stripe_connected_accounts_update_own"
on public.stripe_connected_accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on policy "stripe_connected_accounts_update_own" on public.stripe_connected_accounts is
  'Security: Users can only update their own Stripe Connect account. WITH CHECK prevents ownership transfer attacks.';

-- 1.3 Fix tenants UPDATE policy
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
drop policy if exists "users_update_own_record" on public.users;

create policy "users_update_own_record"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

comment on policy "users_update_own_record" on public.users is
  'Security: Users can only update their own user record. WITH CHECK prevents account takeover attacks.';

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

-- 2.3 Fix notifications INSERT and DELETE policies
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

-- Performance indexes
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_notifications_user_id') then
    create index idx_notifications_user_id on public.notifications(user_id);
  end if;

  if not exists (select 1 from pg_indexes where indexname = 'idx_notification_settings_user_id') then
    create index idx_notification_settings_user_id on public.notification_settings(user_id);
  end if;

  if not exists (select 1 from pg_indexes where indexname = 'idx_activity_user_id') then
    create index idx_activity_user_id on public.activity(user_id);
  end if;

  if not exists (select 1 from pg_indexes where indexname = 'idx_user_errors_user_id') then
    create index idx_user_errors_user_id on public.user_errors(user_id);
  end if;

  if not exists (select 1 from pg_indexes where indexname = 'idx_tenant_invitations_owner_user_id') then
    create index idx_tenant_invitations_owner_user_id on public.tenant_invitations(owner_user_id);
  end if;

  if not exists (select 1 from pg_indexes where indexname = 'idx_tenant_invitations_email') then
    create index idx_tenant_invitations_email on public.tenant_invitations(email);
  end if;
end
$$;
