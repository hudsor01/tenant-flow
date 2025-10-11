-- Migration: Add Missing Foreign Key Indexes
-- Created: 2025-10-12
-- Purpose: Add indexes to foreign key columns for better query performance
-- Issue Level: INFO - Performance optimization

-- ============================================================================
-- PART 1: ADD INDEXES TO NOTIFICATIONS TABLE FOREIGN KEYS
-- ============================================================================
-- notifications table has 3 foreign keys without indexes
-- This can cause slow queries when joining or filtering by these columns

-- Index for leaseId foreign key
CREATE INDEX IF NOT EXISTS idx_notifications_lease_id
ON public.notifications("leaseId")
WHERE "leaseId" IS NOT NULL;

-- Index for maintenanceRequestId foreign key
CREATE INDEX IF NOT EXISTS idx_notifications_maintenance_request_id
ON public.notifications("maintenanceRequestId")
WHERE "maintenanceRequestId" IS NOT NULL;

-- Index for propertyId foreign key
CREATE INDEX IF NOT EXISTS idx_notifications_property_id
ON public.notifications("propertyId")
WHERE "propertyId" IS NOT NULL;

-- ============================================================================
-- PART 2: ADD INDEX TO RENT_PAYMENT TABLE FOREIGN KEY
-- ============================================================================
-- rent_payment table has subscriptionId foreign key without index

CREATE INDEX IF NOT EXISTS idx_rent_payment_subscription_id
ON public.rent_payment("subscriptionId")
WHERE "subscriptionId" IS NOT NULL;

-- ============================================================================
-- PART 3: ADD SECURITY AUDIT LOG ENTRY
-- ============================================================================

INSERT INTO public.security_audit_log (
  "eventType",
  "userId",
  "ipAddress",
  "userAgent",
  "resource",
  "action",
  "details",
  "severity"
)
VALUES (
  'PERFORMANCE_OPTIMIZATION',
  '00000000-0000-0000-0000-000000000000',
  '127.0.0.1',
  'PostgreSQL Migration',
  'database_performance',
  'ADDED_MISSING_INDEXES',
  jsonb_build_object(
    'migration', '20251012_add_missing_indexes',
    'indexes_added', jsonb_build_array(
      'idx_notifications_lease_id',
      'idx_notifications_maintenance_request_id',
      'idx_notifications_property_id',
      'idx_rent_payment_subscription_id'
    ),
    'improvement', 'Added indexes to 4 foreign key columns for better join performance',
    'timestamp', NOW()
  ),
  'INFO'
);

-- ============================================================================
-- VERIFICATION QUERIES (commented out, run manually if needed)
-- ============================================================================

/*
-- Verify indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_notifications_lease_id',
    'idx_notifications_maintenance_request_id',
    'idx_notifications_property_id',
    'idx_rent_payment_subscription_id'
  )
ORDER BY tablename, indexname;

-- Check index sizes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_notifications_lease_id',
    'idx_notifications_maintenance_request_id',
    'idx_notifications_property_id',
    'idx_rent_payment_subscription_id'
  )
ORDER BY tablename, indexname;

-- Verify no more foreign keys without indexes
SELECT
    tc.table_name,
    kcu.column_name,
    'Missing index' as issue
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN pg_indexes idx
    ON idx.schemaname = tc.table_schema
    AND idx.tablename = tc.table_name
    AND idx.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND idx.indexname IS NULL
ORDER BY tc.table_name, kcu.column_name;
*/
