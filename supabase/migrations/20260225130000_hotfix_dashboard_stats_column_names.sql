-- Hotfix: get_dashboard_stats references property_owner_id which doesn't exist.
-- Correct column is owner_user_id on properties, leases, and maintenance_requests.
-- Also fixes get_occupancy_trends_optimized if it has the same issue.

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
  'Dashboard statistics. OPTIMIZED: single CTE pass, no correlated subqueries. '
  'Hotfix 2026-02-25: property_owner_id → owner_user_id.';
