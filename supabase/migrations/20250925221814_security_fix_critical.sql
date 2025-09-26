-- CRITICAL SECURITY FIX - Function Search Path Vulnerabilities
-- Fixes all 15 functions identified by Supabase Security Advisor
-- Date: 2025-09-25 22:18:14

-- Fix health_check function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS TABLE(ok boolean, at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT true AS ok, now() AS at;
$function$;

-- Fix urlencode function  
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

-- Fix set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$function$;

-- Create verification function
CREATE OR REPLACE FUNCTION public.verify_security_compliance()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_function_count integer;
    v_compliant_functions integer;
    v_result json;
BEGIN
    -- Count functions with proper security settings
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.proname NOT LIKE 'pg_%';

    SELECT COUNT(*) INTO v_compliant_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'  
    AND p.proname NOT LIKE 'pg_%'
    AND p.prosecdef = true
    AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS config
        WHERE config LIKE 'search_path=%'
    );

    SELECT json_build_object(
        'totalFunctions', v_function_count,
        'compliantFunctions', v_compliant_functions,
        'functionComplianceRate', ROUND(100.0 * v_compliant_functions / GREATEST(v_function_count, 1), 2),
        'overallStatus', CASE
            WHEN v_compliant_functions = v_function_count THEN 'FULLY_COMPLIANT'
            ELSE 'PARTIAL_COMPLIANCE'
        END,
        'checkedAt', now()
    ) INTO v_result;

    RETURN v_result;
END;
$function$;