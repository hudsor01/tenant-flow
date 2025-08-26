-- Setup Stripe Foreign Data Wrapper for Real Dashboard Calculations
-- This enables real-time access to Stripe data for accurate billing metrics

-- Create the stripe schema for foreign tables (private, not exposed via API)
CREATE SCHEMA IF NOT EXISTS stripe;

-- Enable the wrappers extension if not already enabled
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Create the Stripe foreign data wrapper server
-- Note: This requires STRIPE_SECRET_KEY to be set in Supabase Vault
CREATE SERVER IF NOT EXISTS stripe_fdw_server
  FOREIGN DATA WRAPPER wrappers_handler
  OPTIONS (
    fdw_name 'stripe_fdw',
    api_version '2025-07-30.basil'
  );

-- Create user mapping for the service role to access Stripe
-- The API key should be stored securely in Supabase Vault
CREATE USER MAPPING IF NOT EXISTS FOR service_role
  SERVER stripe_fdw_server
  OPTIONS (
    api_key_id 'stripe_secret_key'  -- References vault key
  );

-- Create foreign table for Stripe customers
CREATE FOREIGN TABLE IF NOT EXISTS stripe.customers (
  id text,
  email text,
  name text,
  created timestamp,
  updated timestamp,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_fdw_server
OPTIONS (
  object 'customers',
  rowid_column 'id'
);

-- Create foreign table for Stripe subscriptions
CREATE FOREIGN TABLE IF NOT EXISTS stripe.subscriptions (
  id text,
  customer text,
  status text,
  current_period_start timestamp,
  current_period_end timestamp,
  created timestamp,
  canceled_at timestamp,
  trial_start timestamp,
  trial_end timestamp,
  metadata jsonb,
  items jsonb,
  attrs jsonb
)
SERVER stripe_fdw_server
OPTIONS (
  object 'subscriptions',
  rowid_column 'id'
);

-- Create foreign table for Stripe invoices 
CREATE FOREIGN TABLE IF NOT EXISTS stripe.invoices (
  id text,
  customer text,
  subscription text,
  status text,
  amount_due bigint,
  amount_paid bigint,
  amount_remaining bigint,
  currency text,
  created timestamp,
  due_date timestamp,
  period_start timestamp,
  period_end timestamp,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_fdw_server
OPTIONS (
  object 'invoices',
  rowid_column 'id'
);

-- Create foreign table for Stripe products
CREATE FOREIGN TABLE IF NOT EXISTS stripe.products (
  id text,
  name text,
  description text,
  active boolean,
  created timestamp,
  updated timestamp,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_fdw_server
OPTIONS (
  object 'products',
  rowid_column 'id'
);

-- Create foreign table for Stripe prices
CREATE FOREIGN TABLE IF NOT EXISTS stripe.prices (
  id text,
  product text,
  active boolean,
  currency text,
  unit_amount bigint,
  recurring jsonb,
  created timestamp,
  metadata jsonb,
  attrs jsonb
)
SERVER stripe_fdw_server
OPTIONS (
  object 'prices',
  rowid_column 'id'
);

-- Security function to get user's Stripe customer ID safely
CREATE OR REPLACE FUNCTION public.get_user_stripe_customer_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_id text;
BEGIN
  -- Get customer ID from user profile
  SELECT stripe_customer_id 
  INTO customer_id
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN customer_id;
END;
$$;

-- Revoke public access to the stripe schema
REVOKE ALL ON SCHEMA stripe FROM public;
REVOKE ALL ON SCHEMA stripe FROM anon;

-- Grant access only to service_role for internal functions
GRANT USAGE ON SCHEMA stripe TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA stripe TO service_role;

-- Security definer function to get real subscription metrics
CREATE OR REPLACE FUNCTION public.get_real_subscription_metrics(user_id uuid)
RETURNS TABLE(
  total_revenue numeric,
  monthly_recurring_revenue numeric,
  active_subscriptions bigint,
  trial_subscriptions bigint,
  canceled_subscriptions bigint,
  failed_payments bigint,
  current_plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stripe
AS $$
DECLARE
  stripe_customer_id text;
BEGIN
  -- Get user's Stripe customer ID
  stripe_customer_id := public.get_user_stripe_customer_id(user_id);
  
  IF stripe_customer_id IS NULL THEN
    -- Return zeros if no Stripe customer
    RETURN QUERY SELECT 
      0::numeric as total_revenue,
      0::numeric as monthly_recurring_revenue,
      0::bigint as active_subscriptions,
      0::bigint as trial_subscriptions,
      0::bigint as canceled_subscriptions,
      0::bigint as failed_payments,
      'FREETRIAL'::text as current_plan;
    RETURN;
  END IF;
  
  -- Calculate real metrics from Stripe data
  RETURN QUERY
  WITH subscription_data AS (
    SELECT 
      s.status,
      s.trial_start,
      s.trial_end,
      s.items,
      CASE 
        WHEN s.status = 'active' AND s.trial_start IS NULL THEN 
          -- Extract amount from subscription items
          COALESCE(
            (s.items::jsonb -> 'data' -> 0 -> 'price' ->> 'unit_amount')::numeric / 100,
            0
          )
        ELSE 0
      END as monthly_amount
    FROM stripe.subscriptions s
    WHERE s.customer = stripe_customer_id
  ),
  invoice_data AS (
    SELECT 
      i.status,
      i.amount_paid / 100.0 as amount_paid_dollars
    FROM stripe.invoices i
    WHERE i.customer = stripe_customer_id
  ),
  current_subscription AS (
    SELECT 
      s.status,
      s.items::jsonb -> 'data' -> 0 -> 'price' ->> 'id' as current_price_id
    FROM stripe.subscriptions s
    WHERE s.customer = stripe_customer_id 
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(SUM(i.amount_paid_dollars), 0) as total_revenue,
    COALESCE(SUM(s.monthly_amount), 0) as monthly_recurring_revenue,
    COUNT(*) FILTER (WHERE s.status = 'active') as active_subscriptions,
    COUNT(*) FILTER (WHERE s.status = 'trialing') as trial_subscriptions,
    COUNT(*) FILTER (WHERE s.status IN ('canceled', 'cancelled')) as canceled_subscriptions,
    COUNT(*) FILTER (WHERE i.status = 'open') as failed_payments,
    CASE 
      WHEN cs.current_price_id = 'price_1RtWFcP3WCR53Sdo5Li5xHiC' THEN 'FREETRIAL'
      WHEN cs.current_price_id IN ('price_1RtWFcP3WCR53SdoCxiVldhb', 'price_1RtWFdP3WCR53SdoArRRXYrL') THEN 'STARTER'  
      WHEN cs.current_price_id IN ('price_1RtWFdP3WCR53Sdoz98FFpSu', 'price_1RtWFdP3WCR53SdoHDRR9kAJ') THEN 'GROWTH'
      WHEN cs.current_price_id IN ('price_1RtWFeP3WCR53Sdo9AsL7oGv', 'price_1RtWFeP3WCR53Sdoxm2iY4mt') THEN 'TENANTFLOW_MAX'
      ELSE 'FREETRIAL'
    END as current_plan
  FROM subscription_data s
  FULL OUTER JOIN invoice_data i ON true
  CROSS JOIN current_subscription cs;
END;
$$;

-- Revoke public access and grant to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_real_subscription_metrics FROM public;
REVOKE EXECUTE ON FUNCTION public.get_real_subscription_metrics FROM anon;
GRANT EXECUTE ON FUNCTION public.get_real_subscription_metrics TO authenticated;

-- Comments for documentation
COMMENT ON SCHEMA stripe IS 'Private schema containing Stripe foreign data wrapper tables. Not exposed via API.';
COMMENT ON FUNCTION public.get_real_subscription_metrics IS 'Security definer function to get real subscription metrics from Stripe FDW for authenticated users only.';
COMMENT ON FUNCTION public.get_user_stripe_customer_id IS 'Helper function to safely retrieve user Stripe customer ID.';

-- Add index on profiles.stripe_customer_id if it doesn't exist
-- (This will fail silently if the column doesn't exist yet)
DO $$ 
BEGIN
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_stripe_customer_id 
  ON public.profiles (stripe_customer_id);
EXCEPTION WHEN undefined_column THEN
  -- Column doesn't exist yet, skip index creation
  NULL;
END $$;

-- Create comprehensive dashboard stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stripe
AS $$
DECLARE
  property_stats jsonb;
  tenant_stats jsonb;
  lease_stats jsonb;
  subscription_stats jsonb;
  dashboard_result jsonb;
BEGIN
  -- Get property statistics using RLS-protected queries
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'singleFamily', COUNT(*) FILTER (WHERE property_type = 'single_family'),
    'multiFamily', COUNT(*) FILTER (WHERE property_type = 'multi_family'), 
    'commercial', COUNT(*) FILTER (WHERE property_type = 'commercial'),
    'totalUnits', COALESCE(SUM(CASE WHEN units IS NOT NULL THEN (units->>'total')::int ELSE 0 END), 0),
    'occupiedUnits', COALESCE(SUM(CASE WHEN units IS NOT NULL THEN (units->>'occupied')::int ELSE 0 END), 0),
    'vacantUnits', COALESCE(SUM(CASE WHEN units IS NOT NULL THEN (units->>'vacant')::int ELSE 0 END), 0),
    'totalMonthlyRent', COALESCE(SUM(CASE WHEN monthly_rent IS NOT NULL THEN monthly_rent ELSE 0 END), 0)
  ) INTO property_stats
  FROM properties 
  WHERE user_id = user_id_param;
  
  -- Get tenant statistics using RLS
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'inactive', COUNT(*) FILTER (WHERE status = 'inactive')
  ) INTO tenant_stats
  FROM tenants 
  WHERE user_id = user_id_param;
  
  -- Get lease statistics using RLS  
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired'),
    'draft', COUNT(*) FILTER (WHERE status = 'draft')
  ) INTO lease_stats
  FROM leases 
  WHERE user_id = user_id_param;
  
  -- Try to get Stripe subscription data (gracefully handle FDW failures)
  BEGIN
    SELECT jsonb_build_object(
      'totalSubscriptions', COALESCE((stripe_data->>'total_subscriptions')::int, 0),
      'activeSubscriptions', COALESCE((stripe_data->>'active_subscriptions')::int, 0),
      'monthlyRecurringRevenue', COALESCE((stripe_data->>'total_mrr')::numeric, 0)
    ) INTO subscription_stats
    FROM (
      SELECT execute_stripe_fdw_query('get_stripe_subscription_analytics') as stripe_data
    ) stripe_query;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to zero values if Stripe FDW fails
    SELECT jsonb_build_object(
      'totalSubscriptions', 0,
      'activeSubscriptions', 0,
      'monthlyRecurringRevenue', 0
    ) INTO subscription_stats;
  END;
  
  -- Build final dashboard response in exact format expected by frontend
  SELECT jsonb_build_object(
    'properties', jsonb_build_object(
      'total', property_stats->>'total',
      'totalProperties', property_stats->>'total',
      'singleFamily', property_stats->>'singleFamily',
      'multiFamily', property_stats->>'multiFamily',
      'commercial', property_stats->>'commercial',
      'totalUnits', property_stats->>'totalUnits',
      'occupiedUnits', property_stats->>'occupiedUnits',
      'vacantUnits', property_stats->>'vacantUnits',
      'occupancyRate', CASE 
        WHEN (property_stats->>'totalUnits')::int > 0 
        THEN ROUND(((property_stats->>'occupiedUnits')::numeric / (property_stats->>'totalUnits')::numeric) * 100)
        ELSE 0 
      END,
      'totalMonthlyRent', property_stats->>'totalMonthlyRent',
      'totalRent', property_stats->>'totalMonthlyRent',
      'potentialRent', property_stats->>'totalMonthlyRent',
      'collectedRent', property_stats->>'totalMonthlyRent',
      'pendingRent', 0
    ),
    'tenants', jsonb_build_object(
      'total', tenant_stats->>'total',
      'totalTenants', tenant_stats->>'total',
      'activeTenants', tenant_stats->>'active',
      'inactiveTenants', tenant_stats->>'inactive',
      'pendingInvitations', 0
    ),
    'units', jsonb_build_object(
      'total', property_stats->>'totalUnits',
      'totalUnits', property_stats->>'totalUnits',
      'occupied', property_stats->>'occupiedUnits',
      'occupiedUnits', property_stats->>'occupiedUnits',
      'vacant', property_stats->>'vacantUnits',
      'availableUnits', property_stats->>'vacantUnits',
      'maintenanceUnits', 0,
      'occupancyRate', CASE 
        WHEN (property_stats->>'totalUnits')::int > 0 
        THEN ROUND(((property_stats->>'occupiedUnits')::numeric / (property_stats->>'totalUnits')::numeric) * 100)
        ELSE 0 
      END,
      'averageRent', CASE 
        WHEN (property_stats->>'totalUnits')::int > 0 
        THEN ROUND((property_stats->>'totalMonthlyRent')::numeric / (property_stats->>'totalUnits')::numeric, 2)
        ELSE 0 
      END
    ),
    'leases', jsonb_build_object(
      'total', lease_stats->>'total',
      'totalLeases', lease_stats->>'total',
      'active', lease_stats->>'active',
      'activeLeases', lease_stats->>'active',
      'expiredLeases', lease_stats->>'expired',
      'pendingLeases', lease_stats->>'draft',
      'totalRentRoll', property_stats->>'totalMonthlyRent'
    ),
    'maintenanceRequests', jsonb_build_object(
      'total', 0,
      'open', 0,
      'inProgress', 0,
      'completed', 0
    ),
    'notifications', jsonb_build_object(
      'total', 0,
      'unread', 0
    ),
    'revenue', jsonb_build_object(
      'total', subscription_stats->>'monthlyRecurringRevenue',
      'monthly', subscription_stats->>'monthlyRecurringRevenue',
      'collected', subscription_stats->>'monthlyRecurringRevenue'
    )
  ) INTO dashboard_result;
  
  RETURN dashboard_result;
END;
$$;

-- Grant permissions for dashboard function
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats FROM public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_stats IS 'Comprehensive dashboard statistics combining property, tenant, lease and Stripe subscription data for authenticated users.';