-- Create Storage Bucket for Bulk Property Imports
-- This migration creates a dedicated storage bucket for temporary CSV uploads during bulk imports

-- ============================================================================
-- Create bulk-imports bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bulk-imports',
  'bulk-imports',
  false, -- private bucket
  6291456, -- 6MB limit (as recommended by Supabase docs)
  ARRAY['text/csv', 'application/csv']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS Policies for bulk-imports bucket
-- ============================================================================

-- Allow authenticated property owners to upload CSV files to their own folder
-- Path structure: {user_id}/{timestamp}_{filename}.csv
CREATE POLICY "Allow owners to upload CSV to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bulk-imports'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND storage.extension(name) = 'csv'
  AND get_current_user_type() = 'OWNER'
);

-- Allow authenticated property owners to read their own CSV files
CREATE POLICY "Allow owners to read their own CSV files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bulk-imports'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND get_current_user_type() = 'OWNER'
);

-- Allow authenticated property owners to delete their own CSV files
CREATE POLICY "Allow owners to delete their own CSV files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bulk-imports'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND get_current_user_type() = 'OWNER'
);

-- Allow service_role full access for backend processing and cleanup
CREATE POLICY "Allow service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'bulk-imports')
WITH CHECK (bucket_id = 'bulk-imports');

-- ============================================================================
-- Verification queries (run manually to verify)
-- ============================================================================

-- Verify bucket exists:
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'bulk-imports';

-- Verify RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'objects'
-- AND policyname LIKE '%bulk%'
-- ORDER BY policyname;
