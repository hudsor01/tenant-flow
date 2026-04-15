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
