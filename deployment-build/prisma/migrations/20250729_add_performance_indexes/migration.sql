-- ======================================================
-- Performance Indexes for TenantFlow Property Management
-- ======================================================
-- These indexes optimize common query patterns in the property management system
-- Based on analysis of controllers, services, and RLS policies

-- User table indexes
CREATE INDEX IF NOT EXISTS "User_stripeCustomerId_idx" ON "User"("stripeCustomerId")
WHERE "stripeCustomerId" IS NOT NULL;
COMMENT ON INDEX "User_stripeCustomerId_idx" IS 'Optimize Stripe webhook lookups by customer ID';

-- Property table indexes
CREATE INDEX IF NOT EXISTS "Property_ownerId_createdAt_idx" ON "Property"("ownerId", "createdAt" DESC);
COMMENT ON INDEX "Property_ownerId_createdAt_idx" IS 'Optimize property listing queries with date sorting';

-- MaintenanceRequest table indexes
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_unitId_status_idx" ON "MaintenanceRequest"("unitId", "status");
COMMENT ON INDEX "MaintenanceRequest_unitId_status_idx" IS 'Optimize maintenance request filtering by unit and status';

-- Subscription table indexes
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId")
WHERE "stripeSubscriptionId" IS NOT NULL;
COMMENT ON INDEX "Subscription_stripeSubscriptionId_idx" IS 'Optimize Stripe webhook subscription lookups';

-- Document table indexes (for future file management features)
CREATE INDEX IF NOT EXISTS "Document_propertyId_createdAt_idx" ON "Document"("propertyId", "createdAt" DESC);
COMMENT ON INDEX "Document_propertyId_createdAt_idx" IS 'Optimize document retrieval by property with date sorting';

-- Lease table indexes (for improved lease management)
CREATE INDEX IF NOT EXISTS "Lease_propertyId_status_idx" ON "Lease"("propertyId", "status")
WHERE "status" IN ('ACTIVE', 'DRAFT');
COMMENT ON INDEX "Lease_propertyId_status_idx" IS 'Optimize active and draft lease lookups by property';

-- Unit table composite indexes for complex queries
CREATE INDEX IF NOT EXISTS "Unit_propertyId_status_rent_idx" ON "Unit"("propertyId", "status", "rent");
COMMENT ON INDEX "Unit_propertyId_status_rent_idx" IS 'Optimize unit filtering with rent range queries';

-- Tenant table composite indexes
CREATE INDEX IF NOT EXISTS "Tenant_email_userId_idx" ON "Tenant"("email", "userId")
WHERE "userId" IS NOT NULL;
COMMENT ON INDEX "Tenant_email_userId_idx" IS 'Optimize tenant lookups by email with user association';

-- ======================================================
-- Query Performance Statistics View
-- ======================================================
-- Create a view to monitor query performance for future optimization

CREATE OR REPLACE VIEW "QueryPerformanceMonitor" AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    null_frac,
    avg_width,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
AND tablename IN ('Property', 'Unit', 'Tenant', 'Lease', 'MaintenanceRequest', 'Document', 'Subscription', 'User')
ORDER BY tablename, attname;

COMMENT ON VIEW "QueryPerformanceMonitor" IS 'Monitor column statistics for query optimization decisions';

-- ======================================================
-- Analyze tables to update statistics
-- ======================================================
-- Update table statistics for query planner optimization

ANALYZE "User";
ANALYZE "Property"; 
ANALYZE "Unit";
ANALYZE "Tenant";
ANALYZE "Lease";
ANALYZE "MaintenanceRequest";
ANALYZE "Document";
ANALYZE "Subscription";