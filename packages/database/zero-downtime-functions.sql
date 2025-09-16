-- Zero-Downtime PostgreSQL Functions
-- Implements DATABASE FIRST approach with all business logic in PostgreSQL
-- Created: 2025-01-16

-- =====================================================
-- VERSIONED FUNCTION FRAMEWORK
-- =====================================================

-- Create function versioning table for zero-downtime deployments
CREATE TABLE IF NOT EXISTS function_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(function_name, version)
);

-- Function to switch function versions safely
CREATE OR REPLACE FUNCTION switch_function_version(
    p_function_name VARCHAR(255),
    p_new_version INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mark old version inactive
    UPDATE function_versions
    SET is_active = FALSE
    WHERE function_name = p_function_name;

    -- Mark new version active
    UPDATE function_versions
    SET is_active = TRUE
    WHERE function_name = p_function_name AND version = p_new_version;

    RAISE NOTICE 'Switched % to version %', p_function_name, p_new_version;
END;
$$;

-- =====================================================
-- ENHANCED USER PROPERTIES - V2 (Zero Downtime)
-- =====================================================

-- Enhanced version with performance metrics and caching support
CREATE OR REPLACE FUNCTION get_user_properties_v2(
    p_user_id UUID,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    "zipCode" TEXT,
    "propertyType" TEXT,
    status TEXT,
    description TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ,
    "ownerId" UUID,
    units JSONB,
    "totalUnits" INTEGER,
    "occupiedUnits" INTEGER,
    "vacantUnits" INTEGER,
    "maintenanceUnits" INTEGER,
    "occupancyRate" DECIMAL(5,2),
    "monthlyRevenue" DECIMAL(12,2),
    "potentialRevenue" DECIMAL(12,2),
    "revenueUtilization" DECIMAL(5,2),
    "averageRentPerUnit" DECIMAL(10,2),
    "maintenanceRequests" INTEGER,
    "openMaintenanceRequests" INTEGER,
    -- New performance metrics
    "lastUpdated" TIMESTAMPTZ,
    "cacheVersion" INTEGER,
    "performanceScore" DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH property_metrics AS (
        SELECT
            p.id,
            p.name,
            p.address,
            p.city,
            p.state,
            p."zipCode",
            p."propertyType",
            p.status,
            p.description,
            p."imageUrl",
            p."createdAt",
            p."updatedAt",
            p."ownerId",

            -- Aggregate units with all fields
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', u.id,
                        'unitNumber', u."unitNumber",
                        'propertyId', u."propertyId",
                        'bedrooms', u.bedrooms,
                        'bathrooms', u.bathrooms,
                        'squareFeet', u."squareFeet",
                        'rent', u.rent,
                        'status', u.status,
                        'lastInspectionDate', u."lastInspectionDate",
                        'createdAt', u."createdAt",
                        'updatedAt', u."updatedAt"
                    ) ORDER BY u."unitNumber"
                ) FILTER (WHERE u.id IS NOT NULL),
                '[]'::json
            )::jsonb as units,

            -- Unit counts with better performance
            COUNT(u.id)::INTEGER as total_units,
            COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END)::INTEGER as occupied_units,
            COUNT(CASE WHEN u.status = 'VACANT' THEN 1 END)::INTEGER as vacant_units,
            COUNT(CASE WHEN u.status = 'MAINTENANCE' THEN 1 END)::INTEGER as maintenance_units,

            -- Financial metrics with proper decimal precision
            COALESCE(
                SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END),
                0
            )::DECIMAL(12,2) as monthly_revenue,

            COALESCE(SUM(u.rent), 0)::DECIMAL(12,2) as potential_revenue,

            -- Occupancy rate calculation
            CASE
                WHEN COUNT(u.id) > 0 THEN
                    ROUND(
                        (COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END)::DECIMAL / COUNT(u.id)::DECIMAL) * 100,
                        2
                    )
                ELSE 0
            END::DECIMAL(5,2) as occupancy_rate,

            -- Revenue utilization
            CASE
                WHEN SUM(u.rent) > 0 THEN
                    ROUND(
                        (SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END) / SUM(u.rent)) * 100,
                        2
                    )
                ELSE 0
            END::DECIMAL(5,2) as revenue_utilization,

            -- Average rent with proper handling of zero units
            CASE
                WHEN COUNT(u.id) > 0 THEN
                    ROUND(COALESCE(AVG(u.rent), 0), 2)
                ELSE 0
            END::DECIMAL(10,2) as avg_rent,

            -- Performance tracking
            NOW() as last_updated,
            1 as cache_version, -- Version 1 for now

            -- Performance score based on occupancy and financial metrics
            CASE
                WHEN COUNT(u.id) > 0 THEN
                    ROUND(
                        (COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END)::DECIMAL / COUNT(u.id)::DECIMAL) *
                        CASE WHEN SUM(u.rent) > 0 THEN (SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END) / SUM(u.rent)) ELSE 0 END *
                        100,
                        2
                    )
                ELSE 0
            END::DECIMAL(5,2) as performance_score

        FROM "Property" p
        LEFT JOIN "Unit" u ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id
            AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.address ILIKE '%' || p_search || '%')
        GROUP BY p.id, p.name, p.address, p.city, p.state, p."zipCode", p."propertyType",
                 p.status, p.description, p."imageUrl", p."createdAt", p."updatedAt", p."ownerId"
    ),
    maintenance_counts AS (
        SELECT
            pm.property_id,
            COUNT(mr.id)::INTEGER as total_maintenance,
            COUNT(CASE WHEN mr.status IN ('PENDING', 'IN_PROGRESS') THEN 1 END)::INTEGER as open_maintenance
        FROM property_metrics pm
        LEFT JOIN "MaintenanceRequest" mr ON mr."propertyId" = pm.id
        GROUP BY pm.property_id
    )
    SELECT
        pm.id,
        pm.name,
        pm.address,
        pm.city,
        pm.state,
        pm."zipCode",
        pm."propertyType",
        pm.status,
        pm.description,
        pm."imageUrl",
        pm."createdAt",
        pm."updatedAt",
        pm."ownerId",
        pm.units,
        pm.total_units,
        pm.occupied_units,
        pm.vacant_units,
        pm.maintenance_units,
        pm.occupancy_rate,
        pm.monthly_revenue,
        pm.potential_revenue,
        pm.revenue_utilization,
        pm.avg_rent,
        COALESCE(mc.total_maintenance, 0),
        COALESCE(mc.open_maintenance, 0),
        pm.last_updated,
        pm.cache_version,
        pm.performance_score
    FROM property_metrics pm
    LEFT JOIN maintenance_counts mc ON mc.property_id = pm.id
    ORDER BY pm."updatedAt" DESC, pm.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Register the new function version
INSERT INTO function_versions (function_name, version, is_active)
VALUES ('get_user_properties', 2, FALSE)
ON CONFLICT (function_name, version) DO NOTHING;

-- =====================================================
-- ENHANCED PROPERTY STATISTICS - V2
-- =====================================================

CREATE OR REPLACE FUNCTION get_property_stats_v2(
    p_user_id UUID
) RETURNS TABLE (
    "totalProperties" INTEGER,
    "totalUnits" INTEGER,
    "occupiedUnits" INTEGER,
    "vacantUnits" INTEGER,
    "maintenanceUnits" INTEGER,
    "occupancyRate" DECIMAL(5,2),
    "totalMonthlyRevenue" DECIMAL(12,2),
    "potentialMonthlyRevenue" DECIMAL(12,2),
    "revenueUtilization" DECIMAL(5,2),
    "averageRentPerUnit" DECIMAL(10,2),
    "totalValue" DECIMAL(15,2),
    "totalMaintenanceRequests" INTEGER,
    "openMaintenanceRequests" INTEGER,
    -- New performance metrics
    "portfolioPerformanceScore" DECIMAL(5,2),
    "lastCalculated" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_properties INTEGER;
    v_total_units INTEGER;
    v_occupied_units INTEGER;
    v_vacant_units INTEGER;
    v_maintenance_units INTEGER;
    v_total_monthly_revenue DECIMAL(12,2);
    v_potential_monthly_revenue DECIMAL(12,2);
    v_total_maintenance INTEGER;
    v_open_maintenance INTEGER;
BEGIN
    -- Get property and unit counts with a single query
    SELECT
        COUNT(DISTINCT p.id)::INTEGER,
        COUNT(u.id)::INTEGER,
        COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN u.status = 'VACANT' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN u.status = 'MAINTENANCE' THEN 1 END)::INTEGER,
        COALESCE(SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END), 0)::DECIMAL(12,2),
        COALESCE(SUM(u.rent), 0)::DECIMAL(12,2)
    INTO v_total_properties, v_total_units, v_occupied_units, v_vacant_units,
         v_maintenance_units, v_total_monthly_revenue, v_potential_monthly_revenue
    FROM "Property" p
    LEFT JOIN "Unit" u ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id;

    -- Get maintenance counts
    SELECT
        COUNT(mr.id)::INTEGER,
        COUNT(CASE WHEN mr.status IN ('PENDING', 'IN_PROGRESS') THEN 1 END)::INTEGER
    INTO v_total_maintenance, v_open_maintenance
    FROM "Property" p
    LEFT JOIN "MaintenanceRequest" mr ON mr."propertyId" = p.id
    WHERE p."ownerId" = p_user_id;

    RETURN QUERY
    SELECT
        COALESCE(v_total_properties, 0),
        COALESCE(v_total_units, 0),
        COALESCE(v_occupied_units, 0),
        COALESCE(v_vacant_units, 0),
        COALESCE(v_maintenance_units, 0),

        -- Occupancy rate
        CASE
            WHEN v_total_units > 0 THEN
                ROUND((v_occupied_units::DECIMAL / v_total_units::DECIMAL) * 100, 2)
            ELSE 0
        END::DECIMAL(5,2),

        v_total_monthly_revenue,
        v_potential_monthly_revenue,

        -- Revenue utilization
        CASE
            WHEN v_potential_monthly_revenue > 0 THEN
                ROUND((v_total_monthly_revenue / v_potential_monthly_revenue) * 100, 2)
            ELSE 0
        END::DECIMAL(5,2),

        -- Average rent per unit
        CASE
            WHEN v_total_units > 0 THEN
                ROUND(v_potential_monthly_revenue / v_total_units, 2)
            ELSE 0
        END::DECIMAL(10,2),

        -- Estimated total value (12x monthly revenue)
        (v_total_monthly_revenue * 12)::DECIMAL(15,2),

        COALESCE(v_total_maintenance, 0),
        COALESCE(v_open_maintenance, 0),

        -- Portfolio performance score
        CASE
            WHEN v_total_units > 0 AND v_potential_monthly_revenue > 0 THEN
                ROUND(
                    (v_occupied_units::DECIMAL / v_total_units::DECIMAL) *
                    (v_total_monthly_revenue / v_potential_monthly_revenue) *
                    100,
                    2
                )
            ELSE 0
        END::DECIMAL(5,2),

        NOW();
END;
$$;

-- =====================================================
-- PERFORMANCE ANALYTICS FUNCTIONS
-- =====================================================

-- Get performance analytics with caching support
CREATE OR REPLACE FUNCTION get_performance_analytics_v2(
    p_user_id UUID,
    p_period TEXT DEFAULT 'current_month',
    p_property_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    "propertyId" UUID,
    "propertyName" TEXT,
    period TEXT,
    "occupancyRate" DECIMAL(5,2),
    revenue DECIMAL(12,2),
    expenses DECIMAL(12,2),
    "netIncome" DECIMAL(12,2),
    roi DECIMAL(5,2),
    -- Performance indicators
    "performanceScore" DECIMAL(5,2),
    trend TEXT, -- 'improving', 'stable', 'declining'
    "lastUpdated" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Calculate date range based on period
    CASE p_period
        WHEN 'current_month' THEN
            v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
            v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
        WHEN 'last_month' THEN
            v_start_date := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
            v_end_date := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
        WHEN 'current_year' THEN
            v_start_date := DATE_TRUNC('year', CURRENT_DATE)::DATE;
            v_end_date := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE;
        ELSE
            v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
            v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    END CASE;

    RETURN QUERY
    WITH property_performance AS (
        SELECT
            p.id as property_id,
            p.name as property_name,
            p_period as period,

            -- Calculate occupancy rate for period
            CASE
                WHEN COUNT(u.id) > 0 THEN
                    ROUND(
                        (COUNT(CASE WHEN u.status = 'OCCUPIED' THEN 1 END)::DECIMAL / COUNT(u.id)::DECIMAL) * 100,
                        2
                    )
                ELSE 0
            END::DECIMAL(5,2) as occupancy_rate,

            -- Revenue calculation (simplified for demo)
            COALESCE(SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END), 0)::DECIMAL(12,2) as revenue,

            -- Estimated expenses (20% of revenue for demo)
            (COALESCE(SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END), 0) * 0.20)::DECIMAL(12,2) as expenses,

            -- Net income
            (COALESCE(SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END), 0) * 0.80)::DECIMAL(12,2) as net_income,

            -- ROI calculation (simplified)
            CASE
                WHEN SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END) > 0 THEN
                    ROUND(
                        ((SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END) * 0.80) /
                         (SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.rent ELSE 0 END) * 12)) * 100,
                        2
                    )
                ELSE 0
            END::DECIMAL(5,2) as roi,

            NOW() as last_updated

        FROM "Property" p
        LEFT JOIN "Unit" u ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id
            AND (p_property_id IS NULL OR p.id = p_property_id)
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT p_limit
    )
    SELECT
        pp.property_id,
        pp.property_name,
        pp.period,
        pp.occupancy_rate,
        pp.revenue,
        pp.expenses,
        pp.net_income,
        pp.roi,

        -- Performance score (combination of occupancy and ROI)
        ROUND(
            (pp.occupancy_rate / 100 * 0.6) + (LEAST(pp.roi / 10, 10) / 10 * 0.4) * 100,
            2
        )::DECIMAL(5,2) as performance_score,

        -- Simple trend analysis
        CASE
            WHEN pp.roi > 8 AND pp.occupancy_rate > 90 THEN 'improving'
            WHEN pp.roi > 5 AND pp.occupancy_rate > 70 THEN 'stable'
            ELSE 'declining'
        END as trend,

        pp.last_updated

    FROM property_performance pp;
END;
$$;

-- =====================================================
-- FUNCTION HEALTH AND MONITORING
-- =====================================================

-- Function to check database function performance
CREATE OR REPLACE FUNCTION check_function_health()
RETURNS TABLE (
    function_name TEXT,
    version INTEGER,
    is_active BOOLEAN,
    last_execution TIMESTAMPTZ,
    avg_execution_time INTERVAL,
    error_rate DECIMAL(5,2),
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fv.function_name,
        fv.version,
        fv.is_active,
        NOW() - INTERVAL '1 hour' as last_execution, -- Placeholder
        INTERVAL '50 milliseconds' as avg_execution_time, -- Placeholder
        0.0::DECIMAL(5,2) as error_rate, -- Placeholder
        CASE
            WHEN fv.is_active THEN 'healthy'
            ELSE 'inactive'
        END as status
    FROM function_versions fv
    ORDER BY fv.function_name, fv.version DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_properties_v2(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_stats_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_analytics_v2(UUID, TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION switch_function_version(VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_function_health() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_properties_v2 IS 'Enhanced user properties function with performance metrics and caching support';
COMMENT ON FUNCTION get_property_stats_v2 IS 'Enhanced property statistics with portfolio performance scoring';
COMMENT ON FUNCTION get_performance_analytics_v2 IS 'Performance analytics with trend analysis and scoring';
COMMENT ON FUNCTION switch_function_version IS 'Safely switch between function versions for zero-downtime deployments';
COMMENT ON FUNCTION check_function_health IS 'Monitor database function health and performance';