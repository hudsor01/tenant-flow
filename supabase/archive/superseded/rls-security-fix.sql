-- Critical RLS Security Fix - October 29, 2025
-- Addresses tables missing Row Level Security for MVP launch

-- Enable RLS on auth_webhook_log
ALTER TABLE public.auth_webhook_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage auth webhook logs
DROP POLICY IF EXISTS "auth_webhook_log_service_only" ON public.auth_webhook_log;
CREATE POLICY "auth_webhook_log_service_only"
ON public.auth_webhook_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: No access for anon/authenticated users (security sensitive)
DROP POLICY IF EXISTS "auth_webhook_log_no_user_access" ON public.auth_webhook_log;
CREATE POLICY "auth_webhook_log_no_user_access"
ON public.auth_webhook_log
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Enable RLS on password_failed_verification_attempts
ALTER TABLE public.password_failed_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own failed attempts (user_id is PK)
DROP POLICY IF EXISTS "password_failed_attempts_user_access" ON public.password_failed_verification_attempts;
CREATE POLICY "password_failed_attempts_user_access"
ON public.password_failed_verification_attempts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy: Only service role can manage failed attempts (for security systems)
DROP POLICY IF EXISTS "password_failed_attempts_service_access" ON public.password_failed_verification_attempts;
CREATE POLICY "password_failed_attempts_service_access"
ON public.password_failed_verification_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Performance optimization: Add indexes for RLS policy columns
-- Index for auth_webhook_log (used by service role queries)
CREATE INDEX IF NOT EXISTS idx_auth_webhook_log_user_id
ON public.auth_webhook_log(user_id)
WHERE user_id IS NOT NULL;

-- Index for password_failed_verification_attempts (user_id is already PK)
-- No additional index needed since user_id is primary key