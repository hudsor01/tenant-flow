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

-- Add RLS policy for trash bucket - allow authenticated users with proper org_id
CREATE POLICY "Users can access trash bucket" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'trash'
    AND auth.uid()::text = (storage.foldername(name))[1] -- User can access their own org's trash
)
WITH CHECK (
    bucket_id = 'trash'
    AND auth.uid()::text = (storage.foldername(name))[1]  -- User can write to their own org's trash
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
