-- Create lease-documents storage bucket for storing generated lease PDFs
-- File size limit: 512 KB (500 KB with safety margin)
-- Typical PDF size: 25-35 KB, Maximum realistic: 50-60 KB, Safety margin: 10x

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lease-documents',
  'lease-documents',
  false,  -- Private bucket (requires authentication)
  524288,  -- 512 KB = 524,288 bytes (10x safety margin over 50 KB max realistic size)
  ARRAY['application/pdf']::text[]
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Landlords (property owners) can read their own lease documents
-- Path structure: lease-documents/{userId}/{leaseId}/lease-{timestamp}-{uuid}.pdf
CREATE POLICY "Landlords can read own lease documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Tenants can read leases they're associated with
-- Checks if authenticated user is the tenant_id in the lease record
CREATE POLICY "Tenants can read their lease documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND EXISTS (
    SELECT 1 FROM public.lease
    WHERE id = (storage.foldername(name))[2]  -- Extract leaseId from path
    AND tenant_id = auth.uid()::text
  )
);

-- RLS Policy: Backend service can insert/update/delete (service role bypasses RLS automatically)
-- This policy is for application-level access control
CREATE POLICY "Service can manage lease documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lease-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
