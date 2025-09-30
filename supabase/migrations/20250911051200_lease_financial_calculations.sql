-- Lease Financial RPC functions to eliminate ALL frontend rent calculations
-- CRITICAL: Move optimistic update calculations and lease financial logic to database
-- Following CLAUDE.md: zero math/business calculations in React components

-- Enhanced lease creation with financial calculations (replaces frontend optimistic updates)
CREATE OR REPLACE FUNCTION create_lease_with_financial_calculations(
  p_user_id UUID,
  p_tenant_id UUID,
  p_unit_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_rent_amount NUMERIC,
  p_security_deposit NUMERIC DEFAULT 0,
  p_lease_terms TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_lease_id UUID;
  updated_stats JSON;
  property_id UUID;
  current_total_rent NUMERIC := 0;
  new_total_rent NUMERIC := 0;
BEGIN
  -- Verify unit belongs to user's property
  SELECT p.id INTO property_id
  FROM "Unit" u
  JOIN "Property" p ON p.id = u."propertyId"
  WHERE u.id = p_unit_id AND p."userId" = p_user_id;
  
  IF property_id IS NULL THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  -- Calculate current total monthly rent (replaces frontend calculation)
  SELECT COALESCE(SUM(l."rentAmount"), 0) INTO current_total_rent
  FROM "Lease" l
  JOIN "Unit" u ON u.id = l."unitId"
  JOIN "Property" p ON p.id = u."propertyId"
  WHERE p."userId" = p_user_id AND l.status = 'ACTIVE';

  -- Create the lease
  INSERT INTO "Lease" (
    "tenantId", "unitId", "startDate", "endDate", 
    "rentAmount", "securityDeposit", "leaseTerms", 
    "status", "createdAt", "updatedAt"
  )
  VALUES (
    p_tenant_id, p_unit_id, p_start_date, p_end_date,
    p_rent_amount, p_security_deposit, p_lease_terms,
    'ACTIVE', NOW(), NOW()
  )
  RETURNING id INTO new_lease_id;

  -- Calculate new total monthly rent (business logic moved from frontend)
  new_total_rent := current_total_rent + p_rent_amount;

  -- Get updated financial statistics
  SELECT json_build_object(
    'totalMonthlyRent', new_total_rent,
    'activeLeases', (
      SELECT COUNT(*)
      FROM "Lease" l
      JOIN "Unit" u ON u.id = l."unitId"
      JOIN "Property" p ON p.id = u."propertyId"
      WHERE p."userId" = p_user_id AND l.status = 'ACTIVE'
    ),
    'occupancyRate', (
      SELECT CASE 
        WHEN COUNT(u.id) > 0 THEN 
          ROUND((COUNT(l.id)::DECIMAL / COUNT(u.id) * 100.0), 1)
        ELSE 0 
      END
      FROM "Property" p
      LEFT JOIN "Unit" u ON u."propertyId" = p.id
      LEFT JOIN "Lease" l ON l."unitId" = u.id AND l.status = 'ACTIVE'
      WHERE p."userId" = p_user_id
    ),
    'revenueProjection', new_total_rent * 12 -- Annual projection
  ) INTO updated_stats;

  -- Return complete lease data with financial calculations
  RETURN (
    SELECT json_build_object(
      'lease', json_build_object(
        'id', l.id,
        'tenantId', l."tenantId",
        'unitId', l."unitId", 
        'startDate', l."startDate",
        'endDate', l."endDate",
        'rentAmount', l."rentAmount",
        'securityDeposit', l."securityDeposit",
        'leaseTerms', l."leaseTerms",
        'status', l.status,
        'createdAt', l."createdAt",
        'updatedAt', l."updatedAt",
        -- Pre-calculated lease analytics (replaces frontend calculations)
        'monthsRemaining', EXTRACT(MONTH FROM AGE(l."endDate", CURRENT_DATE))::INTEGER,
        'daysRemaining', EXTRACT(DAY FROM (l."endDate" - CURRENT_DATE))::INTEGER,
        'leaseProgress', CASE 
          WHEN l."endDate" > l."startDate" THEN
            ROUND((EXTRACT(DAY FROM (CURRENT_DATE - l."startDate")) / 
                   EXTRACT(DAY FROM (l."endDate" - l."startDate")) * 100.0), 1)
          ELSE 0
        END,
        'isExpiringSoon', (l."endDate" - CURRENT_DATE) <= INTERVAL '30 days',
        -- Tenant and unit information
        'tenantName', t."firstName" || ' ' || t."lastName",
        'unitNumber', u."unitNumber",
        'propertyName', p.name
      ),
      'financialStats', updated_stats
    )
    FROM "Lease" l
    JOIN "Tenant" t ON t.id = l."tenantId"
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "Property" p ON p.id = u."propertyId"
    WHERE l.id = new_lease_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced lease update with financial recalculations (replaces frontend optimistic updates)
CREATE OR REPLACE FUNCTION update_lease_with_financial_calculations(
  p_user_id UUID,
  p_lease_id UUID,
  p_rent_amount NUMERIC DEFAULT NULL,
  p_security_deposit NUMERIC DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_lease_terms TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_rent_amount NUMERIC := 0;
  new_rent_amount NUMERIC := 0;
  rent_difference NUMERIC := 0;
  updated_stats JSON;
  property_id UUID;
BEGIN
  -- Verify lease belongs to user and get old rent amount
  SELECT l."rentAmount", p.id INTO old_rent_amount, property_id
  FROM "Lease" l
  JOIN "Unit" u ON u.id = l."unitId"
  JOIN "Property" p ON p.id = u."propertyId"
  WHERE l.id = p_lease_id AND p."userId" = p_user_id;
  
  IF property_id IS NULL THEN
    RAISE EXCEPTION 'Lease not found or access denied';
  END IF;

  -- Use new rent amount or keep existing
  new_rent_amount := COALESCE(p_rent_amount, old_rent_amount);
  rent_difference := new_rent_amount - old_rent_amount;

  -- Update the lease with provided values
  UPDATE "Lease" 
  SET 
    "rentAmount" = COALESCE(p_rent_amount, "rentAmount"),
    "securityDeposit" = COALESCE(p_security_deposit, "securityDeposit"),
    "startDate" = COALESCE(p_start_date, "startDate"),
    "endDate" = COALESCE(p_end_date, "endDate"),
    "leaseTerms" = COALESCE(p_lease_terms, "leaseTerms"),
    "status" = COALESCE(p_status, "status"),
    "updatedAt" = NOW()
  WHERE id = p_lease_id;

  -- Calculate updated financial statistics (business logic from frontend)
  SELECT json_build_object(
    'totalMonthlyRent', (
      SELECT COALESCE(SUM(l."rentAmount"), 0)
      FROM "Lease" l
      JOIN "Unit" u ON u.id = l."unitId"
      JOIN "Property" p ON p.id = u."propertyId"
      WHERE p."userId" = p_user_id AND l.status = 'ACTIVE'
    ),
    'rentDifference', rent_difference,
    'impactDescription', CASE 
      WHEN rent_difference > 0 THEN 'Monthly revenue increased by $' || rent_difference
      WHEN rent_difference < 0 THEN 'Monthly revenue decreased by $' || ABS(rent_difference)
      ELSE 'No change in monthly revenue'
    END
  ) INTO updated_stats;

  -- Return updated lease with calculations
  RETURN (
    SELECT json_build_object(
      'lease', json_build_object(
        'id', l.id,
        'tenantId', l."tenantId",
        'unitId', l."unitId",
        'startDate', l."startDate",
        'endDate', l."endDate",
        'rentAmount', l."rentAmount",
        'securityDeposit', l."securityDeposit",
        'leaseTerms', l."leaseTerms",
        'status', l.status,
        'updatedAt', l."updatedAt",
        -- Pre-calculated analytics (replaces frontend calculations)
        'monthsRemaining', EXTRACT(MONTH FROM AGE(l."endDate", CURRENT_DATE))::INTEGER,
        'daysRemaining', EXTRACT(DAY FROM (l."endDate" - CURRENT_DATE))::INTEGER,
        'leaseProgress', CASE 
          WHEN l."endDate" > l."startDate" THEN
            ROUND((EXTRACT(DAY FROM (CURRENT_DATE - l."startDate")) / 
                   EXTRACT(DAY FROM (l."endDate" - l."startDate")) * 100.0), 1)
          ELSE 0
        END
      ),
      'financialStats', updated_stats
    )
    FROM "Lease" l
    WHERE l.id = p_lease_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced lease termination with financial impact calculations
CREATE OR REPLACE FUNCTION terminate_lease_with_financial_calculations(
  p_user_id UUID,
  p_lease_id UUID,
  p_termination_date DATE DEFAULT CURRENT_DATE,
  p_termination_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  lost_rent_amount NUMERIC := 0;
  property_id UUID;
  updated_stats JSON;
BEGIN
  -- Verify lease belongs to user and get rent amount
  SELECT l."rentAmount", p.id INTO lost_rent_amount, property_id
  FROM "Lease" l
  JOIN "Unit" u ON u.id = l."unitId"
  JOIN "Property" p ON p.id = u."propertyId"
  WHERE l.id = p_lease_id AND p."userId" = p_user_id AND l.status = 'ACTIVE';
  
  IF property_id IS NULL THEN
    RAISE EXCEPTION 'Active lease not found or access denied';
  END IF;

  -- Terminate the lease
  UPDATE "Lease" 
  SET 
    "status" = 'TERMINATED',
    "endDate" = p_termination_date,
    "leaseTerms" = COALESCE("leaseTerms", '') || 
      CASE WHEN p_termination_reason IS NOT NULL 
        THEN E'\n\nTermination Reason: ' || p_termination_reason 
        ELSE '' 
      END,
    "updatedAt" = NOW()
  WHERE id = p_lease_id;

  -- Calculate financial impact (business logic moved from frontend)
  SELECT json_build_object(
    'newTotalMonthlyRent', (
      SELECT COALESCE(SUM(l."rentAmount"), 0)
      FROM "Lease" l
      JOIN "Unit" u ON u.id = l."unitId"
      JOIN "Property" p ON p.id = u."propertyId"
      WHERE p."userId" = p_user_id AND l.status = 'ACTIVE'
    ),
    'monthlyRevenueLoss', lost_rent_amount,
    'annualRevenueLoss', lost_rent_amount * 12,
    'impactDescription', 'Monthly revenue decreased by $' || lost_rent_amount || ' due to lease termination',
    'newOccupancyRate', (
      SELECT CASE 
        WHEN COUNT(u.id) > 0 THEN 
          ROUND((COUNT(l.id)::DECIMAL / COUNT(u.id) * 100.0), 1)
        ELSE 0 
      END
      FROM "Property" p
      LEFT JOIN "Unit" u ON u."propertyId" = p.id
      LEFT JOIN "Lease" l ON l."unitId" = u.id AND l.status = 'ACTIVE'
      WHERE p."userId" = p_user_id
    )
  ) INTO updated_stats;

  RETURN json_build_object(
    'success', true,
    'terminatedLeaseId', p_lease_id,
    'terminationDate', p_termination_date,
    'financialImpact', updated_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get leases with comprehensive financial analytics (replaces frontend calculations)
CREATE OR REPLACE FUNCTION get_leases_with_financial_analytics(
  p_user_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', l.id,
        'tenantId', l."tenantId",
        'unitId', l."unitId",
        'startDate', l."startDate",
        'endDate', l."endDate",
        'rentAmount', l."rentAmount",
        'securityDeposit', l."securityDeposit",
        'status', l.status,
        'createdAt', l."createdAt",
        'updatedAt', l."updatedAt",
        -- Pre-calculated analytics (eliminates frontend date math)
        'daysActive', EXTRACT(DAY FROM (CURRENT_DATE - l."startDate"))::INTEGER,
        'daysRemaining', CASE 
          WHEN l.status = 'ACTIVE' AND l."endDate" > CURRENT_DATE THEN
            EXTRACT(DAY FROM (l."endDate" - CURRENT_DATE))::INTEGER
          ELSE 0
        END,
        'monthsRemaining', CASE 
          WHEN l.status = 'ACTIVE' AND l."endDate" > CURRENT_DATE THEN
            EXTRACT(MONTH FROM AGE(l."endDate", CURRENT_DATE))::INTEGER
          ELSE 0
        END,
        'leaseProgress', CASE 
          WHEN l."endDate" > l."startDate" THEN
            ROUND((EXTRACT(DAY FROM (CURRENT_DATE - l."startDate")) / 
                   EXTRACT(DAY FROM (l."endDate" - l."startDate")) * 100.0), 1)
          ELSE 0
        END,
        'isExpiring', (l.status = 'ACTIVE' AND (l."endDate" - CURRENT_DATE) <= INTERVAL '30 days'),
        'isExpired', (l.status = 'ACTIVE' AND l."endDate" < CURRENT_DATE),
        -- Financial calculations (moved from frontend)
        'totalPaidToDate', l."rentAmount" * GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, l."startDate"))::INTEGER),
        'remainingRevenue', CASE 
          WHEN l.status = 'ACTIVE' AND l."endDate" > CURRENT_DATE THEN
            l."rentAmount" * EXTRACT(MONTH FROM AGE(l."endDate", CURRENT_DATE))::INTEGER
          ELSE 0
        END,
        'annualizedRevenue', l."rentAmount" * 12,
        -- Status formatting and colors
        'statusDisplay', INITCAP(l.status),
        'statusColor', get_status_color('lease', l.status),
        -- Related entity information
        'tenantName', t."firstName" || ' ' || t."lastName",
        'tenantEmail', t.email,
        'unitNumber', u."unitNumber",
        'propertyName', p.name,
        'propertyAddress', p.address || ', ' || p.city
      )
    )
    FROM "Lease" l
    JOIN "Tenant" t ON t.id = l."tenantId"
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "Property" p ON p.id = u."propertyId"
    WHERE p."userId" = p_user_id
    AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l."createdAt" DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get lease financial summary for dashboard (replaces frontend aggregations)
CREATE OR REPLACE FUNCTION get_lease_financial_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  summary_data JSON;
BEGIN
  SELECT json_build_object(
    'totalActiveLeases', COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END),
    'totalMonthlyRevenue', COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."rentAmount" ELSE 0 END), 0),
    'totalAnnualRevenue', COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."rentAmount" * 12 ELSE 0 END), 0),
    'averageRentAmount', CASE 
      WHEN COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END) > 0 THEN
        ROUND(AVG(CASE WHEN l.status = 'ACTIVE' THEN l."rentAmount" END), 2)
      ELSE 0
    END,
    'expiringLeases', COUNT(CASE 
      WHEN l.status = 'ACTIVE' AND (l."endDate" - CURRENT_DATE) <= INTERVAL '30 days' 
      THEN 1 
    END),
    'expiredLeases', COUNT(CASE 
      WHEN l.status = 'ACTIVE' AND l."endDate" < CURRENT_DATE 
      THEN 1 
    END),
    'totalSecurityDeposits', COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."securityDeposit" ELSE 0 END), 0),
    -- Performance metrics (business calculations moved from frontend)
    'collectionRate', 100.0, -- Placeholder until payment tracking is wired into the collection metrics
    'renewalRate', CASE 
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END)::DECIMAL / COUNT(*) * 100.0), 1)
      ELSE 0
    END,
    'occupancyRate', (
      SELECT CASE 
        WHEN COUNT(u.id) > 0 THEN 
          ROUND((COUNT(l.id)::DECIMAL / COUNT(u.id) * 100.0), 1)
        ELSE 0 
      END
      FROM "Property" p
      LEFT JOIN "Unit" u ON u."propertyId" = p.id
      LEFT JOIN "Lease" active_lease ON active_lease."unitId" = u.id AND active_lease.status = 'ACTIVE'
      WHERE p."userId" = p_user_id
    )
  ) INTO summary_data
  FROM "Lease" l
  JOIN "Unit" u ON u.id = l."unitId"
  JOIN "Property" p ON p.id = u."propertyId"
  WHERE p."userId" = p_user_id;

  RETURN summary_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_lease_with_financial_calculations(UUID, UUID, UUID, DATE, DATE, NUMERIC, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_lease_with_financial_calculations(UUID, UUID, NUMERIC, NUMERIC, DATE, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION terminate_lease_with_financial_calculations(UUID, UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leases_with_financial_analytics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lease_financial_summary(UUID) TO authenticated;
