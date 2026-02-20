-- Migration: Fix Property Images Storage RLS Policies
-- Purpose:
--   The original storage RLS policies (20251202150000) referenced p.property_owner_id
--   which was dropped in migration 20251215000000. This caused the INSERT, UPDATE,
--   and DELETE policies to never be created, preventing authenticated users from
--   uploading property images.
--
--   This migration drops any existing (broken) policies and recreates them using
--   the correct column: p.owner_user_id = (SELECT auth.uid())
--
-- Affected table: storage.objects (property-images bucket)

-- Drop old policies if they somehow exist (e.g., partially applied)
DROP POLICY IF EXISTS "Property owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can update images" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can delete images" ON storage.objects;

-- Policy: Authenticated property owners can upload images to their own properties
-- Path structure: property-images/{property_id}/{filename}
-- The first folder segment is the property UUID, owned by the current user
CREATE POLICY "Property owners can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT p.id
    FROM public.properties p
    WHERE p.owner_user_id = (SELECT auth.uid())
      AND p.status != 'inactive'
  )
);

-- Policy: Property owners can update (replace) their uploaded images
CREATE POLICY "Property owners can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT p.id
    FROM public.properties p
    WHERE p.owner_user_id = (SELECT auth.uid())
      AND p.status != 'inactive'
  )
)
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT p.id
    FROM public.properties p
    WHERE p.owner_user_id = (SELECT auth.uid())
      AND p.status != 'inactive'
  )
);

-- Policy: Property owners can delete their uploaded images
CREATE POLICY "Property owners can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT p.id
    FROM public.properties p
    WHERE p.owner_user_id = (SELECT auth.uid())
      AND p.status != 'inactive'
  )
);
