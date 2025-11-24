-- Migration: Protect audit and webhook tables with RLS policies
-- Priority: LOW - Audit Logs & Backend Infrastructure
-- Tables: security_audit_log, user_access_log, webhook_events, webhook_attempts, webhook_metrics
-- Risk: Audit logs and webhook data accessible to all authenticated users

-- ============================================================================
-- SECURITY_AUDIT_LOG TABLE
-- ============================================================================

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own security audit logs"
ON security_audit_log
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to security audit log"
ON security_audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER_ACCESS_LOG TABLE
-- ============================================================================

ALTER TABLE user_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own access logs"
ON user_access_log
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to user access log"
ON user_access_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- WEBHOOK_EVENTS TABLE
-- ============================================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook events
-- Regular users should never access webhook infrastructure
CREATE POLICY "Service role full access to webhook events"
ON webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- WEBHOOK_ATTEMPTS TABLE
-- ============================================================================

ALTER TABLE webhook_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook attempts
CREATE POLICY "Service role full access to webhook attempts"
ON webhook_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- WEBHOOK_METRICS TABLE
-- ============================================================================

ALTER TABLE webhook_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook metrics
CREATE POLICY "Service role full access to webhook metrics"
ON webhook_metrics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- AUDIT TABLES (security_audit_log, user_access_log):
-- - User-scoped read-only access
-- - Users can view their own audit trail
-- - Backend creates audit records
-- - Useful for compliance and transparency
-- - Cannot be modified or deleted by users

-- WEBHOOK TABLES (webhook_events, webhook_attempts, webhook_metrics):
-- - Backend infrastructure only
-- - No user access (all policies service_role only)
-- - Manages Stripe webhook processing
-- - Tracks webhook delivery and retry logic
-- - Performance metrics for webhook handling

-- Access Patterns:
-- - Audit logs: User can read own logs
-- - Webhook tables: Service role only (no user access)

-- Privacy:
-- - Users cannot see other users' audit logs
-- - Webhook data is internal backend data

-- Compliance:
-- - Audit logs support regulatory requirements
-- - Immutable audit trail (users cannot delete)

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed for optimal RLS performance:
-- - security_audit_log.user_id
-- - user_access_log.user_id
-- - webhook_events (no user access, but backend queries benefit from indexes)
-- - webhook_attempts.webhook_event_id (for backend queries)
-- - webhook_metrics (depends on query patterns)

-- Audit log policies are simple user_id lookups - very fast
-- Webhook tables have no RLS overhead for authenticated users (no policies)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('security_audit_log', 'user_access_log', 'webhook_events', 'webhook_attempts', 'webhook_metrics');
-- Expected: rowsecurity = true for all

-- Verify policies exist:
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename IN ('security_audit_log', 'user_access_log', 'webhook_events', 'webhook_attempts', 'webhook_metrics')
-- GROUP BY tablename;
-- Expected:
-- - security_audit_log: 2 policies
-- - user_access_log: 2 policies
-- - webhook_events: 1 policy (service_role only)
-- - webhook_attempts: 1 policy (service_role only)
-- - webhook_metrics: 1 policy (service_role only)

-- Test webhook tables block user access:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<user_id>';
-- SELECT COUNT(*) FROM webhook_events; -- Should return 0 (no policy for authenticated role)
