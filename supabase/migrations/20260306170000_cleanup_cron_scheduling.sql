-- Migration: Archive tables, cleanup cron scheduling, and monitoring
-- Purpose: Create archive-then-delete infrastructure for security_events,
--   user_errors, and stripe_webhook_events. Rewrite existing cleanup functions
--   with archive pattern. Add new webhook cleanup function. Schedule all cron
--   jobs at 3 AM UTC. Add cron health monitoring function.
-- Affected: security_events, user_errors, stripe_webhook_events (+ archive tables),
--   cron.job (4 new entries)
-- Requirements: DB-06, DB-07, DB-08, DB-09

-- =============================================================================
-- Part A: Archive tables
-- Create mirror tables for archive-then-delete pattern (CONTEXT.md locked decision).
-- RLS enabled with service_role-only access since these are operational data.
-- =============================================================================

-- security_events_archive
create table if not exists public.security_events_archive (
  like public.security_events including all
);

alter table public.security_events_archive enable row level security;

-- service_role-only policies for archive table (one per operation)
create policy "security_events_archive_select_service_role"
  on public.security_events_archive for select to service_role using (true);

create policy "security_events_archive_insert_service_role"
  on public.security_events_archive for insert to service_role with check (true);

create policy "security_events_archive_delete_service_role"
  on public.security_events_archive for delete to service_role using (true);

comment on table public.security_events_archive is
  'Archive of old security_events rows. Populated by cleanup_old_security_events() cron. DB-06.';

-- user_errors_archive
create table if not exists public.user_errors_archive (
  like public.user_errors including all
);

alter table public.user_errors_archive enable row level security;

create policy "user_errors_archive_select_service_role"
  on public.user_errors_archive for select to service_role using (true);

create policy "user_errors_archive_insert_service_role"
  on public.user_errors_archive for insert to service_role with check (true);

create policy "user_errors_archive_delete_service_role"
  on public.user_errors_archive for delete to service_role using (true);

comment on table public.user_errors_archive is
  'Archive of old user_errors rows. Populated by cleanup_old_errors() cron. DB-07.';

-- stripe_webhook_events_archive
create table if not exists public.stripe_webhook_events_archive (
  like public.stripe_webhook_events including all
);

alter table public.stripe_webhook_events_archive enable row level security;

create policy "stripe_webhook_events_archive_select_service_role"
  on public.stripe_webhook_events_archive for select to service_role using (true);

create policy "stripe_webhook_events_archive_insert_service_role"
  on public.stripe_webhook_events_archive for insert to service_role with check (true);

create policy "stripe_webhook_events_archive_delete_service_role"
  on public.stripe_webhook_events_archive for delete to service_role using (true);

comment on table public.stripe_webhook_events_archive is
  'Archive of old stripe_webhook_events rows. Tiered retention: 90d succeeded, 180d failed. DB-09.';

-- =============================================================================
-- Part B: Rewrite cleanup functions with archive-then-delete pattern
-- Existing functions do hard delete. We rewrite them to archive first, then
-- delete only successfully archived rows. Batch with LIMIT 10000 + FOR UPDATE
-- SKIP LOCKED to avoid long locks and WAL pressure.
-- =============================================================================

-- DB-06: Rewrite cleanup_old_security_events() with archive pattern
-- Original: tiered delete by severity (30d debug/info, 90d warning, 1y error/critical)
-- New: same tiered retention but archive before delete, batched
create or replace function public.cleanup_old_security_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer := 0;
  v_batch integer;
begin
  -- batch 1: archive debug/info events older than 30 days
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '30 days'
      and severity in ('debug', 'info')
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se
    join to_archive ta on ta.id = se.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  -- delete archived debug/info rows
  delete from public.security_events
  where created_at < now() - interval '30 days'
    and severity in ('debug', 'info')
    and id in (select id from public.security_events_archive);

  -- batch 2: archive warning events older than 90 days
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '90 days'
      and severity = 'warning'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se
    join to_archive ta on ta.id = se.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.security_events
  where created_at < now() - interval '90 days'
    and severity = 'warning'
    and id in (select id from public.security_events_archive);

  -- batch 3: archive error/critical events older than 1 year
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '1 year'
      and severity in ('error', 'critical')
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se
    join to_archive ta on ta.id = se.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.security_events
  where created_at < now() - interval '1 year'
    and severity in ('error', 'critical')
    and id in (select id from public.security_events_archive);

  raise notice 'cleanup_old_security_events: archived % rows', v_archived;
  return v_archived;
end;
$$;

comment on function public.cleanup_old_security_events() is
  'Archive-then-delete security events. Tiered: 30d debug/info, 90d warning, 1y error/critical. Batched 10k rows. DB-06.';

-- DB-07: Rewrite cleanup_old_errors() with archive pattern
-- Original: deletes resolved errors older than 30 days
-- New: archive before delete, extend to all errors older than 90 days (resolved or not)
create or replace function public.cleanup_old_errors()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer := 0;
begin
  -- archive errors older than 90 days (both resolved and unresolved)
  with to_archive as (
    select id from public.user_errors
    where created_at < now() - interval '90 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.user_errors_archive
    select ue.* from public.user_errors ue
    join to_archive ta on ta.id = ue.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_archived from archived;

  -- delete only successfully archived rows
  delete from public.user_errors
  where created_at < now() - interval '90 days'
    and id in (select id from public.user_errors_archive);

  raise notice 'cleanup_old_errors: archived % rows', v_archived;
  return v_archived;
end;
$$;

comment on function public.cleanup_old_errors() is
  'Archive-then-delete user errors older than 90 days. Batched 10k rows. DB-07.';

-- DB-09: Create cleanup_old_webhook_events() with tiered retention
-- Succeeded events: 90 days (Stripe retries within 72h + 30d dispute window + margin)
-- Failed events: 180 days (longer retention for forensic analysis)
create or replace function public.cleanup_old_webhook_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer := 0;
  v_batch integer;
begin
  -- batch 1: archive succeeded events older than 90 days
  with to_archive as (
    select id from public.stripe_webhook_events
    where processed_at < now() - interval '90 days'
      and status = 'succeeded'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.stripe_webhook_events_archive
    select swe.* from public.stripe_webhook_events swe
    join to_archive ta on ta.id = swe.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.stripe_webhook_events
  where processed_at < now() - interval '90 days'
    and status = 'succeeded'
    and id in (select id from public.stripe_webhook_events_archive);

  -- batch 2: archive failed events older than 180 days
  with to_archive as (
    select id from public.stripe_webhook_events
    where processed_at < now() - interval '180 days'
      and status = 'failed'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.stripe_webhook_events_archive
    select swe.* from public.stripe_webhook_events swe
    join to_archive ta on ta.id = swe.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.stripe_webhook_events
  where processed_at < now() - interval '180 days'
    and status = 'failed'
    and id in (select id from public.stripe_webhook_events_archive);

  raise notice 'cleanup_old_webhook_events: archived % rows', v_archived;
  return v_archived;
end;
$$;

comment on function public.cleanup_old_webhook_events() is
  'Archive-then-delete webhook events. Tiered: 90d succeeded, 180d failed. Batched 10k rows. DB-09.';

-- =============================================================================
-- Part C: Schedule all cleanup cron jobs at 3 AM UTC (locked decision)
-- Staggered by 15 minutes to avoid concurrent load.
-- =============================================================================

select cron.schedule(
  'cleanup-security-events',
  '0 3 * * *',
  $$select public.cleanup_old_security_events()$$
);

select cron.schedule(
  'cleanup-errors',
  '15 3 * * *',
  $$select public.cleanup_old_errors()$$
);

select cron.schedule(
  'cleanup-webhook-events',
  '30 3 * * *',
  $$select public.cleanup_old_webhook_events()$$
);

-- =============================================================================
-- Part D: Cron monitoring function (DB-08)
-- Queries cron.job_run_details for failed jobs in the last 25 hours (catches
-- daily jobs even if timing drifts). Logs failures to user_errors for Sentry
-- pickup and fires pg_notify for immediate alerting.
-- =============================================================================

create or replace function public.check_cron_health()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failed record;
begin
  -- check for failed jobs in the last 25 hours (catches daily jobs)
  for v_failed in
    select j.jobname, d.status, d.return_message, d.start_time
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where d.start_time > now() - interval '25 hours'
      and d.status = 'failed'
    order by d.start_time desc
  loop
    -- insert error into user_errors for Sentry pickup via existing monitoring
    -- user_id is NULL (system-generated error, not user-triggered)
    insert into public.user_errors (
      error_type, error_code, error_message, context
    ) values (
      'application',
      'CRON_FAILURE',
      format('Cron job "%s" failed: %s', v_failed.jobname, v_failed.return_message),
      jsonb_build_object('job', v_failed.jobname, 'start_time', v_failed.start_time)
    );

    -- fire pg_notify for immediate alerting (external listener can forward to Sentry/Slack)
    perform pg_notify('cron_failure', json_build_object(
      'job', v_failed.jobname,
      'error', v_failed.return_message,
      'time', v_failed.start_time
    )::text);
  end loop;
end;
$$;

comment on function public.check_cron_health() is
  'Monitors all cron jobs for failures. Checks cron.job_run_details for the last 25h, logs to user_errors + pg_notify. DB-08.';

-- schedule monitoring check hourly
select cron.schedule(
  'check-cron-health',
  '0 * * * *',
  $$select public.check_cron_health()$$
);
