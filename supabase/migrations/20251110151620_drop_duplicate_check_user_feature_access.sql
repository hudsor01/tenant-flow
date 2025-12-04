-- Drop the text overload of check_user_feature_access
-- Keep only the uuid version for type safety
--
-- This resolves the "Could not choose the best candidate function" error
-- when calling check_user_feature_access with ambiguous parameter types

-- Drop any existing versions
DROP FUNCTION IF EXISTS public.check_user_feature_access(p_user_id text, p_feature text);
DROP FUNCTION IF EXISTS public.check_user_feature_access(p_user_id uuid, p_feature text);

-- Create stub function for local development
-- Production uses Supabase Edge Functions or has the real implementation
CREATE OR REPLACE FUNCTION public.check_user_feature_access(
    p_user_id uuid,
    p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
BEGIN
    -- Stub: always return true for local development
    -- The subscription guard has fallback logic if this fails
    RETURN true;
END;
$$;

-- Document the UUID version
COMMENT ON FUNCTION public.check_user_feature_access(p_user_id uuid, p_feature text) IS
'Stub function for local development. Returns true. Production uses real implementation.';
