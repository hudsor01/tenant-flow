-- Add trash bucket for soft-delete functionality
-- This enables reversible deletion of storage objects

-- Create trash bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trash',
    'trash',
    false,  -- Trash bucket should not be public
    52428800,  -- 50MB limit (same as other buckets)
    NULL       -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policy for trash bucket - allow authenticated users to access their own trash
-- Path structure: trash/{userId}/{entityId}/filename
-- Extract userId from path and verify it matches the authenticated user
CREATE POLICY "Users can access trash bucket" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'trash'
    AND (storage.foldername(name))[1] IN (
        SELECT id FROM public.users WHERE "supabaseId" = auth.uid()::text
    )
)
WITH CHECK (
    bucket_id = 'trash'
    AND (storage.foldername(name))[1] IN (
        SELECT id FROM public.users WHERE "supabaseId" = auth.uid()::text
    )
);

-- Also allow service role for system operations
CREATE POLICY "Service role access to trash bucket" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'trash')
WITH CHECK (bucket_id = 'trash');

-- Add comment explaining the purpose
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file management, including trash bucket for soft-delete operations';

-- Add index for better performance on bucket queries
CREATE INDEX IF NOT EXISTS idx_objects_bucket_id ON storage.objects(bucket_id);

-- Verify the bucket was created
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'trash';

-- Log the creation
DO $$
BEGIN
    RAISE NOTICE 'Trash bucket created successfully for soft-delete functionality';
END $$;
