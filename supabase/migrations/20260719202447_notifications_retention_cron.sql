-- Migration: notifications retention (archive table + tiered cleanup fn + cron)
-- Purpose: Bound the notifications table with an archive-then-delete retention
--   cron mirroring the cleanup_old_security_events family (20260306170000).
--   D-12 two-tier policy: read notifications (is_read = true) archive at 90d;
--   unread notifications (is_read is not true) archive at 180d. Batched with
--   LIMIT 10000 + FOR UPDATE SKIP LOCKED to bound locks / WAL pressure.
-- Affected: notifications (+ notifications_archive), cron.job (1 new entry: :45 slot)
-- Requirements: NOTIF-05, D-12
-- Threats mitigated: T-52-09 (unbounded growth / DoS), T-52-10 (archive info
--   disclosure — service_role-only RLS), T-52-11 (concurrent-delete tampering —
--   for update skip locked + delete-only-archived semantics).

-- =============================================================================
-- Part A: Archive table
-- Mirror table for the archive-then-delete pattern. RLS enabled with
-- service_role-only access (operational data — never authenticated-visible).
-- =============================================================================

create table if not exists public.notifications_archive (
  like public.notifications including all
);

alter table public.notifications_archive enable row level security;

-- service_role-only policies for the archive table (one per operation)
create policy "notifications_archive_select_service_role"
  on public.notifications_archive for select to service_role using (true);

create policy "notifications_archive_insert_service_role"
  on public.notifications_archive for insert to service_role with check (true);

create policy "notifications_archive_delete_service_role"
  on public.notifications_archive for delete to service_role using (true);

comment on table public.notifications_archive is
  'Archive of old notifications rows. Populated by cleanup_old_notifications() cron. Tiered retention: 90d read, 180d unread. service_role-only. NOTIF-05.';

-- =============================================================================
-- Part B: Tiered archive-then-delete cleanup function (D-12)
-- Batch 1: read notifications (is_read = true) older than 90 days.
-- Batch 2: unread notifications (is_read is not true) older than 180 days.
-- Each batch archives up to 10000 rows with FOR UPDATE SKIP LOCKED, inserts
-- ON CONFLICT (id) DO NOTHING, then deletes only rows already in the archive.
-- =============================================================================

create or replace function public.cleanup_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer := 0;
  v_batch integer;
begin
  -- batch 1: archive read notifications older than 90 days
  with to_archive as (
    select id from public.notifications
    where is_read = true
      and created_at < now() - interval '90 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.notifications_archive
    select n.* from public.notifications n
    join to_archive ta on ta.id = n.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  -- delete only successfully archived read rows
  delete from public.notifications
  where is_read = true
    and created_at < now() - interval '90 days'
    and id in (select id from public.notifications_archive);

  -- batch 2: archive unread notifications older than 180 days
  with to_archive as (
    select id from public.notifications
    where (is_read is not true)
      and created_at < now() - interval '180 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.notifications_archive
    select n.* from public.notifications n
    join to_archive ta on ta.id = n.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  -- delete only successfully archived unread rows
  delete from public.notifications
  where (is_read is not true)
    and created_at < now() - interval '180 days'
    and id in (select id from public.notifications_archive);

  raise notice 'cleanup_old_notifications: archived % rows', v_archived;
  return v_archived;
end;
$$;

comment on function public.cleanup_old_notifications() is
  'Archive-then-delete notifications. Tiered: 90d read, 180d unread. Batched 10k rows with FOR UPDATE SKIP LOCKED. NOTIF-05 / D-12.';

-- Grant discipline: the cleanup fn is a SECURITY DEFINER batch job invoked only
-- by pg_cron. Revoke from public and grant to service_role only so no
-- authenticated user can trigger a cross-tenant archive-and-delete sweep
-- (mirrors cleanup_old_email_deliverability, 20260415193245, and the phase's
-- create_notification grant discipline).
revoke all on function public.cleanup_old_notifications() from public;
grant execute on function public.cleanup_old_notifications() to service_role;

-- =============================================================================
-- Part C: Schedule the retention cron at the free 3 AM :45 slot
-- Existing slots: :00 security-events, :15 errors, :30 webhook-events.
-- cron.schedule upserts by jobname (idempotent). Named SECURITY DEFINER fn,
-- never inline SQL (CLAUDE.md cron rule).
-- =============================================================================

select cron.schedule(
  'cleanup-notifications',
  '45 3 * * *',
  $$select public.cleanup_old_notifications()$$
);
