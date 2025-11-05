-- Create tenant_emergency_contact table
-- Purpose: Store emergency contact information for tenants
-- Relationship: One-to-one with tenant table

-- Create table
CREATE TABLE IF NOT EXISTS tenant_emergency_contact (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL CHECK (length(contact_name) > 0 AND length(contact_name) <= 255),
  relationship TEXT NOT NULL CHECK (length(relationship) > 0 AND length(relationship) <= 100),
  phone_number TEXT NOT NULL CHECK (length(phone_number) >= 10 AND length(phone_number) <= 20),
  email TEXT CHECK (email IS NULL OR (length(email) > 0 AND length(email) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on tenant_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_emergency_contact_tenant_id
  ON tenant_emergency_contact(tenant_id);

-- Enable RLS
ALTER TABLE tenant_emergency_contact ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "tenant_emergency_contact_select_own" ON tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_insert_own" ON tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_update_own" ON tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_delete_own" ON tenant_emergency_contact;

-- RLS Policies: Tenants can only access their own emergency contact
-- SELECT: Tenant can view their own emergency contact
CREATE POLICY "tenant_emergency_contact_select_own"
  ON tenant_emergency_contact
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant t
      WHERE t.id = tenant_emergency_contact.tenant_id
      AND t."ownerId" = auth.uid()
    )
  );

-- INSERT: Tenant can create their own emergency contact (one-to-one enforced by UNIQUE constraint)
CREATE POLICY "tenant_emergency_contact_insert_own"
  ON tenant_emergency_contact
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant t
      WHERE t.id = tenant_emergency_contact.tenant_id
      AND t."ownerId" = auth.uid()
    )
  );

-- UPDATE: Tenant can update their own emergency contact
CREATE POLICY "tenant_emergency_contact_update_own"
  ON tenant_emergency_contact
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant t
      WHERE t.id = tenant_emergency_contact.tenant_id
      AND t."ownerId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant t
      WHERE t.id = tenant_emergency_contact.tenant_id
      AND t."ownerId" = auth.uid()
    )
  );

-- DELETE: Tenant can delete their own emergency contact
CREATE POLICY "tenant_emergency_contact_delete_own"
  ON tenant_emergency_contact
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant t
      WHERE t.id = tenant_emergency_contact.tenant_id
      AND t."ownerId" = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_emergency_contact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_emergency_contact_updated_at ON tenant_emergency_contact;
CREATE TRIGGER tenant_emergency_contact_updated_at
  BEFORE UPDATE ON tenant_emergency_contact
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_emergency_contact_updated_at();

-- Verification: Check table exists and RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_emergency_contact') THEN
    RAISE EXCEPTION 'Table tenant_emergency_contact was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_emergency_contact' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'RLS is not enabled on tenant_emergency_contact';
  END IF;

  -- Verify all 4 policies exist
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_emergency_contact') < 4 THEN
    RAISE EXCEPTION 'Not all RLS policies were created for tenant_emergency_contact';
  END IF;

  RAISE NOTICE '✅ tenant_emergency_contact table created successfully';
  RAISE NOTICE '✅ RLS enabled and all 4 policies created';
  RAISE NOTICE '✅ Updated_at trigger created';
END $$;
