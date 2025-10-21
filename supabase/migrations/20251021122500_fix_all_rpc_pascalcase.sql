-- Comprehensive fix: Replace ALL PascalCase table references in ALL RPC functions
-- This uses a dynamic approach to fix every function at once

DO $$
DECLARE
    func_record RECORD;
    func_def text;
    fixed_count int := 0;
BEGIN
    -- Loop through all custom functions (excluding system functions)
    FOR func_record IN
        SELECT
            oid,
            proname as function_name
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
        AND proname NOT LIKE 'pg_%'
        AND proname NOT LIKE '_get_%'
    LOOP
        -- Get function definition
        SELECT pg_get_functiondef(func_record.oid) INTO func_def;

        -- Check if it has PascalCase table references
        IF func_def ~ '"[A-Z][a-z]+"' THEN
            -- Replace all PascalCase table names with lowercase
            func_def := replace(func_def, 'public."Lease"', 'public.lease');
            func_def := replace(func_def, 'public."Property"', 'public.property');
            func_def := replace(func_def, 'public."Unit"', 'public.unit');
            func_def := replace(func_def, 'public."Tenant"', 'public.tenant');
            func_def := replace(func_def, 'public."Expense"', 'public.expense');
            func_def := replace(func_def, 'public."Invoice"', 'public.invoice');
            func_def := replace(func_def, '"Lease"', 'lease');
            func_def := replace(func_def, '"Property"', 'property');
            func_def := replace(func_def, '"Unit"', 'unit');
            func_def := replace(func_def, '"Tenant"', 'tenant');
            func_def := replace(func_def, '"Expense"', 'expense');
            func_def := replace(func_def, '"Invoice"', 'invoice');

            -- Execute the fixed function
            BEGIN
                EXECUTE func_def;
                fixed_count := fixed_count + 1;
                RAISE NOTICE 'Fixed function: %', func_record.function_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to fix function %: %', func_record.function_name, SQLERRM;
            END;
        END IF;
    END LOOP;

    RAISE NOTICE 'Total functions fixed: %', fixed_count;
END$$;

-- Verify all functions are fixed
SELECT
    proname as function_name,
    CASE
        WHEN pg_get_functiondef(oid) ~ '"Lease"|"Property"|"Unit"|"Tenant"|"Expense"|"Invoice"'
        THEN '❌ STILL HAS PASCALCASE'
        ELSE '✅ FIXED'
    END as status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname NOT LIKE 'pg_%'
AND proname NOT LIKE '_get_%'
AND proname IN (
    'get_maintenance_analytics',
    'get_property_maintenance_analytics',
    'get_property_units',
    'get_dashboard_metrics',
    'calculate_maintenance_metrics',
    'calculate_property_performance',
    'get_billing_insights',
    'get_invoice_statistics',
    'calculate_financial_metrics',
    'calculate_net_operating_income',
    'get_financial_overview',
    'get_lease_financial_summary',
    'get_dashboard_financial_stats',
    'get_property_financial_analytics',
    'get_leases_with_financial_analytics'
)
ORDER BY function_name;
