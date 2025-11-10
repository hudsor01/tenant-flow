-- Drop the text overload of check_user_feature_access
-- Keep only the uuid version for type safety
--
-- This resolves the "Could not choose the best candidate function" error
-- when calling check_user_feature_access with ambiguous parameter types

DROP FUNCTION IF EXISTS public.check_user_feature_access(p_user_id text, p_feature text);

-- Verify the uuid version exists
COMMENT ON FUNCTION public.check_user_feature_access(p_user_id uuid, p_feature text) IS
'Checks if a user has access to a specific feature based on their active subscription. Only accepts UUID user_id for type safety.';
