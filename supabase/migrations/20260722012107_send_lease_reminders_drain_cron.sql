-- Migration B of the Phase 53 (Renewal Reminder Delivery) REMIND-04 go-live
-- sequence (A delivery-state -> deploy send-lease-reminders -> B drain cron ->
-- C pre-flip go-flip). This is a SAFE NO-OP while the flag is off: the drainer
-- edge function early-returns whenever the delivery kill-flag is not 'true'
-- (still 'false' until Migration C flips it last), so scheduling the drain cron
-- now cannot fire a single email.
--
-- Two parts, both idempotent / re-runnable:
--   (1) invoke_send_lease_reminders() - a SECURITY DEFINER wrapper that reads the
--       deployed fn URL + shared Bearer from public.app_config and net.http_post's
--       the drainer, then posts a Sentry cron check-in. Mirrors the
--       notify_n8n_lease_reminder net.http_post shape (20260504162221) and the
--       queue_payment_reminders Sentry check-in shape (20260224091106).
--   (2) cron.schedule('send-lease-reminders-drain','30 6 * * *', ...) - 06:30 UTC,
--       just after the 06:00 queue-lease-reminders filler and clear of the 3 AM
--       cleanup cluster (:00/:05/:10/:15/:20/:30/:45/:50). cron.schedule upserts by
--       jobname (idempotent).
--
-- Reads only the app_config keys seeded empty by Migration A (reminders.drain_url,
-- reminders.drain_secret, sentry.cron.send_lease_reminders_url); the operator fills
-- them post-deploy. Empty URL => early return, so a manual invoke before go-live is
-- inert. Does NOT read or set the delivery kill-flag (that gate lives inside the
-- edge fn + Migration C). Named SECURITY DEFINER fn, never inline SQL in
-- cron.schedule (CLAUDE.md cron rule).

-- =============================================================================
-- Part 1: invoke_send_lease_reminders() drain invoker (REMIND-01)
-- SECURITY DEFINER + locked search_path. Reads the drain URL + Bearer from
-- app_config (service-role-only RLS), early-returns on an empty URL, net.http_post's
-- the deployed send-lease-reminders edge fn with the shared Bearer, then posts a
-- Sentry cron check-in when the monitor URL is configured.
-- =============================================================================

create or replace function public.invoke_send_lease_reminders()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url    text;
  v_secret text;
  v_sentry text;
  v_start  timestamptz := clock_timestamp();
begin
  select value into v_url    from public.app_config where key = 'reminders.drain_url';
  select value into v_secret from public.app_config where key = 'reminders.drain_secret';

  -- No drain URL configured yet (pre go-live) => inert. The operator fills
  -- reminders.drain_url with the deployed fn URL at go-live (Plan 03 runbook).
  if v_url is null or v_url = '' then
    return;
  end if;

  -- Invoke the drainer. The shared Bearer (== the REMINDERS_INVOKE_SECRET function
  -- secret) is the auth boundary; the fn constant-time-compares it (verify_jwt=false).
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  -- Sentry cron check-in (status=ok) to clear the send-lease-reminders monitor.
  -- Skipped silently when the monitor URL is not configured. Mirrors
  -- queue_payment_reminders (20260224091106).
  select value into v_sentry from public.app_config where key = 'sentry.cron.send_lease_reminders_url';

  if v_sentry is not null and v_sentry <> '' then
    perform net.http_post(
      url     := v_sentry,
      body    := jsonb_build_object(
        'status',      'ok',
        'environment', 'production',
        'duration',    round(extract(epoch from (clock_timestamp() - v_start))::numeric, 3)
      ),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  end if;
end;
$$;

comment on function public.invoke_send_lease_reminders() is
  'pg_cron drain invoker for the send-lease-reminders edge fn (REMIND-01). Reads reminders.drain_url + reminders.drain_secret from app_config, early-returns on empty URL, net.http_post''s the drainer with the shared Bearer, then posts a Sentry cron check-in when sentry.cron.send_lease_reminders_url is set. Safe no-op until Migration C flips the delivery kill-flag true (the edge fn gates the send). Not granted to public/anon/authenticated - pg_cron runs it as the job owner.';

-- =============================================================================
-- Part 2: schedule the drain cron (REMIND-01)
-- 06:30 UTC - just after the 06:00 queue-lease-reminders filler, clear of the
-- 3 AM cleanup cluster. cron.schedule upserts by jobname (idempotent).
-- =============================================================================

select cron.schedule(
  'send-lease-reminders-drain',
  '30 6 * * *',
  $$select public.invoke_send_lease_reminders()$$
);
