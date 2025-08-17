-- Stripe Foreign Data Wrapper RPC Functions
-- These functions provide a secure interface to query Stripe data via foreign data wrapper
-- Apply this SQL to your Supabase database to enable the Stripe FDW service

-- Function to get customers from Stripe FDW
CREATE OR REPLACE FUNCTION get_stripe_customers(limit_count INTEGER DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT id, email, name, description, phone, currency, 
               balance, delinquent, livemode, metadata, created_at
        FROM stripe_fdw.v_customers 
        ORDER BY created_at DESC 
        LIMIT limit_count
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get a specific customer by ID
CREATE OR REPLACE FUNCTION get_stripe_customer_by_id(customer_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT row_to_json(t)
    INTO result
    FROM (
        SELECT id, email, name, description, phone, currency, 
               balance, delinquent, livemode, metadata, created_at
        FROM stripe_fdw.v_customers 
        WHERE id = customer_id
        LIMIT 1
    ) t;
    
    RETURN result;
END;
$$;

-- Function to get subscriptions from Stripe FDW
CREATE OR REPLACE FUNCTION get_stripe_subscriptions(
    customer_id TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    sql_query TEXT;
BEGIN
    sql_query := 'SELECT id, customer_id, status, cancel_at_period_end, currency,
                         default_payment_method, description, livemode, metadata,
                         created_at, current_period_start, current_period_end, trial_end
                  FROM stripe_fdw.v_subscriptions';
    
    IF customer_id IS NOT NULL THEN
        sql_query := sql_query || ' WHERE customer_id = $1';
    END IF;
    
    sql_query := sql_query || ' ORDER BY created_at DESC LIMIT ' || limit_count;
    
    IF customer_id IS NOT NULL THEN
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
        INTO result
        USING customer_id;
    ELSE
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
        INTO result;
    END IF;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get payment intents from Stripe FDW
CREATE OR REPLACE FUNCTION get_stripe_payment_intents(
    customer_id TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    sql_query TEXT;
BEGIN
    sql_query := 'SELECT id, amount, currency, customer_id, status, description,
                         receipt_email, livemode, metadata, created_at
                  FROM stripe_fdw.v_payment_intents';
    
    IF customer_id IS NOT NULL THEN
        sql_query := sql_query || ' WHERE customer_id = $1';
    END IF;
    
    sql_query := sql_query || ' ORDER BY created_at DESC LIMIT ' || limit_count;
    
    IF customer_id IS NOT NULL THEN
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
        INTO result
        USING customer_id;
    ELSE
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
        INTO result;
    END IF;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get products from Stripe FDW
CREATE OR REPLACE FUNCTION get_stripe_products(
    active_only BOOLEAN DEFAULT TRUE,
    limit_count INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    sql_query TEXT;
BEGIN
    sql_query := 'SELECT id, name, description, active, type, livemode, metadata, created_at, updated_at
                  FROM stripe_fdw.v_products';
    
    IF active_only THEN
        sql_query := sql_query || ' WHERE active = true';
    END IF;
    
    sql_query := sql_query || ' ORDER BY created_at DESC LIMIT ' || limit_count;
    
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get prices from Stripe FDW
CREATE OR REPLACE FUNCTION get_stripe_prices(
    product_id TEXT DEFAULT NULL,
    active_only BOOLEAN DEFAULT TRUE,
    limit_count INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    sql_query TEXT;
    where_conditions TEXT[] := '{}';
BEGIN
    sql_query := 'SELECT id, product_id, unit_amount, currency, type, active,
                         billing_scheme, recurring, livemode, metadata, created_at
                  FROM stripe_fdw.v_prices';
    
    IF product_id IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 'product_id = ''' || product_id || '''');
    END IF;
    
    IF active_only THEN
        where_conditions := array_append(where_conditions, 'active = true');
    END IF;
    
    IF array_length(where_conditions, 1) > 0 THEN
        sql_query := sql_query || ' WHERE ' || array_to_string(where_conditions, ' AND ');
    END IF;
    
    sql_query := sql_query || ' ORDER BY created_at DESC LIMIT ' || limit_count;
    
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get subscription analytics
CREATE OR REPLACE FUNCTION get_stripe_subscription_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalSubscriptions', total_count,
        'activeSubscriptions', active_count,
        'canceledSubscriptions', canceled_count,
        'trialSubscriptions', trial_count,
        'monthlyRevenue', 0 -- TODO: Calculate from pricing data
    )
    INTO result
    FROM (
        SELECT 
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE status = 'active') as active_count,
            COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
            COUNT(*) FILTER (WHERE status = 'trialing') as trial_count
        FROM stripe_fdw.v_subscriptions
    ) analytics;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Function to execute custom SQL queries on Stripe FDW data
-- WARNING: Use with extreme caution - this allows direct SQL execution
CREATE OR REPLACE FUNCTION execute_stripe_fdw_query(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Basic security check - only allow SELECT statements
    IF NOT (sql_query ILIKE 'SELECT%' OR sql_query ILIKE 'WITH%') THEN
        RAISE EXCEPTION 'Only SELECT and WITH statements are allowed';
    END IF;
    
    -- Prevent dangerous operations
    IF sql_query ILIKE '%DELETE%' OR sql_query ILIKE '%UPDATE%' OR sql_query ILIKE '%INSERT%' OR sql_query ILIKE '%DROP%' THEN
        RAISE EXCEPTION 'Destructive operations are not allowed';
    END IF;
    
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t'
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_stripe_customers(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_customer_by_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_subscriptions(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_payment_intents(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_products(BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_prices(TEXT, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_subscription_analytics() TO authenticated;

-- Only grant custom query execution to service role (admin access only)
GRANT EXECUTE ON FUNCTION execute_stripe_fdw_query(TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_stripe_customers(INTEGER) IS 'Get customers from Stripe via FDW';
COMMENT ON FUNCTION get_stripe_customer_by_id(TEXT) IS 'Get specific customer by ID from Stripe via FDW';
COMMENT ON FUNCTION get_stripe_subscriptions(TEXT, INTEGER) IS 'Get subscriptions from Stripe via FDW';
COMMENT ON FUNCTION get_stripe_payment_intents(TEXT, INTEGER) IS 'Get payment intents from Stripe via FDW';
COMMENT ON FUNCTION get_stripe_products(BOOLEAN, INTEGER) IS 'Get products from Stripe via FDW';
COMMENT ON FUNCTION get_stripe_prices(TEXT, BOOLEAN, INTEGER) IS 'Get prices from Stripe via FDW';
COMMENT ON FUNCTION get_stripe_subscription_analytics() IS 'Get subscription analytics from Stripe data';
COMMENT ON FUNCTION execute_stripe_fdw_query(TEXT) IS 'Execute custom SQL queries on Stripe FDW data (admin only)';