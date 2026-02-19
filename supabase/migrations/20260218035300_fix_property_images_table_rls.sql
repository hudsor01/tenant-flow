-- Migration: Fix property_images Table RLS Policies
-- Purpose:
--   The property_images table has RLS enabled but is missing SELECT, INSERT,
--   and DELETE policies. This causes all frontend queries to return empty
--   results (RLS deny-by-default when no policy matches).
--
--   The UPDATE policy exists but nothing else. This migration adds:
--   - SELECT: property owners can view their property images
--   - INSERT: property owners can add images to their properties
--   - DELETE: property owners can delete their property images
--
-- Note: The trigger handle_property_image_upload() uses SECURITY DEFINER
-- so it bypasses RLS for the INSERT it does. The INSERT policy here covers
-- direct client-side inserts if needed in the future.
--
-- Affected table: public.property_images

-- Drop existing policies first to make this migration idempotent
DROP POLICY IF EXISTS "property_images_select_owner" ON public.property_images;
DROP POLICY IF EXISTS "property_images_insert_owner" ON public.property_images;
DROP POLICY IF EXISTS "property_images_delete_owner" ON public.property_images;

-- Policy: Authenticated property owners can view images for their properties
CREATE POLICY "property_images_select_owner"
ON public.property_images
FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT id
    FROM public.properties
    WHERE owner_user_id = (SELECT auth.uid())
      AND status != 'inactive'
  )
);

-- Policy: Authenticated property owners can insert images for their properties
-- (Covers direct client inserts; the trigger uses SECURITY DEFINER and bypasses RLS)
CREATE POLICY "property_images_insert_owner"
ON public.property_images
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id
    FROM public.properties
    WHERE owner_user_id = (SELECT auth.uid())
      AND status != 'inactive'
  )
);

-- Policy: Authenticated property owners can delete images for their properties
CREATE POLICY "property_images_delete_owner"
ON public.property_images
FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT id
    FROM public.properties
    WHERE owner_user_id = (SELECT auth.uid())
      AND status != 'inactive'
  )
);
