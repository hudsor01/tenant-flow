-- =============================================================================
-- Migration: Restore performance indexes dropped in simplify_rls_policies
-- Created: 2026-02-20
-- Purpose: Re-create indexes on public schema tables that were dropped in
--          20251230191000_simplify_rls_policies.sql without being recreated
--          elsewhere. These indexes are critical for RLS policy performance
--          and query efficiency on high-traffic lookup columns.
-- Affected tables:
--   public.tenants               -> idx_tenants_user_id
--   public.property_owners       -> idx_property_owners_user_id
--                                -> idx_property_owners_stripe_account_id
--   public.user_preferences      -> idx_user_preferences_user_id
--   public.users                 -> idx_users_email
--                                -> idx_users_stripe_customer_id
--   public.rent_payments         -> idx_rent_payments_stripe_payment_intent_id
--   public.payment_methods       -> idx_payment_methods_stripe_payment_method_id
--   public.leases                -> idx_leases_stripe_subscription_id
--   public.blogs                 -> idx_blogs_slug
-- Intentionally skipped:
--   idx_properties_id            - redundant; id is already the primary key
--   idx_webhook_events_source_external_id - table was restructured in
--                                  20251226054128_add_webhook_monitoring_infrastructure.sql
--   idx_notification_settings_user - idx_notification_settings_user_id already
--                                  exists (created in 20251225182240)
-- =============================================================================

-- Restore the index on tenants.user_id.
-- Used in RLS policies that scope tenants to the authenticated user and in
-- filtered list queries issued by the backend tenants module.
create index if not exists idx_tenants_user_id
  on public.tenants using btree (user_id);

comment on index public.idx_tenants_user_id is
  'Performance index for tenant ownership checks and user-scoped queries';

-- Restore the index on property_owners.user_id.
-- Used in RLS policies and ownership look-ups that join properties to their
-- owner records via the authenticated user id.
create index if not exists idx_property_owners_user_id
  on public.property_owners using btree (user_id);

comment on index public.idx_property_owners_user_id is
  'Performance index for property owner look-ups by authenticated user';

-- Restore the index on property_owners.stripe_account_id.
-- Used when reconciling Stripe Connect account webhooks back to a property
-- owner record.
create index if not exists idx_property_owners_stripe_account_id
  on public.property_owners using btree (stripe_account_id);

comment on index public.idx_property_owners_stripe_account_id is
  'Performance index for property owner look-ups by Stripe Connect account id';

-- Restore the index on user_preferences.user_id.
-- Used in RLS policies and queries that fetch or upsert preferences for the
-- currently authenticated user.
create index if not exists idx_user_preferences_user_id
  on public.user_preferences using btree (user_id);

comment on index public.idx_user_preferences_user_id is
  'Performance index for user preference look-ups scoped to a single user';

-- Restore the index on users.email.
-- Used in authentication flows and admin look-ups that resolve a user record
-- by email address.
create index if not exists idx_users_email
  on public.users using btree (email);

comment on index public.idx_users_email is
  'Performance index for user look-ups by email address';

-- Restore the index on users.stripe_customer_id.
-- Used when reconciling Stripe customer webhooks back to the internal user
-- record.
create index if not exists idx_users_stripe_customer_id
  on public.users using btree (stripe_customer_id);

comment on index public.idx_users_stripe_customer_id is
  'Performance index for user look-ups by Stripe customer id';

-- Restore the index on rent_payments.stripe_payment_intent_id.
-- Used when reconciling Stripe payment_intent webhooks back to rent payment
-- records.
create index if not exists idx_rent_payments_stripe_payment_intent_id
  on public.rent_payments using btree (stripe_payment_intent_id);

comment on index public.idx_rent_payments_stripe_payment_intent_id is
  'Performance index for rent payment look-ups by Stripe payment intent id';

-- Restore the index on payment_methods.stripe_payment_method_id.
-- Used when reconciling Stripe payment method events back to stored payment
-- method records.
create index if not exists idx_payment_methods_stripe_payment_method_id
  on public.payment_methods using btree (stripe_payment_method_id);

comment on index public.idx_payment_methods_stripe_payment_method_id is
  'Performance index for payment method look-ups by Stripe payment method id';

-- Restore the index on leases.stripe_subscription_id.
-- Used when reconciling Stripe subscription webhooks back to lease records.
create index if not exists idx_leases_stripe_subscription_id
  on public.leases using btree (stripe_subscription_id);

comment on index public.idx_leases_stripe_subscription_id is
  'Performance index for lease look-ups by Stripe subscription id';

-- Restore the index on blogs.slug.
-- Used for public blog post look-ups by slug (unique human-readable identifier).
create index if not exists idx_blogs_slug
  on public.blogs using btree (slug);

comment on index public.idx_blogs_slug is
  'Performance index for blog post look-ups by slug';
