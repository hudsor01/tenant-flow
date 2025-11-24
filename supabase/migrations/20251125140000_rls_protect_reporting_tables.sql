-- Migration: Protect reporting and tracking tables with RLS policies
-- Priority: MEDIUM - Reporting & Tracking Data
-- Tables: reports, report_runs, rent_due, notification_logs
-- Risk: Reports and tracking data accessible to all authenticated users

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can select own reports"
ON reports
FOR SELECT
TO authenticated
USING (
  owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Property owners can insert own reports"
ON reports
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Property owners can update own reports"
ON reports
FOR UPDATE
TO authenticated
USING (
  owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Property owners can delete own reports"
ON reports
FOR DELETE
TO authenticated
USING (
  owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Service role full access to reports"
ON reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- REPORT_RUNS TABLE
-- ============================================================================

ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can select own report runs"
ON report_runs
FOR SELECT
TO authenticated
USING (
  report_id IN (
    SELECT id
    FROM reports
    WHERE owner_id IN (
      SELECT id
      FROM property_owners
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Service role full access to report runs"
ON report_runs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- RENT_DUE TABLE
-- ============================================================================

ALTER TABLE rent_due ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can select rent due for their properties"
ON rent_due
FOR SELECT
TO authenticated
USING (
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Tenants can select own rent due"
ON rent_due
FOR SELECT
TO authenticated
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN lease_tenants lt ON l.id = lt.lease_id
    JOIN tenants t ON lt.tenant_id = t.id
    WHERE t.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Service role full access to rent due"
ON rent_due
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- NOTIFICATION_LOGS TABLE
-- ============================================================================

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notification logs"
ON notification_logs
FOR SELECT
TO authenticated
USING (
  notification_id IN (
    SELECT id
    FROM notifications
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Service role full access to notification logs"
ON notification_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- REPORTS:
-- - Property owners can create and manage custom reports
-- - Read/write access to own reports only
-- - Report execution managed by backend

-- REPORT_RUNS:
-- - Execution log for scheduled reports
-- - Property owners can view runs of their reports
-- - Read-only for users, backend creates run records

-- RENT_DUE:
-- - Tracks upcoming rent due dates
-- - Property owners see rent due for their units
-- - Tenants see their own rent due dates
-- - Backend calculates and updates this table

-- NOTIFICATION_LOGS:
-- - Delivery log for notifications
-- - Users can view delivery status of their notifications
-- - Backend creates log entries

-- All tables follow appropriate access patterns:
-- - Owner-scoped: reports, report_runs
-- - Multi-access: rent_due (owner + tenant)
-- - User-scoped: notification_logs

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed:
-- - reports.owner_id
-- - report_runs.report_id
-- - rent_due.unit_id
-- - rent_due.lease_id
-- - notification_logs.notification_id

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('reports', 'report_runs', 'rent_due', 'notification_logs');
-- Expected: rowsecurity = true for all

-- Verify policies exist:
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename IN ('reports', 'report_runs', 'rent_due', 'notification_logs')
-- GROUP BY tablename;
