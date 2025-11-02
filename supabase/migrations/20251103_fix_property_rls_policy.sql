-- Migration: Fix Property RLS Policies to Use Correct Owner ID
-- Issue: RLS policies were checking against auth.uid() but backend inserts users.id
-- This caused ALL property creation attempts to fail RLS checks
-- Fix: Update policies to look up users.id from auth.uid() via users.supabaseId

-- Drop existing broken policies
DROP POLICY IF EXISTS "property_owner_insert" ON property;
DROP POLICY IF EXISTS "property_owner_update" ON property;
DROP POLICY IF EXISTS "property_owner_delete" ON property;

-- Create corrected INSERT policy
-- Allows authenticated users to create properties with their internal users.id
CREATE POLICY "property_owner_insert"
ON property
FOR INSERT
TO authenticated
WITH CHECK (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

COMMENT ON POLICY "property_owner_insert" ON property IS
  'SECURITY FIX: Allow users to create properties using their internal users.id (derived from auth.uid via users.supabaseId lookup)';

-- Create corrected UPDATE policy
-- Allows property owners to update only their own properties
CREATE POLICY "property_owner_update"
ON property
FOR UPDATE
TO authenticated
USING (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

COMMENT ON POLICY "property_owner_update" ON property IS
  'SECURITY FIX: Allow property owners to update their own properties using internal users.id lookup';

-- Create corrected DELETE policy
-- Allows property owners to delete only their own properties
CREATE POLICY "property_owner_delete"
ON property
FOR DELETE
TO authenticated
USING (
  "ownerId" IN (
    SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
  )
);

COMMENT ON POLICY "property_owner_delete" ON property IS
  'SECURITY FIX: Allow property owners to delete their own properties using internal users.id lookup';

-- Verify policies are correctly applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'property'
    AND policyname = 'property_owner_insert'
  ) THEN
    RAISE EXCEPTION 'property_owner_insert policy was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'property'
    AND policyname = 'property_owner_update'
  ) THEN
    RAISE EXCEPTION 'property_owner_update policy was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'property'
    AND policyname = 'property_owner_delete'
  ) THEN
    RAISE EXCEPTION 'property_owner_delete policy was not created';
  END IF;

  RAISE NOTICE 'Property RLS policies successfully updated';
END $$;
