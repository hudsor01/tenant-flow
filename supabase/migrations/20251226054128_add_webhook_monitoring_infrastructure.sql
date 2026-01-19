-- ============================================================================
-- Migration: Add Webhook Monitoring Infrastructure
-- Purpose: Track webhook performance metrics, failures, and health status
-- Affected: public schema (webhook_events, webhook_failures tables)
-- Note: Uses public schema since stripe schema only exists in production
-- ============================================================================

-- ============================================================================
-- 1. CREATE WEBHOOK EVENTS TABLE
-- Tracks all incoming webhook processing metrics
-- ============================================================================

-- Drop existing table if schema doesn't match (fresh recreate for local dev)
drop table if exists public.webhook_events cascade;

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  processing_duration_ms integer,
  signature_verification_ms integer,
  business_logic_ms integer,
  database_operations_ms integer,
  success boolean not null,
  created_at timestamptz default now()
);

comment on table public.webhook_events is 'Tracks webhook processing performance metrics for observability';
comment on column public.webhook_events.stripe_event_id is 'Stripe event ID (evt_xxx) - unique per webhook';
comment on column public.webhook_events.event_type is 'Stripe event type (e.g., invoice.paid, subscription.created)';
comment on column public.webhook_events.processing_duration_ms is 'Total time to process the webhook in milliseconds';
comment on column public.webhook_events.signature_verification_ms is 'Time spent verifying webhook signature';
comment on column public.webhook_events.business_logic_ms is 'Time spent in business logic handlers';
comment on column public.webhook_events.database_operations_ms is 'Time spent on database operations';
comment on column public.webhook_events.success is 'Whether the webhook was processed successfully';

-- Performance indexes for querying metrics
create index idx_webhook_events_type on public.webhook_events(event_type);
create index idx_webhook_events_created on public.webhook_events(created_at desc);
create index idx_webhook_events_stripe_id on public.webhook_events(stripe_event_id);
create index idx_webhook_events_success on public.webhook_events(success) where success = false;

-- ============================================================================
-- 2. CREATE WEBHOOK FAILURES TABLE
-- Tracks failed webhook processing for debugging and retry
-- ============================================================================

-- Drop existing table if schema doesn't match (fresh recreate for local dev)
drop table if exists public.webhook_failures cascade;

create table public.webhook_failures (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null,
  failure_reason text not null check (failure_reason in (
    'signature_invalid', 'processing_error', 'database_error', 'business_logic_error'
  )),
  error_message text,
  error_stack text,
  raw_event_data jsonb,
  retry_count integer default 0,
  created_at timestamptz default now(),
  last_retry_at timestamptz,
  resolved_at timestamptz
);

comment on table public.webhook_failures is 'Tracks webhook processing failures for debugging and manual resolution';
comment on column public.webhook_failures.failure_reason is 'Categorized failure type for filtering';
comment on column public.webhook_failures.raw_event_data is 'Original webhook payload for replay/debugging';
comment on column public.webhook_failures.retry_count is 'Number of retry attempts made';
comment on column public.webhook_failures.resolved_at is 'When the failure was resolved (null = unresolved)';

-- Indexes for failure management
create index idx_webhook_failures_unresolved
  on public.webhook_failures(created_at) where resolved_at is null;
create index idx_webhook_failures_event_type on public.webhook_failures(event_type);
create index idx_webhook_failures_reason on public.webhook_failures(failure_reason);

-- ============================================================================
-- 3. CREATE MATERIALIZED VIEW FOR HOURLY HEALTH SUMMARY
-- Pre-aggregated metrics for dashboard and monitoring
-- ============================================================================

-- Drop if exists to allow recreation
drop materialized view if exists public.webhook_health_summary;

create materialized view public.webhook_health_summary as
select
  date_trunc('hour', created_at) as hour,
  count(*) as total_events,
  count(*) filter (where success = true) as successful_events,
  count(*) filter (where success = false) as failed_events,
  round(avg(processing_duration_ms)::numeric, 2) as avg_duration_ms,
  min(processing_duration_ms) as min_duration_ms,
  max(processing_duration_ms) as max_duration_ms,
  round(100.0 * count(*) filter (where success = true) / nullif(count(*), 0), 2) as success_rate_percentage
from public.webhook_events
where created_at > now() - interval '24 hours'
group by date_trunc('hour', created_at)
order by hour desc;

create unique index idx_webhook_health_summary_hour on public.webhook_health_summary(hour);

comment on materialized view public.webhook_health_summary is 'Hourly aggregated webhook metrics for last 24 hours. Refresh periodically.';

-- ============================================================================
-- 4. CREATE MATERIALIZED VIEW FOR EVENT TYPE SUMMARY
-- Per-event-type statistics for the last 7 days
-- ============================================================================

-- Drop if exists to allow recreation
drop materialized view if exists public.webhook_event_type_summary;

create materialized view public.webhook_event_type_summary as
select
  event_type,
  count(*) as total_count,
  count(*) filter (where success = true) as successful_count,
  count(*) filter (where success = false) as failed_count,
  round(avg(processing_duration_ms)::numeric, 2) as avg_duration_ms,
  max(created_at) as last_received_at
from public.webhook_events
where created_at > now() - interval '7 days'
group by event_type
order by total_count desc;

create unique index idx_webhook_event_type_summary on public.webhook_event_type_summary(event_type);

comment on materialized view public.webhook_event_type_summary is 'Per-event-type statistics for last 7 days. Refresh periodically.';

-- ============================================================================
-- 5. CREATE RPC FUNCTION TO DETECT HEALTH ISSUES
-- Analyzes recent webhook data to detect anomalies
-- ============================================================================

create or replace function public.detect_webhook_health_issues()
returns table (
  issue_type text,
  severity text,
  description text,
  affected_count bigint,
  first_occurrence timestamptz,
  last_occurrence timestamptz
) language plpgsql security definer as $$
begin
  -- Detect high failure rate (>10% in last hour)
  return query
  with hourly_stats as (
    select
      count(*) as total,
      count(*) filter (where success = false) as failed
    from public.webhook_events
    where created_at > now() - interval '1 hour'
  )
  select
    'high_failure_rate'::text,
    'critical'::text,
    'Webhook failure rate exceeds 10% in the last hour'::text,
    hs.failed,
    min(we.created_at),
    max(we.created_at)
  from hourly_stats hs
  cross join public.webhook_events we
  where we.created_at > now() - interval '1 hour'
    and we.success = false
    and hs.total > 0
    and hs.failed::float / hs.total > 0.10
  group by hs.failed;

  -- Detect slow processing (>5 seconds)
  return query
  select
    'slow_processing'::text,
    'warning'::text,
    'Webhooks taking longer than 5 seconds to process'::text,
    count(*)::bigint,
    min(created_at),
    max(created_at)
  from public.webhook_events
  where created_at > now() - interval '1 hour'
    and processing_duration_ms > 5000
  having count(*) > 0;

  -- Detect unresolved failures (older than 1 hour)
  return query
  select
    'unresolved_failures'::text,
    case
      when count(*) > 10 then 'critical'
      when count(*) > 5 then 'warning'
      else 'info'
    end::text,
    'Webhook failures pending resolution'::text,
    count(*)::bigint,
    min(created_at),
    max(created_at)
  from public.webhook_failures
  where resolved_at is null
    and created_at < now() - interval '1 hour'
  having count(*) > 0;
end;
$$;

comment on function public.detect_webhook_health_issues() is 'Analyzes recent webhook data to detect health anomalies';

-- ============================================================================
-- 6. CREATE RPC FUNCTION FOR DATA CLEANUP
-- Enforces retention policy (default 30 days)
-- ============================================================================

create or replace function public.cleanup_old_webhook_data(retention_days integer default 30)
returns table (table_name text, rows_deleted bigint) language plpgsql security definer as $$
declare
  events_deleted bigint;
  failures_deleted bigint;
  cutoff_date timestamptz;
begin
  cutoff_date := now() - (retention_days || ' days')::interval;

  -- Delete old webhook events
  delete from public.webhook_events
  where created_at < cutoff_date;
  get diagnostics events_deleted = row_count;

  -- Delete old resolved failures (keep unresolved for investigation)
  delete from public.webhook_failures
  where created_at < cutoff_date
    and resolved_at is not null;
  get diagnostics failures_deleted = row_count;

  -- Refresh materialized views after cleanup
  refresh materialized view public.webhook_health_summary;
  refresh materialized view public.webhook_event_type_summary;

  return query select 'webhook_events'::text, events_deleted
  union all select 'webhook_failures'::text, failures_deleted;
end;
$$;

comment on function public.cleanup_old_webhook_data(integer) is 'Deletes webhook data older than retention period and refreshes views';

-- ============================================================================
-- 7. CREATE RPC FUNCTION TO REFRESH MATERIALIZED VIEWS
-- For manual or scheduled refresh
-- ============================================================================

create or replace function public.refresh_webhook_views()
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.webhook_health_summary;
  refresh materialized view concurrently public.webhook_event_type_summary;
end;
$$;

comment on function public.refresh_webhook_views() is 'Refreshes webhook monitoring materialized views';

-- ============================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- Service role only access (backend API)
-- ============================================================================

alter table public.webhook_events enable row level security;
alter table public.webhook_failures enable row level security;

-- Service role can perform all operations
drop policy if exists "Service role can manage webhook_events" on public.webhook_events;
create policy "Service role can manage webhook_events"
  on public.webhook_events for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage webhook_failures" on public.webhook_failures;
create policy "Service role can manage webhook_failures"
  on public.webhook_failures for all to service_role using (true) with check (true);

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- Ensure service role has access to functions and views
-- ============================================================================

grant select on public.webhook_health_summary to service_role;
grant select on public.webhook_event_type_summary to service_role;
grant execute on function public.detect_webhook_health_issues() to service_role;
grant execute on function public.cleanup_old_webhook_data(integer) to service_role;
grant execute on function public.refresh_webhook_views() to service_role;
