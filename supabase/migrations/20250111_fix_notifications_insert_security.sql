-- Migration: Fix notifications INSERT policy security vulnerability
-- Date: 2025-01-11
--
-- SECURITY FIX: The notifications_system_insert policy had WITH CHECK (true)
-- which allowed any authenticated user to insert notifications for any user.
--
-- Solution: Replace with proper access control:
-- - Regular users can only insert their own notifications (userId = current user)
-- - System notifications should be created by backend service (bypasses RLS)

-- Drop the insecure policy
DROP POLICY IF EXISTS "notifications_system_insert" ON notifications;

-- Create secure policy: Users can only insert their own notifications
CREATE POLICY "notifications_user_insert"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  "userId" = get_auth_uid()
);

-- Add comment for verification
COMMENT ON POLICY "notifications_user_insert" ON notifications IS 'SECURITY FIX 2025-01-11: Users can only create notifications for themselves. System notifications are created by backend service (bypasses RLS).';
