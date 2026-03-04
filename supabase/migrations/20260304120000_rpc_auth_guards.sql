-- migration: add auth.uid() guards to all SECURITY DEFINER RPCs + search_path sweep + health_check
-- purpose: close primary data exfiltration vector — any authenticated user can currently call
--   dashboard/analytics RPCs with another user's ID and read their data.
-- scope:
--   SEC-01: auth.uid() guards on 25 SECURITY DEFINER RPCs accepting user ID param
--   SEC-05: SET search_path TO 'public' on all SECURITY DEFINER functions (including sweep)
--   SEC-07: verified already done in 20251231081143 (security_events ENUMs → text + CHECK)
--   SEC-08: verified already done in 20260224191923 (get_current_owner_user_id() → auth.uid())
--   SEC-09: health_check changed from SECURITY DEFINER to SECURITY INVOKER
--   SEC-10: cleanup functions get SET search_path
-- affected functions: 25 RPCs + health_check + 3 cleanup functions + any missed via sweep

-- ============================================================================
-- SEC-07: security_events ENUMs already migrated to text + CHECK in 20251231081143 (verified)
-- SEC-08: get_current_owner_user_id() already returns auth.uid() directly in 20260224191923 (verified)
-- ============================================================================

-- ============================================================================
-- SEC-09: Change health_check from SECURITY DEFINER to SECURITY INVOKER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('ok', true, 'timestamp', NOW());
$$;

COMMENT ON FUNCTION public.health_check() IS 'Health check endpoint for backend monitoring - returns {ok: true} if database is accessible. SECURITY INVOKER (SEC-09).';

-- ============================================================================
-- SEC-10: Fix search_path on cleanup functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.security_events
  WHERE created_at < now() - interval '30 days'
    AND severity IN ('debug', 'info');

  DELETE FROM public.security_events
  WHERE created_at < now() - interval '90 days'
    AND severity = 'warning';

  DELETE FROM public.security_events
  WHERE created_at < now() - interval '1 year'
    AND severity IN ('error', 'critical');
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_security_events() IS 'Cleanup old security events based on retention policy (30 days for debug/info, 90 days for warning, 1 year for error/critical). SEC-10: search_path fixed.';

CREATE OR REPLACE FUNCTION public.cleanup_old_errors()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.user_errors
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND resolved_at IS NOT NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old resolved errors', deleted_count;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_errors() IS 'Deletes resolved errors older than 30 days. Run via cron job. SEC-10: search_path fixed.';

CREATE OR REPLACE FUNCTION public.cleanup_old_internal_events(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.processed_internal_events
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_internal_events(integer) IS 'Removes old processed events. Default retention: 30 days. SEC-10: search_path fixed.';


-- ============================================================================
-- SEC-01 / SEC-05: Add auth.uid() guards to all 25 user-ID-parameterized RPCs
-- Each function is CREATE OR REPLACE with:
--   1. SET search_path TO 'public'
--   2. IF guard as first statement checking param != (SELECT auth.uid())
-- ============================================================================

-- ============================================================================
-- 1. get_dashboard_stats(p_user_id uuid)
-- Latest: 20260225130000
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

CREATE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      COUNT(*)::int                                         AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int   AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available')::int  AS vacant_units,
      COUNT(*) FILTER (WHERE u.status = 'maintenance')::int AS maintenance_units,
      COALESCE(AVG(u.rent_amount), 0)                      AS avg_rent,
      COALESCE(SUM(u.rent_amount), 0)                      AS total_potential_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status = 'occupied'), 0) AS total_actual_rent
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
  ),

  property_unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS occ,
      COUNT(*)::int AS tot
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
      (SELECT COUNT(*)::int FROM leases WHERE owner_user_id = p_user_id)               AS total_leases,
      COUNT(*)::int                                                                      AS active_leases,
      (SELECT COUNT(*)::int FROM leases
       WHERE owner_user_id = p_user_id
         AND lease_status IN ('ended', 'terminated'))                                    AS expired_leases,
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
    )
  ),

  maintenance_agg AS (
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int                               AS open_count,
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
      'occupancyChange',    0,
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
      'growth',  0
    )
  ) INTO v_result
  FROM property_agg pa
  CROSS JOIN unit_agg ua
  CROSS JOIN tenant_agg ta
  CROSS JOIN lease_agg la
  CROSS JOIN maintenance_agg ma;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats(uuid) IS
  'Dashboard statistics. OPTIMIZED: single CTE pass. SEC-01: auth.uid() guard.';


-- ============================================================================
-- 2. get_dashboard_data_v2(p_user_id uuid)
-- Latest: 20260302061333
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(p_user_id uuid)
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
    SELECT id, name
    FROM properties
    WHERE owner_user_id = p_user_id
      AND status != 'inactive'
  ),

  all_units AS (
    SELECT u.id, u.property_id, u.status, u.rent_amount
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
  ),

  all_leases AS (
    SELECT l.id, l.unit_id, l.primary_tenant_id, l.rent_amount,
           l.start_date, l.end_date, l.lease_status
    FROM leases l
    JOIN all_units au ON au.id = l.unit_id
    WHERE l.owner_user_id = p_user_id
  ),

  active_leases AS (
    SELECT * FROM all_leases WHERE lease_status = 'active'
  ),

  all_maintenance AS (
    SELECT id, status, priority, created_at, completed_at
    FROM maintenance_requests
    WHERE owner_user_id = p_user_id
  ),

  unit_agg AS (
    SELECT
      count(*)::int                                          AS total_units,
      count(*) FILTER (WHERE status = 'occupied')::int       AS occupied_units,
      count(*) FILTER (WHERE status = 'available')::int      AS vacant_units,
      count(*) FILTER (WHERE status = 'maintenance')::int    AS maintenance_units,
      coalesce(avg(rent_amount), 0)                          AS avg_rent,
      coalesce(sum(rent_amount), 0)                          AS total_potential_rent,
      coalesce(sum(rent_amount) FILTER (WHERE status = 'occupied'), 0) AS total_actual_rent
    FROM all_units
  ),

  property_unit_counts AS (
    SELECT
      property_id,
      count(*) FILTER (WHERE status = 'occupied')::int AS occ,
      count(*)::int AS tot
    FROM all_units
    GROUP BY property_id
  ),

  property_agg AS (
    SELECT
      count(op.id)::int AS total_props,
      count(*) FILTER (WHERE coalesce(puc.occ, 0) > 0)::int AS occupied_props,
      count(*) FILTER (WHERE coalesce(puc.occ, 0) = 0)::int AS vacant_props,
      coalesce(
        round(
          (sum(coalesce(puc.occ, 0))::decimal /
           nullif(sum(coalesce(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      ) AS occupancy_rate
    FROM owner_properties op
    LEFT JOIN property_unit_counts puc ON puc.property_id = op.id
  ),

  lease_agg AS (
    SELECT
      (SELECT count(*)::int FROM all_leases)                            AS total_leases,
      count(*)::int                                                     AS active_leases_count,
      (SELECT count(*)::int FROM all_leases
       WHERE lease_status IN ('ended', 'terminated'))                   AS expired_leases,
      count(*) FILTER (WHERE end_date <= current_date + interval '30 days')::int AS expiring_soon,
      coalesce(sum(rent_amount), 0)                                     AS monthly_revenue
    FROM active_leases
  ),

  tenant_active_ids AS (
    SELECT DISTINCT primary_tenant_id AS tenant_id FROM active_leases
  ),

  tenant_agg AS (
    SELECT
      count(t.id)::int                                                      AS total_tenants,
      count(tai.tenant_id)::int                                             AS active_tenants,
      count(t.id)::int - count(tai.tenant_id)::int                         AS inactive_tenants,
      count(*) FILTER (WHERE t.created_at >= date_trunc('month', current_date))::int AS new_this_month
    FROM tenants t
    LEFT JOIN tenant_active_ids tai ON tai.tenant_id = t.id
    WHERE EXISTS (
      SELECT 1 FROM all_leases l2
      WHERE l2.primary_tenant_id = t.id
    )
  ),

  maintenance_agg AS (
    SELECT
      count(*)::int                                                                AS total,
      count(*) FILTER (WHERE status = 'open')::int                                AS open_count,
      count(*) FILTER (WHERE status = 'in_progress')::int                         AS in_progress,
      count(*) FILTER (WHERE status = 'completed')::int                           AS completed,
      count(*) FILTER (WHERE status = 'completed' AND date(completed_at) = current_date)::int AS completed_today,
      coalesce(
        avg(extract(epoch FROM (completed_at - created_at)) / 86400)
        FILTER (WHERE completed_at IS NOT NULL), 0
      )                                                                            AS avg_resolution_days,
      count(*) FILTER (WHERE priority = 'low')::int                               AS priority_low,
      count(*) FILTER (WHERE priority = 'normal')::int                            AS priority_normal,
      count(*) FILTER (WHERE priority = 'high')::int                              AS priority_high,
      count(*) FILTER (WHERE priority = 'urgent')::int                            AS priority_urgent
    FROM all_maintenance
  ),

  trend_occupancy AS (
    SELECT
      coalesce(
        round(
          (SELECT count(DISTINCT l.unit_id)::numeric
           FROM all_leases l
           WHERE l.lease_status = 'active'
             AND l.start_date <= current_date
             AND (l.end_date IS NULL OR l.end_date >= current_date)
          ) / nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) AS current_val,
      coalesce(
        round(
          (SELECT count(DISTINCT l.unit_id)::numeric
           FROM all_leases l
           WHERE l.lease_status = 'active'
             AND l.start_date <= current_date - interval '30 days'
             AND (l.end_date IS NULL OR l.end_date >= current_date - interval '30 days')
          ) / nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) AS previous_val
    FROM all_units
  ),

  trend_revenue AS (
    SELECT
      coalesce(sum(rent_amount), 0) AS current_val,
      coalesce((
        SELECT sum(l.rent_amount)
        FROM all_leases l
        WHERE l.lease_status = 'active'
          AND l.start_date <= current_date - interval '30 days'
          AND (l.end_date IS NULL OR l.end_date >= current_date - interval '30 days')
      ), 0) AS previous_val
    FROM active_leases
  ),

  trend_tenants AS (
    SELECT
      (SELECT count(DISTINCT al.primary_tenant_id)::numeric FROM active_leases al) AS current_val,
      coalesce((
        SELECT count(DISTINCT l.primary_tenant_id)::numeric
        FROM all_leases l
        WHERE l.lease_status = 'active'
          AND l.start_date <= current_date - interval '30 days'
          AND (l.end_date IS NULL OR l.end_date >= current_date - interval '30 days')
      ), 0) AS previous_val
  ),

  trend_maintenance AS (
    SELECT
      count(*) FILTER (WHERE status = 'open')::numeric AS current_val,
      coalesce((
        SELECT count(*)::numeric
        FROM all_maintenance
        WHERE created_at <= current_date - interval '30 days'
          AND status != 'cancelled'
          AND (status != 'completed' OR completed_at > current_date - interval '30 days')
      ), 0) AS previous_val
    FROM all_maintenance
  ),

  date_series AS (
    SELECT d::date AS series_date
    FROM generate_series(current_date - 29, current_date, '1 day'::interval) d
  ),

  total_unit_count AS (
    SELECT count(*)::numeric AS cnt FROM all_units
  ),

  ts_occupancy AS (
    SELECT jsonb_agg(
      jsonb_build_object('date', occ.date, 'value', occ.rate)
      ORDER BY occ.date
    ) AS data
    FROM (
      SELECT
        to_char(ds.series_date, 'YYYY-MM-DD') AS date,
        CASE WHEN tuc.cnt > 0
          THEN coalesce(
            round(count(DISTINCT l.unit_id)::numeric / tuc.cnt * 100, 2), 0
          )
          ELSE 0
        END AS rate
      FROM date_series ds
      CROSS JOIN total_unit_count tuc
      LEFT JOIN all_leases l
        ON l.lease_status = 'active'
        AND l.start_date <= ds.series_date
        AND (l.end_date IS NULL OR l.end_date >= ds.series_date)
      GROUP BY ds.series_date, tuc.cnt
    ) occ
  ),

  ts_revenue AS (
    SELECT jsonb_agg(
      jsonb_build_object('date', rev.date, 'value', rev.value)
      ORDER BY rev.date
    ) AS data
    FROM (
      SELECT
        to_char(ds.series_date, 'YYYY-MM-DD') AS date,
        coalesce(sum(l.rent_amount), 0)::numeric AS value
      FROM date_series ds
      LEFT JOIN all_leases l
        ON l.lease_status = 'active'
        AND l.start_date <= ds.series_date
        AND (l.end_date IS NULL OR l.end_date >= ds.series_date)
      GROUP BY ds.series_date
    ) rev
  ),

  perf_unit_counts AS (
    SELECT
      property_id,
      count(*) AS total_units,
      count(*) FILTER (WHERE status = 'occupied') AS occupied_units,
      count(*) FILTER (WHERE status = 'available') AS vacant_units
    FROM all_units
    GROUP BY property_id
  ),

  perf_lease_revenues AS (
    SELECT
      u.property_id,
      coalesce(sum(l.rent_amount), 0) AS monthly_revenue
    FROM all_units u
    LEFT JOIN active_leases l ON l.unit_id = u.id
    GROUP BY u.property_id
  ),

  perf_potential_revenues AS (
    SELECT
      property_id,
      coalesce(sum(rent_amount), 0) AS potential_revenue
    FROM all_units
    GROUP BY property_id
  ),

  property_perf AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'property_name', op.name,
          'property_id', op.id,
          'total_units', coalesce(puc.total_units, 0),
          'occupied_units', coalesce(puc.occupied_units, 0),
          'vacant_units', coalesce(puc.vacant_units, 0),
          'occupancy_rate', CASE
            WHEN coalesce(puc.total_units, 0) > 0
            THEN round((puc.occupied_units::numeric / puc.total_units::numeric) * 100, 2)
            ELSE 0
          END,
          'annual_revenue', coalesce(plr.monthly_revenue, 0) * 12,
          'monthly_revenue', coalesce(plr.monthly_revenue, 0),
          'potential_revenue', coalesce(ppr.potential_revenue, 0)
        ) ORDER BY op.name
      ),
      '[]'::jsonb
    ) AS data
    FROM owner_properties op
    LEFT JOIN perf_unit_counts puc ON puc.property_id = op.id
    LEFT JOIN perf_lease_revenues plr ON plr.property_id = op.id
    LEFT JOIN perf_potential_revenues ppr ON ppr.property_id = op.id
  ),

  recent_activities AS (
    SELECT coalesce(
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
        ) ORDER BY a.created_at DESC
      ),
      '[]'::jsonb
    ) AS data
    FROM (
      SELECT id, title, description, activity_type, entity_type, entity_id, user_id, created_at
      FROM activity
      WHERE user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 10
    ) a
  )

  SELECT jsonb_build_object(
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
        'occupancyRate',      CASE WHEN ua.total_units > 0
                                THEN round((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                                ELSE 0 END,
        'occupancyChange',    tocc.current_val - tocc.previous_val,
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
        'growth',  CASE
          WHEN trev.previous_val > 0
          THEN round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          ELSE 0
        END
      )
    ),

    'trends', jsonb_build_object(
      'occupancy_rate', jsonb_build_object(
        'current', tocc.current_val,
        'previous', tocc.previous_val,
        'change', tocc.current_val - tocc.previous_val,
        'percentChange', CASE
          WHEN tocc.previous_val > 0
          THEN round(((tocc.current_val - tocc.previous_val) / tocc.previous_val) * 100, 2)
          ELSE 0
        END,
        'trend', CASE
          WHEN tocc.current_val > tocc.previous_val THEN 'up'
          WHEN tocc.current_val < tocc.previous_val THEN 'down'
          ELSE 'stable'
        END
      ),
      'monthly_revenue', jsonb_build_object(
        'current', trev.current_val,
        'previous', trev.previous_val,
        'change', trev.current_val - trev.previous_val,
        'percentChange', CASE
          WHEN trev.previous_val > 0
          THEN round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          ELSE 0
        END,
        'trend', CASE
          WHEN trev.current_val > trev.previous_val THEN 'up'
          WHEN trev.current_val < trev.previous_val THEN 'down'
          ELSE 'stable'
        END
      ),
      'active_tenants', jsonb_build_object(
        'current', tten.current_val,
        'previous', tten.previous_val,
        'change', tten.current_val - tten.previous_val,
        'percentChange', CASE
          WHEN tten.previous_val > 0
          THEN round(((tten.current_val - tten.previous_val) / tten.previous_val) * 100, 2)
          ELSE 0
        END,
        'trend', CASE
          WHEN tten.current_val > tten.previous_val THEN 'up'
          WHEN tten.current_val < tten.previous_val THEN 'down'
          ELSE 'stable'
        END
      ),
      'open_maintenance', jsonb_build_object(
        'current', tmnt.current_val,
        'previous', tmnt.previous_val,
        'change', tmnt.current_val - tmnt.previous_val,
        'percentChange', CASE
          WHEN tmnt.previous_val > 0
          THEN round(((tmnt.current_val - tmnt.previous_val) / tmnt.previous_val) * 100, 2)
          ELSE 0
        END,
        'trend', CASE
          WHEN tmnt.current_val > tmnt.previous_val THEN 'up'
          WHEN tmnt.current_val < tmnt.previous_val THEN 'down'
          ELSE 'stable'
        END
      )
    ),

    'time_series', jsonb_build_object(
      'occupancy_rate', coalesce(tso.data, '[]'::jsonb),
      'monthly_revenue', coalesce(tsr.data, '[]'::jsonb)
    ),

    'property_performance', pp.data,

    'activities', ra.data

  ) INTO v_result
  FROM property_agg pa
  CROSS JOIN unit_agg ua
  CROSS JOIN tenant_agg ta
  CROSS JOIN lease_agg la
  CROSS JOIN maintenance_agg ma
  CROSS JOIN trend_occupancy tocc
  CROSS JOIN trend_revenue trev
  CROSS JOIN trend_tenants tten
  CROSS JOIN trend_maintenance tmnt
  CROSS JOIN ts_occupancy tso
  CROSS JOIN ts_revenue tsr
  CROSS JOIN property_perf pp
  CROSS JOIN recent_activities ra;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data_v2(uuid) TO service_role;

COMMENT ON FUNCTION public.get_dashboard_data_v2 IS
  'Unified dashboard data fetch. SEC-01: auth.uid() guard.';


-- ============================================================================
-- 3. get_dashboard_time_series(p_user_id uuid, p_metric_name text, p_days integer)
-- Latest: 20260224192500
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_time_series(
  p_user_id uuid,
  p_metric_name text,
  p_days integer DEFAULT 30
)
RETURNS TABLE (date text, value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
            nullif(count(*)::numeric, 0) * 100, 2
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
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) TO service_role;


-- ============================================================================
-- 4. get_metric_trend(p_user_id uuid, p_metric_name text, p_period text)
-- Latest: 20260224192500
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_metric_trend(
  p_user_id uuid,
  p_metric_name text,
  p_period text DEFAULT 'month'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
          nullif(count(*)::numeric, 0) * 100, 2
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
$$;

GRANT EXECUTE ON FUNCTION public.get_metric_trend(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_metric_trend(uuid, text, text) TO service_role;


-- ============================================================================
-- 5. get_billing_insights(owner_id_param uuid, ...)
-- Latest: 20260224193000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_billing_insights(
  owner_id_param uuid,
  start_date_param timestamp without time zone DEFAULT NULL,
  end_date_param timestamp without time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_mrr numeric;
  v_total_revenue numeric;
  v_active_leases integer;
  v_expired_leases integer;
  v_unpaid_total numeric;
  v_unpaid_count integer;
  v_late_fee_total numeric;
  v_tenant_count integer;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF owner_id_param != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount), 0) INTO v_mrr
  FROM leases
  WHERE owner_user_id = owner_id_param
    AND lease_status = 'active';

  v_total_revenue := v_mrr * 12;

  SELECT
    count(*) FILTER (WHERE lease_status = 'active'),
    count(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))
  INTO v_active_leases, v_expired_leases
  FROM leases
  WHERE owner_user_id = owner_id_param;

  SELECT
    coalesce(sum(rp.amount), 0),
    count(*)::integer
  INTO v_unpaid_total, v_unpaid_count
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = owner_id_param
    AND rp.status IN ('pending', 'processing', 'failed');

  SELECT coalesce(sum(rp.amount), 0) INTO v_late_fee_total
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = owner_id_param
    AND rp.status NOT IN ('succeeded', 'refunded')
    AND rp.due_date < current_date;

  SELECT count(DISTINCT l.primary_tenant_id) INTO v_tenant_count
  FROM leases l
  WHERE l.owner_user_id = owner_id_param
    AND l.lease_status = 'active';

  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'mrr', v_mrr,
    'churnRate', CASE
      WHEN (v_active_leases + v_expired_leases) > 0
      THEN round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      ELSE 0
    END,
    'unpaidTotal', v_unpaid_total,
    'unpaidCount', v_unpaid_count,
    'lateFeeTotal', v_late_fee_total,
    'tenantCount', v_tenant_count
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) TO service_role;


-- ============================================================================
-- 6. get_maintenance_analytics(user_id uuid)
-- Latest: 20260224193000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_maintenance_analytics(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
  v_total_requests integer;
  v_completed_requests integer;
  v_open_requests integer;
  v_avg_resolution_hours numeric;
  v_by_status jsonb;
  v_by_priority jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_user_id := user_id;

  SELECT count(*) INTO v_total_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id;

  SELECT count(*) INTO v_completed_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id
    AND status = 'completed';

  SELECT count(*) INTO v_open_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id
    AND status = 'open';

  SELECT coalesce(
    extract(epoch FROM avg(completed_at - created_at) FILTER (WHERE completed_at IS NOT NULL)) / 3600,
    0
  ) INTO v_avg_resolution_hours
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('status', s, 'count', c)),
    '[]'::jsonb
  ) INTO v_by_status
  FROM (
    SELECT status AS s, count(*) AS c
    FROM maintenance_requests
    WHERE owner_user_id = v_user_id
    GROUP BY status
  ) sub;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('priority', pr, 'count', c)),
    '[]'::jsonb
  ) INTO v_by_priority
  FROM (
    SELECT priority AS pr, count(*) AS c
    FROM maintenance_requests
    WHERE owner_user_id = v_user_id
    GROUP BY priority
  ) sub;

  v_result := jsonb_build_object(
    'total_requests', v_total_requests,
    'open_requests', v_open_requests,
    'avg_resolution_hours', v_avg_resolution_hours,
    'total_cost', 0,
    'average_cost', 0,
    'avgResolutionTime', v_avg_resolution_hours / 24,
    'completionRate', CASE
      WHEN v_total_requests > 0
      THEN round((v_completed_requests::decimal / v_total_requests::decimal) * 100, 2)
      ELSE 0
    END,
    'priorityBreakdown', (
      SELECT jsonb_build_object(
        'low',    coalesce(sum(CASE WHEN priority = 'low'    THEN 1 ELSE 0 END), 0),
        'normal', coalesce(sum(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END), 0),
        'high',   coalesce(sum(CASE WHEN priority = 'high'   THEN 1 ELSE 0 END), 0),
        'urgent', coalesce(sum(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END), 0)
      )
      FROM maintenance_requests WHERE owner_user_id = v_user_id
    ),
    'by_status', v_by_status,
    'by_priority', v_by_priority,
    'monthly_cost', '[]'::jsonb,
    'vendor_performance', '[]'::jsonb,
    'trendsOverTime', '[]'::jsonb
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_maintenance_analytics(uuid) TO service_role;


-- ============================================================================
-- 7. get_expense_summary(p_user_id uuid)
-- Latest: 20251225140000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_expense_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_property_owner_id uuid;
  v_categories jsonb;
  v_monthly jsonb;
  v_total_amount numeric;
  v_monthly_avg numeric;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  IF v_property_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'categories', '[]'::jsonb,
      'monthly_totals', '[]'::jsonb,
      'total_amount', 0,
      'monthly_average', 0,
      'year_over_year_change', null
    );
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'category', category,
      'amount', total,
      'percentage', round((total / nullif(sum(total) OVER(), 0) * 100)::numeric, 2)
    )
  ), '[]'::jsonb) INTO v_categories
  FROM (
    SELECT
      coalesce(mr.category, 'Other') AS category,
      sum(e.amount) AS total
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.property_owner_id = v_property_owner_id
      AND e.expense_date >= date_trunc('year', current_date)
    GROUP BY mr.category
  ) cat;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'amount', coalesce(monthly_total, 0)
    )
    ORDER BY month_date
  ), '[]'::jsonb) INTO v_monthly
  FROM (
    SELECT
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date AS month_date
  ) months
  LEFT JOIN (
    SELECT
      date_trunc('month', e.expense_date)::date AS expense_month,
      sum(e.amount) AS monthly_total
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.property_owner_id = v_property_owner_id
      AND e.expense_date >= date_trunc('month', current_date) - interval '11 months'
    GROUP BY date_trunc('month', e.expense_date)
  ) exp ON months.month_date = exp.expense_month;

  SELECT
    coalesce(sum(e.amount), 0),
    coalesce(avg(monthly_total), 0)
  INTO v_total_amount, v_monthly_avg
  FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  CROSS JOIN LATERAL (
    SELECT sum(e2.amount) AS monthly_total
    FROM expenses e2
    JOIN maintenance_requests mr2 ON mr2.id = e2.maintenance_request_id
    WHERE mr2.property_owner_id = v_property_owner_id
      AND date_trunc('month', e2.expense_date) = date_trunc('month', e.expense_date)
  ) monthly
  WHERE mr.property_owner_id = v_property_owner_id
    AND e.expense_date >= date_trunc('year', current_date);

  v_result := jsonb_build_object(
    'categories', v_categories,
    'monthly_totals', v_monthly,
    'total_amount', v_total_amount,
    'monthly_average', round(v_monthly_avg::numeric, 2),
    'year_over_year_change', null
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_expense_summary(uuid) TO authenticated;


-- ============================================================================
-- 8. get_financial_overview(p_user_id uuid)
-- Latest: 20260224220902
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_financial_overview(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_revenue    numeric;
  v_total_expenses   numeric;
  v_net_income       numeric;
  v_accounts_receivable numeric;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount) * 12, 0) INTO v_total_revenue
  FROM leases
  WHERE owner_user_id = p_user_id
    AND lease_status = 'active';

  SELECT coalesce(sum(e.amount), 0) INTO v_total_expenses
  FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  JOIN units u ON u.id = mr.unit_id
  JOIN properties p ON p.id = u.property_id
  WHERE p.owner_user_id = p_user_id
    AND e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  SELECT coalesce(sum(rp.amount), 0) INTO v_accounts_receivable
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = p_user_id
    AND rp.status IN ('pending', 'processing');

  RETURN jsonb_build_object(
    'overview', jsonb_build_object(
      'total_revenue',        v_total_revenue,
      'total_expenses',       v_total_expenses,
      'net_income',           v_net_income,
      'accounts_receivable',  v_accounts_receivable,
      'accounts_payable',     0
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object(
        'label', 'Monthly Revenue',
        'value', v_total_revenue / 12,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Operating Margin',
        'value', CASE
          WHEN v_total_revenue > 0
          THEN round((v_net_income / v_total_revenue * 100)::numeric, 1)
          ELSE 0
        END,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Cash Position',
        'value', v_net_income,
        'trend', null
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_overview(uuid) TO service_role;


-- ============================================================================
-- 9. get_invoice_statistics(p_user_id uuid)
-- Latest: 20251225140000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_invoice_statistics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_property_owner_id uuid;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  IF v_property_owner_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'status', status,
      'count', status_count,
      'amount', total_amount
    )
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      rp.status,
      count(*) AS status_count,
      sum(rp.amount) AS total_amount
    FROM rent_payments rp
    JOIN leases l ON rp.lease_id = l.id
    WHERE l.property_owner_id = v_property_owner_id
      AND rp.due_date >= date_trunc('year', current_date)
    GROUP BY rp.status
  ) stats;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_statistics(uuid) TO authenticated;


-- ============================================================================
-- 10. get_property_performance_cached(p_user_id uuid)
-- Latest: 20251225130000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      COUNT(*) AS total_units,
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
      COALESCE(SUM(u.rent_amount), 0) AS potential_revenue
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
$$;


-- ============================================================================
-- 11. get_property_performance_trends(p_user_id uuid)
-- Latest: 20251225130000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_current_month_start date;
  v_previous_month_start date;
  v_previous_month_end date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
  v_previous_month_start := (v_current_month_start - interval '1 month')::date;
  v_previous_month_end := (v_current_month_start - interval '1 day')::date;

  WITH
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  current_payments AS (
    SELECT
      p.id AS property_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM owner_properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_current_month_start
    GROUP BY p.id
  ),
  previous_payments AS (
    SELECT
      p.id AS property_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM owner_properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_previous_month_start
      AND rp.paid_date <= v_previous_month_end
    GROUP BY p.id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_id', op.id,
        'current_month_revenue', COALESCE(cp.revenue, 0),
        'previous_month_revenue', COALESCE(pp.revenue, 0),
        'trend', CASE
          WHEN COALESCE(cp.revenue, 0) > COALESCE(pp.revenue, 0) THEN 'up'
          WHEN COALESCE(cp.revenue, 0) < COALESCE(pp.revenue, 0) THEN 'down'
          ELSE 'stable'
        END,
        'trend_percentage', CASE
          WHEN COALESCE(pp.revenue, 0) > 0
          THEN ROUND(((COALESCE(cp.revenue, 0) - pp.revenue)::numeric / pp.revenue::numeric) * 100, 2)
          WHEN COALESCE(cp.revenue, 0) > 0 THEN 100.00
          ELSE 0.00
        END
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN current_payments cp ON cp.property_id = op.id
  LEFT JOIN previous_payments pp ON pp.property_id = op.id;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- 12. get_property_performance_with_trends(p_user_id uuid, p_timeframe text, p_limit integer)
-- Latest: 20251225130000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_with_trends(
  p_user_id uuid,
  p_timeframe text DEFAULT '30d',
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  occupancy_rate numeric,
  total_revenue bigint,
  previous_revenue bigint,
  trend_percentage numeric,
  timeframe text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days integer;
  v_start_date date;
  v_prev_start_date date;
  v_prev_end_date date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;
  v_prev_end_date := v_start_date - interval '1 day';
  v_prev_start_date := v_prev_end_date - v_days;

  RETURN QUERY
  WITH
  owner_properties AS (
    SELECT p.id AS prop_id, p.name AS prop_name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  property_occupancy AS (
    SELECT
      op.prop_id,
      op.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE u.status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM owner_properties op
    LEFT JOIN units u ON u.property_id = op.prop_id
    GROUP BY op.prop_id, op.prop_name
  ),
  current_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    GROUP BY p.id
  ),
  previous_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_prev_start_date
      AND rp.paid_date < v_start_date
    WHERE p.owner_user_id = p_user_id
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(cr.revenue, 0) AS total_revenue,
    COALESCE(pr.revenue, 0) AS previous_revenue,
    CASE
      WHEN COALESCE(pr.revenue, 0) > 0
      THEN ROUND(((COALESCE(cr.revenue, 0) - pr.revenue)::numeric / pr.revenue::numeric) * 100, 2)
      WHEN COALESCE(cr.revenue, 0) > 0 THEN 100.00
      ELSE 0.00
    END AS trend_percentage,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN current_revenue cr ON cr.prop_id = po.prop_id
  LEFT JOIN previous_revenue pr ON pr.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_with_trends(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_performance_with_trends(uuid, text, integer) TO service_role;


-- ============================================================================
-- 13. get_property_performance_analytics(p_user_id uuid, ...)
-- Latest: 20251223180000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_timeframe text DEFAULT '30d',
  p_limit integer DEFAULT NULL
)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  occupancy_rate numeric,
  total_revenue bigint,
  total_expenses bigint,
  net_income bigint,
  timeframe text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days integer;
  v_start_date date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;

  RETURN QUERY
  WITH property_units AS (
    SELECT
      p.id AS prop_id,
      p.name AS prop_name,
      u.id AS unit_id,
      u.status AS unit_status
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
  ),
  property_occupancy AS (
    SELECT
      pu.prop_id,
      pu.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM property_units pu
    GROUP BY pu.prop_id, pu.prop_name
  ),
  property_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.owner_user_id = p_user_id
    LEFT JOIN rent_payments rp ON rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  ),
  property_expenses AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(e.amount), 0)::bigint AS expenses
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id
      AND e.expense_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(pr.revenue, 0) AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses,
    (COALESCE(pr.revenue, 0) - COALESCE(pe.expenses, 0))::bigint AS net_income,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN property_revenue pr ON pr.prop_id = po.prop_id
  LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT COALESCE(p_limit, 100);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) TO service_role;


-- ============================================================================
-- 14. search_properties(p_user_id uuid, p_search_term text, p_limit integer)
-- Latest: 20251223200000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_properties(
  p_user_id uuid,
  p_search_term text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  address_line1 text,
  city text,
  state text,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address_line1,
    p.city,
    p.state,
    ts_rank(p.search_vector, plainto_tsquery('english', p_search_term)) AS rank
  FROM properties p
  WHERE p.owner_user_id = p_user_id
    AND p.search_vector @@ plainto_tsquery('english', p_search_term)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_properties(uuid, text, integer) TO authenticated;


-- ============================================================================
-- 15. get_occupancy_trends_optimized(p_owner_id uuid, p_months integer)
-- Latest: 20260225150000 (uses p_owner_id, not p_user_id)
-- ============================================================================

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
  -- SECURITY: Verify caller owns the requested data
  IF p_owner_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) TO service_role;


-- ============================================================================
-- 16. get_revenue_trends_optimized(p_user_id uuid, p_months integer)
-- Latest: 20260224220902
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(
  p_user_id uuid,
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
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  months AS (
    SELECT
      (current_date - (gs || ' months')::interval)::date AS month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date AS month_end
    FROM generate_series(0, p_months - 1) gs
  ),
  monthly_expected AS (
    SELECT
      m.month_start,
      coalesce(sum(l.rent_amount), 0)::bigint AS expected_revenue
    FROM months m
    LEFT JOIN leases l ON
      l.owner_user_id = p_user_id
      AND l.lease_status IN ('active', 'ended')
      AND l.start_date <= m.month_end
      AND (l.end_date IS NULL OR l.end_date >= m.month_start)
    GROUP BY m.month_start
  ),
  monthly_collections AS (
    SELECT
      m.month_start,
      coalesce(sum(rp.amount), 0)::bigint AS collected
    FROM months m
    LEFT JOIN rent_payments rp ON
      rp.status = 'succeeded'
      AND rp.paid_date >= m.month_start
      AND rp.paid_date < (m.month_start + interval '1 month')
    LEFT JOIN leases l ON l.id = rp.lease_id AND l.owner_user_id = p_user_id
    WHERE l.id IS NOT NULL
    GROUP BY m.month_start
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month',       to_char(m.month_start, 'YYYY-MM'),
        'revenue',     coalesce(me.expected_revenue, 0),
        'collections', coalesce(mc.collected, 0),
        'outstanding', greatest(0, coalesce(me.expected_revenue, 0) - coalesce(mc.collected, 0))
      )
      ORDER BY m.month_start DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM months m
  LEFT JOIN monthly_expected me ON me.month_start = m.month_start
  LEFT JOIN monthly_collections mc ON mc.month_start = m.month_start;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_trends_optimized(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_trends_optimized(uuid, integer) TO service_role;


-- ============================================================================
-- 17. get_user_profile(p_user_id uuid)
-- Latest: 20251226163520
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_user_type text;
  v_tenant_data jsonb;
  v_owner_data jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'full_name', u.full_name,
    'phone', u.phone,
    'avatar_url', u.avatar_url,
    'user_type', u.user_type,
    'status', u.status,
    'created_at', u.created_at,
    'updated_at', u.updated_at
  ), u.user_type
  INTO v_result, v_user_type
  FROM public.users u
  WHERE u.id = p_user_id;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_user_type = 'tenant' THEN
    SELECT jsonb_build_object(
      'date_of_birth', t.date_of_birth,
      'emergency_contact_name', t.emergency_contact_name,
      'emergency_contact_phone', t.emergency_contact_phone,
      'emergency_contact_relationship', t.emergency_contact_relationship,
      'identity_verified', t.identity_verified,
      'current_lease', (
        SELECT jsonb_build_object(
          'property_name', p.name,
          'unit_number', un.unit_number,
          'move_in_date', l.start_date
        )
        FROM public.lease_tenants lt
        JOIN public.leases l ON l.id = lt.lease_id
        JOIN public.units un ON un.id = l.unit_id
        JOIN public.properties p ON p.id = un.property_id
        WHERE lt.tenant_id = t.id
        AND l.lease_status = 'active'
        LIMIT 1
      )
    )
    INTO v_tenant_data
    FROM public.tenants t
    WHERE t.user_id = p_user_id;

    v_result = v_result || jsonb_build_object('tenant_profile', COALESCE(v_tenant_data, '{}'::jsonb));

  ELSIF v_user_type IN ('owner', 'OWNER') THEN
    SELECT jsonb_build_object(
      'stripe_connected', EXISTS (
        SELECT 1 FROM public.stripe_connected_accounts sca
        WHERE sca.user_id = p_user_id
        AND sca.onboarding_complete = true
      ),
      'properties_count', (
        SELECT COUNT(*) FROM public.properties pr
        WHERE pr.owner_user_id = p_user_id
      ),
      'units_count', (
        SELECT COUNT(*) FROM public.units un
        JOIN public.properties pr ON pr.id = un.property_id
        WHERE pr.owner_user_id = p_user_id
      )
    )
    INTO v_owner_data;

    v_result = v_result || jsonb_build_object('owner_profile', COALESCE(v_owner_data, '{}'::jsonb));
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO service_role;


-- ============================================================================
-- 18. get_user_dashboard_activities(p_user_id text, p_limit integer, p_offset integer)
-- Latest: 20251101000000 (text parameter, not uuid)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_dashboard_activities(
  p_user_id text,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id text,
  title text,
  description text,
  activity_type text,
  entity_type text,
  entity_id text,
  user_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller owns the requested data (text param, cast for comparison)
  IF p_user_id != (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    a.id::text,
    a.title,
    a.description,
    a.activity_type,
    a.entity_type,
    a.entity_id::text,
    a.user_id::text,
    a.created_at
  FROM activity a
  WHERE a.user_id = p_user_id::uuid
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_dashboard_activities(text, integer, integer) TO authenticated;


-- ============================================================================
-- 19. get_user_sessions(p_user_id uuid)
-- Latest: 20251226033914 — ALREADY HAS GUARD, rewriting for search_path consistency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip inet
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = p_user_id
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_sessions(uuid) TO authenticated;


-- ============================================================================
-- 20. get_user_plan_limits(p_user_id text)
-- Latest: 20260218120000 (text parameter)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id text)
RETURNS TABLE(
  property_limit  integer,
  tenant_limit    integer,
  unit_limit      integer,
  storage_gb      integer,
  has_api_access  boolean,
  has_white_label boolean,
  support_level   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
BEGIN
  -- SECURITY: Verify caller owns the requested data (text param, cast for comparison)
  IF p_user_id != (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'stripe')
     AND to_regclass('stripe.customers') IS NOT NULL
     AND to_regclass('stripe.subscriptions') IS NOT NULL
  THEN
    SELECT id
    INTO v_stripe_customer_id
    FROM stripe.customers
    WHERE (metadata->>'user_id')::uuid = p_user_id::uuid
    LIMIT 1;

    IF v_stripe_customer_id IS NOT NULL THEN
      SELECT si.price
      INTO v_price_id
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      WHERE s.customer = v_stripe_customer_id
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1;
    END IF;
  END IF;

  v_plan_tier := CASE v_price_id
    WHEN 'price_1RtWFcP3WCR53Sdo5Li5xHiC' THEN 'FREETRIAL'
    WHEN 'price_1RtWFcP3WCR53SdoCxiVldhb' THEN 'STARTER'
    WHEN 'price_1RtWFdP3WCR53SdoArRRXYrL' THEN 'STARTER'
    WHEN 'price_1SPGCNP3WCR53SdorjDpiSy5' THEN 'GROWTH'
    WHEN 'price_1SPGCRP3WCR53SdonqLUTJgK' THEN 'GROWTH'
    WHEN 'price_1SPGCjP3WCR53SdoIpidDn0T' THEN 'TENANTFLOW_MAX'
    WHEN 'price_1SPGCoP3WCR53SdoID50geIC' THEN 'TENANTFLOW_MAX'
    ELSE 'STARTER'
  END;

  RETURN QUERY
  SELECT
    CASE v_plan_tier
      WHEN 'FREETRIAL'     THEN 1
      WHEN 'STARTER'       THEN 5
      WHEN 'GROWTH'        THEN 20
      WHEN 'TENANTFLOW_MAX' THEN 9999
      ELSE 5
    END::integer,
    CASE v_plan_tier
      WHEN 'FREETRIAL'     THEN 10
      WHEN 'STARTER'       THEN 25
      WHEN 'GROWTH'        THEN 100
      WHEN 'TENANTFLOW_MAX' THEN 9999
      ELSE 25
    END::integer,
    CASE v_plan_tier
      WHEN 'FREETRIAL'     THEN 5
      WHEN 'STARTER'       THEN 25
      WHEN 'GROWTH'        THEN 100
      WHEN 'TENANTFLOW_MAX' THEN 9999
      ELSE 25
    END::integer,
    CASE v_plan_tier
      WHEN 'FREETRIAL'     THEN 1
      WHEN 'STARTER'       THEN 10
      WHEN 'GROWTH'        THEN 50
      WHEN 'TENANTFLOW_MAX' THEN 100
      ELSE 10
    END::integer,
    (v_plan_tier IN ('GROWTH', 'TENANTFLOW_MAX'))::boolean,
    (v_plan_tier = 'TENANTFLOW_MAX')::boolean,
    CASE v_plan_tier
      WHEN 'FREETRIAL'     THEN 'community'
      WHEN 'STARTER'       THEN 'email'
      WHEN 'GROWTH'        THEN 'priority'
      WHEN 'TENANTFLOW_MAX' THEN 'dedicated'
      ELSE 'email'
    END::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_plan_limits(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_limits(text) TO service_role;


-- ============================================================================
-- 21. check_user_feature_access(p_user_id text, p_feature text)
-- Latest: 20260219100000 (text parameter)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_feature_access(
  p_user_id text,
  p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
BEGIN
  -- SECURITY: Verify caller owns the requested data (text param, cast for comparison)
  IF p_user_id != (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'stripe')
     AND to_regclass('stripe.customers') IS NOT NULL
     AND to_regclass('stripe.subscriptions') IS NOT NULL
  THEN
    SELECT id INTO v_stripe_customer_id
    FROM stripe.customers
    WHERE (metadata->>'user_id')::uuid = p_user_id::uuid
    LIMIT 1;

    IF v_stripe_customer_id IS NOT NULL THEN
      SELECT si.price INTO v_price_id
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      WHERE s.customer = v_stripe_customer_id
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1;
    END IF;
  END IF;

  v_plan_tier := CASE v_price_id
    WHEN 'price_1RtWFcP3WCR53Sdo5Li5xHiC' THEN 'FREETRIAL'
    WHEN 'price_1RtWFcP3WCR53SdoCxiVldhb' THEN 'STARTER'
    WHEN 'price_1RtWFdP3WCR53SdoArRRXYrL' THEN 'STARTER'
    WHEN 'price_1SPGCNP3WCR53SdorjDpiSy5' THEN 'GROWTH'
    WHEN 'price_1SPGCRP3WCR53SdonqLUTJgK' THEN 'GROWTH'
    WHEN 'price_1SPGCjP3WCR53SdoIpidDn0T' THEN 'TENANTFLOW_MAX'
    WHEN 'price_1SPGCoP3WCR53SdoID50geIC' THEN 'TENANTFLOW_MAX'
    ELSE 'STARTER'
  END;

  RETURN CASE p_feature
    WHEN 'basic_properties'  THEN true
    WHEN 'maintenance'       THEN true
    WHEN 'financial_reports' THEN true
    WHEN 'api_access'        THEN v_plan_tier IN ('GROWTH', 'TENANTFLOW_MAX')
    WHEN 'white_label'       THEN v_plan_tier = 'TENANTFLOW_MAX'
    ELSE true
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_feature_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_feature_access(text, text) TO service_role;


-- ============================================================================
-- 22. get_stripe_customer_by_user_id(p_user_id uuid)
-- Latest: 20251225150000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_stripe_customer_by_user_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'stripe'
AS $$
DECLARE
  v_customer_id text;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'stripe') THEN
    RETURN NULL;
  END IF;

  IF to_regclass('stripe.customers') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_customer_id
  FROM stripe.customers
  WHERE (metadata->>'user_id')::uuid = p_user_id
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    SELECT c.id INTO v_customer_id
    FROM stripe.customers c
    INNER JOIN auth.users u ON u.id = p_user_id
    WHERE c.email = u.email
    LIMIT 1;
  END IF;

  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stripe_customer_by_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stripe_customer_by_user_id(uuid) TO service_role;


-- ============================================================================
-- 23. revoke_user_session(p_user_id uuid, p_session_id uuid)
-- Latest: 20251226033914 — ALREADY HAS GUARD, rewriting for search_path consistency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_user_session(p_user_id uuid, p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $$
DECLARE
  v_session_user_id uuid;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT s.user_id INTO v_session_user_id
  FROM auth.sessions s
  WHERE s.id = p_session_id;

  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session_user_id != p_user_id THEN
    RAISE EXCEPTION 'Access denied: session belongs to another user';
  END IF;

  DELETE FROM auth.sessions
  WHERE id = p_session_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_session(uuid, uuid) TO authenticated;


-- ============================================================================
-- 24. calculate_maintenance_metrics(p_user_id uuid, ...)
-- Latest: 20251223180000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_maintenance_metrics(
  p_user_id uuid DEFAULT NULL,
  user_id uuid DEFAULT NULL,
  user_id_param uuid DEFAULT NULL,
  uid uuid DEFAULT NULL
)
RETURNS TABLE (
  total_cost bigint,
  avg_cost numeric,
  total_requests bigint,
  emergency_count bigint,
  high_priority_count bigint,
  normal_priority_count bigint,
  low_priority_count bigint,
  completed_count bigint,
  open_count bigint,
  in_progress_count bigint,
  avg_resolution_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, user_id, user_id_param, uid);

  -- SECURITY: Verify caller owns the requested data
  IF v_user_id IS NOT NULL AND v_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(COALESCE(mr.actual_cost, mr.estimated_cost, 0)), 0)::bigint AS total_cost,
    COALESCE(AVG(COALESCE(mr.actual_cost, mr.estimated_cost, 0)), 0)::numeric AS avg_cost,
    COUNT(*)::bigint AS total_requests,
    COUNT(*) FILTER (WHERE mr.priority = 'urgent')::bigint AS emergency_count,
    COUNT(*) FILTER (WHERE mr.priority = 'high')::bigint AS high_priority_count,
    COUNT(*) FILTER (WHERE mr.priority = 'normal')::bigint AS normal_priority_count,
    COUNT(*) FILTER (WHERE mr.priority = 'low')::bigint AS low_priority_count,
    COUNT(*) FILTER (WHERE mr.status = 'completed')::bigint AS completed_count,
    COUNT(*) FILTER (WHERE mr.status = 'open')::bigint AS open_count,
    COUNT(*) FILTER (WHERE mr.status = 'in_progress')::bigint AS in_progress_count,
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (mr.completed_at - mr.created_at)) / 3600
      ) FILTER (WHERE mr.completed_at IS NOT NULL),
      0
    )::numeric AS avg_resolution_hours
  FROM maintenance_requests mr
  WHERE mr.owner_user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) TO service_role;


-- ============================================================================
-- 25. calculate_monthly_metrics(p_user_id uuid)
-- Latest: 20251225140000
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_monthly_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_property_owner_id uuid;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  IF v_property_owner_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'revenue', coalesce(revenue, 0),
      'expenses', coalesce(expenses, 0),
      'net_income', coalesce(revenue, 0) - coalesce(expenses, 0),
      'cash_flow', coalesce(revenue, 0) - coalesce(expenses, 0)
    )
    ORDER BY month_date
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date AS month_date
  ) months
  LEFT JOIN LATERAL (
    SELECT sum(rp.amount) AS revenue
    FROM rent_payments rp
    JOIN leases l ON rp.lease_id = l.id
    WHERE l.property_owner_id = v_property_owner_id
      AND rp.status = 'succeeded'
      AND date_trunc('month', rp.paid_date) = months.month_date
  ) rev ON true
  LEFT JOIN LATERAL (
    SELECT sum(e.amount) AS expenses
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.property_owner_id = v_property_owner_id
      AND date_trunc('month', e.expense_date) = months.month_date
  ) exp ON true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_monthly_metrics(uuid) TO authenticated;


-- ============================================================================
-- SEC-05 sweep: ensure ALL SECURITY DEFINER functions have search_path set
-- ============================================================================

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS c WHERE c LIKE 'search_path=%'
    ))
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path TO ''public''',
      fn.schema_name, fn.func_name, fn.args);
    RAISE NOTICE 'Fixed search_path on: %.%(%)', fn.schema_name, fn.func_name, fn.args;
  END LOOP;
END;
$$;
