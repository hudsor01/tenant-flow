-- migration: drop unused indexes and update planner statistics
-- purpose: remove 42 indexes with 0 scans since database creation, reducing write overhead
-- affected tables: maintenance_requests, properties, users, webhook/audit tables, and more
-- safety: excludes all primary keys, unique constraints, exclusion constraints,
--         and payment-related tables (rent_payments, payment_*, leases, late_fees, tenants)
--         which will see increased traffic with v1.1 payment infrastructure
--
-- note on VACUUM: dead tuple cleanup (VACUUM ANALYZE) was run as a separate operational
-- command against production. VACUUM cannot execute inside a transaction block, and
-- supabase migrations are transactional. VACUUM is environment-specific maintenance
-- (dead tuple counts differ per environment), not a reproducible schema change.
-- plain ANALYZE is included below to update planner statistics after index drops.

-- ============================================================================
-- category 1: redundant indexes (subsumed by existing composite indexes)
-- ============================================================================

-- subsumed by idx_maintenance_requests_owner_status (owner_user_id, status)
-- and idx_maintenance_requests_owner_priority (owner_user_id, priority)
drop index if exists idx_maintenance_requests_owner_user_id;

-- ============================================================================
-- category 2: indexes for features that don't exist
-- ============================================================================

-- tenantflow is rental management — no property sales features
drop index if exists idx_properties_date_sold;
drop index if exists idx_properties_sale_price;

-- no fuzzy text search feature exists in the application
drop index if exists idx_users_email_trgm;
drop index if exists idx_users_full_name_trgm;

-- gin search index never used — postgrest doesn't leverage it
drop index if exists idx_properties_search_gin;

-- ============================================================================
-- category 3: service-role-only audit/webhook tables
-- these tables are write-heavy, rarely read-queried, and accessed only by
-- service_role which does bulk operations. indexes add write overhead with
-- no query benefit.
-- ============================================================================

-- webhook_attempts
drop index if exists idx_webhook_attempts_webhook_event_id;

-- webhook_metrics
drop index if exists idx_webhook_metrics_event_type;
drop index if exists idx_webhook_metrics_date;

-- webhook_events
drop index if exists idx_webhook_events_event_type;
drop index if exists idx_webhook_events_webhook_source;
drop index if exists idx_webhook_events_created_at;

-- stripe_webhook_events
drop index if exists stripe_webhook_events_processed_at_idx;
drop index if exists stripe_webhook_events_event_type_idx;

-- security_events
drop index if exists idx_security_events_resource;
drop index if exists idx_security_events_severity;
drop index if exists idx_security_events_event_type;
drop index if exists idx_security_events_created_at;
drop index if exists idx_security_events_metadata;
drop index if exists idx_security_events_tags;

-- security_audit_log
drop index if exists idx_security_audit_log_event_type;
drop index if exists idx_security_audit_log_created_at;

-- processed_internal_events
drop index if exists idx_processed_internal_events_status;

-- user_access_log
drop index if exists idx_user_access_log_accessed_at;

-- ============================================================================
-- category 4: effectively dead or tiny table filter indexes
-- tables with < 5 live rows where sequential scan is always optimal,
-- or low-cardinality boolean/status filters with 0 scans
-- ============================================================================

-- user_tour_progress: 2 live rows, 92% dead tuples
drop index if exists idx_user_tour_progress_status;

-- stripe_connected_accounts: old naming convention, onboarding status never queried via index
drop index if exists idx_property_owners_onboarding_status;

-- users: status column never filtered via index (204 rows, seq scan is fine)
drop index if exists idx_users_status;

-- user_errors: error tracking table, these search indexes are never used
drop index if exists idx_user_errors_context_gin;
drop index if exists idx_user_errors_message_trgm;
drop index if exists idx_user_errors_type;
drop index if exists idx_user_errors_unresolved;

-- ============================================================================
-- category 5: low-value standalone indexes with 0 scans
-- ============================================================================

-- maintenance_requests: status alone is low cardinality, owner_status composite is preferred
drop index if exists idx_maintenance_requests_status;

-- maintenance_requests: composite indexes with 0 scans
drop index if exists idx_maintenance_requests_owner_priority;
drop index if exists idx_maintenance_requests_unit_status;
drop index if exists idx_mr_completed_at;

-- notifications: boolean is_read is low cardinality, never queried via index
drop index if exists idx_notifications_is_read;

-- units: 3 live rows, sequential scan always wins
drop index if exists idx_units_owner_user_id;
drop index if exists idx_units_status;

-- blogs: category filter never used (blog feature is secondary)
drop index if exists idx_blogs_category;

-- activity: audit-style table, these filters are never used
drop index if exists idx_activity_activity_type;
drop index if exists idx_activity_created_at;

-- notification_logs: log table, status filter never used
drop index if exists idx_notification_logs_status;

-- ============================================================================
-- update planner statistics for tables that lost indexes
-- ANALYZE can run inside a transaction (unlike VACUUM)
-- ============================================================================

analyze maintenance_requests;
analyze properties;
analyze users;
analyze units;
analyze blogs;
analyze notifications;
analyze activity;
analyze notification_logs;

-- ============================================================================
-- note: indexes intentionally KEPT (despite 0 scans)
-- ============================================================================
-- - all primary keys and unique constraints
-- - all rent_payments indexes (v1.1 payment infrastructure will activate)
-- - all payment_methods, payment_transactions indexes (same reason)
-- - all leases indexes except subsumed ones (subscription management)
-- - all late_fees, payment_reminders, payment_schedules indexes
-- - all tenant_invitations indexes (active feature)
-- - all inspection-related indexes (recently created, will grow)
-- - all document/report indexes (will grow with usage)
-- - blogs_slug_key (unique constraint)
-- - tenants_stripe_customer_id_unique (data integrity)
-- - leases_unit_date_overlap_exclusion (exclusion constraint)
