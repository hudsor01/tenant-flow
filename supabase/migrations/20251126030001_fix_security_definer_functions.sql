-- ============================================================================
-- FIX SECURITY DEFINER FUNCTIONS
-- ============================================================================
-- Add SET search_path = public, pg_temp to all SECURITY DEFINER functions
-- to prevent schema injection attacks.
--
-- See: https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY
-- ============================================================================

-- Recreate get_current_property_owner_id with search_path protection
CREATE OR REPLACE FUNCTION public.get_current_property_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.property_owners WHERE user_id = auth.uid();
$$;

-- Recreate get_current_tenant_id with search_path protection
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid();
$$;

-- Recreate get_current_user_type with search_path protection
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT user_type FROM public.users WHERE id = auth.uid();
$$;
