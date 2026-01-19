-- Migration: Fix Stripe Schema Function Security
-- Created: 2025-12-30 27:00:00 UTC
-- Purpose: Add search_path = '' to SECURITY DEFINER functions in stripe schema
-- Security Impact: HIGH - Prevents SQL injection via search_path manipulation
--
-- Also fixes SECURITY INVOKER functions in public schema for completeness
-- Note: Stripe schema is created by Stripe Sync Engine in production only

-- ============================================================================
-- PART 1: STRIPE SCHEMA SECURITY DEFINER FUNCTIONS (CRITICAL)
-- ============================================================================
-- Only run if stripe schema exists (production only)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    -- cleanup_old_webhook_data has two overloaded versions
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'stripe' AND p.proname = 'cleanup_old_webhook_data') THEN
      EXECUTE 'ALTER FUNCTION stripe.cleanup_old_webhook_data(integer) SET search_path = ''''';
      EXECUTE 'ALTER FUNCTION stripe.cleanup_old_webhook_data(integer, integer) SET search_path = ''''';
    END IF;

    -- detect_webhook_health_issues - monitoring function
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'stripe' AND p.proname = 'detect_webhook_health_issues') THEN
      EXECUTE 'ALTER FUNCTION stripe.detect_webhook_health_issues() SET search_path = ''''';
    END IF;

    -- record_webhook_metrics_batch - metrics recording
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'stripe' AND p.proname = 'record_webhook_metrics_batch') THEN
      EXECUTE 'ALTER FUNCTION stripe.record_webhook_metrics_batch(jsonb) SET search_path = ''''';
    END IF;

    -- refresh_webhook_views - view refresh
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'stripe' AND p.proname = 'refresh_webhook_views') THEN
      EXECUTE 'ALTER FUNCTION stripe.refresh_webhook_views() SET search_path = ''''';
    END IF;

    RAISE NOTICE 'Applied stripe schema function security fixes';
  ELSE
    RAISE NOTICE 'Skipping stripe schema function security fixes - stripe schema does not exist (local dev)';
  END IF;
END $$;

-- ============================================================================
-- PART 2: PUBLIC SCHEMA SECURITY INVOKER FUNCTIONS (GOOD PRACTICE)
-- ============================================================================
-- These are SECURITY INVOKER so lower risk, but still good to set search_path

-- notify_critical_error - error notification trigger
ALTER FUNCTION public.notify_critical_error() SET search_path = '';

-- update_property_search_vector - search vector update trigger
ALTER FUNCTION public.update_property_search_vector() SET search_path = '';

-- update_updated_at_column - timestamp update trigger
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
