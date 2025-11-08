-- Fix Dashboard Stats: Remove PENDING Enum References
-- PENDING was replaced with DRAFT in LeaseStatus enum
-- PENDING was replaced with OPEN in RequestStatus enum
-- This migration updates get_dashboard_stats to use correct enum values

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  -- Single query with LEFT JOINs instead of correlated subqueries
  SELECT json_build_object(
    -- Property stats
    'total_properties', COUNT(DISTINCT p.id),
    'active_properties', COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END),
    'properties_with_active_leases', COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN p.id END),

    -- Unit stats
    'total_units', COUNT(DISTINCT u.id),
    'occupied_units', COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN u.id END),
    'vacant_units', COUNT(DISTINCT CASE WHEN l.id IS NULL OR l.status != 'ACTIVE' THEN u.id END),
    'occupancy_rate', CASE
      WHEN COUNT(DISTINCT u.id) > 0
      THEN ROUND(COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN u.id END)::NUMERIC / COUNT(DISTINCT u.id) * 100, 2)
      ELSE 0
    END,

    -- Lease stats
    'total_leases', COUNT(DISTINCT l.id),
    'active_leases', COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN l.id END),
    'expired_leases', COUNT(DISTINCT CASE WHEN l.status = 'EXPIRED' THEN l.id END),
    'draft_leases', COUNT(DISTINCT CASE WHEN l.status = 'DRAFT' THEN l.id END),

    -- Tenant stats
    'total_tenants', COUNT(DISTINCT t.id),
    'active_tenants', COUNT(DISTINCT CASE WHEN t.status = 'ACTIVE' THEN t.id END),

    -- Maintenance stats
    'total_maintenance_requests', COUNT(DISTINCT mr.id),
    'open_maintenance', COUNT(DISTINCT CASE WHEN mr.status IN ('OPEN', 'IN_PROGRESS') THEN mr.id END),
    'completed_maintenance', COUNT(DISTINCT CASE WHEN mr.status = 'COMPLETED' THEN mr.id END),

    -- Revenue stats (last 30 days)
    'monthly_revenue', COALESCE(SUM(DISTINCT CASE
      WHEN rp.status = 'completed' AND rp."paidAt" >= NOW() - INTERVAL '30 days'
      THEN rp.amount
    END), 0),
    'pending_payments', COALESCE(SUM(DISTINCT CASE
      WHEN rp.status = 'pending'
      THEN rp.amount
    END), 0),
    'overdue_payments', COALESCE(SUM(DISTINCT CASE
      WHEN rp.status = 'overdue'
      THEN rp.amount
    END), 0),

    -- Average metrics
    'average_rent', COALESCE(AVG(DISTINCT l."monthlyRent"), 0),
    'total_monthly_rent', COALESCE(SUM(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN l."monthlyRent" END), 0)
  )
  INTO stats
  FROM property p
  LEFT JOIN unit u ON u."propertyId" = p.id
  LEFT JOIN lease l ON l."unitId" = u.id
  LEFT JOIN tenant t ON t.id = l."tenantId"
  LEFT JOIN maintenance_request mr ON mr."unitId" = u.id
  LEFT JOIN rent_payment rp ON rp."leaseId" = l.id
  WHERE p."ownerId" = p_user_id;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_dashboard_stats IS 'Fixed: PENDING → DRAFT (LeaseStatus), PENDING → OPEN (RequestStatus) for enum compatibility (2025-11-08)';
