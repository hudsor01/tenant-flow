-- Migration: Property Images Auto-Sync Trigger
-- Purpose: Auto-create property_images records when files uploaded to storage
-- Applied manually to remote DB on 2025-12-03
--
-- Note: RLS policies for property_images already exist (property_images_select_owner, etc.)
-- This migration only adds the missing trigger function

-- ============================================================================
-- 1. CREATE AUTO-SYNC TRIGGER FUNCTION
-- ============================================================================

-- Function: Auto-create property_images record when image uploaded to storage
-- Triggered on UPDATE because storage API performs INSERT then UPDATE (metadata)
CREATE OR REPLACE FUNCTION public.handle_property_image_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_property_id uuid;
  v_image_url text;
  v_next_display_order integer;
BEGIN
  -- Only process property-images bucket
  IF NEW.bucket_id != 'property-images' THEN
    RETURN NEW;
  END IF;

  -- Only process when metadata is populated (second operation)
  -- The storage API does INSERT first, then UPDATE with metadata
  IF NEW.metadata IS NULL OR OLD.metadata IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract property_id from folder structure (e.g., "{property_id}/filename.webp")
  v_property_id := (storage.foldername(NEW.name))[1]::uuid;

  -- Skip if we can't extract a valid property_id
  IF v_property_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Construct public URL for the image
  v_image_url := CONCAT(
    'https://bshjmbshupiibfiewpxb.supabase.co',
    '/storage/v1/object/public/property-images/',
    NEW.name
  );

  -- Get next display_order for this property
  SELECT COALESCE(MAX(display_order), -1) + 1
  INTO v_next_display_order
  FROM public.property_images
  WHERE property_id = v_property_id;

  -- Insert record into property_images table
  INSERT INTO public.property_images (
    property_id,
    image_url,
    display_order,
    created_at
  ) VALUES (
    v_property_id,
    v_image_url,
    v_next_display_order,
    NOW()
  )
  -- Skip if record already exists (idempotent)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CREATE TRIGGER ON STORAGE.OBJECTS
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_property_image_upload ON storage.objects;

-- Create trigger on UPDATE (metadata populated on second operation)
CREATE TRIGGER on_property_image_upload
  AFTER UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_property_image_upload();

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on trigger function to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_property_image_upload() TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Direct upload flow:
-- 1. Client uploads to storage: property-images/{property_id}/{filename}
-- 2. Storage INSERT succeeds, then UPDATE with metadata
-- 3. Trigger fires on UPDATE, creates property_images record
-- 4. Frontend queries property_images table via Supabase client (RLS enforced)
