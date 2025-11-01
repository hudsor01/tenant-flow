-- Migration: Add missing indexes for performance
-- Date: 2025-01-11
--
-- PERFORMANCE FIX: Add index for foreign key without covering index
-- Supabase Performance Advisory: Foreign keys without indexes cause slow queries
--
-- Reference: https://supabase.com/docs/guides/database/database-linter

-- ============================================================================
-- Add index for property_images.uploadedById foreign key
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_property_images_uploaded_by_id 
ON public.property_images("uploadedById");

COMMENT ON INDEX idx_property_images_uploaded_by_id IS 'PERFORMANCE FIX 2025-01-11: Index for uploadedById foreign key to improve join performance';
