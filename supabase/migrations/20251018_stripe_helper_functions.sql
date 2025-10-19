-- Migration: Additional Stripe Helper Functions
-- Description: Missing helper functions for access control service
-- Author: Production Implementation
-- Date: 2025-10-18
-- Dependencies: 20251018_stripe_query_functions.sql

-- ============================================================================
-- GET USER ID BY STRIPE CUSTOMER ID
-- ============================================================================
-- Reverse lookup: Get Supabase user ID from Stripe customer ID
-- Used by: Webhook handlers, access control service

CREATE OR REPLACE FUNCTION public.get_user_id_by_stripe_customer(
  p_stripe_customer_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Query stripe.customers table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'customers'
  ) THEN
    EXECUTE format(
      'SELECT user_id FROM stripe.customers WHERE id = $1 LIMIT 1'
    ) USING p_stripe_customer_id INTO v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_stripe_customer(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_stripe_customer(TEXT) TO service_role;

COMMENT ON FUNCTION public.get_user_id_by_stripe_customer IS
'Reverse lookup to get Supabase user ID from Stripe customer ID. Used by webhook handlers.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration adds helper function for reverse user lookup:
--
-- 1. get_user_id_by_stripe_customer() - Get user_id from stripe_customer_id
--
-- This complements the existing get_stripe_customer_by_user_id() function
-- for bidirectional user ↔ customer mapping.
