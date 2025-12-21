-- RPC: assert_can_create_lease
--
-- Purpose:
-- Lease creation requires validating a tenant + invitation relationship.
-- Under current RLS, owners cannot SELECT from public.tenants / public.users,
-- so the API cannot safely validate invitation ownership using a user-scoped client
-- without a tightly-scoped SECURITY DEFINER helper.
--
-- This function:
-- - Ensures caller is an OWNER (via get_current_owner_user_id())
-- - Ensures the unit belongs to the caller
-- - Ensures the tenant exists
-- - Ensures an invitation exists for the tenant and unit
-- - Ensures the invitation is accepted (accepted_at IS NOT NULL)
--
-- The API calls this using the authenticated user's JWT (no service role).

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_can_create_lease(
  p_unit_id uuid,
  p_primary_tenant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_owner_user_id uuid;
  v_tenant_user_id uuid;
  v_tenant_email text;
  v_invitation_id uuid;
  v_invitation_accepted_at timestamptz;
BEGIN
  v_owner_user_id := public.get_current_owner_user_id();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_unit_id IS NULL THEN
    RAISE EXCEPTION 'unit_id is required';
  END IF;

  IF p_primary_tenant_id IS NULL THEN
    RAISE EXCEPTION 'primary_tenant_id is required';
  END IF;

  -- Prevent data leaks: only operate on units owned by caller.
  IF NOT EXISTS (
    SELECT 1
    FROM public.units u
    WHERE u.id = p_unit_id
      AND u.owner_user_id = v_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  SELECT t.user_id
    INTO v_tenant_user_id
  FROM public.tenants t
  WHERE t.id = p_primary_tenant_id;

  IF v_tenant_user_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  SELECT u.email
    INTO v_tenant_email
  FROM public.users u
  WHERE u.id = v_tenant_user_id;

  SELECT ti.id, ti.accepted_at
    INTO v_invitation_id, v_invitation_accepted_at
  FROM public.tenant_invitations ti
  WHERE ti.owner_user_id = v_owner_user_id
    AND ti.unit_id = p_unit_id
    AND (
      -- Accepted invitation (preferred)
      (ti.accepted_by_user_id IS NOT NULL AND ti.accepted_by_user_id = v_tenant_user_id)
      -- Pending invitation (match by email)
      OR (v_tenant_email IS NOT NULL AND ti.email = v_tenant_email)
    )
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Tenant must be invited to this property before a lease can be created';
  END IF;

  IF v_invitation_accepted_at IS NULL THEN
    RAISE EXCEPTION 'Tenant invitation not accepted (pending)';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_can_create_lease(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) TO authenticated;

COMMIT;

