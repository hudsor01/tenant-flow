-- =============================================================================
-- Payment Reminders pg_cron Job: Upcoming Rent Due Notifications
-- =============================================================================
-- Purpose:
--   Restore the payment-reminders cron job that previously ran in the NestJS
--   backend on Railway. NestJS was removed in Phase 57; this migration creates
--   the pg_cron equivalent so the Sentry monitor (slug: payment-reminders,
--   schedule: 0 9 * * *) resumes receiving check-ins.
--
--   Creates:
--     1. payment_reminders table — dedup queue for upcoming payment due alerts
--     2. notify_n8n_payment_reminder() — trigger function POSTing to n8n on INSERT
--     3. trg_payment_reminders_notify_n8n — trigger wiring INSERT → n8n
--     4. queue_payment_reminders() — SECURITY DEFINER function run by pg_cron
--        that populates the queue and sends a Sentry check-in on completion
--     5. pg_cron schedule: 'payment-reminders' at 0 9 * * * UTC
--
-- Affected tables: rent_payments (read), payment_reminders (new)
-- Depends on:
--   - 20260222110100_phase56_schema_foundations.sql (pg_cron, pg_net enabled)
--   - 20260222120000_phase56_pg_cron_jobs.sql (pattern established)
--   - 20260222130000_phase56_db_webhooks.sql (n8n webhook pattern)
--
-- Reminder thresholds: 7 days, 3 days, 1 day before due_date
--
-- Secrets required (set via ALTER DATABASE before going live):
--   ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_PAYMENT_REMINDER_URL" = 'https://...';
--   ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_SECRET" = 'your-secret';
--   ALTER DATABASE postgres SET "app.settings.SENTRY_CRON_PAYMENT_REMINDERS_URL" = 'https://o{ORG_ID}.ingest.sentry.io/api/{PROJECT_ID}/cron/payment-reminders/{DSN_KEY}/';
--
--   The SENTRY_CRON_PAYMENT_REMINDERS_URL is the Sentry cron monitor ingest URL.
--   Format: https://o{org_id}.ingest.sentry.io/api/{project_id}/cron/payment-reminders/{dsn_public_key}/
--   Find it in Sentry → Cron Monitors → payment-reminders → Edit → DSN.
-- =============================================================================


-- =============================================================================
-- Section 1: Create payment_reminders table
-- =============================================================================
-- Deduplication queue for upcoming rent payment due notifications.
-- pg_cron inserts rows with ON CONFLICT DO NOTHING — the UNIQUE constraint on
-- (rent_payment_id, reminder_type) is the idempotency guard. Re-runs are safe.
-- A DB Webhook fires on INSERT and POSTs to n8n to send the tenant notification.
--
-- Reminder thresholds: '7_days', '3_days', '1_day' before due_date.
-- Once a reminder is recorded for a (payment, type) pair it is never re-sent,
-- even if the tenant falls behind and the payment stays pending past the threshold.

create table if not exists public.payment_reminders (
  id              uuid        primary key default gen_random_uuid(),
  rent_payment_id uuid        not null references public.rent_payments(id) on delete cascade,
  lease_id        uuid        not null references public.leases(id) on delete cascade,
  reminder_type   text        not null,   -- '7_days', '3_days', '1_day'
  sent_at         timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  -- Idempotency guard: one reminder per (payment, type) ever.
  -- pg_cron uses INSERT ... ON CONFLICT DO NOTHING against this constraint.
  constraint payment_reminders_reminder_type_check
    check (reminder_type in ('7_days', '3_days', '1_day')),

  constraint payment_reminders_unique_per_payment_type
    unique (rent_payment_id, reminder_type)
);

comment on table public.payment_reminders is
  'Dedup queue for upcoming rent payment due reminders. pg_cron inserts at 09:00 UTC daily '
  'with ON CONFLICT DO NOTHING; DB Webhook fires on INSERT to trigger n8n notification '
  'to tenant. UNIQUE(rent_payment_id, reminder_type) prevents duplicate notifications.';

comment on column public.payment_reminders.reminder_type is
  'Notification threshold: 7_days, 3_days, or 1_day before rent due_date.';

comment on column public.payment_reminders.sent_at is
  'Timestamp when the reminder was queued by pg_cron. n8n sends the actual notification shortly after via DB Webhook.';

-- Performance index for querying reminders by payment (used in tenant billing views).
create index if not exists idx_payment_reminders_rent_payment_id
  on public.payment_reminders using btree (rent_payment_id);

-- Performance index for querying reminders by lease.
create index if not exists idx_payment_reminders_lease_id
  on public.payment_reminders using btree (lease_id);

-- Enable Row Level Security.
alter table public.payment_reminders enable row level security;


-- =============================================================================
-- Section 2: RLS policies for payment_reminders
-- =============================================================================
-- payment_reminders is an internal queue written only by pg_cron (SECURITY
-- DEFINER). Authenticated users can only READ reminders relevant to them.

-- Property owners can view reminder history for leases they own.
create policy "Property owners can view payment reminder history"
  on public.payment_reminders
  for select
  to authenticated
  using (
    lease_id in (
      select id from public.leases
      where owner_user_id = (select auth.uid())
    )
  );

-- Tenants can view their own payment reminders.
-- Two-step resolution: auth.uid() → tenants.user_id → lease_tenants.lease_id
create policy "Tenants can view their own payment reminders"
  on public.payment_reminders
  for select
  to authenticated
  using (
    lease_id in (
      select lt.lease_id from public.lease_tenants lt
      inner join public.tenants t on t.id = lt.tenant_id
      where t.user_id = (select auth.uid())
    )
  );


-- =============================================================================
-- Section 3: n8n webhook trigger on payment_reminders INSERT (WF-04)
-- =============================================================================
-- Fires on INSERT only. When pg_cron queues a payment reminder the trigger
-- POSTs the row to n8n, which sends the tenant notification email/SMS.
--
-- n8n workflow purpose:
--   - Send tenant notification: "Your rent payment of $X is due in N day(s)"
--   - record.reminder_type indicates which threshold fired (7_days, 3_days, 1_day)

create or replace function public.notify_n8n_payment_reminder()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_webhook_url    text;
  v_webhook_secret text;
begin
  v_webhook_url    := current_setting('app.settings.N8N_WEBHOOK_PAYMENT_REMINDER_URL', true);
  v_webhook_secret := current_setting('app.settings.N8N_WEBHOOK_SECRET', true);

  -- abort gracefully if n8n not configured — allows app to run without n8n in dev/staging.
  if v_webhook_url is null or v_webhook_url = '' then
    return new;
  end if;

  -- non-blocking fire-and-forget POST to n8n.
  perform net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'payment_reminders',
      'record', row_to_json(new)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

comment on function public.notify_n8n_payment_reminder() is
  'Trigger function: fires on payment_reminders INSERT and POSTs to n8n. '
  'n8n workflow sends tenant payment due notification. Non-blocking fire-and-forget. '
  'Silently skips if N8N_WEBHOOK_PAYMENT_REMINDER_URL database setting not configured.';

drop trigger if exists trg_payment_reminders_notify_n8n on public.payment_reminders;

create trigger trg_payment_reminders_notify_n8n
  after insert on public.payment_reminders
  for each row
  execute function public.notify_n8n_payment_reminder();


-- =============================================================================
-- Section 4: queue_payment_reminders() pg_cron function (SCHED-04)
-- =============================================================================
-- Runs daily at 09:00 UTC to queue upcoming payment due notifications.
--
-- Business rules:
--   - Only considers pending payments (status = 'pending'). Payments that are
--     already late, succeeded, failed, or cancelled do not need due reminders.
--   - Checks for payments due in exactly 7, 3, or 1 day(s) from today.
--   - INSERT ON CONFLICT DO NOTHING: UNIQUE(rent_payment_id, reminder_type)
--     is the idempotency guard. Re-runs on the same day are completely safe.
--   - After all inserts complete, posts a Sentry check-in (status: ok) so the
--     payment-reminders monitor clears. URL stored as a database config param.
--   - If Sentry URL is not configured the function still runs normally — the
--     Sentry check-in step is skipped silently.

create or replace function public.queue_payment_reminders()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_payment        record;
  v_days_until_due integer;
  v_sentry_url     text;
  v_start_ts       timestamptz;
  v_duration_secs  numeric;
begin
  v_start_ts := clock_timestamp();

  -- loop over pending payments due within the next 7 days.
  -- only 'pending' status — late/succeeded/failed payments skip reminder logic.
  for v_payment in
    select
      rp.id,
      rp.lease_id,
      rp.due_date,
      (rp.due_date - current_date) as days_until_due
    from public.rent_payments rp
    where
      rp.status = 'pending'
      and rp.due_date >= current_date
      and rp.due_date <= (current_date + interval '7 days')
  loop
    v_days_until_due := v_payment.due_date - current_date;

    -- queue a reminder for each applicable threshold independently.
    -- using separate if statements (not elsif) so a payment due in exactly 7 days
    -- could also match 3 or 1 day checks for other payments in the same loop.

    -- 7-day reminder
    if v_days_until_due = 7 then
      insert into public.payment_reminders (rent_payment_id, lease_id, reminder_type)
      values (v_payment.id, v_payment.lease_id, '7_days')
      on conflict (rent_payment_id, reminder_type) do nothing;
    end if;

    -- 3-day reminder
    if v_days_until_due = 3 then
      insert into public.payment_reminders (rent_payment_id, lease_id, reminder_type)
      values (v_payment.id, v_payment.lease_id, '3_days')
      on conflict (rent_payment_id, reminder_type) do nothing;
    end if;

    -- 1-day reminder
    if v_days_until_due = 1 then
      insert into public.payment_reminders (rent_payment_id, lease_id, reminder_type)
      values (v_payment.id, v_payment.lease_id, '1_day')
      on conflict (rent_payment_id, reminder_type) do nothing;
    end if;
  end loop;

  -- ==========================================================================
  -- Sentry cron check-in: POST status=ok to clear the payment-reminders monitor.
  -- URL format: https://o{org_id}.ingest.sentry.io/api/{project_id}/cron/payment-reminders/{dsn_key}/
  -- Set via: ALTER DATABASE postgres SET "app.settings.SENTRY_CRON_PAYMENT_REMINDERS_URL" = '...';
  -- ==========================================================================
  v_sentry_url := current_setting('app.settings.SENTRY_CRON_PAYMENT_REMINDERS_URL', true);

  if v_sentry_url is not null and v_sentry_url != '' then
    v_duration_secs := extract(epoch from (clock_timestamp() - v_start_ts));

    perform net.http_post(
      url     := v_sentry_url,
      body    := jsonb_build_object(
        'status',      'ok',
        'environment', 'production',
        'duration',    round(v_duration_secs::numeric, 3)
      ),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  end if;
end;
$$;

comment on function public.queue_payment_reminders() is
  'pg_cron job: runs daily at 09:00 UTC. Inserts payment_reminders rows for pending rent '
  'payments due in exactly 7, 3, or 1 day(s). UNIQUE constraint prevents duplicates — safe '
  'to re-run. DB Webhook on payment_reminders INSERT fires n8n tenant notification. '
  'Posts Sentry check-in on completion to clear the payment-reminders monitor.';


-- =============================================================================
-- Section 5: Register pg_cron schedule
-- =============================================================================
-- Restores the 09:00 UTC schedule that previously ran in NestJS on Railway.
-- cron.schedule() is idempotent — replaces any existing job with the same name.

select cron.schedule(
  'payment-reminders',
  '0 9 * * *',
  $$select public.queue_payment_reminders()$$
);
