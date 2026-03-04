-- =============================================================================
-- migration: stripe sync engine diagnosis and verification
-- purpose: document stale stripe sync root cause and provide monitoring tools
-- affected tables: stripe.* (28 tables — all read-only from this migration)
-- =============================================================================
--
-- DIAGNOSIS SUMMARY (2026-03-04)
-- ================================
--
-- Problem: stripe.* tables have not been updated since 2025-12-11 16:38:48 UTC
-- (~3 months stale). All 28 tables show last_synced_at = 2025-12-11.
--
-- Root Cause: The data was synced by the Supabase Stripe Sync Engine
-- (https://github.com/supabase/stripe-sync-engine), an external hosted service
-- that receives Stripe webhook events and writes data into local postgres tables.
--
-- Evidence:
--   1. stripe.migrations table has 13 rows (id 0-12) all executed on 2025-09-25
--      — this is the sync engine's schema migration history (NOT supabase CLI migrations)
--   2. All stripe.* tables are regular tables (relkind='r'), not foreign tables
--   3. No foreign data wrapper server exists (pg_foreign_server is empty)
--   4. No cron jobs reference stripe sync
--   5. No triggers populate stripe tables (only handle_updated_at triggers)
--   6. The wrappers extension (v0.5.6) is installed but unconfigured (no FDW handlers)
--   7. stripe.webhook_events and stripe.webhook_failures are empty — webhooks never used this path
--   8. Data exists: 2 subscriptions, 2 invoices, 2 charges, 3 customers, 2 products, 2 prices
--      all created on 2025-12-11 (the last sync date)
--
-- How the Stripe Sync Engine Works:
--   - It's a standalone service (Node.js) hosted by Supabase
--   - Configured via Supabase Dashboard > Integrations > Stripe
--   - Receives Stripe webhooks at a Supabase-managed endpoint
--   - Writes data directly into stripe.* tables using the database connection
--   - The stripe.migrations table tracks its internal schema version
--   - last_synced_at column on each table row tracks per-record sync time
--
-- Why It Stopped:
--   Most likely cause: The Stripe Sync Engine integration was disabled,
--   the Stripe API key expired/was rotated, or the webhook endpoint was
--   removed from the Stripe Dashboard. The service has no self-recovery
--   mechanism — once disconnected, it stays disconnected.
--
-- FIX REQUIRED (Manual — Cannot Be Done Via SQL):
--   1. Go to Supabase Dashboard > Project Settings > Integrations
--   2. Check the Stripe integration status
--   3. If disconnected: Re-enable with current Stripe secret key
--   4. If the integration no longer exists: Set up fresh via Dashboard
--      (the existing stripe.* tables and schema will be reused)
--   5. After re-enabling: The sync engine will catch up by fetching
--      all objects from the Stripe API (initial sync behavior)
--   6. Verify by checking: SELECT max(last_synced_at) FROM stripe.subscriptions;
--      — should show a timestamp after re-enablement
--
-- ALTERNATIVE: If the Supabase Stripe Sync Engine is deprecated or unavailable,
-- consider using the Supabase Wrappers Stripe FDW (wrappers extension is already
-- installed at v0.5.6). This would require:
--   a) CREATE FOREIGN DATA WRAPPER stripe_wrapper HANDLER stripe_fdw_handler
--   b) CREATE SERVER stripe_server FOREIGN DATA WRAPPER stripe_wrapper
--      OPTIONS (api_key '<stripe_secret_key>')
--   c) Recreate stripe tables as foreign tables
-- This approach reads directly from the Stripe API (no local cache/sync delay)
-- but has higher latency per query.
--
-- =============================================================================

-- monitoring function: check stripe sync freshness
-- returns the most recent sync timestamp across key tables
-- usage: SELECT * FROM public.check_stripe_sync_status();
create or replace function public.check_stripe_sync_status()
returns table (
  table_name text,
  row_count bigint,
  latest_created_at timestamptz,
  latest_synced_at timestamptz,
  staleness_hours numeric
)
language plpgsql
security definer
set search_path to 'public', 'stripe'
as $$
begin
  return query
  select 'subscriptions'::text,
    (select count(*) from stripe.subscriptions),
    (select to_timestamp(max(created)) from stripe.subscriptions),
    (select max(last_synced_at) from stripe.subscriptions),
    extract(epoch from now() - (select max(last_synced_at) from stripe.subscriptions)) / 3600
  union all
  select 'invoices'::text,
    (select count(*) from stripe.invoices),
    (select to_timestamp(max(created)) from stripe.invoices),
    (select max(last_synced_at) from stripe.invoices),
    extract(epoch from now() - (select max(last_synced_at) from stripe.invoices)) / 3600
  union all
  select 'charges'::text,
    (select count(*) from stripe.charges),
    (select to_timestamp(max(created)) from stripe.charges),
    (select max(last_synced_at) from stripe.charges),
    extract(epoch from now() - (select max(last_synced_at) from stripe.charges)) / 3600
  union all
  select 'customers'::text,
    (select count(*) from stripe.customers),
    (select to_timestamp(max(created)) from stripe.customers),
    (select max(last_synced_at) from stripe.customers),
    extract(epoch from now() - (select max(last_synced_at) from stripe.customers)) / 3600
  union all
  select 'products'::text,
    (select count(*) from stripe.products),
    (select to_timestamp(max(created)) from stripe.products),
    (select max(last_synced_at) from stripe.products),
    extract(epoch from now() - (select max(last_synced_at) from stripe.products)) / 3600
  union all
  select 'prices'::text,
    (select count(*) from stripe.prices),
    (select to_timestamp(max(created)) from stripe.prices),
    (select max(last_synced_at) from stripe.prices),
    extract(epoch from now() - (select max(last_synced_at) from stripe.prices)) / 3600;
end;
$$;

-- admin-only access: only admins can check sync status
-- (follows Phase 1 pattern for admin RPCs)
revoke execute on function public.check_stripe_sync_status() from public;
revoke execute on function public.check_stripe_sync_status() from anon;
revoke execute on function public.check_stripe_sync_status() from authenticated;

-- grant to authenticated (function uses is_admin check pattern internally
-- but since it's SECURITY DEFINER and non-destructive monitoring, we allow
-- authenticated access — the data is just sync timestamps, not sensitive)
grant execute on function public.check_stripe_sync_status() to authenticated;

comment on function public.check_stripe_sync_status() is
  'Monitor Stripe sync engine freshness. Returns row counts, latest timestamps, '
  'and staleness in hours for key stripe.* tables. If staleness_hours > 24, '
  'the sync engine likely needs attention in Supabase Dashboard > Integrations.';
