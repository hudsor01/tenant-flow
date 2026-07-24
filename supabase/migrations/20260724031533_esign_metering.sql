-- METER-01: race-safe, append-only e-sign send metering (Phase 54).
--
-- Growth owners get 25 lease e-sign "send" actions per CALENDAR month (D-01);
-- the 26th is hard-blocked (D-01a). Max owners are unlimited (the send is
-- recorded for the usage widget but never blocks). Starter never reaches here
-- (the lease-signature tier-gate refuses e-sign before metering). `resend` is
-- exempt and never calls this RPC (D-02) - only the initial `send` is metered.
--
-- Enforcement lives at the DB layer because the check-then-insert must be
-- atomic: a bare `insert ... select ... where count < 25` is TOCTOU under READ
-- COMMITTED (two concurrent sends each read count=24 and both insert -> 26).
-- A per-owner transaction advisory lock serializes same-owner sends so the
-- 25th slot is consumed exactly once (T-54-01). Mirrors the Phase 53
-- lease_reminders / claim_lease_reminders append-only + service_role-only
-- discipline (20260722005310).
--
-- Three parts, all idempotent / re-runnable:
--   (1) esign_events append-only table + owner-scoped SELECT RLS (no
--       authenticated write policy - writes go only through the RPC below).
--   (2) meter_esign_send(uuid, uuid) - advisory-lock count-and-insert,
--       SECURITY DEFINER, service_role-only (the lease-signature edge function
--       is the only caller; end users must never forge or skip the count -
--       T-54-02).
--   (3) get_esign_usage_current_month() - param-less owner-scoped read for the
--       Settings usage widget (METER-02); resolves auth.uid() internally,
--       authenticated-executable.
--
-- No PG enum (CLAUDE.md rule 6): event_type is text + CHECK. No (text) overload
-- of either function (PGRST203 ambiguity - Pitfall 6). Single uuid signatures
-- only. Every SECURITY DEFINER function sets search_path = public (T-54-04).

-- =============================================================================
-- Part 1: esign_events append-only table + owner-scoped SELECT RLS
-- =============================================================================
-- One row per successful metered send reservation. owner_user_id is the
-- canonical owner column (references public.users(id) directly, per CLAUDE.md);
-- lease_id ties the event to the signed lease. Both cascade on delete so a
-- removed owner/lease drops its metering audit. event_type is text + CHECK (no
-- ENUM); only 'send' is ever recorded (resend is exempt, D-02).

create table if not exists public.esign_events (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  lease_id      uuid not null references public.leases(id) on delete cascade,
  event_type    text not null default 'send'
                constraint esign_events_event_type_check check (event_type in ('send')),
  created_at    timestamptz not null default now()
);

-- Covers the meter/usage count query (owner + calendar-month window).
create index if not exists idx_esign_events_owner_month
  on public.esign_events (owner_user_id, created_at);

comment on table public.esign_events is
  'Append-only audit of metered lease e-sign "send" actions (METER-01). One row per successful send reservation. Owner-scoped SELECT only; all writes go through the service_role-only meter_esign_send() RPC - there is deliberately NO authenticated insert/update/delete policy (append-only, mirrors lease_reminders). resend actions are NOT metered (D-02).';

alter table public.esign_events enable row level security;

-- Owner reads only their own metered events (Settings usage widget + audit,
-- T-54-03). Deliberately the ONLY policy: no INSERT/UPDATE/DELETE policy for
-- authenticated, so the write path is the service_role-only RPC below
-- (append-only; end users cannot forge or skip counts).
create policy esign_events_select
  on public.esign_events
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- =============================================================================
-- Part 2: meter_esign_send(uuid, uuid) - advisory-lock count-and-insert
-- =============================================================================
-- Serializes concurrent sends for THE SAME owner via a transaction-scoped
-- advisory lock (released at txn end), then counts the owner's current
-- calendar-month send events and inserts only when under the cap. Growth is
-- hard-capped at 25/month; Max is unlimited (records but never blocks).
-- SECURITY DEFINER + `set search_path = public`; service_role-only.

create or replace function public.meter_esign_send(p_owner uuid, p_lease uuid)
returns table(allowed boolean, used integer, cap integer, unlimited boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  text;
  v_used  integer;
  v_cap   constant integer := 25;
begin
  -- Serialize concurrent sends for THIS owner (T-54-01). Different owners hash
  -- to different lock keys and never contend. Released automatically at txn end.
  perform pg_advisory_xact_lock(hashtextextended('esign:' || p_owner::text, 0));

  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users
  where id = p_owner;

  -- Max / unlimited: record the event for the usage widget, never block.
  if v_plan in ('max', 'tenantflow_max',
                'price_1tvtaqp3wcr53sdo22vayfhp', 'price_1tvtaup3wcr53sdo5mnmsamf') then
    insert into public.esign_events (owner_user_id, lease_id)
    values (p_owner, p_lease);
    return query select true, null::integer, v_cap, true;
    return;
  end if;

  -- Growth (and any non-max that reaches here): 25 / calendar-month hard cap.
  -- D-01: the window is the current calendar month (date_trunc('month', now())).
  select count(*) into v_used
  from public.esign_events
  where owner_user_id = p_owner
    and event_type = 'send'
    and created_at >= date_trunc('month', now());

  if v_used >= v_cap then
    -- D-01a hard block: the 26th send is refused with NO insert.
    return query select false, v_used, v_cap, false;
    return;
  end if;

  insert into public.esign_events (owner_user_id, lease_id)
  values (p_owner, p_lease);
  return query select true, v_used + 1, v_cap, false;
end;
$$;

comment on function public.meter_esign_send(uuid, uuid) is
  'Race-safe metered e-sign send reservation (METER-01). Advisory-lock-serialized count-and-insert on the current calendar-month send window: Growth is hard-capped at 25 (the 26th returns allowed=false with no insert), Max is unlimited (records + returns unlimited=true). service_role-only - the lease-signature edge function is the sole caller.';

-- service_role-only: end users must never call this to forge/skip counting.
revoke all on function public.meter_esign_send(uuid, uuid) from public, anon, authenticated;
grant execute on function public.meter_esign_send(uuid, uuid) to service_role;

-- =============================================================================
-- Part 3: get_esign_usage_current_month() - param-less owner-scoped read
-- =============================================================================
-- The Settings usage widget (Plan 05) calls this with no arguments; it resolves
-- the caller via auth.uid() so the frontend never passes an owner id. Returns
-- the caller's current calendar-month send count, the cap (25), and whether the
-- caller is on an unlimited (Max) plan.

create or replace function public.get_esign_usage_current_month()
returns table(used integer, cap integer, unlimited boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_plan  text;
  v_used  integer;
  v_cap   constant integer := 25;
begin
  -- Param-less: the caller identity is auth.uid(), never a client-supplied id.
  if v_owner is null then
    raise exception 'not authenticated'
      using errcode = '42501';
  end if;

  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users
  where id = v_owner;

  select count(*) into v_used
  from public.esign_events
  where owner_user_id = v_owner
    and event_type = 'send'
    and created_at >= date_trunc('month', now());

  return query select
    v_used,
    v_cap,
    (v_plan in ('max', 'tenantflow_max',
                'price_1tvtaqp3wcr53sdo22vayfhp', 'price_1tvtaup3wcr53sdo5mnmsamf'));
end;
$$;

comment on function public.get_esign_usage_current_month() is
  'Param-less owner-scoped read of the caller''s current calendar-month e-sign usage for the Settings widget (METER-02). Resolves auth.uid() internally (no owner arg from the frontend); returns {used, cap=25, unlimited}. authenticated-executable.';

-- authenticated-callable (wraps auth.uid() internally); never anon/public.
revoke all on function public.get_esign_usage_current_month() from public, anon;
grant execute on function public.get_esign_usage_current_month() to authenticated;
