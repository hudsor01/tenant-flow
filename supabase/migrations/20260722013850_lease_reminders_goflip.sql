-- Migration C1 of the Phase 53 (Renewal Reminder Delivery) REMIND-04 go-live
-- sequence:  A (delivery-state) -> deploy send-lease-reminders -> B (drain cron)
-- -> C1 (this file: mechanical go-flip prep) -> C2 (owner-run flag flip).
--
-- SPLIT from the original single Migration C. The flag flip is deliberately
-- broken out into C2 (20260722014000_lease_reminders_delivery_flip.sql) because
-- the send-lease-reminders edge function is NOT yet deployed in prod (PAT-blocked
-- this session, owner-run residual). Flipping reminders_delivery_enabled='true'
-- while the drainer is undeployed would falsely claim delivery is live: the 06:30
-- drain cron would POST to an empty/absent fn URL and no email would send, yet the
-- flag would read as "on". So C1 does ONLY the irreversible-safe mechanical work
-- (count + expire backlog + drop the dead n8n hop); C2 flips the flag AFTER the fn
-- is deployed and wired. See 53-GO-LIVE-RUNBOOK.md for the exact owner sequence.
--
-- C1 is the REMIND-04 pre-flip gate MINUS the flip. Idempotent / re-runnable.
-- Statement order (the flag flip is intentionally ABSENT - it is C2's sole job):
--   1. RAISE NOTICE the queued backlog count (D-06 record; 0 in prod at authoring).
--   2. Expire every pre-existing pending row WITHOUT sending (delivery_status=
--      'expired', delivered_at=now()) - REMIND-04 clean slate, no storm (Pitfall 2).
--   3. Drop the dead n8n hop: trg_lease_reminders_notify_n8n trigger +
--      notify_n8n_lease_reminder() fn (REMIND-01, Pitfall 3). Their
--      is_notification_suppressed CI guard is already re-ported into the deployed
--      drainer's shouldEmail() stack (Plan 02), so this removal leaves the drainer
--      as the SOLE delivery path - no double-send.
--
-- D-01 preserved: queue_lease_reminders(), the reminder_type CHECK
-- ('30_days','7_days','1_day'), and the 06:00 queue-lease-reminders filler cron are
-- NOT touched. This migration NEVER sends an email and NEVER flips the kill-flag.

-- =============================================================================
-- Part 1: log the queued backlog for the record (D-06)
-- RAISE NOTICE the count of pending rows that Part 2 expires without sending.
-- Prod fact at authoring: backlog = 0 (VALIDATION.md pre-planning MCP). The storm
-- risk is LATENT - the 06:00 filler queues rows daily; expiring the whole backlog
-- first guarantees no burst of stale reminders when C2 flips the flag on.
-- =============================================================================

do $$
declare
  c int;
begin
  select count(*) into c
  from public.lease_reminders
  where delivery_status = 'pending';
  raise notice 'phase53 go-live: expiring % queued lease_reminders without sending', c;
end $$;

-- =============================================================================
-- Part 2: expire the entire pre-existing backlog WITHOUT sending (REMIND-04, D-06)
-- Every pending row is marked terminal-expired with delivered_at stamped. No email
-- is sent for any of these. Only rows the filler queues AFTER C2 flips the flag
-- ever become 'pending' and drain. Idempotent: once cleared, re-running matches 0.
-- =============================================================================

update public.lease_reminders
set delivery_status = 'expired',
    delivered_at    = now()
where delivery_status = 'pending';

-- =============================================================================
-- Part 3: remove the dead n8n hop (REMIND-01, Pitfall 3)
-- trg_lease_reminders_notify_n8n (AFTER INSERT; the SOLE non-internal trigger on
-- lease_reminders - prod-verified) + notify_n8n_lease_reminder(). Their
-- is_notification_suppressed CI guard is already re-ported into the deployed
-- send-lease-reminders drainer (Plan 02, shouldEmail() layer 2), so this removal
-- leaves exactly one delivery path. Idempotent drop-if-exists (mirrors the
-- 20260224091106:174 drop-trigger idiom + 20260616161248 drop-if-exists shape).
-- =============================================================================

drop trigger if exists trg_lease_reminders_notify_n8n on public.lease_reminders;
drop function if exists public.notify_n8n_lease_reminder();
