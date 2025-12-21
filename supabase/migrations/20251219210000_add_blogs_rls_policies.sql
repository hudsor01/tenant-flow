-- ============================================================================
-- Blogs Table - Add RLS Policies
-- ============================================================================
-- Purpose: Enable RLS and add policies for public blog access
-- Tables: public.blogs
-- ============================================================================

-- Enable RLS on blogs table
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policy - Public can read published blogs
-- ============================================================================
CREATE POLICY "blogs_select_published"
ON public.blogs
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
);

COMMENT ON POLICY "blogs_select_published" ON public.blogs IS
'Anonymous and authenticated users can read published blogs';

-- ============================================================================
-- INSERT Policy - Service role only (admin content management)
-- ============================================================================
CREATE POLICY "blogs_insert_service_role"
ON public.blogs
FOR INSERT
TO service_role
WITH CHECK (true);

COMMENT ON POLICY "blogs_insert_service_role" ON public.blogs IS
'Only service role can insert blogs (admin-only content management)';

-- ============================================================================
-- UPDATE Policy - Service role only (admin content management)
-- ============================================================================
CREATE POLICY "blogs_update_service_role"
ON public.blogs
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "blogs_update_service_role" ON public.blogs IS
'Only service role can update blogs (admin-only content management)';

-- Note: DELETE policy already exists in migration 20251220030000_fix_rls_policy_gaps.sql
