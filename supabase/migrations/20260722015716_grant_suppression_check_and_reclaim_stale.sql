-- Phase 53 review fixes CR-01 + WR-02. Applied to prod via MCP 2026-07-22.
--
-- CR-01 (critical): the send-lease-reminders drainer calls is_notification_suppressed(text)
--   as service_role, but that fn's ACL is postgres=X/postgres (revoked from public in
--   20260611141843, never granted to service_role). Its prior callers were SECURITY
--   DEFINER triggers running as owner; the drainer is a new service_role caller and gets
--   42501, so the re-ported CI-synthetic-owner guard silently fails OPEN (Pitfall 1).
--   Grant EXECUTE to service_role (STABLE + SECURITY DEFINER + search_path locked; reads
--   only a config CSV - safe for the trusted batch role). The paired code fix makes
--   shouldEmail() fail CLOSED on any suppression-check error (defense in depth).
grant execute on function public.is_notification_suppressed(text) to service_role;

-- WR-02: a mid-batch crash strands rows in delivery_status='claimed' forever (claim only
--   re-picks 'pending'). Add claimed_at + reclaim rows stuck 'claimed' beyond 1 hour so a
--   crashed prior run self-heals on the next daily drain (1h threshold is safe at the
--   06:30 daily cadence - no overlap with a healthy same-run claim stamping claimed_at=now()).
alter table public.lease_reminders
  add column if not exists claimed_at timestamptz;

create or replace function public.claim_lease_reminders(p_limit int default 100)
returns setof public.lease_reminders
language sql
security definer
set search_path = public
as $$
  update public.lease_reminders lr
  set delivery_status = 'claimed',
      claimed_at = now(),
      attempt_count = lr.attempt_count + 1
  where lr.id in (
    select id
    from public.lease_reminders
    where delivery_status = 'pending'
       or (delivery_status = 'claimed' and claimed_at < now() - interval '1 hour')
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning lr.*;
$$;

comment on function public.claim_lease_reminders(int) is
  'Exactly-once claim primitive for the send-lease-reminders drainer (REMIND-02). Claims up to p_limit rows that are pending, OR stuck claimed>1h from a crashed prior run (WR-02 self-heal), FOR UPDATE SKIP LOCKED; stamps claimed/claimed_at/attempt_count and returns them. service_role-only.';

revoke all on function public.claim_lease_reminders(int) from public, anon, authenticated;
grant execute on function public.claim_lease_reminders(int) to service_role;
