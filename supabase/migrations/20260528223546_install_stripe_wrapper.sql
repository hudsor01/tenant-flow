-- Install the Supabase Stripe Foreign Data Wrapper (FDW).
--
-- Documented at https://fdw.dev/catalog/stripe/ -- the canonical Supabase
-- pattern for querying Stripe API data as Postgres tables.
--
-- After this, stripe.subscriptions / stripe.invoices / stripe.charges /
-- stripe.customers / stripe.payment_intents / etc become live foreign
-- tables that proxy to the Stripe API (no local caching). 24 foreign
-- tables total per the wrapper's import_foreign_schema output.
--
-- Prerequisites (verified pre-apply):
--   - extensions.wrappers @ 0.6.1 installed
--   - vault.secrets has STRIPE_SECRET_KEY (id
--     0d1551ab-1294-4e9d-9315-d4e2ebc25228, created 2025-07-15)
--   - public.stripe.* regular tables dropped (PR #751, merged at
--     86c65d5a8) -- the namespace is free for foreign tables
--
-- This migration was applied via Supabase MCP `apply_migration` ahead of
-- this commit and verified with a live API call (stripe.customers
-- returned 21 rows, stripe.subscriptions returned 0 -- confirms the
-- wrapper proxies to prod Stripe). The schema_migrations row was kept
-- so chain replay on prod skips re-applying.
--
-- All operations wrapped in idempotency guards so re-running on a fresh
-- DB or on a DB that already has the wrapper is a safe no-op.
--
-- Issue #749 root-cause cleanup, part 3 (parts 1 + 2 dropped the dead
-- pivot schema + 4 dead RPCs). Part 4 (subsequent PR) will rewrite the
-- 8 live-but-damaged analytics RPCs to query these foreign tables
-- instead of the long-dropped public.rent_payments table.

-- Step 0: the wrapper extension itself. On prod this was installed by hand
-- BEFORE this migration was applied, so the migration's claim below that it is
-- "a safe no-op on a fresh DB" was false: replay died here with
-- `function extensions.stripe_fdw_handler() does not exist` (SQLSTATE 42883)
-- after 246 of 348 migrations. Measured 2026-10-25. The local image ships
-- wrappers 0.6.3 (prod runs 0.6.1); `if not exists` keeps prod a no-op.
create extension if not exists wrappers with schema extensions;

-- Step 1: register the wrapper handler/validator from the extension
do $$
begin
  if not exists (select 1 from pg_foreign_data_wrapper where fdwname = 'stripe_wrapper') then
    create foreign data wrapper stripe_wrapper
      handler extensions.stripe_fdw_handler
      validator extensions.stripe_fdw_validator;
  end if;
end $$;

-- Step 2: create the server bound to the Vault-stored API key.
-- api_version matches supabase/functions/_shared/stripe-client.ts:8
-- (STRIPE_API_VERSION = '2026-03-25.dahlia') so the whole project
-- speaks to Stripe via the same API contract.
do $$
begin
  -- The api_key_id bound below lives in Vault. Guard on the secret's NAME, not
  -- its id: ids differ per environment, and repeating the id literal here made
  -- gitleaks flag it as a generic-api-key (it is an identifier, not the key).
  -- Where the secret is absent there is nothing to bind and nothing to import,
  -- so this and step 4 are both skipped.
  if not exists (select 1 from vault.secrets where name = 'STRIPE_SECRET_KEY') then
    raise notice 'stripe_server skipped: vault secret STRIPE_SECRET_KEY not present (expected on a fresh or CI database)';
  elsif not exists (select 1 from pg_foreign_server where srvname = 'stripe_server') then
    create server stripe_server
      foreign data wrapper stripe_wrapper
      options (
        api_key_id '0d1551ab-1294-4e9d-9315-d4e2ebc25228',
        api_url 'https://api.stripe.com/v1/',
        api_version '2026-03-25.dahlia'
      );
  end if;
end $$;

-- Step 3: create the stripe schema if missing (PR #751 dropped the old
-- regular-table version, but a fresh DB chain replay might not have
-- reached that point).
create schema if not exists stripe;

-- Step 4: import the foreign tables from Stripe. import_foreign_schema is
-- not idempotent in standard Postgres -- guard by checking whether any
-- foreign table already lives in stripe.*.
do $$
begin
  if not exists (select 1 from pg_foreign_server where srvname = 'stripe_server') then
    raise notice 'import foreign schema skipped: no stripe_server (fresh or CI database)';
  elsif not exists (
    select 1
    from pg_class c
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'stripe' and c.relkind = 'f'
  ) then
    execute 'import foreign schema stripe from server stripe_server into stripe';
  end if;
end $$;
