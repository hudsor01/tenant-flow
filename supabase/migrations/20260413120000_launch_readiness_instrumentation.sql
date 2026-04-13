-- ============================================================================
-- Launch Readiness Instrumentation — Stage 1
-- 1. payout_events: tracks Stripe Connect payout lifecycle for timing SLA
-- 2. get_payout_timing_stats: admin-only aggregate for "2-day payout" claim
-- 3. get_autopay_health: owner-scoped autopay enrollment + cron health
-- ============================================================================

-- ----------------------------------------------------------------------------
-- payout_events: one row per Stripe Connect payout
-- ----------------------------------------------------------------------------
create table if not exists payout_events (
  id uuid primary key default gen_random_uuid(),
  stripe_payout_id text not null unique,
  stripe_account_id text not null,
  owner_user_id uuid not null references users(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'usd',
  status text not null,
  arrival_date timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_message text,
  -- First charge included in this payout (earliest tenant payment)
  first_charge_at timestamptz,
  charge_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Generated duration: from first tenant charge to payout paid
  duration_hours numeric(10, 2) generated always as (
    case
      when paid_at is not null and first_charge_at is not null
        then extract(epoch from (paid_at - first_charge_at)) / 3600.0
      else null
    end
  ) stored,
  constraint payout_events_status_check check (
    status in ('created', 'pending', 'in_transit', 'paid', 'failed', 'canceled')
  )
);

create index if not exists idx_payout_events_owner on payout_events(owner_user_id, created_at desc);
create index if not exists idx_payout_events_status on payout_events(status) where status in ('pending', 'in_transit', 'failed');
create index if not exists idx_payout_events_paid_at on payout_events(paid_at desc) where paid_at is not null;

alter table payout_events enable row level security;

-- Owners read their own payouts; service_role writes via webhook
create policy payout_events_select_own on payout_events
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

-- updated_at trigger
create trigger set_payout_events_updated_at
  before update on payout_events
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- get_payout_timing_stats: admin-only aggregate (P50/P95/max over 30d)
-- ----------------------------------------------------------------------------
create or replace function get_payout_timing_stats()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Admin only
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'window_days', 30,
      'paid_count', count(*) filter (where status = 'paid'),
      'failed_count', count(*) filter (where status = 'failed'),
      'pending_count', count(*) filter (where status in ('pending', 'in_transit', 'created')),
      'p50_hours', percentile_cont(0.5) within group (order by duration_hours)
        filter (where duration_hours is not null),
      'p95_hours', percentile_cont(0.95) within group (order by duration_hours)
        filter (where duration_hours is not null),
      'max_hours', max(duration_hours) filter (where duration_hours is not null),
      'over_48h_count', count(*) filter (where duration_hours > 48),
      'total_volume', coalesce(sum(amount) filter (where status = 'paid'), 0)
    )
    from payout_events
    where created_at >= now() - interval '30 days'
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- get_autopay_health: owner-scoped enrollment + cron run health
-- ----------------------------------------------------------------------------
create or replace function get_autopay_health(p_owner_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_enrolled integer;
  v_total_active integer;
  v_next_run timestamptz;
  v_last_run timestamptz;
  v_last_run_success boolean;
  v_failures_30d integer;
begin
  -- SEC-01: caller identity validation
  if p_owner_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  -- Enrollment counts: active leases with autopay enabled / total active leases
  select
    count(*) filter (
      where l.lease_status = 'active'
      and exists (
        select 1 from rent_due rd
        where rd.lease_id = l.id and rd.autopay_enabled = true
      )
    ),
    count(*) filter (where l.lease_status = 'active')
  into v_enrolled, v_total_active
  from leases l
  where l.owner_user_id = p_owner_user_id;

  -- pg_cron next/last run for process-autopay-charges
  select start_time
  into v_last_run
  from cron.job_run_details jrd
  join cron.job j on j.jobid = jrd.jobid
  where j.jobname = 'process-autopay-charges'
  order by start_time desc
  limit 1;

  select (status = 'succeeded')
  into v_last_run_success
  from cron.job_run_details jrd
  join cron.job j on j.jobid = jrd.jobid
  where j.jobname = 'process-autopay-charges'
  order by start_time desc
  limit 1;

  -- Failures in this owner's autopay over last 30 days
  select count(*)
  into v_failures_30d
  from rent_due rd
  join leases l on l.id = rd.lease_id
  where l.owner_user_id = p_owner_user_id
    and rd.autopay_enabled = true
    and rd.autopay_last_attempt_at >= now() - interval '30 days'
    and rd.status != 'paid'
    and rd.autopay_attempts > 0;

  return jsonb_build_object(
    'enrolled_count', coalesce(v_enrolled, 0),
    'total_active_leases', coalesce(v_total_active, 0),
    'enrollment_rate', case
      when coalesce(v_total_active, 0) = 0 then 0
      else round((v_enrolled::numeric / v_total_active) * 100, 1)
    end,
    'last_run_at', v_last_run,
    'last_run_succeeded', coalesce(v_last_run_success, false),
    'failures_30d', coalesce(v_failures_30d, 0)
  );
exception
  -- If cron schema/tables not readable (extension not exposed), return enrollment only
  when insufficient_privilege or undefined_table then
    return jsonb_build_object(
      'enrolled_count', coalesce(v_enrolled, 0),
      'total_active_leases', coalesce(v_total_active, 0),
      'enrollment_rate', case
        when coalesce(v_total_active, 0) = 0 then 0
        else round((v_enrolled::numeric / v_total_active) * 100, 1)
      end,
      'last_run_at', null,
      'last_run_succeeded', null,
      'failures_30d', coalesce(v_failures_30d, 0)
    );
end;
$$;

grant execute on function get_payout_timing_stats() to authenticated;
grant execute on function get_autopay_health(uuid) to authenticated;

comment on table payout_events is
  'Launch readiness instrumentation: tracks Stripe Connect payout lifecycle to prove 2-day deposit SLA.';
comment on function get_payout_timing_stats() is
  'Admin-only aggregate of payout timing (P50/P95/max) over last 30 days.';
comment on function get_autopay_health(uuid) is
  'Owner-scoped autopay enrollment + cron health snapshot for dashboard widget.';
