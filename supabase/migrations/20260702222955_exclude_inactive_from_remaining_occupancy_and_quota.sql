-- Phase 25 completeness follow-up to 20260702215602_exclude_inactive_from_occupancy_stats.
--
-- With 'inactive' now a valid units.status / leases.lease_status value (soft-delete
-- sentinel added in 20260702214657 + 20260702214706), the corrective migration
-- 20260702215602 fixed four functions (get_dashboard_data_v2,
-- get_property_performance_analytics, get_property_performance_with_trends,
-- get_dashboard_stats). A code review found five more functions that count units in
-- a denominator / quota WITHOUT excluding soft-deleted rows. This migration adds ONLY
-- the inactive-exclusion predicate to each; every other line, alias, numerator, join,
-- GROUP BY, window, return shape, grant, SET search_path, and SECURITY DEFINER is
-- preserved verbatim. The "= 'occupied'"/"= 'available'" numerators are left unchanged.
--
-- Join-shape rule (same as 20260702215602): a plain "<> 'inactive'" is a clean no-op
-- on rows counted over a single table or an INNER JOIN (no phantom NULL-status rows);
-- "IS DISTINCT FROM 'inactive'" would only be needed where a LEFT JOIN can emit a
-- phantom NULL unit row. All five counts fixed here are over a single-table scan or an
-- INNER JOIN, so plain "<> 'inactive'" is correct throughout.
--
-- Exact predicates added:
--   get_occupancy_trends_optimized: unit_snapshot.total_units COUNT(*)
--     -> COUNT(*) FILTER (WHERE u.status <> 'inactive')            [units u JOIN properties p]
--   enforce_unit_plan_limit: quota COUNT over public.units
--     -> + "AND status <> 'inactive'"                             [single-table scan]
--   get_dashboard_time_series ('occupancy_rate'): denominator nullif(count(*)...)
--     -> nullif(count(*) FILTER (WHERE u.status <> 'inactive')...)[single-table scan]
--   get_metric_trend ('occupancy_rate'): denominator nullif(count(*)...)
--     -> nullif(count(*) FILTER (WHERE u.status <> 'inactive')...)[single-table scan]
--   get_property_performance_cached: unit_counts.total_units COUNT(*)
--     -> COUNT(*) FILTER (WHERE u.status <> 'inactive')            [units u JOIN owner_properties op]
--     and potential_revenues.potential_revenue SUM(u.rent_amount)
--     -> SUM(u.rent_amount) FILTER (WHERE u.status <> 'inactive')  [units u JOIN owner_properties op]

CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(p_owner_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_unit_plan_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit  integer;
  v_admin  boolean;
  v_count  integer;
BEGIN
  SELECT units_limit, is_admin
    INTO v_limit, v_admin
  FROM public.get_user_plan_limits(NEW.owner_user_id);

  IF v_admin OR v_limit < 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.units
  WHERE owner_user_id = NEW.owner_user_id
    AND status <> 'inactive';

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'plan_limit_exceeded: units (% / % used)', v_count, v_limit
      USING
        ERRCODE = 'P0001',
        HINT    = 'plan_limit_exceeded',
        DETAIL  = format(
          '{"resource":"units","used":%s,"limit":%s,"upgrade_source":"unit_limit_gate"}',
          v_count, v_limit
        );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_time_series(p_user_id uuid, p_metric_name text, p_days integer DEFAULT 30)
 RETURNS TABLE(date text, value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  FOR v_date IN
    SELECT generate_series(current_date - (p_days - 1), current_date, '1 day'::interval)::date
  LOOP
    date := to_char(v_date, 'YYYY-MM-DD');

    CASE p_metric_name
      WHEN 'occupancy_rate' THEN
        SELECT coalesce(
          round(
            count(*) FILTER (WHERE u.status = 'occupied')::numeric /
            nullif(count(*) FILTER (WHERE u.status <> 'inactive')::numeric, 0) * 100, 2
          ), 0
        ) INTO value
        FROM units u
        WHERE u.property_id IN (SELECT id FROM properties WHERE owner_user_id = p_user_id);

      WHEN 'monthly_revenue' THEN
        SELECT coalesce(sum(rent_amount), 0) INTO value
        FROM leases
        WHERE owner_user_id = p_user_id
          AND lease_status = 'active'
          AND start_date <= v_date
          AND (end_date IS NULL OR end_date >= v_date);

      WHEN 'open_maintenance' THEN
        SELECT count(*)::numeric INTO value
        FROM maintenance_requests
        WHERE owner_user_id = p_user_id
          AND date(created_at) <= v_date
          AND (status != 'completed' OR date(completed_at) > v_date);

      ELSE
        value := 0;
    END CASE;

    RETURN NEXT;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_metric_trend(p_user_id uuid, p_metric_name text, p_period text DEFAULT 'month'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value  numeric;
  v_previous_value numeric;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  CASE p_metric_name
    WHEN 'occupancy_rate' THEN
      SELECT coalesce(
        round(
          count(*) FILTER (WHERE u.status = 'occupied')::numeric /
          nullif(count(*) FILTER (WHERE u.status <> 'inactive')::numeric, 0) * 100, 2
        ), 0
      ) INTO v_current_value
      FROM units u
      WHERE u.property_id IN (SELECT id FROM properties WHERE owner_user_id = p_user_id);
      v_previous_value := v_current_value;

    WHEN 'monthly_revenue' THEN
      SELECT coalesce(sum(rent_amount), 0) INTO v_current_value
      FROM leases
      WHERE owner_user_id = p_user_id
        AND lease_status = 'active';
      v_previous_value := v_current_value;

    WHEN 'active_tenants' THEN
      SELECT count(*)::numeric INTO v_current_value
      FROM tenants t
      WHERE EXISTS (
        SELECT 1 FROM leases l
        WHERE l.primary_tenant_id = t.id
          AND l.owner_user_id = p_user_id
          AND l.lease_status = 'active'
      );
      v_previous_value := v_current_value;

    WHEN 'open_maintenance' THEN
      SELECT count(*)::numeric INTO v_current_value
      FROM maintenance_requests
      WHERE owner_user_id = p_user_id
        AND status NOT IN ('completed', 'cancelled');
      v_previous_value := v_current_value;

    ELSE
      v_current_value  := 0;
      v_previous_value := 0;
  END CASE;

  RETURN jsonb_build_object(
    'current_value',     v_current_value,
    'previous_value',    v_previous_value,
    'change',            v_current_value - v_previous_value,
    'change_percentage', CASE
      WHEN v_previous_value > 0
      THEN round(((v_current_value - v_previous_value) / v_previous_value) * 100, 2)
      ELSE 0
    END,
    'trend', CASE
      WHEN v_current_value > v_previous_value THEN 'up'
      WHEN v_current_value < v_previous_value THEN 'down'
      ELSE 'stable'
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status <> 'inactive') AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied') AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available') AS vacant_units
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  ),
  lease_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(l.rent_amount), 0) AS monthly_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.lease_status = 'active'
    GROUP BY u.property_id
  ),
  potential_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status <> 'inactive'), 0) AS potential_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_name', op.name,
        'property_id', op.id,
        'total_units', COALESCE(uc.total_units, 0),
        'occupied_units', COALESCE(uc.occupied_units, 0),
        'vacant_units', COALESCE(uc.vacant_units, 0),
        'occupancy_rate', CASE
          WHEN COALESCE(uc.total_units, 0) > 0
          THEN ROUND((uc.occupied_units::numeric / uc.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'annual_revenue', COALESCE(lr.monthly_revenue, 0) * 12,
        'monthly_revenue', COALESCE(lr.monthly_revenue, 0),
        'potential_revenue', COALESCE(pr.potential_revenue, 0)
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN unit_counts uc ON uc.property_id = op.id
  LEFT JOIN lease_revenues lr ON lr.property_id = op.id
  LEFT JOIN potential_revenues pr ON pr.property_id = op.id;

  RETURN v_result;
END;
$function$;
