-- DATA-02 (tail): the portfolio occupancy + revenue TREND RPCs joined units/leases to
-- properties by owner only, leaking soft-deleted (status='inactive') properties into the
-- trend charts (a property soft-delete sets properties.status='inactive' but does NOT
-- cascade its units to inactive). Add the property-status guard so trends match the
-- dashboard KPI, which already scopes via a status-filtered owner_properties CTE.
-- CREATE OR REPLACE (no return-type change; grants kept). Also keeps the DATA-03
-- 'expired' historical filter added in 20260709044800.
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
  unit_snapshot AS (
    SELECT
      COUNT(*) FILTER (WHERE u.status <> 'inactive')       AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')        AS occupied_units
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
      AND p.status <> 'inactive'
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
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
      AND p.status <> 'inactive'
      AND m.month_offset > 0
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

CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  WITH months AS (
    SELECT (current_date - (gs || ' months')::interval)::date AS month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date AS month_end
    FROM generate_series(0, p_months - 1) gs
  ),
  monthly_expected AS (
    SELECT m.month_start, coalesce(sum(l.rent_amount), 0)::bigint AS expected_revenue
    FROM months m LEFT JOIN leases l ON l.owner_user_id = p_user_id
      AND l.lease_status IN ('active', 'ended', 'expired') AND l.start_date <= m.month_end
      AND (l.end_date IS NULL OR l.end_date >= m.month_start)
      AND l.unit_id IN (
        SELECT u.id FROM units u JOIN properties p ON p.id = u.property_id
        WHERE p.owner_user_id = p_user_id AND p.status <> 'inactive'
      )
    GROUP BY m.month_start
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(m.month_start, 'YYYY-MM'),
    'revenue', coalesce(me.expected_revenue, 0),
    'collections', 0,
    'outstanding', coalesce(me.expected_revenue, 0)
  ) ORDER BY m.month_start DESC), '[]'::jsonb) INTO v_result
  FROM months m LEFT JOIN monthly_expected me ON me.month_start = m.month_start;
  RETURN v_result;
END;
$function$;
