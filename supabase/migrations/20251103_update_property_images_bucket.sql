-- Migration: Update property-images bucket to support HEIC and increase file size limit
-- Date: 2025-11-03
-- Description: Adds HEIC support and increases file size limit to 10MB for property images

-- Update property-images bucket configuration
UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
WHERE id = 'property-images';
