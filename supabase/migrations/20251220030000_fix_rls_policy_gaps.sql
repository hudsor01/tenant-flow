-- Migration: Fix RLS Policy Gaps
-- Created: 2025-12-20
-- Purpose: Add missing RLS policies to ensure users can access their data without admin permissions
-- Security Impact: CRITICAL - Closes security gaps where tables have RLS enabled but no user policies

-- ============================================================================
-- ANALYSIS SUMMARY
-- ============================================================================
-- Tables with RLS gaps identified:
-- 1. processed_internal_events - NO policies (internal system table - service_role only)
-- 2. blogs - Missing DELETE policy
-- 3. security_events - Missing UPDATE/DELETE (intentional - audit log)
-- 4. property_images - Missing UPDATE policy
-- 5. documents - Missing UPDATE policy
--
-- Strategy: Add policies for authenticated users based on ownership patterns
-- ============================================================================

-- Drop existing policies to make migration re-runnable
DROP POLICY IF EXISTS "processed_internal_events_service_role" ON public.processed_internal_events;
DROP POLICY IF EXISTS "processed_internal_events_service_role_select" ON public.processed_internal_events;
DROP POLICY IF EXISTS "processed_internal_events_service_role_insert" ON public.processed_internal_events;
DROP POLICY IF EXISTS "processed_internal_events_service_role_update" ON public.processed_internal_events;
DROP POLICY IF EXISTS "processed_internal_events_service_role_delete" ON public.processed_internal_events;
DROP POLICY IF EXISTS "blogs_delete_service_role" ON public.blogs;
DROP POLICY IF EXISTS "property_images_update_owner" ON public.property_images;
DROP POLICY IF EXISTS "documents_update_owner" ON public.documents;
DROP POLICY IF EXISTS "activity_insert_own" ON public.activity;
DROP POLICY IF EXISTS "activity_update_own" ON public.activity;
DROP POLICY IF EXISTS "activity_delete_own" ON public.activity;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notification_logs_insert" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_update" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_delete" ON public.notification_logs;
DROP POLICY IF EXISTS "payment_schedules_insert" ON public.payment_schedules;
DROP POLICY IF EXISTS "payment_schedules_update" ON public.payment_schedules;
DROP POLICY IF EXISTS "payment_schedules_delete" ON public.payment_schedules;
DROP POLICY IF EXISTS "payment_transactions_insert" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_update" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_delete" ON public.payment_transactions;
DROP POLICY IF EXISTS "rent_due_insert" ON public.rent_due;
DROP POLICY IF EXISTS "rent_due_update" ON public.rent_due;
DROP POLICY IF EXISTS "rent_due_delete" ON public.rent_due;
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
    DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
    DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
  END IF;
END $$;
DROP POLICY IF EXISTS "user_feature_access_insert" ON public.user_feature_access;
DROP POLICY IF EXISTS "user_feature_access_update" ON public.user_feature_access;
DROP POLICY IF EXISTS "user_feature_access_delete" ON public.user_feature_access;

-- ============================================================================
-- 1. PROCESSED_INTERNAL_EVENTS - Service Role Only (System Table)
-- ============================================================================

-- This is an internal event processing table - only backend should access
-- All operations restricted to service_role

COMMENT ON TABLE public.processed_internal_events IS
'Internal event processing tracking table. Service role only. Not for user access.';

-- Service role policies (separate per operation per RLS best practices)
CREATE POLICY "processed_internal_events_service_role_select"
ON public.processed_internal_events
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "processed_internal_events_service_role_insert"
ON public.processed_internal_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "processed_internal_events_service_role_update"
ON public.processed_internal_events
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "processed_internal_events_service_role_delete"
ON public.processed_internal_events
FOR DELETE
TO service_role
USING (true);

-- ============================================================================
-- 2. BLOGS - Add DELETE Policy
-- ============================================================================

-- Currently missing: DELETE policy for authenticated users
-- Add policy to allow authenticated users to delete their own blogs
-- Note: blogs table doesn't have owner_id, so we'll allow service_role only for now

CREATE POLICY "blogs_delete_service_role"
ON public.blogs
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "blogs_delete_service_role" ON public.blogs IS
'Service role can delete blogs. User deletion not implemented due to missing owner_id column.';

-- ============================================================================
-- 3. PROPERTY_IMAGES - Add UPDATE Policy
-- ============================================================================

-- Allow owners to update images for their properties
CREATE POLICY "property_images_update_owner"
ON public.property_images
FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT id
    FROM public.properties
    WHERE owner_user_id = get_current_owner_user_id()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id
    FROM public.properties
    WHERE owner_user_id = get_current_owner_user_id()
  )
);

COMMENT ON POLICY "property_images_update_owner" ON public.property_images IS
'Property owners can update images for their own properties';

-- ============================================================================
-- 4. DOCUMENTS - Add UPDATE Policy
-- ============================================================================

-- Allow owners to update documents for entities they own
CREATE POLICY "documents_update_owner"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  (
    -- Property documents
    entity_type = 'property'
    AND entity_id IN (
      SELECT id
      FROM public.properties
      WHERE owner_user_id = get_current_owner_user_id()
    )
  )
  OR (
    -- Maintenance request documents
    entity_type = 'maintenance_request'
    AND entity_id IN (
      SELECT id
      FROM public.maintenance_requests
      WHERE owner_user_id = get_current_owner_user_id()
    )
  )
)
WITH CHECK (
  (
    -- Property documents
    entity_type = 'property'
    AND entity_id IN (
      SELECT id
      FROM public.properties
      WHERE owner_user_id = get_current_owner_user_id()
    )
  )
  OR (
    -- Maintenance request documents
    entity_type = 'maintenance_request'
    AND entity_id IN (
      SELECT id
      FROM public.maintenance_requests
      WHERE owner_user_id = get_current_owner_user_id()
    )
  )
);

COMMENT ON POLICY "documents_update_owner" ON public.documents IS
'Property owners can update documents for their properties and maintenance requests';

-- ============================================================================
-- 5. ACTIVITY - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Allow users to insert their own activity records
CREATE POLICY "activity_insert_own"
ON public.activity
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own activity records
CREATE POLICY "activity_update_own"
ON public.activity
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own activity records
CREATE POLICY "activity_delete_own"
ON public.activity
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "activity_insert_own" ON public.activity IS
'Users can insert their own activity records';

COMMENT ON POLICY "activity_update_own" ON public.activity IS
'Users can update their own activity records';

COMMENT ON POLICY "activity_delete_own" ON public.activity IS
'Users can delete their own activity records';

-- ============================================================================
-- 6. NOTIFICATIONS - Add INSERT, DELETE Policies
-- ============================================================================

-- Allow system to insert notifications for users
CREATE POLICY "notifications_insert_own"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own notifications
CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "notifications_insert_own" ON public.notifications IS
'Users can receive notifications (system creates notifications for users)';

COMMENT ON POLICY "notifications_delete_own" ON public.notifications IS
'Users can delete their own notifications';

-- ============================================================================
-- 7. NOTIFICATION_LOGS - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Allow system to log notification deliveries
CREATE POLICY "notification_logs_insert"
ON public.notification_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can update logs (for retry tracking)
CREATE POLICY "notification_logs_update"
ON public.notification_logs
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Service role can delete old logs (cleanup)
CREATE POLICY "notification_logs_delete"
ON public.notification_logs
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "notification_logs_insert" ON public.notification_logs IS
'Service role can insert notification delivery logs';

COMMENT ON POLICY "notification_logs_update" ON public.notification_logs IS
'Service role can update notification logs for retry tracking';

COMMENT ON POLICY "notification_logs_delete" ON public.notification_logs IS
'Service role can delete old notification logs for cleanup';

-- ============================================================================
-- 8. PAYMENT_SCHEDULES - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Only backend should create/modify payment schedules
CREATE POLICY "payment_schedules_insert"
ON public.payment_schedules
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "payment_schedules_update"
ON public.payment_schedules
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "payment_schedules_delete"
ON public.payment_schedules
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "payment_schedules_insert" ON public.payment_schedules IS
'Service role creates payment schedules from lease agreements';

COMMENT ON POLICY "payment_schedules_update" ON public.payment_schedules IS
'Service role updates payment schedules when leases change';

COMMENT ON POLICY "payment_schedules_delete" ON public.payment_schedules IS
'Service role can delete payment schedules when leases are terminated';

-- ============================================================================
-- 9. PAYMENT_TRANSACTIONS - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Only backend processes payments
CREATE POLICY "payment_transactions_insert"
ON public.payment_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "payment_transactions_update"
ON public.payment_transactions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "payment_transactions_delete"
ON public.payment_transactions
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "payment_transactions_insert" ON public.payment_transactions IS
'Service role records payment transactions from Stripe';

COMMENT ON POLICY "payment_transactions_update" ON public.payment_transactions IS
'Service role updates transaction status (succeeded/failed)';

COMMENT ON POLICY "payment_transactions_delete" ON public.payment_transactions IS
'Service role can delete test/invalid transactions';

-- ============================================================================
-- 10. RENT_DUE - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Backend manages rent_due calculation
CREATE POLICY "rent_due_insert"
ON public.rent_due
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "rent_due_update"
ON public.rent_due
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "rent_due_delete"
ON public.rent_due
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "rent_due_insert" ON public.rent_due IS
'Service role calculates and inserts rent due amounts';

COMMENT ON POLICY "rent_due_update" ON public.rent_due IS
'Service role updates rent due when payments are made';

COMMENT ON POLICY "rent_due_delete" ON public.rent_due IS
'Service role can delete rent due for terminated leases';

-- ============================================================================
-- 11. SUBSCRIPTIONS - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Backend manages Stripe subscriptions
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    CREATE POLICY "subscriptions_insert"
    ON public.subscriptions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

    CREATE POLICY "subscriptions_update"
    ON public.subscriptions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "subscriptions_delete"
    ON public.subscriptions
    FOR DELETE
    TO service_role
    USING (true);

    COMMENT ON POLICY "subscriptions_insert" ON public.subscriptions IS
    'Service role creates subscriptions when users subscribe';

    COMMENT ON POLICY "subscriptions_update" ON public.subscriptions IS
    'Service role updates subscription status from Stripe webhooks';

    COMMENT ON POLICY "subscriptions_delete" ON public.subscriptions IS
    'Service role can delete cancelled subscriptions';
  END IF;
END $$;

-- ============================================================================
-- 12. USER_FEATURE_ACCESS - Add INSERT, UPDATE, DELETE Policies
-- ============================================================================

-- Backend manages feature access
CREATE POLICY "user_feature_access_insert"
ON public.user_feature_access
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "user_feature_access_update"
ON public.user_feature_access
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "user_feature_access_delete"
ON public.user_feature_access
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "user_feature_access_insert" ON public.user_feature_access IS
'Service role grants feature access based on subscription';

COMMENT ON POLICY "user_feature_access_update" ON public.user_feature_access IS
'Service role updates feature access when subscription changes';

COMMENT ON POLICY "user_feature_access_delete" ON public.user_feature_access IS
'Service role can revoke feature access';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count policies per table to verify coverage
DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
  missing_tables TEXT[];
BEGIN
  missing_tables := ARRAY[]::TEXT[];

  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true
    ORDER BY tablename
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = table_record.tablename;

    IF policy_count = 0 THEN
      missing_tables := array_append(missing_tables, table_record.tablename);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Tables with RLS enabled but NO policies: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All tables with RLS have at least one policy';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== RLS Policy Gaps Fixed ===';
  RAISE NOTICE 'Added policies for:';
  RAISE NOTICE '  - processed_internal_events (service_role only)';
  RAISE NOTICE '  - blogs (DELETE)';
  RAISE NOTICE '  - property_images (UPDATE)';
  RAISE NOTICE '  - documents (UPDATE)';
  RAISE NOTICE '  - activity (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - notifications (INSERT, DELETE)';
  RAISE NOTICE '  - notification_logs (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - payment_schedules (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - payment_transactions (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - rent_due (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - subscriptions (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - user_feature_access (INSERT, UPDATE, DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security: Users can now access their data without admin permissions';
  RAISE NOTICE '🔒 Backend operations properly restricted to service_role';
END $$;
