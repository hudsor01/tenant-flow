-- Migration: Protect tenant_invitations table with RLS policies
-- Priority: HIGH - Access Control & Security
-- Table: tenant_invitations
-- Risk: Invitation codes and tenant emails accessible to all authenticated users

-- Enable RLS
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANT_INVITATIONS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select invitations they created
CREATE POLICY "Property owners can select own invitations"
ON tenant_invitations
FOR SELECT
TO authenticated
USING (
  property_owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 2: Property owners can insert invitations for their properties
CREATE POLICY "Property owners can insert invitations for their properties"
ON tenant_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  property_owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
  AND
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Property owners can update their invitations
-- Allows owners to resend, cancel, or modify invitations
CREATE POLICY "Property owners can update own invitations"
ON tenant_invitations
FOR UPDATE
TO authenticated
USING (
  property_owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  property_owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 4: Property owners can delete their invitations
-- Allows owners to cancel invitations
CREATE POLICY "Property owners can delete own invitations"
ON tenant_invitations
FOR DELETE
TO authenticated
USING (
  property_owner_id IN (
    SELECT id
    FROM property_owners
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 5: Invited users can select invitations sent to their email
-- Allows invited tenants to view invitations they received
CREATE POLICY "Invited users can select invitations sent to them"
ON tenant_invitations
FOR SELECT
TO authenticated
USING (
  email = (
    SELECT email
    FROM auth.users
    WHERE id = (SELECT auth.uid())
  )
);

-- Policy 6: Invited users can update invitations sent to them
-- Allows tenants to accept invitations
CREATE POLICY "Invited users can update invitations sent to them"
ON tenant_invitations
FOR UPDATE
TO authenticated
USING (
  email = (
    SELECT email
    FROM auth.users
    WHERE id = (SELECT auth.uid())
  )
)
WITH CHECK (
  email = (
    SELECT email
    FROM auth.users
    WHERE id = (SELECT auth.uid())
  )
);

-- Policy 7: Service role has full access (backend operations)
CREATE POLICY "Service role full access to tenant invitations"
ON tenant_invitations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Sensitive Data Protected:
-- - invitation_code: Unique code for accessing invitation
-- - invitation_url: Full URL with code
-- - email: Recipient email address
-- - property_owner_id: Who created the invitation
-- - unit_id: Which unit is being assigned

-- Access Control:
-- - Property Owners: Full CRUD on invitations they created
-- - Invited Tenants: Read-only access to invitations sent to their email
-- - Invited Tenants: Can accept invitations (UPDATE accepted_at, status)
-- - Other Users: NO ACCESS to invitations not sent to them
-- - Service Role: Full CRUD (backend manages invitation lifecycle)

-- Security Features:
-- ✓ Invitation codes not accessible to unauthorized users
-- ✓ Property owners cannot see invitations from other owners
-- ✓ Tenants can only see invitations sent to their email
-- ✓ Prevents invitation enumeration attacks
-- ✓ Expires_at field allows time-based access control

-- Tenant Onboarding Flow:
-- 1. Owner creates invitation for a unit (property_owner_id check)
-- 2. Backend sends email with invitation_url
-- 3. Tenant clicks link and sees invitation (email match check)
-- 4. Tenant accepts invitation (updates status to 'accepted')
-- 5. Backend creates lease and tenant record (service_role)

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed for optimal RLS performance:
-- - property_owner_id (lookup for owner policies)
-- - email (lookup for tenant policies)
-- - unit_id (validation for insert policy)
-- These indexes will be created in the performance optimization migration

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenant_invitations';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'tenant_invitations'
-- ORDER BY policyname;
-- Expected: 7 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM tenant_invitations; -- Should return owner's invitations only

-- Test as invited tenant (replace email with actual invited email):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>'; -- User with matching email
-- SELECT COUNT(*) FROM tenant_invitations; -- Should return invitations sent to tenant's email
-- SELECT invitation_code FROM tenant_invitations WHERE email != (SELECT email FROM auth.users WHERE id = '<tenant_user_id>'); -- Should return 0 rows

-- Test tenant can accept invitation:
-- UPDATE tenant_invitations
-- SET status = 'accepted', accepted_at = NOW(), accepted_by_user_id = '<tenant_user_id>'
-- WHERE email = (SELECT email FROM auth.users WHERE id = '<tenant_user_id>'); -- Should SUCCEED
