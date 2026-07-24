-- =============================================================================
-- Rent charge generation cron (LEDGER-01/04) — the ONE money conversion.
-- =============================================================================
-- Purpose: a daily SECURITY DEFINER pg_cron function that inserts each covered
-- lease's rent charge for every tracked calendar month, converting the integer
-- leases.rent_amount to numeric(10,2) DOLLARS EXACTLY ONCE (D-00). This is the
-- single integer->numeric boundary for the whole ledger — there is no cents
-- math and no hundredfold scaling; any such scaling here would reintroduce the
-- v8.0 100x bug class.
--
-- Behavior:
--   - One type='rent' charge per covered lease per calendar month (D-01),
--     period_start = the 1st of the month, due_date = the 1st (leases have no
--     rent-due-day column; none is added for v10).
--   - Coverage (DIS-5): lease_status in ('active','ended','expired','terminated')
--     AND the period overlaps [start_date, end_date] AND the lease has been
--     onboarded (ledger_start_date is not null). Periods are floored at the
--     later of ledger_start_date and start_date (track-since, D-04) and run
--     forward to the current month — NOT the naive lease_status = 'active'.
--   - Idempotent (D-01): the partial unique index
--     uq_rent_charges_lease_period_rent (lease_id, period_start) where
--     type = 'rent' plus `on conflict ... do nothing` make cron re-runs no-ops.
--   - Returns the count inserted, for cron logging.
--   - service_role-only: end users must never fabricate charges. Revoked from
--     public/anon/authenticated, granted to service_role only, SECURITY DEFINER
--     with search_path pinned to public.
--   - No automatic late fee is applied (manual lines only, DIS-3).
--
-- Analog: 20260224091106_payment_reminders_cron.sql (named SECURITY DEFINER
-- cron fn + idempotent insert + idempotent cron.schedule). Diverges: returns
-- integer (count) not void; is service_role-only (the analog omits the revoke);
-- coverage predicate is status-set + period-overlap, not = 'active'; slot is
-- 05:00 UTC.
--
-- The 'generate-rent-charges' slot ('0 5 * * *') is verified clear of the
-- 03:00-03:45 cleanup cluster and the 06:00/06:30 reminder slots.
--
-- Applied to prod in Plan 55-04 (the blocking gate), NOT here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- generate_rent_charges() — idempotent monthly rent charge generation
-- -----------------------------------------------------------------------------
create or replace function public.generate_rent_charges()
returns integer                          -- count inserted (for cron logging)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  -- One row per covered lease per tracked calendar month. generate_series is
  -- bounded from the later of the track-since month and the lease-start month
  -- through the current month (RESEARCH A3 / D-04) — a bounded forward range,
  -- never an unbounded backfill.
  with active_periods as (
    select
      l.id            as lease_id,
      l.owner_user_id as owner_user_id,
      l.rent_amount   as rent_amount,
      gs::date        as period_start
    from public.leases l
    join lateral generate_series(
           greatest(date_trunc('month', l.ledger_start_date),
                    date_trunc('month', l.start_date)),
           date_trunc('month', current_date),
           interval '1 month') gs on true
    where l.ledger_start_date is not null                                   -- onboarded only (D-04)
      and l.lease_status in ('active','ended','expired','terminated')       -- coverage, not naive = 'active' (DIS-5)
      and l.start_date <= (gs + interval '1 month' - interval '1 day')::date -- period overlaps the lease term
      and (l.end_date is null or l.end_date >= gs::date)
  ),
  ins as (
    insert into public.rent_charges (lease_id, owner_user_id, type, amount, period_start, due_date, description)
    select
      lease_id,
      owner_user_id,
      'rent',
      rent_amount::numeric(10,2),          -- THE ONE CONVERSION: integer dollars -> numeric(10,2) dollars (D-00)
      period_start,
      period_start,                        -- due_date = the 1st (D-01)
      'Monthly rent'
    from active_periods
    on conflict (lease_id, period_start) where type = 'rent' do nothing     -- idempotent (D-01); arbiter matches the partial index
    returning 1
  )
  select count(*) into v_inserted from ins;

  return v_inserted;
end;
$$;

comment on function public.generate_rent_charges() is
  'pg_cron job (05:00 UTC daily): inserts one type=''rent'' charge per covered lease per tracked calendar month (LEDGER-01), converting the integer leases.rent_amount to numeric(10,2) dollars EXACTLY ONCE (D-00). Idempotent via the partial unique index + on conflict do nothing. Coverage = onboarded leases (ledger_start_date not null) whose period overlaps the term and whose status is active/ended/expired/terminated. service_role-only. Returns the count inserted.';

-- service_role-only: end users must never call this to fabricate charges
-- (RESEARCH Security threat "End user calling the generator").
revoke all on function public.generate_rent_charges() from public, anon, authenticated;
grant execute on function public.generate_rent_charges() to service_role;

-- -----------------------------------------------------------------------------
-- Register the pg_cron schedule (idempotent — replaces any job of the same name)
-- -----------------------------------------------------------------------------
-- 05:00 UTC daily; verified clear of the 03:00-03:45 cleanup cluster and the
-- 06:00/06:30 reminder slots.
select cron.schedule('generate-rent-charges', '0 5 * * *', $$select public.generate_rent_charges()$$);
