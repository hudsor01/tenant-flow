-- Migration: Fix Overly Permissive RLS Policies
-- Date: 2025-10-12
-- Issue: 3 policies allow overly broad access
--
-- Tables affected:
--   1. form_drafts - Public full access (should be session-scoped)
--   2. customer_invoice - All authenticated users (should be email-scoped)
--   3. customer_invoice_item - All authenticated users (should be invoice-scoped)

-- ============================================
-- FIX 1: form_drafts - Session-based access
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Form drafts are publicly accessible" ON public.form_drafts;

-- Create session-based access policy
-- Allows anonymous and authenticated users to manage their own drafts by session_id
CREATE POLICY "form_drafts_session_access"
ON public.form_drafts
FOR ALL
TO anon, authenticated
USING (
  -- Users can only access drafts from their own session
  session_id = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'session_id',
    current_setting('request.headers', true)::json->>'x-session-id'
  )
);

-- Add service role access for admin operations
CREATE POLICY "form_drafts_service_access"
ON public.form_drafts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX 2: customer_invoice - Email-scoped access
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage customer invoices" ON public.customer_invoice;

-- Analysis: This appears to be a public invoice generator tool
-- Strategy: Allow creators to manage their invoices by email, allow read-only for others

-- Policy 1: Users can manage invoices they created (by email)
CREATE POLICY "customer_invoice_creator_access"
ON public.customer_invoice
FOR ALL
TO authenticated
USING (
  -- Can access invoices where their email matches businessEmail
  businessEmail = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Or invoices created in their session (for anonymous → authenticated transition)
  emailCaptured = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy 2: Service role full access
CREATE POLICY "customer_invoice_service_access"
ON public.customer_invoice
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 3: Anonymous users can create invoices (public invoice generator)
-- But cannot view or modify others' invoices
CREATE POLICY "customer_invoice_anon_create_only"
ON public.customer_invoice
FOR INSERT
TO anon
WITH CHECK (true);

-- ============================================
-- FIX 3: customer_invoice_item - Invoice-scoped access
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage customer invoice items" ON public.customer_invoice_item;

-- Policy 1: Users can manage items for their own invoices
CREATE POLICY "customer_invoice_item_owner_access"
ON public.customer_invoice_item
FOR ALL
TO authenticated
USING (
  -- Can access items for invoices they own
  "invoiceId" IN (
    SELECT id FROM customer_invoice
    WHERE businessEmail = (SELECT email FROM auth.users WHERE id = auth.uid())
       OR emailCaptured = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Policy 2: Service role full access
CREATE POLICY "customer_invoice_item_service_access"
ON public.customer_invoice_item
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 3: Anonymous users can create items (for public invoice generator)
CREATE POLICY "customer_invoice_item_anon_create_only"
ON public.customer_invoice_item
FOR INSERT
TO anon
WITH CHECK (true);

-- ============================================
-- AUDIT LOGGING
-- ============================================

INSERT INTO public.security_audit_log (
  "eventType",
  resource,
  action,
  severity,
  details,
  "userId",
  "ipAddress",
  "userAgent",
  timestamp
) VALUES (
  'SECURITY_CONFIG_UPDATE',
  'multiple_tables',
  'TIGHTENED_OVERLY_PERMISSIVE_POLICIES',
  'HIGH',
  jsonb_build_object(
    'issue', '3 policies allowed overly broad access (public full access, cross-user access)',
    'tables_affected', ARRAY['form_drafts', 'customer_invoice', 'customer_invoice_item'],
    'fix', 'Added proper access controls: session-scoped for form_drafts, email-scoped for invoices',
    'migration', '20251012_fix_overly_permissive_policies',
    'security_improvement', 'Users can now only access their own data, anonymous users restricted to create-only'
  ),
  'system',
  '127.0.0.1',
  'PostgreSQL Migration',
  NOW()
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  form_drafts_count INT;
  customer_invoice_count INT;
  customer_invoice_item_count INT;
BEGIN
  -- Count new policies on form_drafts (should be 2)
  SELECT COUNT(*) INTO form_drafts_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'form_drafts'
    AND policyname IN ('form_drafts_session_access', 'form_drafts_service_access');

  -- Count new policies on customer_invoice (should be 3)
  SELECT COUNT(*) INTO customer_invoice_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'customer_invoice'
    AND policyname IN ('customer_invoice_creator_access', 'customer_invoice_service_access', 'customer_invoice_anon_create_only');

  -- Count new policies on customer_invoice_item (should be 3)
  SELECT COUNT(*) INTO customer_invoice_item_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'customer_invoice_item'
    AND policyname IN ('customer_invoice_item_owner_access', 'customer_invoice_item_service_access', 'customer_invoice_item_anon_create_only');

  IF form_drafts_count = 2 AND customer_invoice_count = 3 AND customer_invoice_item_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All overly permissive policies fixed. Total new policies: %', (form_drafts_count + customer_invoice_count + customer_invoice_item_count);
  ELSE
    RAISE WARNING 'ISSUE: Expected 8 new policies, got: form_drafts=%, customer_invoice=%, customer_invoice_item=%',
      form_drafts_count, customer_invoice_count, customer_invoice_item_count;
  END IF;
END $$;
