-- Migration: Create performance indexes for RLS policies
-- Priority: PERFORMANCE - Optimize RLS query execution
-- Purpose: Add indexes on all columns used in RLS policy checks
-- Impact: Prevents table scans, enables efficient policy evaluation

-- ============================================================================
-- PROPERTY OWNERSHIP CHAIN INDEXES
-- ============================================================================

-- Core ownership lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_owners_user_id
  ON property_owners(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_property_owner_id
  ON properties(property_owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_property_id
  ON units(property_id);

-- Direct lookup for units RLS (faster than join)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_property_owner_id
  ON units(property_owner_id)
  WHERE property_owner_id IS NOT NULL;

-- ============================================================================
-- LEASE RELATIONSHIP INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_unit_id
  ON leases(unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_primary_tenant_id
  ON leases(primary_tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_property_owner_id
  ON leases(property_owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_tenants_lease_id
  ON lease_tenants(lease_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_tenants_tenant_id
  ON lease_tenants(tenant_id);

-- ============================================================================
-- TENANT RELATIONSHIP INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_user_id
  ON tenants(user_id);

-- ============================================================================
-- PAYMENT & FINANCIAL INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_payments_tenant_id
  ON rent_payments(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_payments_lease_id
  ON rent_payments(lease_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_tenant_id
  ON payment_methods(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_transactions_rent_payment_id
  ON payment_transactions(rent_payment_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_schedules_lease_id
  ON payment_schedules(lease_id);

-- ============================================================================
-- MAINTENANCE & EXPENSE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_requests_tenant_id
  ON maintenance_requests(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_requests_property_owner_id
  ON maintenance_requests(property_owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_requests_unit_id
  ON maintenance_requests(unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_maintenance_request_id
  ON expenses(maintenance_request_id);

-- ============================================================================
-- INVITATION & ONBOARDING INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_invitations_property_owner_id
  ON tenant_invitations(property_owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_invitations_unit_id
  ON tenant_invitations(unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_invitations_email
  ON tenant_invitations(email);

-- ============================================================================
-- DOCUMENT INDEXES
-- ============================================================================

-- Composite index for documents (entity_type, entity_id)
-- Optimizes the multi-condition OR policies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_entity
  ON documents(entity_type, entity_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_images_property_id
  ON property_images(property_id);

-- ============================================================================
-- USER-SCOPED TABLE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_id
  ON activity(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_feature_access_user_id
  ON user_feature_access(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);

-- ============================================================================
-- REPORTING & TRACKING INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_owner_id
  ON reports(owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_runs_report_id
  ON report_runs(report_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_due_unit_id
  ON rent_due(unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_due_lease_id
  ON rent_due(lease_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_logs_notification_id
  ON notification_logs(notification_id);

-- ============================================================================
-- AUDIT LOG INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_audit_log_user_id
  ON security_audit_log(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_access_log_user_id
  ON user_access_log(user_id);

-- ============================================================================
-- WEBHOOK INFRASTRUCTURE INDEXES (Backend Performance)
-- ============================================================================

-- These support backend webhook processing, not RLS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_attempts_webhook_event_id
  ON webhook_attempts(webhook_event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_status
  ON webhook_events(status)
  WHERE status != 'processed'; -- Partial index for pending events

-- ============================================================================
-- NOTES & PERFORMANCE IMPACT
-- ============================================================================

-- Index Strategy:
-- - CONCURRENTLY: Prevents table locking during index creation
-- - IF NOT EXISTS: Safe for rerunning migration
-- - Selective partial indexes: For large tables with predictable filters

-- Performance Impact:
-- ✓ Foreign key columns used in RLS joins
-- ✓ User ID columns for user-scoped policies
-- ✓ Composite indexes for multi-column lookups (documents)
-- ✓ Partial indexes for status-based queries

-- Expected Improvements:
-- - User-scoped policies: ~1000x faster (table scan → index lookup)
-- - Owner-scoped policies: ~100x faster (reduces join costs)
-- - Complex multi-table joins: ~10-50x faster (efficient join execution)

-- Maintenance:
-- - Indexes auto-update on INSERT/UPDATE/DELETE
-- - PostgreSQL auto-vacuum maintains index health
-- - Monitor index usage with pg_stat_user_indexes

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all indexes were created:
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Check index sizes:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index usage (run after some production traffic):
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

-- Verify query plans use indexes (example for rent_payments):
-- EXPLAIN ANALYZE
-- SELECT * FROM rent_payments
-- WHERE tenant_id IN (SELECT id FROM tenants WHERE user_id = '<user_id>');
-- Look for "Index Scan" instead of "Seq Scan"
