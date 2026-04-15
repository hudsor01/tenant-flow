-- Migration: email_deliverability schema + archive + RLS + cleanup cron
-- Purpose: Create storage layer for Resend webhook ingest with 90-day
--   archive-then-delete retention. Admin-only SELECT via is_admin() guard;
--   service_role bypasses RLS for Edge Function writes.
-- Affected tables: public.email_deliverability, public.email_deliverability_archive
-- Affected cron jobs: cleanup-email-deliverability (0 4 * * *)
-- Requirements: ANALYTICS-01 (storage layer + retention)
-- Decisions: D1 (90-day retention, 4 AM UTC slot, archive-then-delete),
--   D4 (event_at from top-level created_at, raw_payload preserves nested timestamps)

-- =============================================================================
-- Part A: email_deliverability table
-- One row per (message_id, event_type) combination. A single email produces
-- multiple webhook events (delivered + opened + complained) so we key by the
-- composite UNIQUE, not primary key on message_id alone (Pitfall 2).
-- =============================================================================

create table if not exists public.email_deliverability (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  event_type text not null,
  recipient_email text not null,
  template_tag text,
  event_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  constraint email_deliverability_event_type_check check (
    event_type in (
      'email.delivered',
      'email.bounced',
      'email.opened',
      'email.complained',
      'email.delivery_delayed'
    )
  ),
  constraint email_deliverability_message_event_unique unique (message_id, event_type)
);

comment on table public.email_deliverability is
  'Resend webhook ingest events. 90-day retention with archive-then-delete via cleanup_old_email_deliverability() cron. ANALYTICS-01.';

comment on column public.email_deliverability.event_at is
  'Top-level Resend created_at; see raw_payload for event-specific timestamps';

-- Secondary indexes:
-- - template_event for RPC GROUP BY aggregation (get_deliverability_stats)
-- - event_at for cleanup cron scanning
-- (The UNIQUE (message_id, event_type) constraint creates its own index — no
-- duplicate index needed for the composite key.)
create index if not exists idx_email_deliverability_template_event
  on public.email_deliverability (template_tag, event_type, event_at desc);

create index if not exists idx_email_deliverability_event_at
  on public.email_deliverability (event_at desc);

alter table public.email_deliverability enable row level security;

-- Admin-only SELECT. Service role bypasses RLS for INSERT via Edge Function.
create policy email_deliverability_admin_select
  on public.email_deliverability
  for select
  to authenticated
  using ((select public.is_admin()));

-- =============================================================================
-- Part B: email_deliverability_archive (sibling)
-- Mirrors security_events_archive pattern exactly (service_role-only policies).
-- LIKE ... INCLUDING ALL inherits columns, indexes, and constraints.
-- =============================================================================

create table if not exists public.email_deliverability_archive (
  like public.email_deliverability including all
);

alter table public.email_deliverability_archive enable row level security;

create policy email_deliverability_archive_select_service_role
  on public.email_deliverability_archive
  for select
  to service_role
  using (true);

create policy email_deliverability_archive_insert_service_role
  on public.email_deliverability_archive
  for insert
  to service_role
  with check (true);

create policy email_deliverability_archive_delete_service_role
  on public.email_deliverability_archive
  for delete
  to service_role
  using (true);

comment on table public.email_deliverability_archive is
  'Archive of old email_deliverability rows. Populated by cleanup_old_email_deliverability() cron. ANALYTICS-01.';

-- =============================================================================
-- Part C: cleanup_old_email_deliverability() + cron schedule (D1 retention)
-- 90-day retention; archive-then-delete pattern mirroring cleanup_old_errors().
-- Batched at 10000 rows/run with FOR UPDATE SKIP LOCKED for concurrent safety.
-- Called by pg_cron at 0 4 * * * (4 AM UTC; avoids the crowded 3 AM slot).
-- =============================================================================

create or replace function public.cleanup_old_email_deliverability()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer := 0;
begin
  -- archive rows older than 90 days
  with to_archive as (
    select id from public.email_deliverability
    where event_at < now() - interval '90 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.email_deliverability_archive
    select ed.* from public.email_deliverability ed
    join to_archive ta on ta.id = ed.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_archived from archived;

  -- delete only successfully archived rows
  delete from public.email_deliverability
  where event_at < now() - interval '90 days'
    and id in (select id from public.email_deliverability_archive);

  raise notice 'cleanup_old_email_deliverability: archived % rows', v_archived;
  return v_archived;
end;
$$;

revoke all on function public.cleanup_old_email_deliverability() from public;
grant execute on function public.cleanup_old_email_deliverability() to service_role;

comment on function public.cleanup_old_email_deliverability() is
  'Archive-then-delete email deliverability events older than 90 days. Batched 10k rows. Called by cleanup-email-deliverability cron at 0 4 * * *. ANALYTICS-01 retention.';

-- Schedule cleanup at 4 AM UTC (per D1 — avoids crowded 3 AM window)
select cron.schedule(
  'cleanup-email-deliverability',
  '0 4 * * *',
  $$select public.cleanup_old_email_deliverability()$$
);
