-- migration: phase 1 — update planner statistics on tables missing ANALYZE
-- purpose: 14 tables have never had ANALYZE run, leading to stale/missing planner statistics.
--          the query planner relies on these statistics to choose optimal execution plans.
--          missing stats can cause the planner to choose sequential scans over index scans,
--          or to estimate wildly wrong row counts for joins.
--
-- affected tables:
--   expenses, inspections, inspection_rooms, inspection_photos, payment_methods,
--   reports, report_runs, notification_settings, lease_reminders, payment_reminders,
--   email_suppressions, late_fees, user_preferences, user_feature_access,
--   vendors, property_images, autopay_enrollments
--
-- note on VACUUM: dead tuple cleanup (VACUUM ANALYZE) cannot execute inside a
--   transaction block, and supabase migrations are transactional. VACUUM is
--   environment-specific maintenance that must be run operationally:
--
--   -- run manually against production after applying this migration:
--   VACUUM ANALYZE properties;    -- 90% dead tuple ratio (35 dead / 39 live)
--   VACUUM ANALYZE vendors;       -- 100% dead (48 dead / 0 live)
--   VACUUM ANALYZE blogs;         -- 1.3x bloat, 376kB waste
--   VACUUM ANALYZE maintenance_requests;  -- 1.2x bloat, 80kB waste
--
-- safety: ANALYZE is a read-only statistics collection operation.
--   it acquires only a ShareUpdateExclusiveLock (does not block reads or writes).
--   safe to run during normal operation.
--
-- prior ANALYZE coverage (already done in earlier migrations):
--   20251220021229: leases, units, properties, tenants
--   20251220040000: documents, properties, maintenance_requests, lease_tenants,
--                   leases, rent_payments, payment_transactions, payment_schedules, rent_due
--   20251226062933: webhook_events, webhook_failures
--   20260301065605: maintenance_requests, properties, users, units, blogs,
--                   notifications, activity, notification_logs
--   20260302061333: webhook_events, webhook_attempts, webhook_metrics,
--                   stripe_webhook_events, security_events, security_audit_log,
--                   processed_internal_events, user_access_log, user_tour_progress,
--                   stripe_connected_accounts, user_errors

-- ============================================================================
-- tables that have NEVER had ANALYZE run (confirmed by cross-referencing
-- all prior migrations containing ANALYZE statements)
-- ============================================================================

-- financial tables
analyze expenses;
analyze late_fees;

-- inspection tables
analyze inspections;
analyze inspection_rooms;
analyze inspection_photos;

-- payment tables
analyze payment_methods;

-- reporting tables
analyze reports;
analyze report_runs;

-- user preference/settings tables
analyze notification_settings;
analyze user_preferences;
analyze user_feature_access;

-- communication tables
analyze lease_reminders;
analyze payment_reminders;
analyze email_suppressions;

-- additional tables not in original plan but also missing ANALYZE
analyze vendors;
analyze property_images;
analyze autopay_enrollments;
