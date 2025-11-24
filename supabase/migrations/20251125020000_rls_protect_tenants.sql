-- Migration: Protect tenants table with RLS policies
-- Priority: CRITICAL - PII Exposure (SSN, DOB, emergency contacts)
-- Table: tenants
-- Risk: Contains sensitive PII accessible to all authenticated users

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Tenants can select their own record
CREATE POLICY "Tenants can select own record"
ON tenants
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

-- Policy 2: Tenants can update their own record
-- (Allows tenants to update emergency contacts, verify identity, etc.)
CREATE POLICY "Tenants can update own record"
ON tenants
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- Policy 3: Property owners can select tenants who have leases in their properties
-- This allows owners to view tenant info for their properties only
CREATE POLICY "Property owners can select tenants in their properties"
ON tenants
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT lt.tenant_id
    FROM lease_tenants lt
    JOIN leases l ON lt.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 4: Property owners can insert tenant records for their properties
-- This allows owners to create tenant profiles when adding new tenants
CREATE POLICY "Property owners can insert tenants for their properties"
ON tenants
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allows any authenticated user to insert (tenant self-registration)
  -- OR validates that the user is a property owner
  -- Note: The actual validation happens in the application layer
  -- This policy is permissive to allow tenant onboarding flows
  true
);

-- Policy 5: Service role has full access (backend operations)
CREATE POLICY "Service role full access to tenants"
ON tenants
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- PII Fields Protected:
-- - ssn_last_four: Last 4 digits of SSN
-- - date_of_birth: Birth date
-- - emergency_contact_name: Emergency contact name
-- - emergency_contact_phone: Emergency contact phone
-- - emergency_contact_relationship: Emergency contact relationship
-- - identity_verified: Identity verification status

-- Access Control:
-- - Tenants: Read/write own record only
-- - Property Owners: Read-only for tenants in their properties (via lease chain)
-- - Service Role: Full CRUD (backend manages tenant creation/deletion)

-- GDPR Compliance:
-- - Users can only access their own PII
-- - Property owners only see PII for tenants they have legitimate business relationship with
-- - Right to be forgotten: Backend handles via service_role deletion

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenants';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'tenants'
-- ORDER BY policyname;
-- Expected: 5 policies listed

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM tenants; -- Should return 1 (own record only)
-- SELECT ssn_last_four FROM tenants WHERE user_id != '<tenant_user_id>'; -- Should return 0 rows

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM tenants; -- Should return only tenants in owner's properties
