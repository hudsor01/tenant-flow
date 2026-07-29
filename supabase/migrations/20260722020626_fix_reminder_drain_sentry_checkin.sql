-- Phase 53 review fix WR-03. Applied to prod via MCP 2026-07-22 and verified
-- (prod migration version 20260722020626; repo filename reconciled to the
-- prod-assigned version per migration-mcp-prod-drift).
--
-- WR-03: invoke_send_lease_reminders() (authored in the ALREADY-APPLIED, immutable
--   Migration B 20260722012107) posted an UNCONDITIONAL Sentry cron check-in with
--   status='ok' after net.http_post'ing the drainer. It never inspected the invoke
--   outcome, so a misconfigured drain (e.g. reminders.drain_url set but
--   reminders.drain_secret empty => every drain 401s at the fn's constant-time
--   Bearer compare) still read GREEN on the monitor. That is exactly the class of
--   failure a cron monitor exists to catch.
--
-- This create-or-replace makes the check-in reflect the ACTUAL invoke outcome:
-- status='ok' only when the Bearer is configured AND net.http_post accepted the
-- request onto the pg_net queue (non-null request id), else status='error'.
--
-- LIMITATION (documented in the fn body): pg_net's net.http_post is async and
-- returns a request id (bigint), NOT the drainer's HTTP response. A true
-- delivery-success check would have to poll net._http_response for that id, which
-- lands asynchronously and cannot be read in the same statement/transaction. So
-- the synchronously-available signals are: (a) the Bearer secret being non-empty
-- (an empty secret guarantees a 401), and (b) net.http_post returning a non-null
-- request id (the POST was accepted). A drainer 500 or a zero-send healthy-looking
-- run is NOT observable here; those surface via net._http_response (async) and the
-- edge fn's own Sentry events. This is a strict improvement over the prior
-- unconditional 'ok' and directly catches the url/secret misconfiguration class.
--
-- Preserves everything else from Migration B: the app_config reads, the empty-url
-- early return (pre go-live => inert, NO check-in), and the PUBLIC/anon/authenticated
-- REVOKE (re-asserted here; create-or-replace preserves ACLs, this keeps it explicit).

create or replace function public.invoke_send_lease_reminders()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url        text;
  v_secret     text;
  v_sentry     text;
  v_start      timestamptz := clock_timestamp();
  v_request_id bigint;
  v_status     text;
begin
  select value into v_url    from public.app_config where key = 'reminders.drain_url';
  select value into v_secret from public.app_config where key = 'reminders.drain_secret';

  -- No drain URL configured yet (pre go-live) => inert, and post NO check-in: the
  -- monitor should stay silent until go-live, not flap error while the feature is
  -- intentionally off. The operator fills reminders.drain_url at go-live.
  if v_url is null or v_url = '' then
    return;
  end if;

  -- Invoke the drainer. net.http_post is async/fire-and-forget: it returns a
  -- request id (bigint) immediately, NOT the drainer's HTTP response. A true
  -- delivery-success check would need to poll net._http_response for this id,
  -- which arrives asynchronously and cannot be read in this same statement.
  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    timeout_milliseconds := 5000
  ) into v_request_id;

  -- Sentry cron check-in reflects the ACTUAL invoke outcome (WR-03). status='ok'
  -- ONLY when the Bearer secret is configured (an empty secret guarantees a 401 at
  -- the drainer -- the "url set but secret not" misconfiguration) AND net.http_post
  -- accepted the request onto the pg_net queue (non-null request id). Anything else
  -- => status='error', so the monitor flags a broken drain instead of false-green.
  -- Cannot observe a drainer 500 or a zero-send run (see migration header).
  if coalesce(v_secret, '') <> '' and v_request_id is not null then
    v_status := 'ok';
  else
    v_status := 'error';
  end if;

  select value into v_sentry from public.app_config where key = 'sentry.cron.send_lease_reminders_url';

  if v_sentry is not null and v_sentry <> '' then
    perform net.http_post(
      url     := v_sentry,
      body    := jsonb_build_object(
        'status',      v_status,
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
  'pg_cron drain invoker for the send-lease-reminders edge fn (REMIND-01, WR-03 check-in fix). Reads reminders.drain_url + reminders.drain_secret from app_config, early-returns on empty URL (posts no check-in), net.http_post''s the drainer with the shared Bearer, then posts a Sentry cron check-in whose status reflects the actual invoke outcome: ok only when the secret is configured AND net.http_post returned a request id, else error. LIMITATION: net.http_post is async and returns a request id not the response, so a drainer 500 / zero-send run is not observable here (would need net._http_response polling). Safe no-op until the delivery kill-flag is true (the edge fn gates the send). Not granted to public/anon/authenticated - pg_cron runs it as the job owner.';

-- Re-assert the SECURITY DEFINER revoke (pass-3 convention 20260602044104): an
-- authenticated user must not be able to trigger an out-of-band drain POST.
-- create-or-replace preserves ACLs, so this is idempotent; kept explicit for
-- self-contained auditability. pg_cron runs this as the job owner, unaffected.
revoke all on function public.invoke_send_lease_reminders() from public, anon, authenticated;
