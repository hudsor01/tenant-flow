-- Emergency Production Fix: Correct table name casing in RPC functions
-- Date: 2025-10-21
-- Issue: RPC functions reference "Lease", "Property", "Unit", "Tenant" (PascalCase)
--        but actual tables are lowercase: lease, property, unit, tenant
-- Result: "relation 'Lease' does not exist" errors in production

-- This script uses simple string replacement to fix all occurrences
-- We'll use dynamic SQL to get current function definitions and replace table names

-- Step 1: Get and fix calculate_financial_metrics
DO $$
DECLARE
    func_def text;
BEGIN
    -- Get current function definition
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc
    WHERE proname = 'calculate_financial_metrics'
    AND pronamespace = 'public'::regnamespace;

    -- Replace PascalCase with lowercase
    func_def := replace(func_def, '"Lease"', 'lease');
    func_def := replace(func_def, '"Property"', 'property');
    func_def := replace(func_def, '"Unit"', 'unit');
    func_def := replace(func_def, '"Tenant"', 'tenant');

    -- Execute the fixed function
    EXECUTE func_def;

    RAISE NOTICE 'Fixed calculate_financial_metrics';
END$$;

-- Step 2: Fix calculate_net_operating_income
DO $$
DECLARE
    func_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc
    WHERE proname = 'calculate_net_operating_income'
    AND pronamespace = 'public'::regnamespace;

    func_def := replace(func_def, '"Lease"', 'lease');
    func_def := replace(func_def, '"Property"', 'property');
    func_def := replace(func_def, '"Unit"', 'unit');
    func_def := replace(func_def, '"Tenant"', 'tenant');

    EXECUTE func_def;
    RAISE NOTICE 'Fixed calculate_net_operating_income';
END$$;

-- Step 3: Fix get_lease_financial_summary
DO $$
DECLARE
    func_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc
    WHERE proname = 'get_lease_financial_summary'
    AND pronamespace = 'public'::regnamespace;

    func_def := replace(func_def, 'public."Lease"', 'public.lease');
    func_def := replace(func_def, 'public."Property"', 'public.property');
    func_def := replace(func_def, 'public."Unit"', 'public.unit');
    func_def := replace(func_def, 'public."Tenant"', 'public.tenant');
    func_def := replace(func_def, '"Lease"', 'lease');
    func_def := replace(func_def, '"Property"', 'property');
    func_def := replace(func_def, '"Unit"', 'unit');
    func_def := replace(func_def, '"Tenant"', 'tenant');

    EXECUTE func_def;
    RAISE NOTICE 'Fixed get_lease_financial_summary';
END$$;

-- Step 4: Fix get_leases_with_financial_analytics
DO $$
DECLARE
    func_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc
    WHERE proname = 'get_leases_with_financial_analytics'
    AND pronamespace = 'public'::regnamespace;

    func_def := replace(func_def, 'public."Lease"', 'public.lease');
    func_def := replace(func_def, 'public."Property"', 'public.property');
    func_def := replace(func_def, 'public."Unit"', 'public.unit');
    func_def := replace(func_def, 'public."Tenant"', 'public.tenant');
    func_def := replace(func_def, '"Lease"', 'lease');
    func_def := replace(func_def, '"Property"', 'property');
    func_def := replace(func_def, '"Unit"', 'unit');
    func_def := replace(func_def, '"Tenant"', 'tenant');

    EXECUTE func_def;
    RAISE NOTICE 'Fixed get_leases_with_financial_analytics';
END$$;

-- Final verification
SELECT
    proname as function_name,
    CASE
        WHEN pg_get_functiondef(oid) LIKE '%"Lease"%' OR
             pg_get_functiondef(oid) LIKE '%"Property"%' OR
             pg_get_functiondef(oid) LIKE '%"Unit"%' OR
             pg_get_functiondef(oid) LIKE '%"Tenant"%'
        THEN '❌ STILL HAS ISSUES'
        ELSE '✅ FIXED'
    END as status
FROM pg_proc
WHERE proname IN (
    'calculate_financial_metrics',
    'calculate_net_operating_income',
    'get_financial_overview',
    'get_lease_financial_summary',
    'get_dashboard_financial_stats',
    'get_property_financial_analytics',
    'get_leases_with_financial_analytics'
)
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
