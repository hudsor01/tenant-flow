-- Change Priority enum from EMERGENCY back to URGENT
-- Reason: Application code universally uses URGENT, not EMERGENCY
-- This aligns the database with the existing application expectations

-- Step 1: Drop materialized view that depends on priority column
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_mv;

-- Step 2: Drop the default constraint temporarily
ALTER TABLE maintenance_request
  ALTER COLUMN priority DROP DEFAULT;

-- Step 2: Create new enum with URGENT
CREATE TYPE "Priority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Step 3: Update the column to use the new enum, mapping EMERGENCY -> URGENT
ALTER TABLE maintenance_request
  ALTER COLUMN priority TYPE "Priority_new"
  USING (CASE
    WHEN priority::text = 'EMERGENCY' THEN 'URGENT'
    ELSE priority::text
  END)::"Priority_new";

-- Step 4: Drop the old enum
DROP TYPE "Priority";

-- Step 5: Rename the new enum to the original name
ALTER TYPE "Priority_new" RENAME TO "Priority";

-- Step 6: Restore the default constraint
ALTER TABLE maintenance_request
  ALTER COLUMN priority SET DEFAULT 'MEDIUM'::"Priority";

-- Step 7: Recreate the materialized view with URGENT instead of EMERGENCY
CREATE MATERIALIZED VIEW dashboard_stats_mv AS
SELECT
  p."ownerId" AS user_id,
  COUNT(DISTINCT p.id) AS total_properties,
  COUNT(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM unit u2 WHERE u2."propertyId" = p.id AND u2.status = 'OCCUPIED'::"UnitStatus")) AS occupied_properties,
  COUNT(DISTINCT u.id) AS total_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED'::"UnitStatus") AS occupied_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'VACANT'::"UnitStatus") AS vacant_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'MAINTENANCE'::"UnitStatus") AS maintenance_units,
  COALESCE(SUM(u.rent), 0) AS total_potential_rent,
  COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'::"UnitStatus"), 0) AS total_actual_rent,
  COALESCE(AVG(u.rent) FILTER (WHERE u.status = 'OCCUPIED'::"UnitStatus"), 0) AS average_unit_rent,
  COUNT(DISTINCT l.id) AS total_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'ACTIVE'::"LeaseStatus" AND (l."startDate" IS NULL OR l."startDate" <= NOW()) AND (l."endDate" IS NULL OR l."endDate" >= NOW())) AS active_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l."endDate" < NOW()) AS expired_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'ACTIVE'::"LeaseStatus" AND l."endDate" IS NOT NULL AND l."endDate" >= NOW() AND l."endDate" <= NOW() + INTERVAL '30 days') AS expiring_soon_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'TERMINATED'::"LeaseStatus") AS terminated_leases,
  COALESCE(SUM(COALESCE(l."rentAmount", l."monthlyRent")) FILTER (WHERE l.status = 'ACTIVE'::"LeaseStatus" AND (l."startDate" IS NULL OR l."startDate" <= NOW()) AND (l."endDate" IS NULL OR l."endDate" >= NOW())), 0) AS total_lease_rent,
  COALESCE(SUM(l."securityDeposit"), 0) AS total_security_deposits,
  COUNT(DISTINCT t.id) AS total_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ACTIVE'::"TenantStatus") AS active_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('INACTIVE'::"TenantStatus", 'EVICTED'::"TenantStatus", 'MOVED_OUT'::"TenantStatus", 'ARCHIVED'::"TenantStatus")) AS inactive_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ACTIVE'::"TenantStatus" AND t."createdAt" >= DATE_TRUNC('month', NOW())) AS new_tenants_this_month,
  COUNT(DISTINCT m.id) AS total_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('OPEN'::"RequestStatus", 'ON_HOLD'::"RequestStatus")) AS open_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'IN_PROGRESS'::"RequestStatus") AS in_progress_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('COMPLETED'::"RequestStatus", 'CLOSED'::"RequestStatus")) AS completed_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'URGENT'::"Priority") AS emergency_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'LOW'::"Priority") AS low_priority_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'MEDIUM'::"Priority") AS medium_priority_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'HIGH'::"Priority") AS high_priority_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('COMPLETED'::"RequestStatus", 'CLOSED'::"RequestStatus") AND m."updatedAt"::DATE = CURRENT_DATE) AS completed_today_maintenance,
  COALESCE(AVG(EXTRACT(EPOCH FROM (m."updatedAt" - m."createdAt")) / 3600) FILTER (WHERE m.status IN ('COMPLETED'::"RequestStatus", 'CLOSED'::"RequestStatus")), 0) AS avg_resolution_time_hours,
  COALESCE(SUM(rp."netAmount") FILTER (WHERE rp.status = 'SUCCEEDED'::"RentPaymentStatus" AND rp."paidAt" >= DATE_TRUNC('month', NOW())), 0) AS monthly_revenue,
  COALESCE(SUM(rp."netAmount") FILTER (WHERE rp.status = 'SUCCEEDED'::"RentPaymentStatus" AND rp."paidAt" >= DATE_TRUNC('year', NOW())), 0) AS yearly_revenue,
  COALESCE(SUM(rp."netAmount") FILTER (WHERE rp.status = 'SUCCEEDED'::"RentPaymentStatus" AND rp."paidAt" >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND rp."paidAt" < DATE_TRUNC('month', NOW())), 0) AS previous_month_revenue,
  CASE
    WHEN COUNT(DISTINCT u.id) > 0
    THEN ROUND((COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED'::"UnitStatus")::NUMERIC / COUNT(DISTINCT u.id)::NUMERIC) * 100, 2)
    ELSE 0
  END AS occupancy_rate,
  COALESCE((
    SELECT ROUND((
      CASE
        WHEN COUNT(DISTINCT u.id) > 0
        THEN (COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED'::"UnitStatus")::NUMERIC / COUNT(DISTINCT u.id)::NUMERIC) * 100
        ELSE 0
      END - h.occupancy_rate
    ), 2)
    FROM dashboard_stats_history h
    WHERE h.user_id = p."ownerId"
      AND h.snapshot_date = CURRENT_DATE - 30
    ORDER BY h.snapshot_timestamp DESC
    LIMIT 1
  ), 0) AS occupancy_change_percentage,
  NOW() AS last_updated
FROM property p
LEFT JOIN unit u ON u."propertyId" = p.id
LEFT JOIN lease l ON l."unitId" = u.id
LEFT JOIN tenant t ON t.id = l."tenantId"
LEFT JOIN maintenance_request m ON m."unitId" = u.id
LEFT JOIN rent_payments rp ON rp."tenantId" = t.id
GROUP BY p."ownerId";

-- Verify the change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Priority' AND e.enumlabel = 'URGENT'
  ) THEN
    RAISE EXCEPTION 'Priority enum does not contain URGENT value';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Priority' AND e.enumlabel = 'EMERGENCY'
  ) THEN
    RAISE EXCEPTION 'Priority enum still contains EMERGENCY value';
  END IF;
END $$;
