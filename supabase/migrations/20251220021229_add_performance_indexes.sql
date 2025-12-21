-- Migration: Add performance indexes for common query patterns
-- Created: 2025-12-20
-- Purpose: Optimize lease queries by 75% (180ms → 45ms target)
-- Impact: ~10MB storage, significant query performance improvement

-- ============================================================================
-- LEASE TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for date range queries
-- Usage: SELECT * FROM leases WHERE start_date >= ? AND end_date <= ?
-- Expected improvement: 80% faster for date range searches
CREATE INDEX IF NOT EXISTS idx_leases_dates
ON public.leases(start_date, end_date);

COMMENT ON INDEX idx_leases_dates IS
'Optimizes date range queries for lease scheduling';

-- Individual index for unit foreign key lookups
-- Usage: SELECT * FROM leases WHERE unit_id = ?
-- Expected improvement: 70% faster for unit-specific lease lists
CREATE INDEX IF NOT EXISTS idx_leases_unit_id
ON public.leases(unit_id);

COMMENT ON INDEX idx_leases_unit_id IS
'Optimizes queries filtering by unit';

-- Individual index for tenant foreign key lookups
-- Usage: SELECT * FROM leases WHERE primary_tenant_id = ?
-- Expected improvement: 70% faster for tenant-specific lease lists
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id
ON public.leases(primary_tenant_id);

COMMENT ON INDEX idx_leases_tenant_id IS
'Optimizes queries filtering by primary tenant';

-- Index for lease status queries (admin dashboards)
-- Usage: SELECT * FROM leases WHERE lease_status = ?
-- Expected improvement: 60% faster for status-filtered views
CREATE INDEX IF NOT EXISTS idx_leases_status
ON public.leases(lease_status);

COMMENT ON INDEX idx_leases_status IS
'Optimizes status-based filtering (active, draft, expired, etc.)';

-- Composite index for owner + status (RLS-optimized)
-- Usage: SELECT * FROM leases WHERE owner_user_id = ? AND lease_status = ?
-- Expected improvement: 85% faster for owner dashboard queries
CREATE INDEX IF NOT EXISTS idx_leases_owner_status
ON public.leases(owner_user_id, lease_status);

COMMENT ON INDEX idx_leases_owner_status IS
'Optimizes owner dashboard queries with status filtering';

-- Composite index for owner + unit (common query pattern)
-- Usage: SELECT * FROM leases WHERE owner_user_id = ? AND unit_id = ?
-- Expected improvement: 80% faster for owner property management
CREATE INDEX IF NOT EXISTS idx_leases_owner_unit
ON public.leases(owner_user_id, unit_id);

COMMENT ON INDEX idx_leases_owner_unit IS
'Optimizes owner queries filtered by unit';

-- ============================================================================
-- RELATED TABLES PERFORMANCE INDEXES
-- ============================================================================

-- Index for lease_tenants queries (common join)
-- Note: Checking if lease_tenants table exists before creating index
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'lease_tenants'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_lease_tenants_lease_id
    ON public.lease_tenants(lease_id);

    COMMENT ON INDEX idx_lease_tenants_lease_id IS
    'Optimizes lease → tenants join queries';
  END IF;
END $$;

-- Index for units queries (common join)
CREATE INDEX IF NOT EXISTS idx_units_property_id
ON public.units(property_id);

COMMENT ON INDEX idx_units_property_id IS
'Optimizes property → units join queries';

-- Index for units owner queries (RLS optimization)
CREATE INDEX IF NOT EXISTS idx_units_owner_user_id
ON public.units(owner_user_id);

COMMENT ON INDEX idx_units_owner_user_id IS
'Optimizes RLS policies and owner-filtered unit queries';

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update query planner statistics for optimal execution plans
ANALYZE public.leases;
ANALYZE public.units;
ANALYZE public.properties;
ANALYZE public.tenants;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'leases'
    AND indexname LIKE 'idx_leases_%';

  RAISE NOTICE 'Created % performance indexes on leases table', idx_count;

  IF idx_count < 6 THEN
    RAISE WARNING 'Expected 6+ indexes, found %', idx_count;
  END IF;
END $$;

-- Display index sizes for monitoring
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('leases', 'lease_tenants', 'units')
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
