-- Phase 44 / Plan 2 / ANALYTICS-03 — Onboarding funnel events schema + RLS + triggers
-- Decisions: D2 (signup-cohort semantics — consumed by get_funnel_stats RPC in next migration)
--            D8 (backfill union tenants + tenant_invitations — consumed by backfill migration)
-- Pitfall 3 mitigation: composite UNIQUE index enables ON CONFLICT DO NOTHING in triggers,
-- so funnel inserts never acquire blocking locks on concurrent source-table writes. Trigger
-- bodies wrap insert in BEGIN/EXCEPTION so a funnel failure NEVER fails the source write.
-- Retention: INDEFINITE — no cleanup cron. Row count bounded by OWNER count x 4 steps.

-- =============================================================================
-- Part A: onboarding_funnel_events table
-- One row per (owner_user_id, step_name). Composite UNIQUE guarantees
-- idempotency for triggers and backfill via ON CONFLICT DO NOTHING.
-- =============================================================================

create table if not exists public.onboarding_funnel_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  step_name text not null,
  completed_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  constraint onboarding_funnel_events_step_check check (
    step_name in ('signup', 'first_property', 'first_tenant', 'first_rent')
  ),
  constraint onboarding_funnel_events_owner_step_unique unique (owner_user_id, step_name)
);

create index if not exists idx_onboarding_funnel_events_step_time
  on public.onboarding_funnel_events (step_name, completed_at desc);

create index if not exists idx_onboarding_funnel_events_owner
  on public.onboarding_funnel_events (owner_user_id, completed_at desc);

alter table public.onboarding_funnel_events enable row level security;

-- Admin-only SELECT; NO authenticated INSERT/UPDATE/DELETE policies because
-- writes happen exclusively through SECURITY DEFINER triggers (Part B)
-- which run as postgres role and bypass RLS.
create policy onboarding_funnel_events_admin_select
  on public.onboarding_funnel_events
  for select
  to authenticated
  using ((select public.is_admin()));

comment on table public.onboarding_funnel_events is
  'Append-only onboarding funnel log. One row per (owner_user_id, step_name). Trigger-driven from users/properties/tenant_invitations/rent_payments. Retained indefinitely for historical cohort analysis.';
comment on column public.onboarding_funnel_events.step_name is
  'Funnel step. Values: signup | first_property | first_tenant | first_rent. No PostgreSQL ENUM per project rule.';
comment on column public.onboarding_funnel_events.completed_at is
  'When the source event actually occurred (e.g., users.created_at, rent_payments.paid_date). Differs from recorded_at for backfilled rows.';
comment on column public.onboarding_funnel_events.recorded_at is
  'When THIS row was inserted into the funnel table. Equals completed_at for live trigger-driven rows; differs for backfilled historical rows.';
comment on column public.onboarding_funnel_events.metadata is
  'Event-specific context (e.g., property_id for first_property, lease_id+rent_payment_id for first_rent). Defaults to {} - never null - to keep aggregation SQL simple.';

-- =============================================================================
-- Part B: Trigger functions + triggers
-- All SECURITY DEFINER with set search_path = public. Each INSERT is wrapped
-- in BEGIN/EXCEPTION WHEN others THEN RAISE WARNING so a funnel-insert failure
-- NEVER fails the source table write (Pitfall 3 mitigation).
-- =============================================================================

-- Trigger 1: signup (ANY user_type -- filtered downstream by presence of
-- owner-only steps; user_type could transition PENDING -> OWNER post-insert)
create or replace function public.fn_record_signup_funnel_event()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  begin
    insert into public.onboarding_funnel_events (owner_user_id, step_name, completed_at)
    values (new.id, 'signup', coalesce(new.created_at, now()))
    on conflict (owner_user_id, step_name) do nothing;
  exception when others then
    raise warning 'fn_record_signup_funnel_event failed for user %: % / %',
      new.id, sqlstate, sqlerrm;
  end;
  return new;
end;
$$;

create trigger trg_funnel_signup
  after insert on public.users
  for each row
  execute function public.fn_record_signup_funnel_event();

-- Trigger 2: first_property (fires for every property insert; earliest wins
-- via ON CONFLICT). No status filter: soft-deleted properties still count as
-- "first property reached" (funnel captures intent, not current state).
create or replace function public.fn_record_first_property_funnel_event()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  begin
    insert into public.onboarding_funnel_events
      (owner_user_id, step_name, completed_at, metadata)
    values
      (new.owner_user_id,
       'first_property',
       coalesce(new.created_at, now()),
       jsonb_build_object('property_id', new.id))
    on conflict (owner_user_id, step_name) do nothing;
  exception when others then
    raise warning 'fn_record_first_property_funnel_event failed for property %: % / %',
      new.id, sqlstate, sqlerrm;
  end;
  return new;
end;
$$;

create trigger trg_funnel_first_property
  after insert on public.properties
  for each row
  execute function public.fn_record_first_property_funnel_event();

-- Trigger 3: first_tenant (tenant_invitations only per D8 forward-going
-- policy; legacy tenants-table rows covered by backfill UNION in the backfill
-- migration). Modern flow goes through tenant_invitations, so that is the
-- authoritative source for live captures.
create or replace function public.fn_record_first_tenant_funnel_event()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  begin
    insert into public.onboarding_funnel_events
      (owner_user_id, step_name, completed_at, metadata)
    values
      (new.owner_user_id,
       'first_tenant',
       coalesce(new.created_at, now()),
       jsonb_build_object('invitation_id', new.id))
    on conflict (owner_user_id, step_name) do nothing;
  exception when others then
    raise warning 'fn_record_first_tenant_funnel_event failed for invitation %: % / %',
      new.id, sqlstate, sqlerrm;
  end;
  return new;
end;
$$;

create trigger trg_funnel_first_tenant
  after insert on public.tenant_invitations
  for each row
  execute function public.fn_record_first_tenant_funnel_event();

-- Trigger 4: first_rent -- SHARED function body for AFTER INSERT and
-- AFTER UPDATE OF status triggers on rent_payments.
-- Pitfall 3 mitigation: trigger reads ONLY NEW.* and does exactly ONE SELECT
-- against leases (read-only, different table). Never SELECT rent_payments
-- itself (would risk deadlock on shared row locks under concurrent writes).
create or replace function public.fn_record_first_rent_funnel_event()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_owner_user_id uuid;
begin
  -- Gate: only proceed if new row is succeeded AND either (a) INSERT,
  -- or (b) status just transitioned INTO 'succeeded' from something else.
  if new.status = 'succeeded'
     and (tg_op = 'INSERT' or coalesce(old.status, '') is distinct from 'succeeded')
  then
    begin
      select l.owner_user_id
        into v_owner_user_id
      from public.leases l
      where l.id = new.lease_id;

      if v_owner_user_id is not null then
        insert into public.onboarding_funnel_events
          (owner_user_id, step_name, completed_at, metadata)
        values
          (v_owner_user_id,
           'first_rent',
           coalesce(new.paid_date, new.created_at, now()),
           jsonb_build_object(
             'lease_id', new.lease_id,
             'rent_payment_id', new.id
           ))
        on conflict (owner_user_id, step_name) do nothing;
      end if;
    exception when others then
      raise warning 'fn_record_first_rent_funnel_event failed for rent_payment %: % / %',
        new.id, sqlstate, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger trg_funnel_first_rent_insert
  after insert on public.rent_payments
  for each row
  execute function public.fn_record_first_rent_funnel_event();

create trigger trg_funnel_first_rent_update
  after update of status on public.rent_payments
  for each row
  execute function public.fn_record_first_rent_funnel_event();
