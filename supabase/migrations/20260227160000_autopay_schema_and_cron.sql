-- =============================================================================
-- migration: autopay schema changes and pg_cron job
-- purpose: enable recurring automatic rent payments via saved payment methods
--
-- changes:
--   1. adds autopay_payment_method_id column to leases (stores stripe pm id)
--   2. adds index on leases(auto_pay_enabled) for the pg_cron query
--   3. creates process_autopay_charges() security definer function
--   4. registers pg_cron schedule for daily autopay processing at 07:00 utc
--
-- existing columns used:
--   - leases.auto_pay_enabled (boolean, already exists, default false)
--   - tenants.stripe_customer_id (text, already exists)
--   - payment_methods.stripe_payment_method_id (text, already exists)
--
-- depends on:
--   - 20260222110100_phase56_schema_foundations.sql (pg_cron, pg_net enabled)
--   - 20260226180000_add_rent_payment_fee_columns.sql (rent_due_id on rent_payments)
-- =============================================================================

-- section 1: schema changes
-- add autopay_payment_method_id to leases — stores the stripe payment method id
-- chosen by the tenant for autopay. null means no payment method selected.
alter table public.leases
  add column if not exists autopay_payment_method_id text null;

comment on column public.leases.autopay_payment_method_id is
  'Stripe payment method ID (pm_xxx) used for autopay charges. Set when tenant enables autopay. Cleared when tenant disables autopay.';

-- index for the pg_cron query that filters autopay-enabled active leases
create index if not exists idx_leases_auto_pay_enabled
  on public.leases (auto_pay_enabled)
  where auto_pay_enabled = true and lease_status = 'active';

-- =============================================================================
-- section 2: process_autopay_charges() function
-- =============================================================================
-- runs daily at 07:00 utc via pg_cron.
-- finds all rent_due records due today where the tenant has autopay enabled,
-- then invokes the stripe-autopay-charge edge function for each via pg_net.
--
-- idempotency: skips rent_due records that already have a succeeded or processing
-- rent_payments record. the edge function also performs its own duplicate check.
--
-- the function reads the supabase url and service role key from database config
-- params set via: alter database postgres set "app.settings.SUPABASE_URL" = '...';
-- these are the same params used by other db webhook functions.

create or replace function public.process_autopay_charges()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_record         record;
  v_supabase_url   text;
  v_service_key    text;
  v_edge_fn_url    text;
begin
  -- read supabase configuration from database settings.
  -- these must be set as postgresql database-level config params.
  v_supabase_url := current_setting('app.settings.SUPABASE_URL', true);
  v_service_key  := current_setting('app.settings.SUPABASE_SERVICE_ROLE_KEY', true);

  -- abort gracefully if not configured — autopay will not fire but nothing breaks.
  if v_supabase_url is null or v_supabase_url = '' then
    raise notice 'process_autopay_charges: SUPABASE_URL not configured, skipping';
    return;
  end if;

  if v_service_key is null or v_service_key = '' then
    raise notice 'process_autopay_charges: SUPABASE_SERVICE_ROLE_KEY not configured, skipping';
    return;
  end if;

  v_edge_fn_url := v_supabase_url || '/functions/v1/stripe-autopay-charge';

  -- find all rent_due records due today where the tenant has autopay enabled
  -- and no successful or in-progress payment exists for this rent_due period.
  for v_record in
    select
      rd.id as rent_due_id,
      rd.amount,
      rd.due_date,
      rd.unit_id,
      l.id as lease_id,
      l.owner_user_id,
      l.autopay_payment_method_id,
      l.unit_id as lease_unit_id,
      t.id as tenant_id,
      t.stripe_customer_id
    from public.rent_due rd
    join public.leases l
      on l.id = rd.lease_id
      and l.auto_pay_enabled = true
      and l.lease_status = 'active'
      and l.autopay_payment_method_id is not null
    join public.lease_tenants lt
      on lt.lease_id = l.id
    join public.tenants t
      on t.id = lt.tenant_id
      and t.stripe_customer_id is not null
    where
      rd.due_date = current_date
      and rd.status = 'pending'
      -- skip if a payment already exists for this rent_due (succeeded or processing)
      and not exists (
        select 1 from public.rent_payments rp
        where rp.rent_due_id = rd.id
          and rp.status in ('succeeded', 'processing')
      )
  loop
    -- fire async http post to the stripe-autopay-charge edge function.
    -- pg_net queues the request asynchronously — this function does not wait.
    perform net.http_post(
      url     := v_edge_fn_url,
      body    := jsonb_build_object(
        'tenant_id',                  v_record.tenant_id,
        'lease_id',                   v_record.lease_id,
        'rent_due_id',                v_record.rent_due_id,
        'amount',                     v_record.amount,
        'stripe_customer_id',         v_record.stripe_customer_id,
        'autopay_payment_method_id',  v_record.autopay_payment_method_id,
        'owner_user_id',              v_record.owner_user_id,
        'unit_id',                    v_record.unit_id
      ),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      timeout_milliseconds := 15000
    );
  end loop;
end;
$$;

comment on function public.process_autopay_charges() is
  'pg_cron job: runs daily at 07:00 UTC. For each rent_due record due today with '
  'autopay enabled, invokes the stripe-autopay-charge Edge Function to create an '
  'off-session PaymentIntent. Skips records that already have a succeeded or '
  'processing payment. Idempotent — safe to re-run.';

-- =============================================================================
-- section 3: register pg_cron schedule
-- =============================================================================
-- cron.schedule() is idempotent — replaces any existing job with the same name.
-- 07:00 utc = early morning for us tenants, charges appear before business hours.

select cron.schedule(
  'process-autopay-charges',
  '0 7 * * *',
  $$select public.process_autopay_charges()$$
);
