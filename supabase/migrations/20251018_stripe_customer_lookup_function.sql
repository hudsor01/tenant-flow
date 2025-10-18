-- Migration: Stripe Customer Lookup Function
-- Description: PostgreSQL function to query stripe.customers table (created by Stripe Sync Engine)
-- Author: Claude Code
-- Date: 2025-10-18

-- ============================================================================
-- STRIPE CUSTOMER LOOKUP FUNCTION
-- ============================================================================
-- This function queries the stripe.customers table created by @supabase/stripe-sync-engine
-- It provides a type-safe way to fetch Stripe customer IDs from the backend

CREATE OR REPLACE FUNCTION public.get_stripe_customer_id(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id text;
BEGIN
  -- Query stripe.customers table (created by Stripe Sync Engine)
  -- If the table doesn't exist yet, this will gracefully return NULL
  SELECT id INTO v_customer_id
  FROM stripe.customers
  WHERE email = p_email
  LIMIT 1;

  RETURN v_customer_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If stripe schema doesn't exist yet, return NULL instead of erroring
    RETURN NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_stripe_customer_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stripe_customer_id(text) TO service_role;

-- ============================================================================
-- FUNCTION SUMMARY
-- ============================================================================
-- Function: get_stripe_customer_id(p_email text)
-- Purpose: Fetch Stripe customer ID by email from stripe.customers table
-- Returns: Stripe customer ID (text) or NULL if not found
-- Security: SECURITY DEFINER allows querying stripe schema
-- Error Handling: Returns NULL if stripe schema doesn't exist
