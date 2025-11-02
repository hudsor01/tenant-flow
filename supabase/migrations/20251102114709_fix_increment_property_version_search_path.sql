-- Fix search_path vulnerability identified by Supabase Security Advisor
-- Function: increment_property_version
-- Issue: "Function has a role mutable search_path"
-- Impact: Vulnerable to search path manipulation attacks
-- Fix: Set search_path to public, pg_temp (2025 security best practice)

ALTER FUNCTION public.increment_property_version()
SET search_path = public, pg_temp;

-- Verify fix applied
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'increment_property_version';

-- Expected: configuration should show search_path setting
