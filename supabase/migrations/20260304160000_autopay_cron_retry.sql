-- =============================================================================
-- migration: autopay pg_cron retry logic
-- purpose: update process_autopay_charges() to handle:
--   1. per-tenant portion calculation (responsibility_percentage)
--   2. retry logic for failed autopay charges using autopay_next_retry_at
--
-- retry schedule:
--   day 1: initial charge (due_date = current_date)
--   day 3: retry 1 (autopay_next_retry_at set by Edge Function after attempt 1)
--   day 7: retry 2 (autopay_next_retry_at set by Edge Function after attempt 2)
--   after 3 failed attempts: no more retries
--
-- depends on:
--   20260304140000_financial_fixes_schema.sql (autopay_attempts, autopay_next_retry_at columns)
--   20260227160000_autopay_schema_and_cron.sql (original function + cron job)
-- =============================================================================

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
  -- Read supabase configuration from database settings.
  v_supabase_url := current_setting('app.settings.SUPABASE_URL', true);
  v_service_key  := current_setting('app.settings.SUPABASE_SERVICE_ROLE_KEY', true);

  -- Abort gracefully if not configured.
  if v_supabase_url is null or v_supabase_url = '' then
    raise notice 'process_autopay_charges: SUPABASE_URL not configured, skipping';
    return;
  end if;

  if v_service_key is null or v_service_key = '' then
    raise notice 'process_autopay_charges: SUPABASE_SERVICE_ROLE_KEY not configured, skipping';
    return;
  end if;

  v_edge_fn_url := v_supabase_url || '/functions/v1/stripe-autopay-charge';

  -- =========================================================================
  -- Cursor 1: Due-date charges (initial autopay for today's rent)
  -- Per-tenant amounts computed from lease_tenants.responsibility_percentage.
  -- =========================================================================
  for v_record in
    select
      rd.id as rent_due_id,
      rd.amount as full_amount,
      round((rd.amount * lt.responsibility_percentage / 100)::numeric, 2) as tenant_amount,
      rd.due_date,
      rd.unit_id,
      lt.responsibility_percentage,
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
      -- Skip if a payment already exists for this tenant + rent_due
      and not exists (
        select 1 from public.rent_payments rp
        where rp.rent_due_id = rd.id
          and rp.tenant_id = t.id
          and rp.status in ('succeeded', 'processing')
      )
  loop
    perform net.http_post(
      url     := v_edge_fn_url,
      body    := jsonb_build_object(
        'tenant_id',                  v_record.tenant_id,
        'lease_id',                   v_record.lease_id,
        'rent_due_id',                v_record.rent_due_id,
        'amount',                     v_record.tenant_amount,
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

  -- =========================================================================
  -- Cursor 2: Retry charges (failed autopay from previous days)
  -- Queries rent_due records where autopay_next_retry_at has arrived
  -- and fewer than 3 attempts have been made.
  -- =========================================================================
  for v_record in
    select
      rd.id as rent_due_id,
      rd.amount as full_amount,
      round((rd.amount * lt.responsibility_percentage / 100)::numeric, 2) as tenant_amount,
      rd.due_date,
      rd.unit_id,
      rd.autopay_attempts,
      lt.responsibility_percentage,
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
      rd.autopay_next_retry_at is not null
      and rd.autopay_next_retry_at <= now()
      and rd.autopay_attempts < 3
      and rd.status != 'paid'
      -- Skip if a payment already exists for this tenant + rent_due
      and not exists (
        select 1 from public.rent_payments rp
        where rp.rent_due_id = rd.id
          and rp.tenant_id = t.id
          and rp.status in ('succeeded', 'processing')
      )
  loop
    perform net.http_post(
      url     := v_edge_fn_url,
      body    := jsonb_build_object(
        'tenant_id',                  v_record.tenant_id,
        'lease_id',                   v_record.lease_id,
        'rent_due_id',                v_record.rent_due_id,
        'amount',                     v_record.tenant_amount,
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
  'pg_cron job: runs daily at 07:00 UTC. Two cursors: (1) initial charges for '
  'rent_due records due today with autopay enabled, computing per-tenant amounts '
  'from lease_tenants.responsibility_percentage; (2) retry charges for failed '
  'autopay where autopay_next_retry_at <= now() and autopay_attempts < 3. '
  'Retry schedule: day 1 initial, day 3 retry 1, day 7 retry 2. '
  'Invokes stripe-autopay-charge Edge Function via pg_net. Idempotent.';
