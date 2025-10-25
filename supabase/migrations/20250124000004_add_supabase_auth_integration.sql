-- Migration: Add Supabase Auth Integration for Tenant Invitations (Phase 3.1)
-- Adds auth_user_id column to link tenant records with Supabase Auth users
-- NON-BREAKING: Keeps existing custom invitation fields for backwards compatibility

-- ============================================================================
-- STEP 1: Add auth_user_id column to tenant table
-- ============================================================================
ALTER TABLE tenant
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);

-- Create index for efficient lookups
CREATE INDEX idx_tenant_auth_user_id ON tenant(auth_user_id);

COMMENT ON COLUMN tenant.auth_user_id IS
'Links tenant record to Supabase Auth user (invited via auth.admin.inviteUserByEmail)';

-- ============================================================================
-- STEP 2: Create function to sync tenant status (called from backend)
-- ============================================================================
-- Note: Cannot create triggers on auth.users (owned by Supabase Auth)
-- Instead, backend will call this function after successful invitation acceptance
CREATE OR REPLACE FUNCTION public.activate_tenant_from_auth_user(p_auth_user_id UUID)
RETURNS TABLE(tenant_id TEXT, activated BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  activated BOOLEAN := FALSE;
BEGIN
  -- Find tenant linked to this auth user
  SELECT id, invitation_status, status INTO tenant_record
  FROM tenant
  WHERE auth_user_id = p_auth_user_id;

  -- If tenant exists and invitation was sent, activate tenant
  IF FOUND AND tenant_record.invitation_status = 'SENT' THEN
    UPDATE tenant
    SET
      invitation_status = 'ACCEPTED',
      invitation_accepted_at = NOW(),
      status = 'ACTIVE'
    WHERE id = tenant_record.id;

    activated := TRUE;

    RAISE NOTICE 'Tenant % activated via auth user %',
      tenant_record.id, p_auth_user_id;
  END IF;

  -- Return result
  RETURN QUERY SELECT tenant_record.id, activated;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.activate_tenant_from_auth_user(UUID) TO authenticated;

COMMENT ON FUNCTION public.activate_tenant_from_auth_user(UUID) IS
'Activates tenant record when called after Supabase Auth user confirms invitation. Called from backend after successful auth.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================
-- Check that the column was added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tenant' AND column_name = 'auth_user_id';

-- Check that the index was created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'tenant' AND indexname = 'idx_tenant_auth_user_id';

-- Check that the function was created:
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname = 'activate_tenant_from_auth_user';

-- Test the activation function (replace UUID with actual auth user ID):
-- SELECT * FROM public.activate_tenant_from_auth_user('00000000-0000-0000-0000-000000000000');
