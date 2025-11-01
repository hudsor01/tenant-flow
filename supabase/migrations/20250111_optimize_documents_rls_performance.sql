-- Migration: Optimize documents table RLS performance  
-- Date: 2025-01-11
--
-- PERFORMANCE FIX: Optimize auth function calls in RLS policies
-- Issue: auth.uid() is re-evaluated for each row causing slow queries at scale
-- Solution: Use (select auth.uid()) to evaluate once per query
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- Drop existing documents RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can soft-delete documents" ON documents;

-- ============================================================================
-- Create optimized documents RLS policies
-- ============================================================================

-- SELECT: Users can view their own documents (optimized)
CREATE POLICY "Users can view their own documents"
ON documents
FOR SELECT
TO authenticated
USING (
  user_id = (select auth.uid())
);

-- INSERT: Users can upload documents (optimized)
CREATE POLICY "Users can upload documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = (select auth.uid())) 
  AND (entity_type = ANY (ARRAY['lease'::text, 'receipt'::text]))
);

-- UPDATE: Users can soft-delete documents (optimized)
CREATE POLICY "Users can soft-delete documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  user_id = (select auth.uid())
)
WITH CHECK (
  user_id = (select auth.uid())
);

-- ============================================================================
-- Comments for verification
-- ============================================================================

COMMENT ON POLICY "Users can view their own documents" ON documents IS 'PERFORMANCE FIX 2025-01-11: Optimized auth.uid() call with (select auth.uid())';
COMMENT ON POLICY "Users can upload documents" ON documents IS 'PERFORMANCE FIX 2025-01-11: Optimized auth.uid() call with (select auth.uid())';
COMMENT ON POLICY "Users can soft-delete documents" ON documents IS 'PERFORMANCE FIX 2025-01-11: Optimized auth.uid() call with (select auth.uid())';
