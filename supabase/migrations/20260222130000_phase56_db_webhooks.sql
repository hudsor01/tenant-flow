-- =============================================================================
-- Phase 56-03: DB Webhook Trigger Functions for n8n Integration
-- =============================================================================
-- Purpose:
--   Creates PostgreSQL trigger functions that use net.http_post() (pg_net) to
--   fire HTTP POST requests to n8n webhook endpoints on k3s. Three webhook
--   channels are established:
--     1. rent_payments INSERT → N8N_WEBHOOK_RENT_PAYMENT_URL
--     2. maintenance_requests INSERT/UPDATE → N8N_WEBHOOK_MAINTENANCE_URL
--     3. lease_reminders INSERT → N8N_WEBHOOK_LEASE_REMINDER_URL
--
-- Pre-requisites:
--   - pg_net extension enabled (it is by default on Supabase)
--   - Phase 56-01: late_fees + lease_reminders tables created
--   - Phase 56-02: pg_cron jobs created (queue_lease_reminders populates lease_reminders)
--
-- Secrets required (set via ALTER DATABASE before going live):
--   ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_SECRET" = 'your-secret';
--   ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL" = 'https://...';
--   ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_MAINTENANCE_URL" = 'https://...';
--   ALTER DATABASE postgres SET "app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL" = 'https://...';
--
--   IMPORTANT: These are PostgreSQL database-level config params, NOT Edge Function env
--   vars. Do NOT configure them in Supabase Dashboard → Project Settings → Edge Functions.
--   Use Supabase Dashboard → SQL Editor and run the ALTER DATABASE statements above.
--
-- Auth pattern:
--   All webhook calls include Authorization: Bearer <N8N_WEBHOOK_SECRET> header.
--   n8n Webhook Trigger nodes must be configured to validate this header.
--
-- Graceful failure:
--   All trigger functions check if the webhook URL is configured before firing.
--   If N8N_WEBHOOK_*_URL is not set, the trigger silently returns without error.
--   This allows the application to operate normally without n8n configured.
--
-- Affected tables:
--   - public.rent_payments (trigger added)
--   - public.maintenance_requests (trigger added)
--   - public.lease_reminders (trigger added)
-- =============================================================================

-- =============================================================================
-- Section 1: Ensure pg_net is available
-- =============================================================================
-- pg_net is enabled by default on all Supabase projects. This is a safety
-- check to prevent migration failure on fresh environments.
create extension if not exists pg_net with schema extensions;

-- =============================================================================
-- Section 2: rent_payments webhook trigger (WF-01)
-- =============================================================================
-- Fires on INSERT only (payment recorded). Sends the full new row as JSON body
-- with a type:'INSERT' envelope for n8n workflow routing.
--
-- n8n workflow purpose: Send owner notification + generate payment receipt PDF.
-- =============================================================================

create or replace function public.notify_n8n_rent_payment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_webhook_url    text;
  v_webhook_secret text;
begin
  -- read n8n configuration from supabase app settings.
  -- these must be set as postgresql database-level config params before webhooks fire.
  -- the second argument 'true' means: return null if not set (instead of raising an error).
  v_webhook_url    := current_setting('app.settings.N8N_WEBHOOK_RENT_PAYMENT_URL', true);
  v_webhook_secret := current_setting('app.settings.N8N_WEBHOOK_SECRET', true);

  -- abort gracefully if url not configured — webhook delivery is optional.
  -- this allows the application to run normally without n8n configured in dev/staging.
  if v_webhook_url is null or v_webhook_url = '' then
    return new;
  end if;

  -- fire async http post to n8n — non-blocking fire-and-forget pattern.
  -- pg_net queues the request asynchronously; the trigger does not wait for the response.
  -- retries are handled by pg_net's internal async queue.
  perform net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'rent_payments',
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

comment on function public.notify_n8n_rent_payment() is
  'Trigger function: fires on rent_payments INSERT and POSTs payment row to n8n. '
  'n8n workflow sends owner notification and generates receipt. Non-blocking — '
  'gracefully skips if N8N_WEBHOOK_RENT_PAYMENT_URL database setting not configured.';

-- drop trigger if exists to allow re-run of migration (idempotent)
drop trigger if exists trg_rent_payments_notify_n8n on public.rent_payments;

-- fire after insert so the full committed row is available in new
create trigger trg_rent_payments_notify_n8n
  after insert on public.rent_payments
  for each row
  execute function public.notify_n8n_rent_payment();

-- =============================================================================
-- Section 3: maintenance_requests webhook trigger (WF-02)
-- =============================================================================
-- Fires on INSERT (new request created) and UPDATE (status change only).
-- For UPDATE operations, the trigger only fires when the status column has
-- changed — this avoids spurious webhook calls on unrelated field updates
-- (e.g., description edits, vendor assignment, updated_at bumps).
--
-- n8n workflow purpose:
--   - INSERT: notify property owner of new maintenance request
--   - UPDATE: notify tenant of status change (assigned, in_progress, completed)
-- =============================================================================

create or replace function public.notify_n8n_maintenance()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_webhook_url    text;
  v_webhook_secret text;
  v_event_type     text;
begin
  v_webhook_url    := current_setting('app.settings.N8N_WEBHOOK_MAINTENANCE_URL', true);
  v_webhook_secret := current_setting('app.settings.N8N_WEBHOOK_SECRET', true);

  if v_webhook_url is null or v_webhook_url = '' then
    return new;
  end if;

  -- for update operations: only fire if the status column actually changed.
  -- tg_op = 'UPDATE' check gates access to old.status (old is only valid on update).
  -- this avoids spurious webhook calls on unrelated field updates.
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  -- tg_op returns 'INSERT' or 'UPDATE' — used as the event type envelope.
  -- n8n workflow branches on this value to route to owner vs tenant notification.
  v_event_type := tg_op;

  perform net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   v_event_type,
      'table',  'maintenance_requests',
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

comment on function public.notify_n8n_maintenance() is
  'Trigger function: fires on maintenance_requests INSERT (notify owner of new request) '
  'and UPDATE (notify tenant of status change). n8n workflow branches on the type field. '
  'Only fires on UPDATE when the status column changes. Non-blocking fire-and-forget.';

-- drop trigger if exists to allow re-run of migration (idempotent)
drop trigger if exists trg_maintenance_notify_n8n on public.maintenance_requests;

-- fires after insert or update — tg_op inside the function distinguishes the event.
-- status-change guard prevents spurious calls on unrelated field updates.
create trigger trg_maintenance_notify_n8n
  after insert or update on public.maintenance_requests
  for each row
  execute function public.notify_n8n_maintenance();

-- =============================================================================
-- Section 4: lease_reminders webhook trigger
-- =============================================================================
-- Fires on INSERT only. The lease_reminders table is populated by the
-- queue_lease_reminders() pg_cron job (Phase 56-02, running at 06:00 UTC daily).
-- Each INSERT in lease_reminders triggers n8n to send the lease expiry
-- notification email to the relevant tenant and/or owner.
--
-- n8n workflow purpose:
--   - Send lease expiry notification email for 30-day, 7-day, or 1-day reminders
--   - The record.reminder_type field indicates which threshold triggered
-- =============================================================================

create or replace function public.notify_n8n_lease_reminder()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_webhook_url    text;
  v_webhook_secret text;
begin
  v_webhook_url    := current_setting('app.settings.N8N_WEBHOOK_LEASE_REMINDER_URL', true);
  v_webhook_secret := current_setting('app.settings.N8N_WEBHOOK_SECRET', true);

  if v_webhook_url is null or v_webhook_url = '' then
    return new;
  end if;

  perform net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'lease_reminders',
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

comment on function public.notify_n8n_lease_reminder() is
  'Trigger function: fires on lease_reminders INSERT (rows inserted by the '
  'queue_lease_reminders() pg_cron job). POSTs to n8n to send lease expiry '
  'notification email. record.reminder_type contains: 30_days, 7_days, or 1_day.';

-- drop trigger if exists to allow re-run of migration (idempotent)
drop trigger if exists trg_lease_reminders_notify_n8n on public.lease_reminders;

create trigger trg_lease_reminders_notify_n8n
  after insert on public.lease_reminders
  for each row
  execute function public.notify_n8n_lease_reminder();

-- =============================================================================
-- Section 5: Grant execute permissions
-- =============================================================================
-- Trigger functions are called by the trigger mechanism, not directly by users.
-- SECURITY DEFINER means they execute as the function owner (superuser context),
-- which is required to call net.http_post() from within trigger context.
-- No additional grants are needed — table RLS controls when the trigger fires.
--
-- The triggers themselves fire on DML operations (INSERT/UPDATE) which are
-- governed by existing RLS policies on each table.
-- =============================================================================
