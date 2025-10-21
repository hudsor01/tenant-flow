-- Fix all remaining RPC functions with PascalCase table references
-- This migration uses dynamic SQL to fix ALL custom functions at once

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    fixed_count INTEGER := 0;
BEGIN
    -- Loop through all functions that have PascalCase table references
    FOR func_record IN
        SELECT oid, proname as function_name
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
        AND proname NOT LIKE 'pg_%'
        AND proname NOT LIKE 'supabase_%'
        AND pg_get_functiondef(oid) ~ '"[A-Z]'
    LOOP
        -- Get the function definition
        SELECT pg_get_functiondef(func_record.oid) INTO func_def;

        -- Replace all PascalCase table names with lowercase
        -- Core tables
        func_def := replace(func_def, '"Lease"', 'lease');
        func_def := replace(func_def, '"Property"', 'property');
        func_def := replace(func_def, '"Unit"', 'unit');
        func_def := replace(func_def, '"Tenant"', 'tenant');
        func_def := replace(func_def, '"User"', 'users');  -- "User" → users (lowercase plural)

        -- Financial tables
        func_def := replace(func_def, '"RentPayment"', 'rent_payment');
        func_def := replace(func_def, '"RentPayments"', 'rent_payments');
        func_def := replace(func_def, '"Expense"', 'expense');
        func_def := replace(func_def, '"Invoice"', 'invoice');
        func_def := replace(func_def, '"PaymentMethod"', 'payment_method');

        -- Maintenance tables
        func_def := replace(func_def, '"MaintenanceRequest"', 'maintenance_request');
        func_def := replace(func_def, '"Vendor"', 'vendor');

        -- Notification tables
        func_def := replace(func_def, '"Notification"', 'notification');
        func_def := replace(func_def, '"NotificationPreference"', 'notification_preference');

        -- Auth/Profile tables
        func_def := replace(func_def, '"Profile"', 'profile');
        func_def := replace(func_def, '"Role"', 'role');
        func_def := replace(func_def, '"Permission"', 'permission');

        -- Analytics tables
        func_def := replace(func_def, '"Analytics"', 'analytics');
        func_def := replace(func_def, '"Report"', 'report');

        -- Document tables
        func_def := replace(func_def, '"Document"', 'document');
        func_def := replace(func_def, '"Contract"', 'contract');

        -- Communication tables
        func_def := replace(func_def, '"Message"', 'message');
        func_def := replace(func_def, '"Communication"', 'communication');

        -- Billing tables
        func_def := replace(func_def, '"BillingCycle"', 'billing_cycle');
        func_def := replace(func_def, '"Subscription"', 'subscription');

        -- Re-create the function with corrected table names
        EXECUTE func_def;
        fixed_count := fixed_count + 1;

        RAISE NOTICE 'Fixed function: %', func_record.function_name;
    END LOOP;

    RAISE NOTICE 'Total functions fixed: %', fixed_count;
END $$;
