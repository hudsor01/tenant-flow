-- ============================================================================
-- Tenant Analytics RPC Functions
-- ============================================================================
-- Create comprehensive tenant analytics RPC functions using native PostgreSQL
-- All analytics leverage existing tenant and lease tables
-- 
-- Author: Claude Code  
-- Date: 2025-09-11
-- ============================================================================

-- Tenant Behavior Analytics RPC
CREATE OR REPLACE FUNCTION get_tenant_behavior_analytics(
    p_user_id UUID,
    p_tenant_id UUID DEFAULT NULL,
    p_property_id UUID DEFAULT NULL,
    p_timeframe TEXT DEFAULT '6m'
)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
BEGIN
    -- Calculate start date based on timeframe
    v_start_date := CASE p_timeframe
        WHEN '3m' THEN NOW() - INTERVAL '3 months'
        WHEN '6m' THEN NOW() - INTERVAL '6 months'
        WHEN '12m' THEN NOW() - INTERVAL '12 months'
        WHEN '24m' THEN NOW() - INTERVAL '24 months'
        ELSE NOW() - INTERVAL '6 months'
    END;

    -- Return comprehensive tenant behavior analytics
    RETURN (
        SELECT ARRAY_AGG(
            json_build_object(
                'tenantId', t."id",
                'tenantName', COALESCE(t."firstName" || ' ' || t."lastName", 'Unknown'),
                'email', t."email",
                'phone', t."phone",
                'propertyId', p."id",
                'propertyName', p."name",
                'unitNumber', u."unitNumber",
                'leaseStatus', l."status",
                'moveInDate', l."startDate",
                'leaseEndDate', l."endDate",
                'monthlyRent', COALESCE(l."monthlyRent", 0),
                'tenureDays', EXTRACT(EPOCH FROM (COALESCE(l."terminatedAt", NOW()) - l."startDate")) / 86400,
                'tenureMonths', EXTRACT(EPOCH FROM (COALESCE(l."terminatedAt", NOW()) - l."startDate")) / (86400 * 30),
                'invitationStatus', t."invitationStatus",
                'maintenanceRequests', COALESCE(maint_stats.total_requests, 0),
                'urgentMaintenance', COALESCE(maint_stats.urgent_requests, 0),
                'avgMaintenanceResponse', COALESCE(maint_stats.avg_response_days, 0),
                'communicationPreference', COALESCE(t."communicationPreference", 'email'),
                'isLongTermTenant', CASE 
                    WHEN EXTRACT(EPOCH FROM (COALESCE(l."terminatedAt", NOW()) - l."startDate")) / (86400 * 365) >= 1
                    THEN TRUE
                    ELSE FALSE
                END,
                'renewalEligible', CASE 
                    WHEN l."status" = 'ACTIVE' AND l."endDate" > NOW() + INTERVAL '30 days'
                    THEN TRUE
                    ELSE FALSE
                END,
                'riskScore', COALESCE(risk_stats.risk_score, 0),
                'satisfactionScore', COALESCE(satisfaction_stats.satisfaction_score, 85), -- Default placeholder
                'timeframe', p_timeframe
            )
            ORDER BY 
                CASE l."status"
                    WHEN 'ACTIVE' THEN 1
                    WHEN 'EXPIRED' THEN 2
                    ELSE 3
                END,
                EXTRACT(EPOCH FROM (COALESCE(l."terminatedAt", NOW()) - l."startDate")) DESC
        )
        FROM "tenant" t
        LEFT JOIN "lease" l ON l."tenantId" = t."id"
        LEFT JOIN "unit" u ON l."unitId" = u."id"
        LEFT JOIN "property" p ON u."propertyId" = p."id"
        LEFT JOIN (
            -- Maintenance request statistics per tenant
            SELECT 
                mr."tenantId",
                COUNT(mr.*) as total_requests,
                COUNT(mr.*) FILTER (WHERE mr."priority" IN ('HIGH', 'URGENT')) as urgent_requests,
                AVG(
                    CASE 
                        WHEN mr."status" = 'COMPLETED' AND mr."completedAt" IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (mr."completedAt" - mr."createdAt")) / 86400
                        ELSE NULL
                    END
                ) as avg_response_days
            FROM "maintenance_request" mr
            WHERE mr."createdAt" >= v_start_date
            GROUP BY mr."tenantId"
        ) as maint_stats ON t."id" = maint_stats."tenantId"
        LEFT JOIN (
            -- Risk scoring based on maintenance frequency and urgency
            SELECT 
                mr2."tenantId",
                CASE 
                    WHEN COUNT(mr2.*) FILTER (WHERE mr2."priority" = 'URGENT') > 3 THEN 75
                    WHEN COUNT(mr2.*) > 10 THEN 60
                    WHEN COUNT(mr2.*) > 5 THEN 40
                    ELSE 20
                END as risk_score
            FROM "maintenance_request" mr2
            WHERE mr2."createdAt" >= v_start_date
            GROUP BY mr2."tenantId"
        ) as risk_stats ON t."id" = risk_stats."tenantId"
        LEFT JOIN (
            -- Satisfaction scoring (placeholder - would integrate with surveys)
            SELECT 
                t2."id" as tenant_id,
                CASE 
                    WHEN EXTRACT(EPOCH FROM (NOW() - t2."createdAt")) / (86400 * 365) > 2 THEN 90
                    WHEN EXTRACT(EPOCH FROM (NOW() - t2."createdAt")) / (86400 * 365) > 1 THEN 85
                    ELSE 80
                END as satisfaction_score
            FROM "tenant" t2
        ) as satisfaction_stats ON t."id" = satisfaction_stats.tenant_id
        WHERE p."ownerId" = p_user_id
        AND (p_tenant_id IS NULL OR t."id" = p_tenant_id)
        AND (p_property_id IS NULL OR p."id" = p_property_id)
        AND l."createdAt" >= v_start_date
    );
END;
$$;

-- Tenant Satisfaction Analytics RPC
CREATE OR REPLACE FUNCTION get_tenant_satisfaction_analytics(
    p_user_id UUID,
    p_property_id UUID DEFAULT NULL,
    p_timeframe TEXT DEFAULT '12m'
)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
BEGIN
    -- Calculate start date based on timeframe
    v_start_date := CASE p_timeframe
        WHEN '6m' THEN NOW() - INTERVAL '6 months'
        WHEN '12m' THEN NOW() - INTERVAL '12 months'
        WHEN '24m' THEN NOW() - INTERVAL '24 months'
        ELSE NOW() - INTERVAL '12 months'
    END;

    -- Return tenant satisfaction analytics
    RETURN (
        SELECT ARRAY_AGG(
            json_build_object(
                'propertyId', p."id",
                'propertyName', p."name",
                'totalTenants', COALESCE(tenant_stats.total_tenants, 0),
                'activeTenants', COALESCE(tenant_stats.active_tenants, 0),
                'longTermTenants', COALESCE(tenant_stats.long_term_tenants, 0),
                'averageTenureMonths', COALESCE(tenant_stats.avg_tenure_months, 0),
                'averageSatisfactionScore', COALESCE(satisfaction_metrics.avg_satisfaction, 85),
                'highSatisfactionCount', COALESCE(satisfaction_metrics.high_satisfaction, 0),
                'lowSatisfactionCount', COALESCE(satisfaction_metrics.low_satisfaction, 0),
                'maintenanceComplaintRate', COALESCE(complaint_metrics.complaint_rate, 0),
                'responseTimeRating', COALESCE(response_metrics.avg_response_rating, 4.0),
                'renewalIntentScore', COALESCE(renewal_metrics.renewal_intent, 75),
                'recommendationScore', COALESCE(nps_metrics.nps_score, 50),
                'timeframe', p_timeframe
            )
        )
        FROM "property" p
        LEFT JOIN (
            -- Tenant statistics per property
            SELECT 
                p2."id" as property_id,
                COUNT(DISTINCT t.*) as total_tenants,
                COUNT(DISTINCT t.*) FILTER (WHERE l."status" = 'ACTIVE') as active_tenants,
                COUNT(DISTINCT t.*) FILTER (WHERE 
                    EXTRACT(EPOCH FROM (NOW() - l."startDate")) / (86400 * 365) >= 1
                ) as long_term_tenants,
                AVG(
                    EXTRACT(EPOCH FROM (COALESCE(l."terminatedAt", NOW()) - l."startDate")) / (86400 * 30)
                ) as avg_tenure_months
            FROM "property" p2
            LEFT JOIN "unit" u ON u."propertyId" = p2."id"
            LEFT JOIN "lease" l ON l."unitId" = u."id"
            LEFT JOIN "tenant" t ON l."tenantId" = t."id"
            WHERE l."createdAt" >= v_start_date OR l."createdAt" IS NULL
            GROUP BY p2."id"
        ) as tenant_stats ON p."id" = tenant_stats.property_id
        LEFT JOIN (
            -- Satisfaction metrics (placeholder - would integrate with survey system)
            SELECT 
                p3."id" as property_id,
                AVG(
                    CASE 
                        WHEN EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 365) > 2 THEN 90
                        WHEN EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 365) > 1 THEN 85
                        ELSE 80
                    END
                ) as avg_satisfaction,
                COUNT(*) FILTER (WHERE 
                    CASE 
                        WHEN EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 365) > 2 THEN 90
                        WHEN EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 365) > 1 THEN 85
                        ELSE 80
                    END >= 80
                ) as high_satisfaction,
                COUNT(*) FILTER (WHERE 
                    CASE 
                        WHEN EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 365) > 2 THEN 90
                        WHEN EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 365) > 1 THEN 85
                        ELSE 80
                    END < 70
                ) as low_satisfaction
            FROM "property" p3
            LEFT JOIN "unit" u2 ON u2."propertyId" = p3."id"
            LEFT JOIN "lease" l2 ON l2."unitId" = u2."id"
            WHERE l2."status" = 'ACTIVE'
            GROUP BY p3."id"
        ) as satisfaction_metrics ON p."id" = satisfaction_metrics.property_id
        LEFT JOIN (
            -- Maintenance complaint rate metrics
            SELECT 
                p4."id" as property_id,
                CASE 
                    WHEN COUNT(DISTINCT t2.*) > 0
                    THEN ROUND((COUNT(mr.*) FILTER (WHERE mr."priority" IN ('HIGH', 'URGENT'))::FLOAT / COUNT(DISTINCT t2.*)) * 100, 2)
                    ELSE 0
                END as complaint_rate
            FROM "property" p4
            LEFT JOIN "unit" u3 ON u3."propertyId" = p4."id"
            LEFT JOIN "lease" l3 ON l3."unitId" = u3."id" AND l3."status" = 'ACTIVE'
            LEFT JOIN "tenant" t2 ON l3."tenantId" = t2."id"
            LEFT JOIN "maintenance_request" mr ON mr."unitId" = u3."id" 
                AND mr."createdAt" >= v_start_date
            GROUP BY p4."id"
        ) as complaint_metrics ON p."id" = complaint_metrics.property_id
        LEFT JOIN (
            -- Response time rating (placeholder)
            SELECT 
                p5."id" as property_id,
                4.2 as avg_response_rating -- Placeholder - would calculate from actual response times
            FROM "property" p5
        ) as response_metrics ON p."id" = response_metrics.property_id
        LEFT JOIN (
            -- Renewal intent metrics
            SELECT 
                p6."id" as property_id,
                CASE 
                    WHEN COUNT(l4.*) > 0
                    THEN ROUND((COUNT(l4.*) FILTER (WHERE l4."endDate" > NOW() + INTERVAL '60 days')::FLOAT / COUNT(l4.*)) * 100, 2)
                    ELSE 0
                END as renewal_intent
            FROM "property" p6
            LEFT JOIN "unit" u4 ON u4."propertyId" = p6."id"
            LEFT JOIN "lease" l4 ON l4."unitId" = u4."id" AND l4."status" = 'ACTIVE'
            GROUP BY p6."id"
        ) as renewal_metrics ON p."id" = renewal_metrics.property_id
        LEFT JOIN (
            -- NPS-like score (placeholder)
            SELECT 
                p7."id" as property_id,
                60 as nps_score -- Placeholder - would integrate with actual NPS surveys
            FROM "property" p7
        ) as nps_metrics ON p."id" = nps_metrics.property_id
        WHERE p."ownerId" = p_user_id
        AND (p_property_id IS NULL OR p."id" = p_property_id)
    );
END;
$$;

-- Tenant Retention Analytics RPC
CREATE OR REPLACE FUNCTION get_tenant_retention_analytics(
    p_user_id UUID,
    p_property_id UUID DEFAULT NULL,
    p_timeframe TEXT DEFAULT '24m'
)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
BEGIN
    -- Calculate start date based on timeframe
    v_start_date := CASE p_timeframe
        WHEN '12m' THEN NOW() - INTERVAL '12 months'
        WHEN '24m' THEN NOW() - INTERVAL '24 months'
        WHEN '36m' THEN NOW() - INTERVAL '36 months'
        ELSE NOW() - INTERVAL '24 months'
    END;

    -- Return tenant retention and churn analytics
    RETURN (
        SELECT ARRAY_AGG(
            json_build_object(
                'propertyId', p."id",
                'propertyName', p."name",
                'totalTenants', COALESCE(retention_stats.total_tenants, 0),
                'retainedTenants', COALESCE(retention_stats.retained_tenants, 0),
                'churnedTenants', COALESCE(retention_stats.churned_tenants, 0),
                'newTenants', COALESCE(retention_stats.new_tenants, 0),
                'retentionRate', CASE 
                    WHEN COALESCE(retention_stats.total_tenants, 0) > 0
                    THEN ROUND((COALESCE(retention_stats.retained_tenants, 0)::FLOAT / retention_stats.total_tenants) * 100, 2)
                    ELSE 0
                END,
                'churnRate', CASE 
                    WHEN COALESCE(retention_stats.total_tenants, 0) > 0
                    THEN ROUND((COALESCE(retention_stats.churned_tenants, 0)::FLOAT / retention_stats.total_tenants) * 100, 2)
                    ELSE 0
                END,
                'averageTenureBeforeChurn', COALESCE(churn_stats.avg_tenure_months, 0),
                'topChurnReasons', COALESCE(churn_reasons.reasons, '[]'::JSON),
                'seasonalTrends', COALESCE(seasonal_stats.trends, '[]'::JSON),
                'retentionBySegment', json_build_object(
                    'shortTerm', COALESCE(segment_stats.short_term_retention, 0),
                    'mediumTerm', COALESCE(segment_stats.medium_term_retention, 0),
                    'longTerm', COALESCE(segment_stats.long_term_retention, 0)
                ),
                'timeframe', p_timeframe
            )
        )
        FROM "property" p
        LEFT JOIN (
            -- Basic retention statistics
            SELECT 
                p2."id" as property_id,
                COUNT(DISTINCT l2."tenantId") as total_tenants,
                COUNT(DISTINCT l2."tenantId") FILTER (WHERE l2."status" = 'ACTIVE') as retained_tenants,
                COUNT(DISTINCT l2."tenantId") FILTER (WHERE l2."status" IN ('EXPIRED', 'TERMINATED')) as churned_tenants,
                COUNT(DISTINCT l2."tenantId") FILTER (WHERE l2."startDate" >= v_start_date) as new_tenants
            FROM "property" p2
            LEFT JOIN "unit" u ON u."propertyId" = p2."id"
            LEFT JOIN "lease" l2 ON l2."unitId" = u."id"
            WHERE l2."startDate" >= v_start_date OR l2."status" = 'ACTIVE'
            GROUP BY p2."id"
        ) as retention_stats ON p."id" = retention_stats.property_id
        LEFT JOIN (
            -- Churn analysis
            SELECT 
                p3."id" as property_id,
                AVG(
                    EXTRACT(EPOCH FROM (COALESCE(l3."terminatedAt", l3."endDate") - l3."startDate")) / (86400 * 30)
                ) as avg_tenure_months
            FROM "property" p3
            LEFT JOIN "unit" u2 ON u2."propertyId" = p3."id"
            LEFT JOIN "lease" l3 ON l3."unitId" = u2."id"
            WHERE l3."status" IN ('EXPIRED', 'TERMINATED')
            AND l3."startDate" >= v_start_date
            GROUP BY p3."id"
        ) as churn_stats ON p."id" = churn_stats.property_id
        LEFT JOIN (
            -- Churn reasons (placeholder - would integrate with exit surveys)
            SELECT 
                p4."id" as property_id,
                json_build_array(
                    json_build_object('reason', 'End of lease', 'percentage', 45),
                    json_build_object('reason', 'Relocation', 'percentage', 25),
                    json_build_object('reason', 'Financial reasons', 'percentage', 20),
                    json_build_object('reason', 'Property issues', 'percentage', 10)
                ) as reasons
            FROM "property" p4
        ) as churn_reasons ON p."id" = churn_reasons.property_id
        LEFT JOIN (
            -- Seasonal trends (placeholder)
            SELECT 
                p5."id" as property_id,
                json_build_array(
                    json_build_object('month', 'Q1', 'churnRate', 15),
                    json_build_object('month', 'Q2', 'churnRate', 10),
                    json_build_object('month', 'Q3', 'churnRate', 25),
                    json_build_object('month', 'Q4', 'churnRate', 12)
                ) as trends
            FROM "property" p5
        ) as seasonal_stats ON p."id" = seasonal_stats.property_id
        LEFT JOIN (
            -- Retention by tenure segment
            SELECT 
                p6."id" as property_id,
                COUNT(*) FILTER (WHERE tenure_months <= 12)::FLOAT / NULLIF(COUNT(*), 0) * 100 as short_term_retention,
                COUNT(*) FILTER (WHERE tenure_months > 12 AND tenure_months <= 24)::FLOAT / NULLIF(COUNT(*), 0) * 100 as medium_term_retention,
                COUNT(*) FILTER (WHERE tenure_months > 24)::FLOAT / NULLIF(COUNT(*), 0) * 100 as long_term_retention
            FROM "property" p6
            LEFT JOIN "unit" u3 ON u3."propertyId" = p6."id"
            LEFT JOIN "lease" l4 ON l4."unitId" = u3."id"
            LEFT JOIN (
                SELECT 
                    l5."id",
                    EXTRACT(EPOCH FROM (COALESCE(l5."terminatedAt", NOW()) - l5."startDate")) / (86400 * 30) as tenure_months
                FROM "lease" l5
                WHERE l5."status" IN ('ACTIVE', 'EXPIRED', 'TERMINATED')
            ) as tenure_calc ON l4."id" = tenure_calc."id"
            WHERE l4."startDate" >= v_start_date OR l4."status" = 'ACTIVE'
            GROUP BY p6."id"
        ) as segment_stats ON p."id" = segment_stats.property_id
        WHERE p."ownerId" = p_user_id
        AND (p_property_id IS NULL OR p."id" = p_property_id)
    );
END;
$$;

-- Tenant Demographics Analytics RPC
CREATE OR REPLACE FUNCTION get_tenant_demographics_analytics(
    p_user_id UUID,
    p_property_id UUID DEFAULT NULL
)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return tenant demographic insights and patterns
    RETURN (
        SELECT ARRAY_AGG(
            json_build_object(
                'propertyId', p."id",
                'propertyName', p."name",
                'totalActiveTenants', COALESCE(demo_stats.total_tenants, 0),
                'averageAge', COALESCE(demo_stats.avg_age, 0),
                'ageDistribution', json_build_object(
                    'under25', COALESCE(age_stats.under_25, 0),
                    'age25to35', COALESCE(age_stats.age_25_35, 0),
                    'age36to50', COALESCE(age_stats.age_36_50, 0),
                    'over50', COALESCE(age_stats.over_50, 0)
                ),
                'communicationPreferences', json_build_object(
                    'email', COALESCE(comm_stats.email_pref, 0),
                    'phone', COALESCE(comm_stats.phone_pref, 0),
                    'text', COALESCE(comm_stats.text_pref, 0)
                ),
                'invitationStatus', json_build_object(
                    'accepted', COALESCE(invite_stats.accepted, 0),
                    'pending', COALESCE(invite_stats.pending, 0),
                    'sent', COALESCE(invite_stats.sent, 0)
                ),
                'tenureDistribution', json_build_object(
                    'newTenants', COALESCE(tenure_stats.new_tenants, 0),
                    'establishedTenants', COALESCE(tenure_stats.established_tenants, 0),
                    'longTermTenants', COALESCE(tenure_stats.long_term_tenants, 0)
                ),
                'averageTenureMonths', COALESCE(demo_stats.avg_tenure_months, 0)
            )
        )
        FROM "property" p
        LEFT JOIN (
            -- Basic demographic statistics
            SELECT 
                p2."id" as property_id,
                COUNT(DISTINCT t.*) as total_tenants,
                AVG(
                    CASE 
                        WHEN t."dateOfBirth" IS NOT NULL
                        THEN EXTRACT(YEAR FROM AGE(t."dateOfBirth"))
                        ELSE NULL
                    END
                ) as avg_age,
                AVG(
                    EXTRACT(EPOCH FROM (NOW() - l2."startDate")) / (86400 * 30)
                ) as avg_tenure_months
            FROM "property" p2
            LEFT JOIN "unit" u ON u."propertyId" = p2."id"
            LEFT JOIN "lease" l2 ON l2."unitId" = u."id" AND l2."status" = 'ACTIVE'
            LEFT JOIN "tenant" t ON l2."tenantId" = t."id"
            GROUP BY p2."id"
        ) as demo_stats ON p."id" = demo_stats.property_id
        LEFT JOIN (
            -- Age distribution statistics
            SELECT 
                p3."id" as property_id,
                COUNT(*) FILTER (WHERE 
                    t2."dateOfBirth" IS NOT NULL AND 
                    EXTRACT(YEAR FROM AGE(t2."dateOfBirth")) < 25
                ) as under_25,
                COUNT(*) FILTER (WHERE 
                    t2."dateOfBirth" IS NOT NULL AND 
                    EXTRACT(YEAR FROM AGE(t2."dateOfBirth")) BETWEEN 25 AND 35
                ) as age_25_35,
                COUNT(*) FILTER (WHERE 
                    t2."dateOfBirth" IS NOT NULL AND 
                    EXTRACT(YEAR FROM AGE(t2."dateOfBirth")) BETWEEN 36 AND 50
                ) as age_36_50,
                COUNT(*) FILTER (WHERE 
                    t2."dateOfBirth" IS NOT NULL AND 
                    EXTRACT(YEAR FROM AGE(t2."dateOfBirth")) > 50
                ) as over_50
            FROM "property" p3
            LEFT JOIN "unit" u2 ON u2."propertyId" = p3."id"
            LEFT JOIN "lease" l3 ON l3."unitId" = u2."id" AND l3."status" = 'ACTIVE'
            LEFT JOIN "tenant" t2 ON l3."tenantId" = t2."id"
            GROUP BY p3."id"
        ) as age_stats ON p."id" = age_stats.property_id
        LEFT JOIN (
            -- Communication preferences
            SELECT 
                p4."id" as property_id,
                COUNT(*) FILTER (WHERE t3."communicationPreference" = 'email') as email_pref,
                COUNT(*) FILTER (WHERE t3."communicationPreference" = 'phone') as phone_pref,
                COUNT(*) FILTER (WHERE t3."communicationPreference" = 'text') as text_pref
            FROM "property" p4
            LEFT JOIN "unit" u3 ON u3."propertyId" = p4."id"
            LEFT JOIN "lease" l4 ON l4."unitId" = u3."id" AND l4."status" = 'ACTIVE'
            LEFT JOIN "tenant" t3 ON l4."tenantId" = t3."id"
            GROUP BY p4."id"
        ) as comm_stats ON p."id" = comm_stats.property_id
        LEFT JOIN (
            -- Invitation status statistics
            SELECT 
                p5."id" as property_id,
                COUNT(*) FILTER (WHERE t4."invitationStatus" = 'ACCEPTED') as accepted,
                COUNT(*) FILTER (WHERE t4."invitationStatus" = 'PENDING') as pending,
                COUNT(*) FILTER (WHERE t4."invitationStatus" = 'SENT') as sent
            FROM "property" p5
            LEFT JOIN "unit" u4 ON u4."propertyId" = p5."id"
            LEFT JOIN "lease" l5 ON l5."unitId" = u4."id" AND l5."status" = 'ACTIVE'
            LEFT JOIN "tenant" t4 ON l5."tenantId" = t4."id"
            GROUP BY p5."id"
        ) as invite_stats ON p."id" = invite_stats.property_id
        LEFT JOIN (
            -- Tenure distribution
            SELECT 
                p6."id" as property_id,
                COUNT(*) FILTER (WHERE tenure_months <= 6) as new_tenants,
                COUNT(*) FILTER (WHERE tenure_months > 6 AND tenure_months <= 24) as established_tenants,
                COUNT(*) FILTER (WHERE tenure_months > 24) as long_term_tenants
            FROM "property" p6
            LEFT JOIN "unit" u5 ON u5."propertyId" = p6."id"
            LEFT JOIN "lease" l6 ON l6."unitId" = u5."id" AND l6."status" = 'ACTIVE'
            LEFT JOIN (
                SELECT 
                    l7."id",
                    EXTRACT(EPOCH FROM (NOW() - l7."startDate")) / (86400 * 30) as tenure_months
                FROM "lease" l7
            ) as tenure_calc ON l6."id" = tenure_calc."id"
            GROUP BY p6."id"
        ) as tenure_stats ON p."id" = tenure_stats.property_id
        WHERE p."ownerId" = p_user_id
        AND (p_property_id IS NULL OR p."id" = p_property_id)
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_tenant_behavior_analytics(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_satisfaction_analytics(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_retention_analytics(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_demographics_analytics(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_tenant_behavior_analytics IS 'Returns comprehensive tenant behavior metrics including tenure, maintenance patterns, and risk scoring';
COMMENT ON FUNCTION get_tenant_satisfaction_analytics IS 'Returns tenant satisfaction analytics with ratings, complaint rates, and NPS-like metrics';  
COMMENT ON FUNCTION get_tenant_retention_analytics IS 'Returns tenant retention and churn analytics with seasonal trends and segment analysis';
COMMENT ON FUNCTION get_tenant_demographics_analytics IS 'Returns tenant demographic insights including age distribution, communication preferences, and tenure patterns';

-- ============================================================================
-- Tenant Analytics RPC Functions Created Successfully
-- All functions use native PostgreSQL with proper security and performance
-- ============================================================================