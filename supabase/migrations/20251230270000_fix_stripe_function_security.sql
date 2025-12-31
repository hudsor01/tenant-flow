-- Migration: Fix Stripe Schema Function Security
-- Created: 2025-12-30 27:00:00 UTC
-- Purpose: Add search_path = '' to SECURITY DEFINER functions in stripe schema
-- Security Impact: HIGH - Prevents SQL injection via search_path manipulation
--
-- Also fixes SECURITY INVOKER functions in public schema for completeness

-- ============================================================================
-- PART 1: STRIPE SCHEMA SECURITY DEFINER FUNCTIONS (CRITICAL)
-- ============================================================================

-- cleanup_old_webhook_data has two overloaded versions
alter function stripe.cleanup_old_webhook_data(integer) set search_path = '';
alter function stripe.cleanup_old_webhook_data(integer, integer) set search_path = '';

-- detect_webhook_health_issues - monitoring function
alter function stripe.detect_webhook_health_issues() set search_path = '';

-- record_webhook_metrics_batch - metrics recording
alter function stripe.record_webhook_metrics_batch(jsonb) set search_path = '';

-- refresh_webhook_views - view refresh
alter function stripe.refresh_webhook_views() set search_path = '';

-- ============================================================================
-- PART 2: PUBLIC SCHEMA SECURITY INVOKER FUNCTIONS (GOOD PRACTICE)
-- ============================================================================
-- These are SECURITY INVOKER so lower risk, but still good to set search_path

-- notify_critical_error - error notification trigger
alter function public.notify_critical_error() set search_path = '';

-- update_property_search_vector - search vector update trigger
alter function public.update_property_search_vector() set search_path = '';

-- update_updated_at_column - timestamp update trigger
alter function public.update_updated_at_column() set search_path = '';
