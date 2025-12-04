-- Migration: Property Images Storage Bucket & Auto-Sync Trigger
-- Purpose:
--   1. Create property-images storage bucket
--   2. Set up storage RLS policies
--   3. Auto-create property_images records when files uploaded to storage
--
-- Note: RLS policies for property_images TABLE already exist (property_images_select_owner, etc.)
-- This migration handles STORAGE policies and the auto-sync trigger

-- ============================================================================
-- 0. CREATE STORAGE BUCKET
-- ============================================================================

-- Create property-images bucket (public for image serving)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,  -- Public bucket for serving images
  10485760,  -- 10 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 0.1 STORAGE RLS POLICIES
-- ============================================================================

-- Note: storage.objects has RLS enabled by default in Supabase

-- Policy: Anyone can view property images (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public read access for property images'
  ) THEN
    CREATE POLICY "Public read access for property images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'property-images');
  END IF;
END $$;

-- Policy: Property owners can upload images to their properties
-- Path structure: property-images/{property_id}/{filename}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Property owners can upload images'
  ) THEN
    CREATE POLICY "Property owners can upload images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'property-images'
      AND (storage.foldername(name))[1]::uuid IN (
        SELECT p.id FROM public.properties p
        WHERE p.property_owner_id = public.get_current_property_owner_id()
      )
    );
  END IF;
END $$;

-- Policy: Property owners can update their images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Property owners can update images'
  ) THEN
    CREATE POLICY "Property owners can update images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'property-images'
      AND (storage.foldername(name))[1]::uuid IN (
        SELECT p.id FROM public.properties p
        WHERE p.property_owner_id = public.get_current_property_owner_id()
      )
    );
  END IF;
END $$;

-- Policy: Property owners can delete their images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Property owners can delete images'
  ) THEN
    CREATE POLICY "Property owners can delete images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'property-images'
      AND (storage.foldername(name))[1]::uuid IN (
        SELECT p.id FROM public.properties p
        WHERE p.property_owner_id = public.get_current_property_owner_id()
      )
    );
  END IF;
END $$;

-- ============================================================================
-- 1. CREATE AUTO-SYNC TRIGGER FUNCTION
-- ============================================================================

-- Function: Auto-create property_images record when image uploaded to storage
-- Handles both INSERT and UPDATE triggers for maximum compatibility
--
-- IMPORTANT: Stores relative path in image_url, NOT full URL
-- Frontend uses supabase.storage.from('property-images').getPublicUrl(path) to construct URL
-- This makes it environment-agnostic (works for both local and production)
CREATE OR REPLACE FUNCTION public.handle_property_image_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_property_id uuid;
  v_storage_path text;
  v_next_display_order integer;
BEGIN
  -- Only process property-images bucket
  IF NEW.bucket_id != 'property-images' THEN
    RETURN NEW;
  END IF;

  -- For UPDATE: only process when metadata is populated for the first time
  -- For INSERT: process if we have the file name
  IF TG_OP = 'UPDATE' THEN
    -- Skip if metadata was already set (prevent duplicate processing)
    IF OLD.metadata IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Extract property_id from folder structure (e.g., "{property_id}/filename.webp")
  BEGIN
    v_property_id := (storage.foldername(NEW.name))[1]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    -- Skip if property_id is not a valid UUID
    RETURN NEW;
  END;

  -- Skip if we can't extract a valid property_id
  IF v_property_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Store relative path (e.g., "{property_id}/{filename}")
  -- Frontend constructs full URL using Supabase client
  v_storage_path := NEW.name;

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
    v_storage_path,
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

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS on_property_image_upload ON storage.objects;
DROP TRIGGER IF EXISTS on_property_image_insert ON storage.objects;

-- Create trigger on INSERT (handles immediate uploads)
CREATE TRIGGER on_property_image_insert
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_property_image_upload();

-- Create trigger on UPDATE (handles metadata population)
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
