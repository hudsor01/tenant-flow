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
