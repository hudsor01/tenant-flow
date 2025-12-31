-- Migration: Fix get_tenants_with_lease_by_owner RPC function
-- This function was using property_owners table which was renamed to stripe_connected_accounts.
-- Update to use properties.owner_user_id instead of joining through property_owners.

CREATE OR REPLACE FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid")
RETURNS SETOF "uuid"
LANGUAGE "sql" STABLE
SET "search_path" TO 'public'
AS $$
  SELECT DISTINCT t.id
  FROM tenants t
  INNER JOIN lease_tenants lt ON lt.tenant_id = t.id
  INNER JOIN leases l ON l.id = lt.lease_id
  INNER JOIN units u ON u.id = l.unit_id
  INNER JOIN properties p ON p.id = u.property_id
  WHERE p.owner_user_id = p_user_id
    AND p_user_id = (SELECT auth.uid())  -- Authorization: only allow querying your own data
    AND l.lease_status = 'active';
$$;

COMMENT ON FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid") IS
'Returns tenant IDs with active leases for properties owned by the given user.
SECURITY INVOKER: Runs with caller permissions.
Authorization: Only returns data when p_user_id matches auth.uid().
Updated to use properties.owner_user_id instead of property_owners table.';
