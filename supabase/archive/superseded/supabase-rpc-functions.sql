-- =====================================================================================
-- REQUIRED RPC FUNCTIONS FOR TENANTFLOW ANALYTICS
-- =====================================================================================
-- These functions need to be created in your Supabase database to support the analytics service
-- Run these in your Supabase SQL Editor or via migration

-- =====================================================================================
-- 1. GET_DASHBOARD_STATS - Core dashboard statistics aggregation
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    properties_stats json;
    tenants_stats json;
    units_stats json;
    leases_stats json;
    maintenance_stats json;
    notifications_stats json;
    revenue_stats json;
BEGIN
    -- Properties statistics
    SELECT json_build_object(
        'total', COALESCE(COUNT(*), 0),
        'owned', COALESCE(COUNT(*), 0),
        'rented', COALESCE(COUNT(CASE WHEN EXISTS(
            SELECT 1 FROM "unit" u
            JOIN "lease" l ON u.id = l."unitId"
            WHERE u."propertyId" = p.id AND l.status = 'ACTIVE'
        ) THEN 1 END), 0),
        'available', COALESCE(COUNT(CASE WHEN NOT EXISTS(
            SELECT 1 FROM "unit" u
            JOIN "lease" l ON u.id = l."unitId"
            WHERE u."propertyId" = p.id AND l.status = 'ACTIVE'
        ) THEN 1 END), 0),
        'maintenance', COALESCE(COUNT(CASE WHEN EXISTS(
            SELECT 1 FROM "unit" u
            WHERE u."propertyId" = p.id AND u.status = 'MAINTENANCE'
        ) THEN 1 END), 0)
    ) INTO properties_stats
    FROM "property" p
    WHERE p."ownerId" = user_id_param;

    -- Tenants statistics
    SELECT json_build_object(
        'total', COALESCE(COUNT(DISTINCT t.id), 0),
        'active', COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'ACTIVE' THEN t.id END), 0),
        'inactive', COALESCE(COUNT(DISTINCT CASE WHEN t.status != 'ACTIVE' THEN t.id END), 0)
    ) INTO tenants_stats
    FROM "tenant" t
    JOIN "lease" l ON t.id = l."tenantId"
    JOIN "unit" u ON l."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id_param;

    -- Units statistics
    SELECT json_build_object(
        'totalUnits', COALESCE(COUNT(*), 0),
        'availableUnits', COALESCE(COUNT(CASE WHEN u.status = 'VACANT' THEN 1 END), 0),
        'occupiedUnits', COALESCE(COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END), 0),
        'maintenanceUnits', COALESCE(COUNT(CASE WHEN u.status = 'MAINTENANCE' THEN 1 END), 0),
        'averageRent', COALESCE(AVG(u.rent), 0),
        'total', COALESCE(COUNT(*), 0),
        'occupied', COALESCE(COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END), 0),
        'vacant', COALESCE(COUNT(CASE WHEN u.status = 'VACANT' THEN 1 END), 0),
        'occupancyRate', CASE
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END) * 100.0 / COUNT(*)), 2)
            ELSE 0
        END
    ) INTO units_stats
    FROM "unit" u
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id_param;

    -- Leases statistics
    SELECT json_build_object(
        'totalLeases', COALESCE(COUNT(*), 0),
        'activeLeases', COALESCE(COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END), 0),
        'expiredLeases', COALESCE(COUNT(CASE WHEN l.status = 'EXPIRED' THEN 1 END), 0),
        'pendingLeases', COALESCE(COUNT(CASE WHEN l.status = 'PENDING' THEN 1 END), 0),
        'totalRentRoll', COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."rentAmount" ELSE 0 END), 0),
        'total', COALESCE(COUNT(*), 0),
        'active', COALESCE(COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END), 0)
    ) INTO leases_stats
    FROM "lease" l
    JOIN "unit" u ON l."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id_param;

    -- Maintenance requests statistics
    SELECT json_build_object(
        'total', COALESCE(COUNT(*), 0),
        'open', COALESCE(COUNT(CASE WHEN m.status = 'OPEN' THEN 1 END), 0),
        'inProgress', COALESCE(COUNT(CASE WHEN m.status = 'IN_PROGRESS' THEN 1 END), 0),
        'completed', COALESCE(COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END), 0)
    ) INTO maintenance_stats
    FROM "maintenance_request" m
    JOIN "unit" u ON m."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id_param;

    -- Notifications statistics (placeholder - assuming no notifications table yet)
    SELECT json_build_object(
        'total', 0,
        'unread', 0
    ) INTO notifications_stats;

    -- Revenue statistics
    SELECT json_build_object(
        'total', COALESCE(SUM(rp.amount), 0) / 100, -- Convert from cents to dollars
        'monthly', COALESCE(SUM(CASE
            WHEN rp."paidAt" >= DATE_TRUNC('month', CURRENT_DATE)
            THEN rp.amount ELSE 0 END), 0) / 100,
        'collected', COALESCE(SUM(CASE WHEN rp.status = 'SUCCEEDED' THEN rp.amount ELSE 0 END), 0) / 100
    ) INTO revenue_stats
    FROM "RentPayment" rp
    JOIN "tenant" t ON rp."tenantId" = t.id
    JOIN "lease" l ON t.id = l."tenantId"
    JOIN "unit" u ON l."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id_param;

    -- Build final result
    SELECT json_build_object(
        'properties', properties_stats,
        'tenants', tenants_stats,
        'units', units_stats,
        'leases', leases_stats,
        'maintenanceRequests', maintenance_stats,
        'notifications', notifications_stats,
        'revenue', revenue_stats
    ) INTO result;

    RETURN result;
END;
$$;

-- =====================================================================================
-- 2. GET_PROPERTY_PERFORMANCE - Property performance metrics
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_property_performance(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'property_name', p.name,
            'property_id', p.id,
            'total_units', COALESCE(unit_counts.total_units, 0),
            'occupied_units', COALESCE(unit_counts.occupied_units, 0),
            'vacant_units', COALESCE(unit_counts.vacant_units, 0),
            'occupancy_rate', CASE
                WHEN COALESCE(unit_counts.total_units, 0) > 0
                THEN ROUND((COALESCE(unit_counts.occupied_units, 0) * 100.0 / unit_counts.total_units), 2)
                ELSE 0
            END,
            'annual_revenue', COALESCE(revenue_data.annual_revenue, 0),
            'monthly_revenue', COALESCE(revenue_data.monthly_revenue, 0),
            'potential_revenue', COALESCE(unit_counts.total_units, 0) * COALESCE(avg_rent.average_rent, 0) * 12,
            'address', COALESCE(p.address, ''),
            'property_type', COALESCE(p.type::text, 'OTHER'),
            'status', CASE
                WHEN COALESCE(unit_counts.total_units, 0) = 0 THEN 'NO_UNITS'
                WHEN COALESCE(unit_counts.occupied_units, 0) = 0 THEN 'VACANT'
                WHEN COALESCE(unit_counts.occupied_units, 0) = unit_counts.total_units THEN 'FULL'
                ELSE 'PARTIAL'
            END
        )
    ) INTO result
    FROM "property" p
    LEFT JOIN (
        SELECT
            u."propertyId",
            COUNT(*) as total_units,
            COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END) as occupied_units,
            COUNT(CASE WHEN u.status = 'VACANT' THEN 1 END) as vacant_units
        FROM "unit" u
        GROUP BY u."propertyId"
    ) unit_counts ON p.id = unit_counts."propertyId"
    LEFT JOIN (
        SELECT
            p.id as property_id,
            COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."rentAmount" * 12 ELSE 0 END), 0) as annual_revenue,
            COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."rentAmount" ELSE 0 END), 0) as monthly_revenue
        FROM "property" p
        LEFT JOIN "unit" u ON p.id = u."propertyId"
        LEFT JOIN "lease" l ON u.id = l."unitId"
        GROUP BY p.id
    ) revenue_data ON p.id = revenue_data.property_id
    LEFT JOIN (
        SELECT
            u."propertyId",
            AVG(u.rent) as average_rent
        FROM "unit" u
        WHERE u.rent IS NOT NULL
        GROUP BY u."propertyId"
    ) avg_rent ON p.id = avg_rent."propertyId"
    WHERE p."ownerId" = p_user_id;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- =====================================================================================
-- 3. GET_MAINTENANCE_ANALYTICS - Maintenance analytics with resolution times
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_maintenance_analytics(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    avg_resolution_time numeric;
    completion_rate numeric;
    priority_breakdown json;
    trends_over_time json;
BEGIN
    -- Calculate average resolution time (in days)
    SELECT AVG(
        CASE
            WHEN m.status = 'COMPLETED' AND m."completedAt" IS NOT NULL
            THEN EXTRACT(epoch FROM (m."completedAt"::timestamp - m."createdAt"::timestamp)) / 86400
            ELSE NULL
        END
    ) INTO avg_resolution_time
    FROM "maintenance_request" m
    JOIN "unit" u ON m."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id;

    -- Calculate completion rate
    SELECT
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND((COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)), 2)
            ELSE 0
        END
    INTO completion_rate
    FROM "maintenance_request" m
    JOIN "unit" u ON m."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id;

    -- Priority breakdown
    SELECT json_object_agg(priority, count)
    INTO priority_breakdown
    FROM (
        SELECT
            m.priority,
            COUNT(*) as count
        FROM "maintenance_request" m
        JOIN "unit" u ON m."unitId" = u.id
        JOIN "property" p ON u."propertyId" = p.id
        WHERE p."ownerId" = user_id
        GROUP BY m.priority
    ) priority_stats;

    -- Trends over time (last 12 months)
    SELECT json_agg(
        json_build_object(
            'month', month_data.month,
            'completed', COALESCE(month_data.completed, 0),
            'avg_resolution_days', COALESCE(month_data.avg_resolution_days, 0)
        )
        ORDER BY month_data.month
    )
    INTO trends_over_time
    FROM (
        SELECT
            TO_CHAR(DATE_TRUNC('month', m."createdAt"), 'YYYY-MM') as month,
            COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed,
            AVG(
                CASE
                    WHEN m.status = 'COMPLETED' AND m."completedAt" IS NOT NULL
                    THEN EXTRACT(epoch FROM (m."completedAt"::timestamp - m."createdAt"::timestamp)) / 86400
                    ELSE NULL
                END
            ) as avg_resolution_days
        FROM "maintenance_request" m
        JOIN "unit" u ON m."unitId" = u.id
        JOIN "property" p ON u."propertyId" = p.id
        WHERE p."ownerId" = user_id
            AND m."createdAt" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', m."createdAt")
        ORDER BY month
    ) month_data;

    -- Build final result
    SELECT json_build_object(
        'avg_resolution_time', COALESCE(avg_resolution_time, 0),
        'completion_rate', COALESCE(completion_rate, 0),
        'priority_breakdown', COALESCE(priority_breakdown, '{}'::json),
        'trends_over_time', COALESCE(trends_over_time, '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;

-- =====================================================================================
-- 4. GET_BILLING_INSIGHTS - Billing and revenue insights
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_billing_insights(
    user_id uuid,
    start_date timestamp DEFAULT NULL,
    end_date timestamp DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    date_filter_start timestamp;
    date_filter_end timestamp;
BEGIN
    -- Set default date range if not provided (last 12 months)
    date_filter_start := COALESCE(start_date, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months');
    date_filter_end := COALESCE(end_date, CURRENT_DATE);

    SELECT json_build_object(
        'total_revenue', COALESCE(SUM(rp.amount), 0) / 100, -- Convert from cents
        'monthly_revenue', COALESCE(
            SUM(CASE
                WHEN rp."paidAt" >= DATE_TRUNC('month', CURRENT_DATE)
                THEN rp.amount
                ELSE 0
            END), 0
        ) / 100,
        'payment_success_rate', CASE
            WHEN COUNT(*) > 0
            THEN ROUND((COUNT(CASE WHEN rp.status = 'SUCCEEDED' THEN 1 END) * 100.0 / COUNT(*)), 2)
            ELSE 0
        END,
        'outstanding_payments', COALESCE(
            SUM(CASE WHEN rp.status != 'SUCCEEDED' THEN rp.amount ELSE 0 END), 0
        ) / 100,
        'revenue_by_month', (
            SELECT json_agg(
                json_build_object(
                    'month', TO_CHAR(DATE_TRUNC('month', rp2."paidAt"), 'YYYY-MM'),
                    'revenue', COALESCE(SUM(rp2.amount), 0) / 100
                )
                ORDER BY DATE_TRUNC('month', rp2."paidAt")
            )
            FROM "RentPayment" rp2
            JOIN "tenant" t2 ON rp2."tenantId" = t2.id
            JOIN "lease" l2 ON t2.id = l2."tenantId"
            JOIN "unit" u2 ON l2."unitId" = u2.id
            JOIN "property" p2 ON u2."propertyId" = p2.id
            WHERE p2."ownerId" = user_id
                AND rp2."paidAt" >= date_filter_start
                AND rp2."paidAt" <= date_filter_end
                AND rp2.status = 'SUCCEEDED'
            GROUP BY DATE_TRUNC('month', rp2."paidAt")
        )
    ) INTO result
    FROM "RentPayment" rp
    JOIN "tenant" t ON rp."tenantId" = t.id
    JOIN "lease" l ON t.id = l."tenantId"
    JOIN "unit" u ON l."unitId" = u.id
    JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = user_id
        AND rp."paidAt" >= date_filter_start
        AND rp."paidAt" <= date_filter_end;

    RETURN COALESCE(result, '{}'::json);
END;
$$;

-- =====================================================================================
-- 5. HEALTH_CHECK_ANALYTICS - Simple health check for analytics functions
-- =====================================================================================

CREATE OR REPLACE FUNCTION health_check_analytics()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT true;
$$;

-- =====================================================================================
-- 6. STRIPE RPC FUNCTIONS (Referenced in billing service)
-- =====================================================================================

-- Note: These require Stripe tables to exist. If you don't have Stripe integration,
-- these functions will return empty results

-- REMOVED: get_stripe_payment_intents function
-- Replaced with direct table queries in billing repository for better performance and simplicity

CREATE OR REPLACE FUNCTION get_stripe_subscriptions(
    limit_count integer DEFAULT 1000,
    customer_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return empty array if stripe_subscriptions table doesn't exist
    RETURN '[]'::json;

    -- Uncomment and modify if you have Stripe tables:
    /*
    RETURN (
        SELECT json_agg(row_to_json(ss))
        FROM (
            SELECT * FROM stripe_subscriptions
            WHERE (customer_id IS NULL OR customer_id = ss.customer_id)
            ORDER BY created_at DESC
            LIMIT limit_count
        ) ss
    );
    */
END;
$$;

CREATE OR REPLACE FUNCTION get_stripe_customers(limit_count integer DEFAULT 1000)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return empty array if stripe_customers table doesn't exist
    RETURN '[]'::json;

    -- Uncomment and modify if you have Stripe tables:
    /*
    RETURN (
        SELECT json_agg(row_to_json(sc))
        FROM (
            SELECT * FROM stripe_customers
            ORDER BY created_at DESC
            LIMIT limit_count
        ) sc
    );
    */
END;
$$;

-- =====================================================================================
-- GRANT PERMISSIONS
-- =====================================================================================

-- Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_performance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_maintenance_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_billing_insights(uuid, timestamp, timestamp) TO authenticated;
GRANT EXECUTE ON FUNCTION health_check_analytics() TO authenticated;
-- REMOVED: GRANT for get_stripe_payment_intents (function removed)
GRANT EXECUTE ON FUNCTION get_stripe_subscriptions(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_customers(integer) TO authenticated;

-- =====================================================================================
-- INSTRUCTIONS
-- =====================================================================================
--
-- 1. Copy this entire file content
-- 2. Go to your Supabase Dashboard → SQL Editor
-- 3. Paste the content and run it
-- 4. All RPC functions will be created and ready to use
--
-- These functions provide:
-- - Dashboard statistics aggregation
-- - Property performance metrics
-- - Maintenance analytics with resolution times
-- - Billing insights and revenue analysis
-- - Health check functionality
-- - Stripe analytics support (placeholder)
--
-- =====================================================================================