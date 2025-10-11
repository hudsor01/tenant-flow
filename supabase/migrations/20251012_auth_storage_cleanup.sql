-- ============================================================================
-- AUTH & STORAGE CLEANUP AND MAINTENANCE
-- ============================================================================
-- This migration performs routine cleanup tasks:
-- 1. Remove old refresh tokens (>30 days) - 158 tokens
-- 2. Clean up old audit log entries (>90 days)
-- 3. Verify storage bucket security
-- 4. Add storage bucket file size limits
-- ============================================================================

\echo '=== 1. CLEANUP OLD REFRESH TOKENS ==='
-- Remove refresh tokens older than 30 days
-- These are no longer valid and just consume database space
DELETE FROM auth.refresh_tokens
WHERE created_at < now() - interval '30 days';

-- Show results
SELECT
  'Remaining Refresh Tokens' as metric,
  count(*) as value
FROM auth.refresh_tokens
UNION ALL
SELECT
  'Active Tokens (Last 7 Days)',
  count(*) FILTER (WHERE created_at > now() - interval '7 days')
FROM auth.refresh_tokens;

\echo ''
\echo '=== 2. CLEANUP OLD AUDIT LOG ENTRIES ==='
-- Keep only 90 days of audit logs for compliance
DELETE FROM auth.audit_log_entries
WHERE created_at < now() - interval '90 days';

-- Show results
SELECT
  count(*) as remaining_audit_entries
FROM auth.audit_log_entries;

\echo ''
\echo '=== 3. ADD FILE SIZE LIMITS TO STORAGE BUCKETS ==='
-- Prevent abuse by limiting file sizes
-- 10MB for maintenance photos, 5MB for property images, 10MB for tenant documents

UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'maintenance-photos'
AND file_size_limit IS NULL;

UPDATE storage.buckets
SET file_size_limit = 5242880   -- 5MB in bytes
WHERE id = 'property-images'
AND file_size_limit IS NULL;

UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'tenant-documents'
AND file_size_limit IS NULL;

-- Show bucket configuration
SELECT
  id as bucket_name,
  public as is_public,
  file_size_limit,
  CASE
    WHEN file_size_limit IS NOT NULL THEN pg_size_pretty(file_size_limit::bigint)
    ELSE 'No limit'
  END as size_limit_readable
FROM storage.buckets
ORDER BY id;

\echo ''
\echo '=== 4. ADD MIME TYPE RESTRICTIONS ==='
-- Restrict file types for security
-- maintenance-photos: Only images
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]
WHERE id = 'maintenance-photos'
AND (allowed_mime_types IS NULL OR array_length(allowed_mime_types, 1) IS NULL);

-- property-images: Only images
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]
WHERE id = 'property-images'
AND (allowed_mime_types IS NULL OR array_length(allowed_mime_types, 1) IS NULL);

-- tenant-documents: Images and PDFs
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
]
WHERE id = 'tenant-documents'
AND (allowed_mime_types IS NULL OR array_length(allowed_mime_types, 1) IS NULL);

\echo ''
\echo '=== 5. VERIFY STORAGE RLS POLICIES ==='
-- Ensure all storage tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets');

-- Count policies per table
SELECT
  schemaname,
  tablename,
  count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
GROUP BY schemaname, tablename
ORDER BY tablename;

\echo ''
\echo '=== 6. VERIFY AUTH TRIGGER IS ACTIVE ==='
-- Confirm handle_new_user trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
AND trigger_name = 'on_auth_user_created';

\echo ''
\echo '=== 7. FINAL SYNC VERIFICATION ==='
-- Verify all auth.users are synced to public.users
SELECT
  'Auth Users' as source,
  count(*) as count
FROM auth.users
UNION ALL
SELECT
  'Public Users',
  count(*)
FROM public.users
UNION ALL
SELECT
  'Users NOT Synced',
  count(*)
FROM auth.users au
LEFT JOIN public.users pu ON au.id::text = pu."supabaseId"
WHERE pu."supabaseId" IS NULL;

\echo ''
\echo '=== CLEANUP COMPLETE ==='
