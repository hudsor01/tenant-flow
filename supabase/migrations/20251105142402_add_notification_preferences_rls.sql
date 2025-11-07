-- Enable RLS on tenant table for notification_preferences column
-- This ensures notification preferences data isolation

-- Note: tenant table already has RLS enabled, we just need to ensure
-- the notification_preferences access is properly secured

-- Policy: Tenants can view their own notification preferences
-- (This should already be covered by existing tenant RLS policies)
-- But let's make it explicit for notification_preferences access

-- The tenant table should already have policies that restrict access to auth.uid() = userId
-- This migration ensures notification_preferences follows the same security model

-- If tenant table doesn't have RLS enabled, enable it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'tenant'
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.tenant ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Ensure tenant can access their own record (including notification_preferences)
DROP POLICY IF EXISTS "tenant_own_record_access" ON public.tenant;
CREATE POLICY "tenant_own_record_access"
ON public.tenant
FOR ALL
TO authenticated
USING (
    auth_user_id = (SELECT auth.uid())
    OR userId = (SELECT auth.uid())
)
WITH CHECK (
    auth_user_id = (SELECT auth.uid())
    OR userId = (SELECT auth.uid())
);

-- Service role has full access for management operations
DROP POLICY IF EXISTS "tenant_service_access" ON public.tenant;
CREATE POLICY "tenant_service_access"
ON public.tenant
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Performance index for tenant RLS policies
CREATE INDEX IF NOT EXISTS idx_tenant_auth_user_id
ON public.tenant(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_user_id
ON public.tenant(userId);