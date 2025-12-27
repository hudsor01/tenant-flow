-- ============================================================================
-- Migration: Optimize Webhook Monitoring Infrastructure
-- Purpose: Performance optimizations for high-volume webhook processing
-- Affected: stripe.webhook_events, stripe.webhook_failures, RPC functions
-- ============================================================================

-- ============================================================================
-- 1. ADD BRIN INDEXES FOR TIME-RANGE QUERIES
-- BRIN indexes are ~100x smaller than B-tree for timestamp columns
-- Perfect for append-only data like webhook events
-- ============================================================================

-- Drop existing B-tree index on created_at (will replace with BRIN)
drop index if exists stripe.idx_webhook_events_created;

-- BRIN index for time-range scans (much more efficient for large tables)
create index idx_webhook_events_created_brin
  on stripe.webhook_events using brin (created_at)
  with (pages_per_range = 32);

comment on index stripe.idx_webhook_events_created_brin is
  'BRIN index for efficient time-range queries on webhook events';

-- ============================================================================
-- 2. ADD COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Composite index for health issue detection (success + time range)
create index idx_webhook_events_failed_recent
  on stripe.webhook_events (created_at desc)
  where success = false;

comment on index stripe.idx_webhook_events_failed_recent is
  'Partial index for failed webhooks ordered by time';

-- Composite index for slow processing detection
create index idx_webhook_events_slow
  on stripe.webhook_events (created_at desc)
  where processing_duration_ms > 5000;

comment on index stripe.idx_webhook_events_slow is
  'Partial index for slow webhook processing (>5s)';

-- Composite index for cleanup operations
create index idx_webhook_failures_cleanup
  on stripe.webhook_failures (created_at)
  where resolved_at is not null;

comment on index stripe.idx_webhook_failures_cleanup is
  'Partial index for resolved failures (cleanup target)';

-- ============================================================================
-- 3. OPTIMIZE detect_webhook_health_issues() FUNCTION
-- Remove inefficient CROSS JOIN, use CTEs instead
-- ============================================================================

create or replace function stripe.detect_webhook_health_issues()
returns table (
  issue_type text,
  severity text,
  description text,
  affected_count bigint,
  first_occurrence timestamptz,
  last_occurrence timestamptz
) language plpgsql security definer as $$
declare
  hour_ago timestamptz := now() - interval '1 hour';
begin
  -- Detect high failure rate (>10% in last hour)
  -- Optimized: single scan with conditional aggregation
  return query
  with hourly_metrics as (
    select
      count(*) as total,
      count(*) filter (where success = false) as failed,
      min(created_at) filter (where success = false) as first_fail,
      max(created_at) filter (where success = false) as last_fail
    from stripe.webhook_events
    where created_at > hour_ago
  )
  select
    'high_failure_rate'::text,
    'critical'::text,
    'Webhook failure rate exceeds 10% in the last hour'::text,
    hm.failed,
    hm.first_fail,
    hm.last_fail
  from hourly_metrics hm
  where hm.total > 0
    and hm.failed > 0
    and hm.failed::float / hm.total > 0.10;

  -- Detect slow processing (>5 seconds)
  -- Optimized: uses partial index idx_webhook_events_slow
  return query
  select
    'slow_processing'::text,
    'warning'::text,
    'Webhooks taking longer than 5 seconds to process'::text,
    count(*)::bigint,
    min(created_at),
    max(created_at)
  from stripe.webhook_events
  where created_at > hour_ago
    and processing_duration_ms > 5000
  having count(*) > 0;

  -- Detect unresolved failures (older than 1 hour)
  -- Optimized: uses partial index idx_webhook_failures_unresolved
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
  from stripe.webhook_failures
  where resolved_at is null
    and created_at < hour_ago
  having count(*) > 0;
end;
$$;

-- ============================================================================
-- 4. OPTIMIZE cleanup_old_webhook_data() FUNCTION
-- Add batch deletion to avoid long locks
-- ============================================================================

create or replace function stripe.cleanup_old_webhook_data(
  retention_days integer default 30,
  batch_size integer default 10000
)
returns table (table_name text, rows_deleted bigint) language plpgsql security definer as $$
declare
  cutoff_date timestamptz;
  events_deleted bigint := 0;
  failures_deleted bigint := 0;
  batch_deleted bigint;
begin
  cutoff_date := now() - (retention_days || ' days')::interval;

  -- Delete webhook events in batches to avoid long locks
  loop
    with deleted as (
      delete from stripe.webhook_events
      where id in (
        select id from stripe.webhook_events
        where created_at < cutoff_date
        limit batch_size
        for update skip locked
      )
      returning id
    )
    select count(*) into batch_deleted from deleted;

    events_deleted := events_deleted + batch_deleted;
    exit when batch_deleted < batch_size;

    -- Small pause between batches to reduce lock contention
    perform pg_sleep(0.01);
  end loop;

  -- Delete resolved failures in batches
  loop
    with deleted as (
      delete from stripe.webhook_failures
      where id in (
        select id from stripe.webhook_failures
        where created_at < cutoff_date
          and resolved_at is not null
        limit batch_size
        for update skip locked
      )
      returning id
    )
    select count(*) into batch_deleted from deleted;

    failures_deleted := failures_deleted + batch_deleted;
    exit when batch_deleted < batch_size;

    perform pg_sleep(0.01);
  end loop;

  -- Refresh materialized views concurrently (non-blocking)
  refresh materialized view concurrently stripe.webhook_health_summary;
  refresh materialized view concurrently stripe.webhook_event_type_summary;

  return query select 'webhook_events'::text, events_deleted
  union all select 'webhook_failures'::text, failures_deleted;
end;
$$;

comment on function stripe.cleanup_old_webhook_data(integer, integer) is
  'Batch-deletes old webhook data to avoid long locks. Default batch size: 10000 rows.';

-- ============================================================================
-- 5. ADD BATCH INSERT FUNCTION FOR HIGH-THROUGHPUT SCENARIOS
-- ============================================================================

create or replace function stripe.record_webhook_metrics_batch(
  metrics jsonb
)
returns integer language plpgsql security definer as $$
declare
  inserted_count integer;
begin
  insert into stripe.webhook_events (
    stripe_event_id,
    event_type,
    processing_duration_ms,
    signature_verification_ms,
    business_logic_ms,
    database_operations_ms,
    success
  )
  select
    (m->>'stripe_event_id')::text,
    (m->>'event_type')::text,
    (m->>'processing_duration_ms')::integer,
    (m->>'signature_verification_ms')::integer,
    (m->>'business_logic_ms')::integer,
    (m->>'database_operations_ms')::integer,
    (m->>'success')::boolean
  from jsonb_array_elements(metrics) as m
  on conflict (stripe_event_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

comment on function stripe.record_webhook_metrics_batch(jsonb) is
  'Batch insert webhook metrics. Ignores duplicates. Returns count of inserted rows.';

grant execute on function stripe.record_webhook_metrics_batch(jsonb) to service_role;

-- ============================================================================
-- 6. ADD STATISTICS TARGETS FOR BETTER QUERY PLANNING
-- ============================================================================

alter table stripe.webhook_events alter column event_type set statistics 1000;
alter table stripe.webhook_events alter column created_at set statistics 1000;
alter table stripe.webhook_events alter column success set statistics 100;

alter table stripe.webhook_failures alter column event_type set statistics 500;
alter table stripe.webhook_failures alter column failure_reason set statistics 100;
alter table stripe.webhook_failures alter column resolved_at set statistics 100;

-- ============================================================================
-- 7. ANALYZE TABLES FOR OPTIMIZER
-- ============================================================================

analyze stripe.webhook_events;
analyze stripe.webhook_failures;
