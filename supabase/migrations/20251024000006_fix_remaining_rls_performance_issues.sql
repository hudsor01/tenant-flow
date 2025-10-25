-- Migration: Fix Remaining RLS Performance Issues (Corrected Column Names)
-- Date: 2025-01-24
-- Description: Fix policies that failed due to column name mismatches

-- =====================================================
-- FIX POLICIES WITH CORRECT COLUMN NAMES
-- =====================================================

-- Table: form_drafts
-- Note: This table doesn't have userId, only session_id
-- The policy should just check session_id
DROP POLICY IF EXISTS "form_drafts_session_access" ON public.form_drafts;
CREATE POLICY "form_drafts_session_access" ON public.form_drafts
FOR ALL
TO authenticated
USING (
  session_id = (SELECT current_setting('request.jwt.claims', true)::json->>'session_id')
)
WITH CHECK (
  session_id = (SELECT current_setting('request.jwt.claims', true)::json->>'session_id')
);

-- Table: customer_invoice
-- Note: customer_invoice doesn't have a user ownership column
-- This table appears to be for invoice generation, not user-specific
-- Skip RLS policy - let service_role handle access

-- Table: customer_invoice_item
-- Skip - depends on customer_invoice which has no user ownership

-- Table: documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
FOR SELECT
TO authenticated
USING (user_id::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;
CREATE POLICY "Users can upload documents" ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (user_id::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can soft-delete documents" ON public.documents;
CREATE POLICY "Users can soft-delete documents" ON public.documents
FOR UPDATE
TO authenticated
USING (user_id::text = (SELECT auth.uid()::text))
WITH CHECK (user_id::text = (SELECT auth.uid()::text));

-- Table: rent_subscription
-- Use landlordId instead of propertyId
DROP POLICY IF EXISTS "rent_subscription_select_consolidated" ON public.rent_subscription;
CREATE POLICY "rent_subscription_select_consolidated" ON public.rent_subscription
FOR SELECT
TO authenticated
USING (
  -- Landlords can view subscriptions they own
  "landlordId"::text = (SELECT auth.uid()::text)
  OR
  -- Tenants can view their own subscriptions
  "tenantId"::text = (SELECT auth.uid()::text)
);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Check for remaining duplicate policies:
-- SELECT tablename, cmd, roles, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND permissive = 'PERMISSIVE'
-- GROUP BY tablename, cmd, roles
-- HAVING COUNT(*) > 1
-- ORDER BY tablename, cmd;
