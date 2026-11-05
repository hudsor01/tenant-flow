-- =============================================================================
-- get_dashboard_stats and get_dashboard_data_v2: compute the occupancy change
-- and the revenue growth from one lease-based definition, and say over which
-- days
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, and after
-- 20261102163709_property_performance_rent_received.sql (independent functions;
-- the order only keeps the ledger sequential). Apply
-- 20261102200501_occupancy_trends_exclude_soft_deleted.sql with it: the two
-- carry one rule (ONE DEFINITION below), and with only one of them applied the
-- tile and the occupancy chart count a soft-deleted unit's lease differently. After the merge the main
-- session applies this file with MCP `apply_migration`, reads
-- `list_migrations`, and renames the file to the version production assigned,
-- in a follow-up PR. Until it is applied, the analytics overview finds no
-- `occupancyChangeWindow` / `growthWindow` in the payload and says the change
-- is unavailable, never the old body's figure.
--
-- THE DEFECT. get_dashboard_stats returns the literals
--     'occupancyChange', 0   and   'growth', 0
-- (latest repo copy: 20260709050956), so a caller cannot tell "no change" from
-- "never computed". get_dashboard_data_v2, which the dashboard and the
-- analytics overview read, computes both inline (it does not call
-- get_dashboard_stats), but compares today's leases with only the leases whose
-- status is 'active' TODAY on the earlier date: a lease that ran 30 days ago
-- and has since ended or expired counts on neither date, so a tenant who left
-- never shows as a drop; growth divides two integer sums of rent_amount, so
-- a rise of 120% read 100%; and growth is 0 (not "no figure") when nothing was
-- rented 30 days ago. scheduled_rent below is numeric, so the division is
-- exact before it is rounded.
--
-- STARTED FROM THE LIVE PRODUCTION BODIES (md5 of pg_get_functiondef equal to
-- production's, read 2026-11-02, on a replay of the chain without this PR's
-- migrations), not repo copies. Unchanged in both: the signature, RETURNS,
-- LANGUAGE plpgsql, SECURITY DEFINER, the pinned search_path, the volatility
-- (VOLATILE, the default), the auth.uid() guard as written, the ACL (EXECUTE
-- for authenticated and service_role only), and every key this header does
-- not name, computed as before. In get_dashboard_data_v2 the
-- `trends.occupancy_rate` and `trends.monthly_revenue` objects now read the
-- same two figures (current and previous below), so
-- `stats.units.occupancyChange` equals `trends.occupancy_rate.change`, and
-- `trends.active_tenants` reads the helper's tenant count on the same two days
-- (it compared today's active leases with only the leases still active TODAY
-- that ran 30 days ago, the defect the occupancy trend had). In all four trends (occupancy_rate,
-- monthly_revenue, active_tenants, open_maintenance) `percentChange` is NULL
-- when the earlier figure is 0 (it was 0, a figure no caller could tell from
-- "unchanged") and each states its two days in `window`, the dashboard KPI
-- chips' marker. `trend` and `open_maintenance`'s two counts keep their
-- formulas.
--
-- THE SERIES (get_dashboard_data_v2). `time_series.occupancy_rate` and
-- `time_series.monthly_revenue`, the dashboard's Occupancy and Scheduled Rent
-- sparklines (drawn beside the trend chips, in the trend's color) and the
-- 30-day Scheduled Rent chart, counted on each of the last 30 days only the
-- leases whose status is 'active' TODAY, the defect above, so a sparkline
-- could stay flat beside a chip that fell. Each day's point is now
-- dashboard_lease_position on that day (its occupancy_rate and its
-- scheduled_rent), so the last point is the trend's `current`.
-- `time_series.monthly_revenue_6mo`, the 6-month Scheduled Rent chart, summed
-- the rent of every 'active' lease that overlapped each calendar month; each
-- month's point is now the helper's scheduled_rent on the month's last day
-- (today, for this month), so a unit whose lease changed in the month counts
-- once and this month's point is the trend's `current` too. The days (the
-- last 30, today included) and the months (the last six calendar months, this
-- one included) are unchanged.
--
-- ONE DEFINITION. dashboard_lease_position(owner, day) returns the owner's
-- occupancy rate, scheduled monthly rent and tenants on a day, from leases,
-- the rule get_occupancy_trends_optimized (the occupancy trend series, as
-- 20261102200501 leaves it) applies to a month, applied to one day:
--   - the counted units: the owner's units that are not soft-deleted
--     (status 'inactive'), on properties that are not soft-deleted;
--   - a lease counts on a day when it is on a counted unit, its status is
--     'active', 'ended' or 'expired' (it was running then, whatever it is
--     now; a soft-deleted lease is 'inactive') and the day is within
--     start_date .. end_date (an open end runs on);
--   - occupancy_rate: the counted units with such a lease, over the counted
--     units, in percent, rounded to 2 decimals (0 with no units). One unit
--     list for the numerator and the denominator, so a soft-deleted unit's
--     lease never counts (it used to, and could put the rate over 100%);
--     the list is today's on both dates (there is no unit history), as the
--     series' is.
--   - scheduled_rent: the sum of those leases' rent_amount, the dashboard's
--     "Revenue" (scheduled rent, never cash; CLAUDE.md, Domain model).
--   - tenant_count: the distinct primary tenants of those leases.
-- Both ends of each comparison come from it, and so does every point of the
-- series, so today's figure is never units.status (the stored occupancy the
-- tiles display) set against a lease count 30 days ago. Both callers are
-- SECURITY DEFINER and run it as postgres, so it is SECURITY INVOKER and no
-- client role may execute it.
--
-- WHAT EACH KEY MEANS (both functions).
--   units.occupancyChange: occupancy_rate today minus occupancy_rate 30 days
--     ago, in percentage points (the difference of the two rounded rates).
--   units.occupancyChangeWindow and revenue.growthWindow:
--     'YYYY-MM-DD/YYYY-MM-DD', the two days compared (30 days ago, today), an
--     ISO 8601 interval. THE MARKER: the bodies before this one never return
--     these keys, so a caller shows a change only when its window is there,
--     and says it is unavailable otherwise (the old 0 is no figure).
--   revenue.growth: the percent change of scheduled_rent between the two days,
--     rounded to 2 decimals, or NULL when nothing was scheduled 30 days ago
--     (no prior figure to compare: never 0, never a division by zero).
--   trends.<each>.window (get_dashboard_data_v2): the same two days.
--   trends.<each>.percentChange: the change over the earlier figure, in
--     percent, rounded to 2 decimals, or NULL when the earlier figure is 0.
--     For occupancy_rate it is relative; the change in points is `change`.
--   trends.active_tenants: tenant_count today and 30 days ago.
--
-- OPEN MAINTENANCE, ONE COUNT (both functions). The dashboard's and the
-- analytics overview's "Open maintenance" tile shows get_dashboard_data_v2's
-- `stats.maintenance.open` beside the `trends.open_maintenance` chip, and the
-- production body counted three different sets under that one name:
-- `stats.maintenance.open` the requests whose status is 'open', the trend's
-- current figure every request not completed or cancelled, and each
-- property's `open_maintenance` (the portfolio table) 'open' and 'in_progress'
-- only. So a chip read "+3 vs. 30 days ago" beside a figure of 2. All three
-- now count the requests that are not completed or cancelled ('open',
-- 'assigned', 'in_progress', 'needs_reassignment', 'on_hold'): the only set the
-- trend can compare with 30 days ago, because no status history exists ('open'
-- 30 days ago cannot be known; "not yet completed or cancelled" can, from
-- created_at and completed_at). get_dashboard_stats' `maintenance.open` counts
-- the same set, so the two functions give one figure under one name (no
-- caller reads that key today; a figure under that name must not differ).
-- `stats.maintenance.inProgress` keeps its own count in both (no caller reads
-- it).
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds a portfolio
-- (scripts/migration-replay-owner-figures.sql) and asserts both functions'
-- figures, every trend's (its percentChange NULL with no earlier figure, its
-- window, the tenants by the helper's rule), every point of the three series
-- (by the helper's rule, day by day and month by month), that they agree with
-- each other and with the helper, that the helper equals the occupancy series
-- on every month whose leases hold, the windows, the guard and the grants
-- (assertOwnerFiguresComputed in scripts/migration-replay-assertions.ts).
-- =============================================================================

create or replace function public.dashboard_lease_position(p_owner_id uuid, p_on date)
 returns table(occupancy_rate numeric, scheduled_rent numeric, tenant_count integer)
 language sql
 stable
 set search_path to 'public'
as $function$
  -- The counted units (see the header): one list for both sides of the rate.
  with counted_units as (
    select u.id
    from units u
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_owner_id
      and p.status <> 'inactive'
      and u.status <> 'inactive'
  ),
  running_leases as (
    select l.unit_id, l.rent_amount, l.primary_tenant_id
    from leases l
    join counted_units cu on cu.id = l.unit_id
    where l.lease_status in ('active', 'ended', 'expired')
      and l.start_date <= p_on
      and (l.end_date is null or l.end_date >= p_on)
  )
  select
    coalesce(round(
      (select count(distinct rl.unit_id) from running_leases rl)::numeric
        / nullif((select count(*) from counted_units), 0)::numeric * 100, 2), 0) as occupancy_rate,
    coalesce((select sum(rl.rent_amount) from running_leases rl), 0)::numeric as scheduled_rent,
    (select count(distinct rl.primary_tenant_id) from running_leases rl)::integer as tenant_count;
$function$;

comment on function public.dashboard_lease_position(uuid, date) is
  'Private helper of get_dashboard_stats and get_dashboard_data_v2: on p_on, over the counted units (the owner''s units not inactive on properties not inactive), the occupancy rate (counted units with a lease in status active/ended/expired running on p_on, over the counted units, percent, 2 decimals), the scheduled monthly rent (sum of those leases'' rent_amount) and the tenants (distinct primary tenants of those leases). The rule get_occupancy_trends_optimized applies to a month (20261102200501). No client role may execute it.';

revoke all on function public.dashboard_lease_position(uuid, date) from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  owner_properties AS (
    SELECT id
    FROM properties
    WHERE owner_user_id = p_user_id
      AND status != 'inactive'
  ),

  unit_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE u.status <> 'inactive')::int AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int   AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available')::int  AS vacant_units,
      COUNT(*) FILTER (WHERE u.status = 'maintenance')::int AS maintenance_units,
      COALESCE(AVG(u.rent_amount) FILTER (WHERE u.status <> 'inactive'), 0) AS avg_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status <> 'inactive'), 0) AS total_potential_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status = 'occupied'), 0) AS total_actual_rent
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
  ),

  property_unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS occ,
      COUNT(*) FILTER (WHERE u.status <> 'inactive')::int AS tot
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
    GROUP BY u.property_id
  ),
  property_agg AS (
    SELECT
      COUNT(op.id)::int                                                   AS total_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) > 0)::int              AS occupied_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) = 0)::int              AS vacant_props,
      COALESCE(
        ROUND(
          (SUM(COALESCE(puc.occ, 0))::decimal /
           NULLIF(SUM(COALESCE(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      )                                                                   AS occupancy_rate,
      COALESCE(SUM(ua.total_actual_rent), 0)                             AS monthly_rent,
      COALESCE(SUM(ua.avg_rent), 0)                                      AS avg_rent
    FROM owner_properties op
    LEFT JOIN property_unit_counts puc ON puc.property_id = op.id
    CROSS JOIN unit_agg ua
  ),

  active_leases AS (
    SELECT
      l.id,
      l.primary_tenant_id,
      l.rent_amount,
      l.end_date
    FROM leases l
    WHERE l.owner_user_id = p_user_id
      AND l.lease_status = 'active'
  ),
  lease_agg AS (
    SELECT
      (SELECT COUNT(*)::int FROM leases WHERE owner_user_id = p_user_id AND lease_status <> 'inactive') AS total_leases,
      COUNT(*)::int                                                                      AS active_leases,
      (SELECT COUNT(*)::int FROM leases
       WHERE owner_user_id = p_user_id
         AND lease_status IN ('ended', 'terminated', 'expired'))                         AS expired_leases,
      COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days')::int         AS expiring_soon,
      COALESCE(SUM(rent_amount), 0)                                                      AS monthly_revenue
    FROM active_leases
  ),

  tenant_active_ids AS (
    SELECT DISTINCT primary_tenant_id AS tenant_id
    FROM active_leases
  ),
  tenant_agg AS (
    SELECT
      COUNT(t.id)::int                                                     AS total_tenants,
      COUNT(tai.tenant_id)::int                                            AS active_tenants,
      COUNT(t.id)::int - COUNT(tai.tenant_id)::int                        AS inactive_tenants,
      COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS new_this_month
    FROM tenants t
    LEFT JOIN tenant_active_ids tai ON tai.tenant_id = t.id
    WHERE EXISTS (
      SELECT 1 FROM leases l2
      JOIN units u2 ON u2.id = l2.unit_id
      WHERE u2.property_id IN (SELECT id FROM owner_properties)
        AND l2.primary_tenant_id = t.id
        AND l2.lease_status <> 'inactive'
    )
  ),

  maintenance_agg AS (
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int      AS open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int                        AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int                          AS completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::int AS completed_today,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
        FILTER (WHERE completed_at IS NOT NULL), 0
      )                                                                           AS avg_resolution_days,
      COUNT(*) FILTER (WHERE priority = 'low')::int                              AS priority_low,
      COUNT(*) FILTER (WHERE priority = 'normal')::int                           AS priority_normal,
      COUNT(*) FILTER (WHERE priority = 'high')::int                             AS priority_high,
      COUNT(*) FILTER (WHERE priority = 'urgent')::int                           AS priority_urgent
    FROM maintenance_requests
    WHERE owner_user_id = p_user_id
  ),

  -- The occupancy and scheduled rent the trends compare, today and 30 days
  -- ago, both from dashboard_lease_position (see the migration header).
  trend_now AS (
    SELECT * FROM public.dashboard_lease_position(p_user_id, CURRENT_DATE)
  ),
  trend_then AS (
    SELECT * FROM public.dashboard_lease_position(p_user_id, CURRENT_DATE - 30)
  )

  SELECT json_build_object(
    'properties', json_build_object(
      'total',           pa.total_props,
      'occupied',        pa.occupied_props,
      'vacant',          pa.vacant_props,
      'occupancyRate',   pa.occupancy_rate,
      'totalMonthlyRent', (SELECT total_actual_rent FROM unit_agg),
      'averageRent',     (SELECT avg_rent FROM unit_agg)
    ),
    'tenants', json_build_object(
      'total',         ta.total_tenants,
      'active',        ta.active_tenants,
      'inactive',      ta.inactive_tenants,
      'newThisMonth',  ta.new_this_month
    ),
    'units', json_build_object(
      'total',              ua.total_units,
      'occupied',           ua.occupied_units,
      'vacant',             ua.vacant_units,
      'maintenance',        ua.maintenance_units,
      'available',          ua.vacant_units,
      'averageRent',        ua.avg_rent,
      'occupancyRate',      CASE WHEN ua.total_units > 0
                              THEN ROUND((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                              ELSE 0 END,
      'occupancyChange',    tn.occupancy_rate - tt.occupancy_rate,
      'occupancyChangeWindow', to_char(CURRENT_DATE - 30, 'YYYY-MM-DD') || '/' || to_char(CURRENT_DATE, 'YYYY-MM-DD'),
      'totalPotentialRent', ua.total_potential_rent,
      'totalActualRent',    ua.total_actual_rent
    ),
    'leases', json_build_object(
      'total',        la.total_leases,
      'active',       la.active_leases,
      'expired',      la.expired_leases,
      'expiringSoon', la.expiring_soon
    ),
    'maintenance', json_build_object(
      'total',           ma.total,
      'open',            ma.open_count,
      'inProgress',      ma.in_progress,
      'completed',       ma.completed,
      'completedToday',  ma.completed_today,
      'avgResolutionTime', ma.avg_resolution_days,
      'byPriority', json_build_object(
        'low',    ma.priority_low,
        'normal', ma.priority_normal,
        'high',   ma.priority_high,
        'urgent', ma.priority_urgent
      )
    ),
    'revenue', json_build_object(
      'monthly', la.monthly_revenue,
      'yearly',  la.monthly_revenue * 12,
      'growth',  CASE WHEN tt.scheduled_rent > 0
                   THEN ROUND(((tn.scheduled_rent - tt.scheduled_rent) / tt.scheduled_rent) * 100, 2)
                   ELSE NULL END,
      'growthWindow', to_char(CURRENT_DATE - 30, 'YYYY-MM-DD') || '/' || to_char(CURRENT_DATE, 'YYYY-MM-DD')
    )
  ) INTO v_result
  FROM property_agg pa
  CROSS JOIN unit_agg ua
  CROSS JOIN tenant_agg ta
  CROSS JOIN lease_agg la
  CROSS JOIN maintenance_agg ma
  CROSS JOIN trend_now tn
  CROSS JOIN trend_then tt;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  with
  owner_properties as (
    select id, name, address_line1, property_type
    from properties
    where owner_user_id = p_user_id
      and status != 'inactive'
  ),

  all_units as (
    select u.id, u.property_id, u.status, u.rent_amount
    from units u
    where u.property_id in (select id from owner_properties)
      and u.status <> 'inactive'
  ),

  all_leases as (
    select l.id, l.unit_id, l.primary_tenant_id, l.rent_amount,
           l.start_date, l.end_date, l.lease_status
    from leases l
    join all_units au on au.id = l.unit_id
    where l.owner_user_id = p_user_id
      and l.lease_status <> 'inactive'
  ),

  active_leases as (
    select * from all_leases where lease_status = 'active'
  ),

  all_maintenance as (
    select id, status, priority, created_at, completed_at
    from maintenance_requests
    where owner_user_id = p_user_id
  ),

  unit_agg as (
    select
      count(*)::int                                          as total_units,
      count(*) filter (where status = 'occupied')::int       as occupied_units,
      count(*) filter (where status = 'available')::int      as vacant_units,
      count(*) filter (where status = 'maintenance')::int    as maintenance_units,
      coalesce(avg(rent_amount), 0)                          as avg_rent,
      coalesce(sum(rent_amount), 0)                          as total_potential_rent,
      coalesce(sum(rent_amount) filter (where status = 'occupied'), 0) as total_actual_rent
    from all_units
  ),

  property_unit_counts as (
    select
      property_id,
      count(*) filter (where status = 'occupied')::int as occ,
      count(*)::int as tot
    from all_units
    group by property_id
  ),

  property_agg as (
    select
      count(op.id)::int as total_props,
      count(*) filter (where coalesce(puc.occ, 0) > 0)::int as occupied_props,
      count(*) filter (where coalesce(puc.occ, 0) = 0)::int as vacant_props,
      coalesce(
        round(
          (sum(coalesce(puc.occ, 0))::decimal /
           nullif(sum(coalesce(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      ) as occupancy_rate
    from owner_properties op
    left join property_unit_counts puc on puc.property_id = op.id
  ),

  lease_agg as (
    select
      (select count(*)::int from all_leases)                            as total_leases,
      count(*)::int                                                     as active_leases_count,
      (select count(*)::int from all_leases
       where lease_status in ('ended', 'terminated', 'expired'))        as expired_leases,
      count(*) filter (where end_date <= current_date + interval '30 days')::int as expiring_soon,
      coalesce(sum(rent_amount), 0)                                     as monthly_revenue
    from active_leases
  ),

  tenant_active_ids as (
    select distinct primary_tenant_id as tenant_id from active_leases
  ),

  tenant_agg as (
    select
      count(t.id)::int                                                      as total_tenants,
      count(tai.tenant_id)::int                                             as active_tenants,
      count(t.id)::int - count(tai.tenant_id)::int                         as inactive_tenants,
      count(*) filter (where t.created_at >= date_trunc('month', current_date))::int as new_this_month
    from tenants t
    left join tenant_active_ids tai on tai.tenant_id = t.id
    where exists (
      select 1 from all_leases l2
      where l2.primary_tenant_id = t.id
    )
  ),

  maintenance_agg as (
    select
      count(*)::int                                                                as total,
      -- Open: not completed or cancelled, the trend's set (see the header).
      count(*) filter (where status not in ('completed', 'cancelled'))::int       as open_count,
      count(*) filter (where status = 'in_progress')::int                         as in_progress,
      count(*) filter (where status = 'completed')::int                           as completed,
      count(*) filter (where status = 'completed' and date(completed_at) = current_date)::int as completed_today,
      coalesce(
        avg(extract(epoch from (completed_at - created_at)) / 86400)
        filter (where completed_at is not null), 0
      )                                                                            as avg_resolution_days,
      count(*) filter (where priority = 'low')::int                               as priority_low,
      count(*) filter (where priority = 'normal')::int                            as priority_normal,
      count(*) filter (where priority = 'high')::int                              as priority_high,
      count(*) filter (where priority = 'urgent')::int                            as priority_urgent
    from all_maintenance
  ),

  -- Occupancy today and 30 days ago, both from dashboard_lease_position (see
  -- the migration header): one rule on both dates, so a lease that has
  -- since ended still counts on the day it was running.
  trend_occupancy as (
    select
      (select occupancy_rate from public.dashboard_lease_position(p_user_id, current_date)) as current_val,
      (select occupancy_rate from public.dashboard_lease_position(p_user_id, current_date - 30)) as previous_val
  ),

  -- Scheduled rent today and 30 days ago, from the same leases.
  trend_revenue as (
    select
      (select scheduled_rent from public.dashboard_lease_position(p_user_id, current_date)) as current_val,
      (select scheduled_rent from public.dashboard_lease_position(p_user_id, current_date - 30)) as previous_val
  ),

  -- Tenants with a running lease today and 30 days ago, from the same rule.
  trend_tenants as (
    select
      (select tenant_count from public.dashboard_lease_position(p_user_id, current_date))::numeric as current_val,
      (select tenant_count from public.dashboard_lease_position(p_user_id, current_date - 30))::numeric as previous_val
  ),

  trend_maintenance as (
    select
      count(*) filter (where status not in ('completed', 'cancelled'))::numeric as current_val,
      coalesce((
        select count(*)::numeric
        from all_maintenance
        where created_at <= current_date - interval '30 days'
          and status != 'cancelled'
          and (status != 'completed' or completed_at > current_date - interval '30 days')
      ), 0) as previous_val
    from all_maintenance
  ),

  date_series as (
    select d::date as series_date
    from generate_series(current_date - 29, current_date, '1 day'::interval) d
  ),

  month_series as (
    select date_trunc('month', d)::date as month_start
    from generate_series(
      date_trunc('month', current_date) - interval '5 months',
      date_trunc('month', current_date),
      '1 month'::interval
    ) d
  ),

  -- Each day's occupancy and scheduled rent, from dashboard_lease_position
  -- (see the header): the rule the trends compare, on every day of the series.
  daily_position as (
    select ds.series_date, pos.occupancy_rate, pos.scheduled_rent
    from date_series ds
    cross join lateral public.dashboard_lease_position(p_user_id, ds.series_date) pos
  ),

  ts_occupancy as (
    select jsonb_agg(
      jsonb_build_object('date', to_char(dp.series_date, 'YYYY-MM-DD'), 'value', dp.occupancy_rate)
      order by dp.series_date
    ) as data
    from daily_position dp
  ),

  ts_revenue as (
    select jsonb_agg(
      jsonb_build_object('date', to_char(dp.series_date, 'YYYY-MM-DD'), 'value', dp.scheduled_rent)
      order by dp.series_date
    ) as data
    from daily_position dp
  ),

  -- Each month's scheduled rent on its last day (today, for this month), by
  -- the same rule (see the header).
  ts_revenue_6mo as (
    select jsonb_agg(
      jsonb_build_object('month', to_char(ms.month_start, 'YYYY-MM'),
                         'value', pos.scheduled_rent)
      order by ms.month_start
    ) as data
    from month_series ms
    cross join lateral public.dashboard_lease_position(
      p_user_id,
      least((ms.month_start + interval '1 month' - interval '1 day')::date, current_date)
    ) pos
  ),

  perf_unit_counts as (
    select
      property_id,
      count(*) as total_units,
      count(*) filter (where status = 'occupied') as occupied_units,
      count(*) filter (where status = 'available') as vacant_units
    from all_units
    group by property_id
  ),

  perf_lease_revenues as (
    select
      u.property_id,
      coalesce(sum(l.rent_amount), 0) as monthly_revenue
    from all_units u
    left join active_leases l on l.unit_id = u.id
    group by u.property_id
  ),

  perf_potential_revenues as (
    select
      property_id,
      coalesce(sum(rent_amount), 0) as potential_revenue
    from all_units
    group by property_id
  ),

  perf_open_maintenance as (
    select
      u.property_id,
      count(*) filter (where am.status not in ('completed', 'cancelled'))::int as open_maintenance
    from all_maintenance am
    join maintenance_requests mr on mr.id = am.id
    join all_units u on u.id = mr.unit_id
    group by u.property_id
  ),

  property_perf as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'property_name', op.name,
          'property_id', op.id,
          'total_units', coalesce(puc.total_units, 0),
          'occupied_units', coalesce(puc.occupied_units, 0),
          'vacant_units', coalesce(puc.vacant_units, 0),
          'occupancy_rate', case
            when coalesce(puc.total_units, 0) > 0
            then round((puc.occupied_units::numeric / puc.total_units::numeric) * 100, 2)
            else 0
          end,
          'annual_revenue', coalesce(plr.monthly_revenue, 0) * 12,
          'monthly_revenue', coalesce(plr.monthly_revenue, 0),
          'potential_revenue', coalesce(ppr.potential_revenue, 0),
          'open_maintenance', coalesce(pom.open_maintenance, 0),
          'address', op.address_line1,
          'property_type', op.property_type,
          'status', case
            when coalesce(puc.total_units, 0) = 0 then 'NO_UNITS'
            when coalesce(puc.occupied_units, 0) = 0 then 'vacant'
            when puc.occupied_units = puc.total_units then 'FULL'
            else 'PARTIAL'
          end
        ) order by op.name
      ),
      '[]'::jsonb
    ) as data
    from owner_properties op
    left join perf_unit_counts puc on puc.property_id = op.id
    left join perf_lease_revenues plr on plr.property_id = op.id
    left join perf_potential_revenues ppr on ppr.property_id = op.id
    left join perf_open_maintenance pom on pom.property_id = op.id
  ),

  recent_activities as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id::text,
          'title', a.title,
          'description', a.description,
          'activity_type', a.activity_type,
          'entity_type', a.entity_type,
          'entity_id', a.entity_id::text,
          'user_id', a.user_id::text,
          'created_at', a.created_at
        ) order by a.created_at desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select id, title, description, activity_type, entity_type, entity_id, user_id, created_at
      from activity
      where user_id = p_user_id
      order by created_at desc
      limit 10
    ) a
  )

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'properties', jsonb_build_object(
        'total',           pa.total_props,
        'occupied',        pa.occupied_props,
        'vacant',          pa.vacant_props,
        'occupancyRate',   pa.occupancy_rate,
        'totalMonthlyRent', ua.total_actual_rent,
        'averageRent',     ua.avg_rent
      ),
      'tenants', jsonb_build_object(
        'total',         ta.total_tenants,
        'active',        ta.active_tenants,
        'inactive',      ta.inactive_tenants,
        'newThisMonth',  ta.new_this_month
      ),
      'units', jsonb_build_object(
        'total',              ua.total_units,
        'occupied',           ua.occupied_units,
        'vacant',             ua.total_units - ua.occupied_units,
        'maintenance',        ua.maintenance_units,
        'available',          ua.vacant_units,
        'averageRent',        ua.avg_rent,
        'occupancyRate',      case when ua.total_units > 0
                                then round((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                                else 0 end,
        'occupancyChange',    tocc.current_val - tocc.previous_val,
        'occupancyChangeWindow', to_char(current_date - 30, 'YYYY-MM-DD') || '/' || to_char(current_date, 'YYYY-MM-DD'),
        'totalPotentialRent', ua.total_potential_rent,
        'totalActualRent',    ua.total_actual_rent
      ),
      'leases', jsonb_build_object(
        'total',        la.total_leases,
        'active',       la.active_leases_count,
        'expired',      la.expired_leases,
        'expiringSoon', la.expiring_soon
      ),
      'maintenance', jsonb_build_object(
        'total',           ma.total,
        'open',            ma.open_count,
        'inProgress',      ma.in_progress,
        'completed',       ma.completed,
        'completedToday',  ma.completed_today,
        'avgResolutionTime', ma.avg_resolution_days,
        'byPriority', jsonb_build_object(
          'low',    ma.priority_low,
          'normal', ma.priority_normal,
          'high',   ma.priority_high,
          'urgent', ma.priority_urgent
        )
      ),
      'revenue', jsonb_build_object(
        'monthly', la.monthly_revenue,
        'yearly',  la.monthly_revenue * 12,
        'growth',  case
          when trev.previous_val > 0
          then round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          else null
        end,
        'growthWindow', to_char(current_date - 30, 'YYYY-MM-DD') || '/' || to_char(current_date, 'YYYY-MM-DD')
      )
    ),
    'trends', jsonb_build_object(
      'occupancy_rate', jsonb_build_object(
        'current', tocc.current_val,
        'previous', tocc.previous_val,
        'change', tocc.current_val - tocc.previous_val,
        'percentChange', case
          when tocc.previous_val > 0
          then round(((tocc.current_val - tocc.previous_val) / tocc.previous_val) * 100, 2)
          else null
        end,
        'window', to_char(current_date - 30, 'YYYY-MM-DD') || '/' || to_char(current_date, 'YYYY-MM-DD'),
        'trend', case
          when tocc.current_val > tocc.previous_val then 'up'
          when tocc.current_val < tocc.previous_val then 'down'
          else 'stable'
        end
      ),
      'monthly_revenue', jsonb_build_object(
        'current', trev.current_val,
        'previous', trev.previous_val,
        'change', trev.current_val - trev.previous_val,
        'percentChange', case
          when trev.previous_val > 0
          then round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          else null
        end,
        'window', to_char(current_date - 30, 'YYYY-MM-DD') || '/' || to_char(current_date, 'YYYY-MM-DD'),
        'trend', case
          when trev.current_val > trev.previous_val then 'up'
          when trev.current_val < trev.previous_val then 'down'
          else 'stable'
        end
      ),
      'active_tenants', jsonb_build_object(
        'current', tten.current_val,
        'previous', tten.previous_val,
        'change', tten.current_val - tten.previous_val,
        'percentChange', case
          when tten.previous_val > 0
          then round(((tten.current_val - tten.previous_val) / tten.previous_val) * 100, 2)
          else null
        end,
        'window', to_char(current_date - 30, 'YYYY-MM-DD') || '/' || to_char(current_date, 'YYYY-MM-DD'),
        'trend', case
          when tten.current_val > tten.previous_val then 'up'
          when tten.current_val < tten.previous_val then 'down'
          else 'stable'
        end
      ),
      'open_maintenance', jsonb_build_object(
        'current', tmnt.current_val,
        'previous', tmnt.previous_val,
        'change', tmnt.current_val - tmnt.previous_val,
        'percentChange', case
          when tmnt.previous_val > 0
          then round(((tmnt.current_val - tmnt.previous_val) / tmnt.previous_val) * 100, 2)
          else null
        end,
        'window', to_char(current_date - 30, 'YYYY-MM-DD') || '/' || to_char(current_date, 'YYYY-MM-DD'),
        'trend', case
          when tmnt.current_val > tmnt.previous_val then 'up'
          when tmnt.current_val < tmnt.previous_val then 'down'
          else 'stable'
        end
      )
    ),
    'time_series', jsonb_build_object(
      'occupancy_rate', coalesce(tso.data, '[]'::jsonb),
      'monthly_revenue', coalesce(tsr.data, '[]'::jsonb),
      'monthly_revenue_6mo', coalesce(ts6.data, '[]'::jsonb)
    ),
    'property_performance', pp.data,
    'activities', ra.data
  ) into v_result
  from property_agg pa
  cross join unit_agg ua
  cross join tenant_agg ta
  cross join lease_agg la
  cross join maintenance_agg ma
  cross join trend_occupancy tocc
  cross join trend_revenue trev
  cross join trend_tenants tten
  cross join trend_maintenance tmnt
  cross join ts_occupancy tso
  cross join ts_revenue tsr
  cross join ts_revenue_6mo ts6
  cross join property_perf pp
  cross join recent_activities ra;

  return v_result;
end;
$function$;

revoke all on function public.get_dashboard_stats(uuid) from public, anon, authenticated;
grant execute on function public.get_dashboard_stats(uuid) to authenticated, service_role;
revoke all on function public.get_dashboard_data_v2(uuid) from public, anon, authenticated;
grant execute on function public.get_dashboard_data_v2(uuid) to authenticated, service_role;
