-- Migration: Optimize activate_tenant_from_auth_user function
-- Reduces the number of database queries from two to one by using the RETURNING clause.

CREATE OR REPLACE FUNCTION public.activate_tenant_from_auth_user(p_auth_user_id UUID)
RETURNS TABLE(tenant_id TEXT, activated BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activated_tenant_id TEXT;
BEGIN
  -- Find tenant linked to this auth user and activate if invitation was sent
  UPDATE tenant
  SET
    invitation_status = 'ACCEPTED',
    invitation_accepted_at = NOW(),
    status = 'ACTIVE'
  WHERE auth_user_id = p_auth_user_id AND invitation_status = 'SENT'
  RETURNING id INTO activated_tenant_id;

  -- Return result
  IF activated_tenant_id IS NOT NULL THEN
    RAISE NOTICE 'Tenant % activated via auth user %', activated_tenant_id, p_auth_user_id;
    RETURN QUERY SELECT activated_tenant_id, TRUE;
  ELSE
    -- To ensure the function always returns a row, select the tenant_id if it exists,
    -- but return FALSE for the activated status.
    RETURN QUERY SELECT id, FALSE FROM tenant WHERE auth_user_id = p_auth_user_id LIMIT 1;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.activate_tenant_from_auth_user(UUID) TO authenticated;

COMMENT ON FUNCTION public.activate_tenant_from_auth_user(UUID) IS
'Activates tenant record when called after Supabase Auth user confirms invitation. Called from backend after successful auth. Optimized to use a single query.';
