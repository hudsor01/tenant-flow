-- Migration: Protect user-scoped tables with RLS policies
-- Priority: MEDIUM - User Privacy
-- Tables: notifications, activity, user_preferences, user_feature_access
-- Risk: User-specific data accessible to all authenticated users

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to notifications"
ON notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- ACTIVITY TABLE
-- ============================================================================

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own activity"
ON activity
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to activity"
ON activity
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own preferences"
ON user_preferences
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own preferences"
ON user_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own preferences"
ON user_preferences
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own preferences"
ON user_preferences
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to user preferences"
ON user_preferences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER_FEATURE_ACCESS TABLE
-- ============================================================================

ALTER TABLE user_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own feature access"
ON user_feature_access
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to user feature access"
ON user_feature_access
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- All tables follow user-scoped pattern:
-- - Users can only access their own records (user_id = auth.uid())
-- - Service role has full access for backend operations
-- - Simple, performant policies with direct user_id lookup

-- NOTIFICATIONS:
-- - Users can read and mark notifications as read
-- - Backend creates notifications via service_role
-- - Users cannot create their own notifications

-- ACTIVITY:
-- - Read-only audit trail of user actions
-- - Backend creates activity records
-- - Users can view their own activity history

-- USER_PREFERENCES:
-- - Users have full CRUD on their own preferences
-- - Settings like notification preferences, UI preferences, etc.

-- USER_FEATURE_ACCESS:
-- - Read-only feature flags per user
-- - Backend manages which features users can access
-- - Based on subscription tier, beta access, etc.

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed:
-- - user_id on all tables (simple lookups)
-- These indexes will be created in the performance optimization migration

-- All policies use simple user_id = auth.uid() checks
-- Very fast performance - no complex joins required

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('notifications', 'activity', 'user_preferences', 'user_feature_access');
-- Expected: rowsecurity = true for all

-- Verify policies exist:
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename IN ('notifications', 'activity', 'user_preferences', 'user_feature_access')
-- GROUP BY tablename;
-- Expected:
-- - notifications: 3 policies
-- - activity: 2 policies
-- - user_preferences: 5 policies
-- - user_feature_access: 2 policies
