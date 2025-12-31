-- Migration: Fix Dashboard Stats Row Assignment
-- Purpose: Fix the ROW() constructor assignment issue in get_dashboard_stats
-- The original function fails with "invalid input syntax for type integer"
-- when assigning ROW(...) to composite type variables.
--
-- Fix: Use direct field assignment instead of ROW() constructor for composite types.

-- ============================================================================
-- STEP 1: Drop and recreate the function with fixed assignment syntax
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  properties public.property_stats_type,
  tenants public.tenant_stats_type,
  units public.unit_stats_type,
  leases public.lease_stats_type,
  maintenance public.maintenance_stats_type,
  revenue public.revenue_stats_type
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_properties public.property_stats_type;
  v_tenants public.tenant_stats_type;
  v_units public.unit_stats_type;
  v_leases public.lease_stats_type;
  v_maintenance public.maintenance_stats_type;
  v_revenue public.revenue_stats_type;
  v_maintenance_priority public.maintenance_priority_type;

  -- Property stats temp vars
  v_prop_total integer;
  v_prop_occupied integer;
  v_prop_vacant integer;
  v_prop_occupancy_rate numeric;
  v_prop_total_monthly_rent bigint;
  v_prop_average_rent numeric;

  -- Tenant stats temp vars
  v_tenant_total integer;
  v_tenant_active integer;
  v_tenant_inactive integer;
  v_tenant_new_this_month integer;

  -- Unit stats temp vars
  v_unit_total integer;
  v_unit_occupied integer;
  v_unit_vacant integer;
  v_unit_maintenance integer;
  v_unit_average_rent numeric;
  v_unit_available integer;
  v_unit_occupancy_rate numeric;
  v_unit_occupancy_change numeric;
  v_unit_total_potential_rent bigint;
  v_unit_total_actual_rent bigint;

  -- Lease stats temp vars
  v_lease_total integer;
  v_lease_active integer;
  v_lease_expired integer;
  v_lease_expiring_soon integer;

  -- Maintenance stats temp vars
  v_maint_total integer;
  v_maint_open integer;
  v_maint_in_progress integer;
  v_maint_completed integer;
  v_maint_completed_today integer;
  v_maint_avg_resolution_time numeric;
  v_maint_priority_low integer;
  v_maint_priority_normal integer;
  v_maint_priority_high integer;
  v_maint_priority_urgent integer;

  -- Revenue stats temp vars
  v_rev_monthly bigint;
  v_rev_yearly bigint;
  v_rev_growth numeric;
BEGIN
  -- Check if user has any properties (is a property owner)
  IF NOT EXISTS (SELECT 1 FROM properties WHERE owner_user_id = p_user_id) THEN
    -- Return empty stats for non-owners using direct field assignment
    v_properties.total := 0;
    v_properties.occupied := 0;
    v_properties.vacant := 0;
    v_properties.occupancy_rate := 0;
    v_properties.total_monthly_rent := 0;
    v_properties.average_rent := 0;

    v_tenants.total := 0;
    v_tenants.active := 0;
    v_tenants.inactive := 0;
    v_tenants.new_this_month := 0;

    v_units.total := 0;
    v_units.occupied := 0;
    v_units.vacant := 0;
    v_units.maintenance := 0;
    v_units.average_rent := 0;
    v_units.available := 0;
    v_units.occupancy_rate := 0;
    v_units.occupancy_change := 0;
    v_units.total_potential_rent := 0;
    v_units.total_actual_rent := 0;

    v_leases.total := 0;
    v_leases.active := 0;
    v_leases.expired := 0;
    v_leases.expiring_soon := 0;

    v_maintenance_priority.low := 0;
    v_maintenance_priority.normal := 0;
    v_maintenance_priority.high := 0;
    v_maintenance_priority.urgent := 0;

    v_maintenance.total := 0;
    v_maintenance.open := 0;
    v_maintenance.in_progress := 0;
    v_maintenance.completed := 0;
    v_maintenance.completed_today := 0;
    v_maintenance.avg_resolution_time := 0;
    v_maintenance.by_priority := v_maintenance_priority;

    v_revenue.monthly := 0;
    v_revenue.yearly := 0;
    v_revenue.growth := 0;

    RETURN QUERY SELECT v_properties, v_tenants, v_units, v_leases, v_maintenance, v_revenue;
    RETURN;
  END IF;

  -- Properties statistics using temp vars then assign to composite
  WITH property_stats AS (
    SELECT
      p.id,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'occupied') as occupied_units,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as total_units
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  )
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE occupied_units > 0)::integer,
    COUNT(*) FILTER (WHERE occupied_units = 0 OR total_units = 0)::integer,
    COALESCE(
      ROUND(
        (SUM(occupied_units)::numeric / NULLIF(SUM(total_units)::numeric, 0)) * 100,
        2
      ),
      0
    )::numeric,
    COALESCE(
      (SELECT SUM(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.owner_user_id = p_user_id
       AND u.status = 'occupied'),
      0
    )::bigint,
    COALESCE(
      (SELECT AVG(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.owner_user_id = p_user_id),
      0
    )::numeric
  INTO v_prop_total, v_prop_occupied, v_prop_vacant,
       v_prop_occupancy_rate, v_prop_total_monthly_rent, v_prop_average_rent
  FROM property_stats;

  v_properties.total := v_prop_total;
  v_properties.occupied := v_prop_occupied;
  v_properties.vacant := v_prop_vacant;
  v_properties.occupancy_rate := v_prop_occupancy_rate;
  v_properties.total_monthly_rent := v_prop_total_monthly_rent;
  v_properties.average_rent := v_prop_average_rent;

  -- Tenants statistics
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM leases l
      WHERE l.primary_tenant_id = t.id
      AND l.lease_status = 'active'
    ))::integer,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM leases l
      WHERE l.primary_tenant_id = t.id
      AND l.lease_status = 'active'
    ))::integer,
    COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::integer
  INTO v_tenant_total, v_tenant_active, v_tenant_inactive, v_tenant_new_this_month
  FROM tenants t
  WHERE EXISTS (
    SELECT 1 FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_user_id
    AND EXISTS (SELECT 1 FROM leases l WHERE l.unit_id = u.id AND l.primary_tenant_id = t.id)
  );

  v_tenants.total := COALESCE(v_tenant_total, 0);
  v_tenants.active := COALESCE(v_tenant_active, 0);
  v_tenants.inactive := COALESCE(v_tenant_inactive, 0);
  v_tenants.new_this_month := COALESCE(v_tenant_new_this_month, 0);

  -- Units statistics
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE status = 'occupied')::integer,
    COUNT(*) FILTER (WHERE status = 'available')::integer,
    COUNT(*) FILTER (WHERE status = 'maintenance')::integer,
    COALESCE(AVG(rent_amount), 0)::numeric,
    COUNT(*) FILTER (WHERE status = 'available')::integer,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'occupied')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
        2
      ),
      0
    )::numeric,
    0::numeric,
    COALESCE(SUM(rent_amount), 0)::bigint,
    COALESCE(SUM(rent_amount) FILTER (WHERE status = 'occupied'), 0)::bigint
  INTO v_unit_total, v_unit_occupied, v_unit_vacant, v_unit_maintenance,
       v_unit_average_rent, v_unit_available, v_unit_occupancy_rate,
       v_unit_occupancy_change, v_unit_total_potential_rent, v_unit_total_actual_rent
  FROM units
  WHERE property_id IN (
    SELECT id FROM properties WHERE owner_user_id = p_user_id
  );

  v_units.total := COALESCE(v_unit_total, 0);
  v_units.occupied := COALESCE(v_unit_occupied, 0);
  v_units.vacant := COALESCE(v_unit_vacant, 0);
  v_units.maintenance := COALESCE(v_unit_maintenance, 0);
  v_units.average_rent := COALESCE(v_unit_average_rent, 0);
  v_units.available := COALESCE(v_unit_available, 0);
  v_units.occupancy_rate := COALESCE(v_unit_occupancy_rate, 0);
  v_units.occupancy_change := COALESCE(v_unit_occupancy_change, 0);
  v_units.total_potential_rent := COALESCE(v_unit_total_potential_rent, 0);
  v_units.total_actual_rent := COALESCE(v_unit_total_actual_rent, 0);

  -- Leases statistics
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE lease_status = 'active')::integer,
    COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))::integer,
    COUNT(*) FILTER (
      WHERE lease_status = 'active'
      AND end_date <= CURRENT_DATE + INTERVAL '30 days'
    )::integer
  INTO v_lease_total, v_lease_active, v_lease_expired, v_lease_expiring_soon
  FROM leases
  WHERE owner_user_id = p_user_id;

  v_leases.total := COALESCE(v_lease_total, 0);
  v_leases.active := COALESCE(v_lease_active, 0);
  v_leases.expired := COALESCE(v_lease_expired, 0);
  v_leases.expiring_soon := COALESCE(v_lease_expiring_soon, 0);

  -- Maintenance priority breakdown
  SELECT
    COUNT(*) FILTER (WHERE priority = 'low')::integer,
    COUNT(*) FILTER (WHERE priority = 'normal')::integer,
    COUNT(*) FILTER (WHERE priority = 'high')::integer,
    COUNT(*) FILTER (WHERE priority = 'urgent')::integer
  INTO v_maint_priority_low, v_maint_priority_normal, v_maint_priority_high, v_maint_priority_urgent
  FROM maintenance_requests
  WHERE owner_user_id = p_user_id;

  v_maintenance_priority.low := COALESCE(v_maint_priority_low, 0);
  v_maintenance_priority.normal := COALESCE(v_maint_priority_normal, 0);
  v_maintenance_priority.high := COALESCE(v_maint_priority_high, 0);
  v_maintenance_priority.urgent := COALESCE(v_maint_priority_urgent, 0);

  -- Maintenance statistics
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE status = 'open')::integer,
    COUNT(*) FILTER (WHERE status = 'in_progress')::integer,
    COUNT(*) FILTER (WHERE status = 'completed')::integer,
    COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::integer,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL),
      0
    )::numeric
  INTO v_maint_total, v_maint_open, v_maint_in_progress,
       v_maint_completed, v_maint_completed_today, v_maint_avg_resolution_time
  FROM maintenance_requests
  WHERE owner_user_id = p_user_id;

  v_maintenance.total := COALESCE(v_maint_total, 0);
  v_maintenance.open := COALESCE(v_maint_open, 0);
  v_maintenance.in_progress := COALESCE(v_maint_in_progress, 0);
  v_maintenance.completed := COALESCE(v_maint_completed, 0);
  v_maintenance.completed_today := COALESCE(v_maint_completed_today, 0);
  v_maintenance.avg_resolution_time := COALESCE(v_maint_avg_resolution_time, 0);
  v_maintenance.by_priority := v_maintenance_priority;

  -- Revenue statistics
  SELECT
    COALESCE(SUM(rent_amount), 0)::bigint,
    COALESCE(SUM(rent_amount) * 12, 0)::bigint
  INTO v_rev_monthly, v_rev_yearly
  FROM leases
  WHERE owner_user_id = p_user_id AND lease_status = 'active';

  v_revenue.monthly := COALESCE(v_rev_monthly, 0);
  v_revenue.yearly := COALESCE(v_rev_yearly, 0);
  v_revenue.growth := 0;

  -- Return all stats as a single row
  RETURN QUERY SELECT v_properties, v_tenants, v_units, v_leases, v_maintenance, v_revenue;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_dashboard_stats(uuid) IS 'Returns typed dashboard statistics for a property owner. Uses owner_user_id for direct user lookup. Fixed ROW() constructor issue by using direct field assignment.';
