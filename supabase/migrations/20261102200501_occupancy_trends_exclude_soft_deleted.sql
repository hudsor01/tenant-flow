-- =============================================================================
-- get_occupancy_trends_optimized: count one unit list on both sides of each
-- month's rate, so a soft-deleted unit's lease never counts
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, together with
-- 20261102184501_dashboard_trends_from_leases.sql, whose
-- dashboard_lease_position applies this rule to one day (the analytics
-- overview's occupancy change and the dashboard's occupancy chip compare two
-- of its days; the occupancy chart plots this series). With only one of the
-- two applied the tile and the chart count a soft-deleted unit's lease
-- differently. After the merge the main session applies this file with MCP
-- `apply_migration`, reads `list_migrations`, and renames the file to the
-- version production assigned, in a follow-up PR.
--
-- THE DEFECT. The series' denominator is the owner's units that are not
-- soft-deleted (status 'inactive'), on properties that are not soft-deleted,
-- but each past month's numerator joins a lease to its unit with no status
-- filter (latest repo copy: 20260709060533), so a lease on a unit the owner
-- later soft-deleted counts as an occupied unit that is not in the
-- denominator: the month reads too high, and over 100% when every counted
-- unit was let as well.
--
-- STARTED FROM THE LIVE PRODUCTION BODY (md5 of pg_get_functiondef
-- cd3d85466231ba7c4b1ec8fef6930e4e, equal to production's, read 2026-11-02,
-- on a replay of the chain; no other migration of this PR touches the
-- function), not a repo copy. Unchanged: the signature and default
-- (p_months 12), RETURNS jsonb, LANGUAGE plpgsql, SECURITY DEFINER, the
-- pinned search_path, the volatility (VOLATILE, the default), the auth.uid()
-- guard as written, the months (offset 0 is today's stored occupancy,
-- units.status; offset n a lease that overlaps the month starting n months
-- ago), the lease statuses that count ('active', 'ended', 'expired'), the
-- output keys and their order (month DESC), the rounding, and the ACL
-- (EXECUTE for authenticated and service_role only).
--
-- ONE RULE. counted_units, the owner's units that are not soft-deleted on
-- properties that are not soft-deleted, is the denominator and the only units
-- a lease may count on in the numerator. A soft-deleted lease is 'inactive',
-- which the status list already excludes. The current month's stored
-- occupancy reads the same list (a unit is 'occupied' or 'inactive', never
-- both). dashboard_lease_position (20261102184501) is the same rule on a day.
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds a portfolio with a soft-deleted unit's lease
-- (scripts/migration-replay-owner-figures.sql) and asserts every month of the
-- series, that it equals the helper on the months whose leases do not change,
-- the guard and the grants (assertOwnerFiguresComputed in
-- scripts/migration-replay-assertions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(p_owner_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_owner_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  -- ONE RULE (see the header): the units both sides of every rate count.
  counted_units AS (
    SELECT u.id, u.status
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
      AND p.status <> 'inactive'
      AND u.status <> 'inactive'
  ),
  unit_snapshot AS (
    SELECT
      COUNT(*)                                             AS total_units,
      COUNT(*) FILTER (WHERE cu.status = 'occupied')       AS occupied_units
    FROM counted_units cu
  ),
  months AS (
    SELECT
      gs AS month_offset,
      (CURRENT_DATE - (gs || ' months')::interval)::date AS month_date
    FROM generate_series(0, p_months - 1) gs
  ),
  historical_occupancy AS (
    SELECT
      m.month_date,
      COUNT(DISTINCT l.unit_id) AS occupied_units
    FROM months m
    JOIN leases l ON
      l.lease_status IN ('active', 'ended', 'expired')
      AND l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
      AND (l.end_date IS NULL OR l.end_date >= m.month_date)
    JOIN counted_units cu ON cu.id = l.unit_id
    WHERE m.month_offset > 0
    GROUP BY m.month_date
  ),
  monthly_occupancy AS (
    SELECT
      m.month_date,
      TO_CHAR(m.month_date, 'YYYY-MM') AS month,
      CASE
        WHEN m.month_offset = 0 THEN us.occupied_units
        ELSE COALESCE(ho.occupied_units, 0)
      END AS occupied_units,
      us.total_units
    FROM months m
    CROSS JOIN unit_snapshot us
    LEFT JOIN historical_occupancy ho ON ho.month_date = m.month_date
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', mo.month,
        'occupancy_rate', CASE
          WHEN mo.total_units > 0
          THEN ROUND((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'total_units',    mo.total_units,
        'occupied_units', mo.occupied_units
      ) ORDER BY mo.month_date DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM monthly_occupancy mo;

  RETURN v_result;
END;
$function$;

revoke all on function public.get_occupancy_trends_optimized(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to authenticated, service_role;
