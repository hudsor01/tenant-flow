-- Migration A of the Phase 53 (Renewal Reminder Delivery) REMIND-04 go-live
-- sequence (A -> deploy send-lease-reminders -> B cron -> C pre-flip go-flip).
-- This is the first, load-bearing step: it adds the delivery-state foundation
-- that the drainer (Plan 02) and the go-flip (Plan 04) build on. It never sends,
-- never touches cadence, and seeds the kill-flag default OFF so nothing can fire
-- until Migration C flips it last.
--
-- Four idempotent, re-runnable parts:
--   (1) delivery-state columns + partial pending index on public.lease_reminders
--       (REMIND-02) - sent_at is queued-time and must NOT be reused as a guard.
--   (2) extend notifications_notification_type_check with 'lease_renewal_reminder'
--       (REMIND-05) so create_notification cannot raise 23514 inside the drainer
--       (the Phase 52 review-C6 abort class).
--   (3) seed app_config('reminders_delivery_enabled','false') + empty drain keys
--       (REMIND-04, D-07) - Migration C flips the flag true, never this migration.
--   (4) claim_lease_reminders(int) RPC - FOR UPDATE SKIP LOCKED exactly-once claim,
--       service_role-only (REMIND-02).
--
-- D-01 preserved: queue_lease_reminders(), the reminder_type CHECK
-- ('30_days','7_days','1_day'), the queue-lease-reminders cron, and the n8n
-- trigger are NOT touched here (the trigger drop is Migration C's job).

-- =============================================================================
-- Part 1: delivery-state columns on public.lease_reminders (REMIND-02)
-- Real state model so a drained row can be stamped exactly-once. Mirrors the
-- text + CHECK state-column convention (no ENUM per CLAUDE.md rule 6).
-- =============================================================================

alter table public.lease_reminders
  add column if not exists delivery_status text not null default 'pending'
    constraint lease_reminders_delivery_status_check
    check (delivery_status in ('pending', 'claimed', 'sent', 'suppressed', 'failed', 'expired')),
  add column if not exists delivered_at      timestamptz,
  add column if not exists resend_message_id text,
  add column if not exists attempt_count     integer not null default 0;

-- Partial index for the drainer's claim query (WHERE delivery_status = 'pending').
create index if not exists idx_lease_reminders_pending
  on public.lease_reminders (delivery_status)
  where delivery_status = 'pending';

comment on column public.lease_reminders.delivery_status is
  'Delivery lifecycle for the send-lease-reminders drainer. pending=queued, not yet drained; claimed=in-flight this drain run (FOR UPDATE SKIP LOCKED); sent=Resend accepted; suppressed=blocked by a tier/suppression gate (in-app notification still created); failed=Resend error (retryable); expired=backlog cleared at go-live without sending (REMIND-04). NOTE: sent_at is queued-time (default now() at INSERT), NOT a delivery guard - use delivery_status/delivered_at.';

comment on column public.lease_reminders.delivered_at is
  'Timestamp the reminder reached a terminal delivered state (sent or backlog-expired). NULL until the drainer stamps it.';

comment on column public.lease_reminders.resend_message_id is
  'Resend message id returned when delivery_status=sent; NULL otherwise.';

comment on column public.lease_reminders.attempt_count is
  'Number of drain attempts against this row; incremented by claim_lease_reminders on each claim.';

-- Correct the stale table/sent_at comments that still reference the removed n8n
-- Database Webhook hop (delivery is in-house via send-lease-reminders now).
comment on table public.lease_reminders is
  'Dedup queue for lease expiry reminders. pg_cron queue_lease_reminders() inserts with ON CONFLICT DO NOTHING (D-01, unchanged); the send-lease-reminders Edge Function drains pending rows exactly-once via claim_lease_reminders() and stamps delivery_status. UNIQUE(lease_id, reminder_type) prevents duplicate queue rows.';

comment on column public.lease_reminders.sent_at is
  'Timestamp when the reminder was QUEUED (default now() at INSERT by pg_cron). This is queued-time, NOT sent-time - it is NOT the delivery guard. Use delivery_status/delivered_at for exactly-once delivery.';

-- =============================================================================
-- Part 2: extend notifications_notification_type_check (REMIND-05, Pitfall 4)
-- Add 'lease_renewal_reminder' so create_notification('lease_renewal_reminder',...)
-- inside the drainer never raises 23514 and aborts the claim transaction. Copies
-- the idempotent drop-if-exists -> add-constraint pattern from 20260720001542.
-- notifications_archive is intentionally NOT re-extended: its copied CHECK was
-- dropped in 20260720015620.
-- =============================================================================

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type = any (array[
    'maintenance'::text,
    'lease'::text,
    'payment'::text,
    'system'::text,
    'lease_signed'::text,
    'lease_executed'::text,
    'lease_finalize_failed'::text,
    'maintenance_created'::text,
    'maintenance_status'::text,
    'lease_renewal_reminder'::text
  ]));

-- =============================================================================
-- Part 3: seed the delivery kill-flag + drain config keys (REMIND-04, D-07)
-- reminders_delivery_enabled defaults 'false' - Migration C flips it true as its
-- LAST statement, so delivery physically cannot fire before the backlog clear.
-- The drain URL/secret/sentry keys are empty for the operator to fill post-deploy.
-- ON CONFLICT DO NOTHING preserves any operator-set values on re-run.
-- =============================================================================

insert into public.app_config (key, value) values
  ('reminders_delivery_enabled',           'false'),
  ('reminders.drain_url',                   ''),
  ('reminders.drain_secret',                ''),
  ('sentry.cron.send_lease_reminders_url',  '')
on conflict (key) do nothing;

-- =============================================================================
-- Part 4: claim_lease_reminders(int) RPC (REMIND-02)
-- Atomically claims pending rows FOR UPDATE SKIP LOCKED so overlapping drain runs
-- never double-claim. Sets delivery_status='claimed' + attempt_count+1 in one
-- statement and returns the claimed rows. Row-lock idiom copied from
-- calculate_late_fees() (20260222120000); grant discipline copied from
-- create_notification (20260719193759) - service_role-only, never callable by
-- public/anon/authenticated.
-- =============================================================================

create or replace function public.claim_lease_reminders(p_limit int default 100)
returns setof public.lease_reminders
language sql
security definer
set search_path = public
as $$
  update public.lease_reminders lr
  set delivery_status = 'claimed',
      attempt_count = lr.attempt_count + 1
  where lr.id in (
    select id
    from public.lease_reminders
    where delivery_status = 'pending'
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning lr.*;
$$;

comment on function public.claim_lease_reminders(int) is
  'Exactly-once claim primitive for the send-lease-reminders drainer (REMIND-02). Claims up to p_limit pending rows FOR UPDATE SKIP LOCKED, flips them to claimed, increments attempt_count, and returns them. service_role-only.';

revoke all on function public.claim_lease_reminders(int) from public, anon, authenticated;
grant execute on function public.claim_lease_reminders(int) to service_role;
