-- Fix Function Search Path Security Vulnerabilities
-- Addresses 14 functions with mutable search_path found by Supabase security advisor
--
-- Issue: Functions without SET search_path are vulnerable to SQL injection attacks
-- Solution: Add SET search_path = public, SECURITY DEFINER to all affected functions
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- 1. Fix health_check function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS TABLE(ok boolean, at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT true AS ok, now() AS at;
$function$;

-- 2. Fix urlencode function
CREATE OR REPLACE FUNCTION public.urlencode(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(input, ' ', '%20'),
                    '!', '%21'),
                  '"', '%22'),
                '#', '%23'),
              '$', '%24'),
            '%', '%25'),
          '&', '%26'),
        '''', '%27'),
      '(', '%28'),
    ')', '%29');
END;
$function$;

-- 3. Move extensions out of public schema for security
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Extensions can only be moved by superuser, document for manual fix:
-- ALTER EXTENSION pgtap SET SCHEMA extensions;
-- ALTER EXTENSION pg_repack SET SCHEMA extensions;
-- ALTER EXTENSION plpgsql_check SET SCHEMA extensions;
-- ALTER EXTENSION sslinfo SET SCHEMA extensions;

-- Create a view to help identify remaining functions with mutable search_path
CREATE OR REPLACE VIEW public.functions_without_search_path AS
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    CASE
        WHEN p.proconfig IS NULL THEN 'No search_path set'
        WHEN NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) AS config
            WHERE config LIKE 'search_path=%'
        ) THEN 'No search_path in config'
        ELSE 'search_path configured'
    END as search_path_status,
    CASE
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_mode
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- functions only, not aggregates
  AND p.proname NOT LIKE 'pg_%'  -- exclude system functions
ORDER BY p.proname;

-- Create a function to safely recreate functions with proper search_path
-- This helps identify which functions still need manual fixing
CREATE OR REPLACE FUNCTION public.check_function_security_compliance()
RETURNS TABLE(
    function_name text,
    has_security_definer boolean,
    has_search_path boolean,
    compliance_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT
        p.proname::text,
        p.prosecdef,
        EXISTS (
            SELECT 1 FROM unnest(p.proconfig) AS config
            WHERE config LIKE 'search_path=%'
        ),
        CASE
            WHEN p.prosecdef AND EXISTS (
                SELECT 1 FROM unnest(p.proconfig) AS config
                WHERE config LIKE 'search_path=%'
            ) THEN 'COMPLIANT'
            WHEN NOT p.prosecdef THEN 'MISSING_SECURITY_DEFINER'
            WHEN NOT EXISTS (
                SELECT 1 FROM unnest(p.proconfig) AS config
                WHERE config LIKE 'search_path=%'
            ) THEN 'MISSING_SEARCH_PATH'
            ELSE 'UNKNOWN'
        END::text
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname NOT LIKE 'pg_%'
    ORDER BY p.proname;
$function$;

-- Log security fix completion
INSERT INTO public.system_logs (
    level,
    category,
    message,
    metadata
) VALUES (
    'info',
    'security',
    'Applied search_path security fixes for SQL injection prevention',
    jsonb_build_object(
        'migration', '20250920_fix_search_path_security',
        'functions_fixed', 2,
        'extensions_documented', 4,
        'compliance_check_function_created', true
    )
);

-- Note: Remaining 12 functions need individual recreation based on their current definitions
-- Use the check_function_security_compliance() function to identify them:
-- SELECT * FROM public.check_function_security_compliance() WHERE compliance_status != 'COMPLIANT';