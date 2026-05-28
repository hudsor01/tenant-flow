-- =============================================================================
-- Migration: Restore performance indexes dropped in simplify_rls_policies
-- Created: 2026-02-20
-- Purpose: Re-create indexes on public schema tables that were dropped in
--          20251230191000_simplify_rls_policies.sql without being recreated
--          elsewhere. These indexes are critical for RLS policy performance
--          and query efficiency on high-traffic lookup columns.
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap each CREATE INDEX in a
-- to_regclass existence guard so Supabase preview-branch replays do not
-- fail on tables that have since been dropped by later migrations
-- (property_owners → renamed → dropped; rent_payments + payment_methods
-- dropped per CLAUDE.md "no rent payment facilitation"). The CI Supabase
-- Preview check replays the full migration chain on a fresh database; the
-- original CREATE INDEX statements raised SQLSTATE 42P01 against tables
-- that simply do not exist in the post-cleanup schema. Prod has already
-- applied the un-guarded version (no replay), so this rewrite is safe —
-- supabase_migrations.schema_migrations tracks by version, not content.
--
-- Affected tables (still exist):
--   public.tenants               -> idx_tenants_user_id
--   public.user_preferences      -> idx_user_preferences_user_id
--   public.users                 -> idx_users_email
--                                -> idx_users_stripe_customer_id
--   public.leases                -> idx_leases_stripe_subscription_id
--   public.blogs                 -> idx_blogs_slug
-- Skipped on replay (table dropped since original authoring):
--   public.property_owners       -> dropped after rename → stripe_connected_accounts → drop
--   public.rent_payments         -> dropped per "no rent payment facilitation"
--   public.payment_methods       -> dropped per "no rent payment facilitation"
-- Intentionally skipped at authoring time:
--   idx_properties_id            - redundant; id is already the primary key
--   idx_webhook_events_source_external_id - table was restructured in
--                                  20251226054128_add_webhook_monitoring_infrastructure.sql
--   idx_notification_settings_user - idx_notification_settings_user_id already
--                                  exists (created in 20251225182240)
-- =============================================================================

-- public.tenants — table still exists
do $$ begin
  if to_regclass('public.tenants') is not null then
    create index if not exists idx_tenants_user_id
      on public.tenants using btree (user_id);
    comment on index public.idx_tenants_user_id is
      'Performance index for tenant ownership checks and user-scoped queries';
  end if;
end $$;

-- public.property_owners — DROPPED (renamed then removed). Skipped on replay.
do $$ begin
  if to_regclass('public.property_owners') is not null then
    create index if not exists idx_property_owners_user_id
      on public.property_owners using btree (user_id);
    comment on index public.idx_property_owners_user_id is
      'Performance index for property owner look-ups by authenticated user';

    create index if not exists idx_property_owners_stripe_account_id
      on public.property_owners using btree (stripe_account_id);
    comment on index public.idx_property_owners_stripe_account_id is
      'Performance index for property owner look-ups by Stripe Connect account id';
  end if;
end $$;

-- public.user_preferences — table still exists
do $$ begin
  if to_regclass('public.user_preferences') is not null then
    create index if not exists idx_user_preferences_user_id
      on public.user_preferences using btree (user_id);
    comment on index public.idx_user_preferences_user_id is
      'Performance index for user preference look-ups scoped to a single user';
  end if;
end $$;

-- public.users — table still exists
do $$ begin
  if to_regclass('public.users') is not null then
    create index if not exists idx_users_email
      on public.users using btree (email);
    comment on index public.idx_users_email is
      'Performance index for user look-ups by email address';

    create index if not exists idx_users_stripe_customer_id
      on public.users using btree (stripe_customer_id);
    comment on index public.idx_users_stripe_customer_id is
      'Performance index for user look-ups by Stripe customer id';
  end if;
end $$;

-- public.rent_payments — DROPPED ("no rent payment facilitation"). Skipped on replay.
do $$ begin
  if to_regclass('public.rent_payments') is not null then
    create index if not exists idx_rent_payments_stripe_payment_intent_id
      on public.rent_payments using btree (stripe_payment_intent_id);
    comment on index public.idx_rent_payments_stripe_payment_intent_id is
      'Performance index for rent payment look-ups by Stripe payment intent id';
  end if;
end $$;

-- public.payment_methods — DROPPED ("no rent payment facilitation"). Skipped on replay.
do $$ begin
  if to_regclass('public.payment_methods') is not null then
    create index if not exists idx_payment_methods_stripe_payment_method_id
      on public.payment_methods using btree (stripe_payment_method_id);
    comment on index public.idx_payment_methods_stripe_payment_method_id is
      'Performance index for payment method look-ups by Stripe payment method id';
  end if;
end $$;

-- public.leases — table still exists
do $$ begin
  if to_regclass('public.leases') is not null then
    create index if not exists idx_leases_stripe_subscription_id
      on public.leases using btree (stripe_subscription_id);
    comment on index public.idx_leases_stripe_subscription_id is
      'Performance index for lease look-ups by Stripe subscription id';
  end if;
end $$;

-- public.blogs — table still exists
do $$ begin
  if to_regclass('public.blogs') is not null then
    create index if not exists idx_blogs_slug
      on public.blogs using btree (slug);
    comment on index public.idx_blogs_slug is
      'Performance index for blog post look-ups by slug';
  end if;
end $$;
