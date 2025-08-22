-- ============================================================================
-- TenantFlow Database Indexing Strategy
-- ============================================================================
-- 
-- Performance-optimized indexes for multi-tenant property management
-- Based on query pattern analysis and business requirements
-- 
-- Author: Claude (Generated)
-- Date: 2025-01-21
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- PRIMARY INDEXES (Multi-tenant & Core Business Logic)
-- ============================================================================

-- Properties: Owner-scoped queries with time ordering
-- Query: SELECT * FROM "Property" WHERE "ownerId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_property_owner_created 
ON "Property" ("ownerId", "createdAt" DESC);

-- Properties: Owner-scoped with property type filtering
-- Query: SELECT * FROM "Property" WHERE "ownerId" = ? AND "propertyType" = ?
CREATE INDEX IF NOT EXISTS idx_property_owner_type 
ON "Property" ("ownerId", "propertyType");

-- Properties: Text search optimization (address, city, name)
-- Query: SELECT * FROM "Property" WHERE "ownerId" = ? AND (name ILIKE ? OR address ILIKE ?)
CREATE INDEX IF NOT EXISTS idx_property_search 
ON "Property" USING gin (
  to_tsvector('english', "name" || ' ' || "address" || ' ' || "city")
);

-- Units: Property-scoped queries with status filtering
-- Query: SELECT * FROM "Unit" WHERE "propertyId" = ? AND "status" = ?
CREATE INDEX IF NOT EXISTS idx_unit_property_status 
ON "Unit" ("propertyId", "status");

-- Units: Owner access via property relationship
-- Query: SELECT u.* FROM "Unit" u JOIN "Property" p ON u."propertyId" = p.id WHERE p."ownerId" = ?
CREATE INDEX IF NOT EXISTS idx_unit_property_id 
ON "Unit" ("propertyId");

-- ============================================================================
-- LEASE MANAGEMENT INDEXES
-- ============================================================================

-- Leases: Property-scoped with status and time
-- Query: SELECT * FROM "Lease" WHERE "propertyId" = ? AND "status" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_lease_property_status_created 
ON "Lease" ("propertyId", "status", "createdAt" DESC);

-- Leases: Unit-scoped queries
-- Query: SELECT * FROM "Lease" WHERE "unitId" = ? AND "status" = ?
CREATE INDEX IF NOT EXISTS idx_lease_unit_status 
ON "Lease" ("unitId", "status");

-- Leases: Tenant-scoped queries
-- Query: SELECT * FROM "Lease" WHERE "tenantId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_lease_tenant_created 
ON "Lease" ("tenantId", "createdAt" DESC);

-- Leases: Date range queries for active leases
-- Query: SELECT * FROM "Lease" WHERE "startDate" <= ? AND "endDate" >= ? AND "status" = 'ACTIVE'
CREATE INDEX IF NOT EXISTS idx_lease_date_range_status 
ON "Lease" ("status", "startDate", "endDate");

-- Leases: Expiry monitoring
-- Query: SELECT * FROM "Lease" WHERE "endDate" BETWEEN ? AND ? AND "status" = 'ACTIVE'
CREATE INDEX IF NOT EXISTS idx_lease_expiry_monitoring 
ON "Lease" ("endDate", "status") 
WHERE "status" = 'ACTIVE';

-- ============================================================================
-- TENANT MANAGEMENT INDEXES
-- ============================================================================

-- Tenants: User-scoped queries (for user-owned tenants)
-- Query: SELECT * FROM "Tenant" WHERE "userId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_tenant_user_created 
ON "Tenant" ("userId", "createdAt" DESC);

-- Tenants: Email lookup for contact/communication
-- Query: SELECT * FROM "Tenant" WHERE "email" = ?
CREATE INDEX IF NOT EXISTS idx_tenant_email 
ON "Tenant" ("email");

-- Tenants: Phone lookup for contact
-- Query: SELECT * FROM "Tenant" WHERE "phone" = ?
CREATE INDEX IF NOT EXISTS idx_tenant_phone 
ON "Tenant" ("phone") 
WHERE "phone" IS NOT NULL;

-- Tenants: Name search optimization
-- Query: SELECT * FROM "Tenant" WHERE "name" ILIKE ?
CREATE INDEX IF NOT EXISTS idx_tenant_name_search 
ON "Tenant" USING gin (to_tsvector('english', "name"));

-- ============================================================================
-- BILLING & SUBSCRIPTION INDEXES
-- ============================================================================

-- Subscriptions: User-scoped queries
-- Query: SELECT * FROM "Subscription" WHERE "userId" = ?
CREATE INDEX IF NOT EXISTS idx_subscription_user 
ON "Subscription" ("userId");

-- Subscriptions: Stripe customer lookup
-- Query: SELECT * FROM "Subscription" WHERE "stripeCustomerId" = ?
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_customer 
ON "Subscription" ("stripeCustomerId");

-- Subscriptions: Status monitoring
-- Query: SELECT * FROM "Subscription" WHERE "status" = ? AND "currentPeriodEnd" < ?
CREATE INDEX IF NOT EXISTS idx_subscription_status_expiry 
ON "Subscription" ("status", "currentPeriodEnd");

-- Users: Stripe customer lookup optimization
-- Query: SELECT * FROM "User" WHERE "stripeCustomerId" = ?
CREATE INDEX IF NOT EXISTS idx_user_stripe_customer 
ON "User" ("stripeCustomerId") 
WHERE "stripeCustomerId" IS NOT NULL;

-- Users: Email lookup for authentication
-- Query: SELECT * FROM "User" WHERE "email" = ?
CREATE INDEX IF NOT EXISTS idx_user_email 
ON "User" ("email");

-- ============================================================================
-- MAINTENANCE & ACTIVITY INDEXES
-- ============================================================================

-- Maintenance Requests: Property-scoped with status and priority
-- Query: SELECT * FROM "MaintenanceRequest" WHERE "propertyId" = ? AND "status" = ? ORDER BY "priority" DESC, "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_maintenance_property_status_priority 
ON "MaintenanceRequest" ("propertyId", "status", "priority" DESC, "createdAt" DESC);

-- Maintenance Requests: Unit-scoped queries
-- Query: SELECT * FROM "MaintenanceRequest" WHERE "unitId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_created 
ON "MaintenanceRequest" ("unitId", "createdAt" DESC);

-- Maintenance Requests: Emergency/high-priority monitoring
-- Query: SELECT * FROM "MaintenanceRequest" WHERE "priority" IN ('EMERGENCY', 'HIGH') AND "status" = 'OPEN'
CREATE INDEX IF NOT EXISTS idx_maintenance_priority_status 
ON "MaintenanceRequest" ("priority", "status") 
WHERE "priority" IN ('EMERGENCY', 'HIGH');

-- Activity Log: User-scoped with time ordering
-- Query: SELECT * FROM "Activity" WHERE "userId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_activity_user_created 
ON "Activity" ("userId", "createdAt" DESC);

-- Activity Log: Entity tracking
-- Query: SELECT * FROM "Activity" WHERE "entityType" = ? AND "entityId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_activity_entity_created 
ON "Activity" ("entityType", "entityId", "createdAt" DESC);

-- ============================================================================
-- DOCUMENT MANAGEMENT INDEXES
-- ============================================================================

-- Documents: Entity-scoped queries
-- Query: SELECT * FROM "Document" WHERE "entityType" = ? AND "entityId" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_document_entity_created 
ON "Document" ("entityType", "entityId", "createdAt" DESC);

-- Documents: User-scoped queries
-- Query: SELECT * FROM "Document" WHERE "uploadedBy" = ? ORDER BY "createdAt" DESC
CREATE INDEX IF NOT EXISTS idx_document_uploader_created 
ON "Document" ("uploadedBy", "createdAt" DESC);

-- Documents: File type filtering
-- Query: SELECT * FROM "Document" WHERE "entityId" = ? AND "fileType" = ?
CREATE INDEX IF NOT EXISTS idx_document_entity_type 
ON "Document" ("entityId", "fileType");

-- ============================================================================
-- BLOG & CONTENT INDEXES (if applicable)
-- ============================================================================

-- Blog Articles: Published content with time ordering
-- Query: SELECT * FROM "BlogArticle" WHERE "publishedAt" IS NOT NULL ORDER BY "publishedAt" DESC
CREATE INDEX IF NOT EXISTS idx_blog_published 
ON "BlogArticle" ("publishedAt" DESC NULLS LAST);

-- Blog Articles: Category filtering
-- Query: SELECT * FROM "BlogArticle" WHERE "category" = ? AND "publishedAt" IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_blog_category_published 
ON "BlogArticle" ("category", "publishedAt" DESC);

-- Blog Articles: Featured content
-- Query: SELECT * FROM "BlogArticle" WHERE "featured" = true AND "publishedAt" IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_blog_featured 
ON "BlogArticle" ("featured", "publishedAt" DESC) 
WHERE "featured" = true AND "publishedAt" IS NOT NULL;

-- Blog Articles: Full-text search
-- Query: SELECT * FROM "BlogArticle" WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ?)
CREATE INDEX IF NOT EXISTS idx_blog_search 
ON "BlogArticle" USING gin (
  to_tsvector('english', "title" || ' ' || "content" || ' ' || "excerpt")
);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Multi-tenant dashboard analytics
-- Query: Complex queries joining Property → Unit → Lease for owner dashboard
CREATE INDEX IF NOT EXISTS idx_property_unit_dashboard 
ON "Unit" ("propertyId", "status", "rent");

-- Tenant lease history
-- Query: SELECT l.* FROM "Lease" l JOIN "Unit" u ON l."unitId" = u.id JOIN "Property" p ON u."propertyId" = p.id WHERE p."ownerId" = ?
CREATE INDEX IF NOT EXISTS idx_lease_owner_lookup 
ON "Lease" ("unitId", "status", "createdAt" DESC);

-- Revenue calculations
-- Query: Aggregate rent calculations across properties for an owner
CREATE INDEX IF NOT EXISTS idx_unit_revenue_calc 
ON "Unit" ("propertyId", "status", "rent") 
WHERE "status" = 'OCCUPIED' AND "rent" IS NOT NULL;

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Create a view to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Create a view to monitor slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 20;

-- ============================================================================
-- INDEX MAINTENANCE COMMANDS
-- ============================================================================

-- Reindex all tables (run during maintenance windows)
-- REINDEX DATABASE tenantflow;

-- Analyze statistics (run after bulk data changes)
-- ANALYZE;

-- Check for unused indexes
-- SELECT schemaname, tablename, indexname, idx_scan 
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- NOTES & BEST PRACTICES
-- ============================================================================

/*
PERFORMANCE CONSIDERATIONS:
1. Monitor index usage with pg_stat_user_indexes
2. Regular ANALYZE after bulk operations
3. Consider partial indexes for filtered queries
4. Use composite indexes for multi-column WHERE clauses
5. Order columns in composite indexes: equality first, then ranges, then ordering

MAINTENANCE SCHEDULE:
- Weekly: Check slow_queries view
- Monthly: Review index_usage_stats
- Quarterly: REINDEX during maintenance window
- After major data migrations: ANALYZE

QUERY OPTIMIZATION TIPS:
1. Use EXPLAIN ANALYZE to verify index usage
2. Avoid queries that can't use indexes (functions on columns)
3. Use covering indexes where beneficial
4. Consider expression indexes for computed queries
5. Partial indexes for subset queries (WHERE conditions)

SUPABASE-SPECIFIC NOTES:
- RLS policies automatically filter by user context
- Use service role for admin operations
- Monitor connection pooling with PgBouncer
- Consider read replicas for analytics queries
*/