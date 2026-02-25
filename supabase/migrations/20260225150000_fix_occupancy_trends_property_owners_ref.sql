-- Hotfix: get_occupancy_trends_optimized references property_owners table which
-- was dropped. The COALESCE lookup was a legacy indirection — p_user_id IS the
-- owner_user_id directly. Remove the dead reference.

DROP FUNCTION IF EXISTS public.get_occupancy_trends_optimized(uuid, integer);

CREATE FUNCTION public.get_occupancy_trends_optimized(
  p_owner_id uuid,
  p_months integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  unit_snapshot AS (
    SELECT
      COUNT(*)                                              AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')        AS occupied_units
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
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
      l.lease_status IN ('active', 'ended')
      AND l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
      AND (l.end_date IS NULL OR l.end_date >= m.month_date)
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
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
$$;

COMMENT ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) IS
  'Monthly occupancy trends. Fixed: removed dead property_owners reference. '
  'Uses single JOIN+GROUP BY instead of per-month correlated subqueries.';
