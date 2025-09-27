-- Financial Analytics RPC Functions
-- These functions move all heavy calculations from frontend to PostgreSQL

-- Function to calculate financial metrics for a given period
CREATE OR REPLACE FUNCTION calculate_financial_metrics(
  p_user_id TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH expense_data AS (
    SELECT
      DATE_TRUNC('month', e.date) AS month,
      SUM(e.amount) AS total_expenses,
      COUNT(*) AS expense_count,
      AVG(e.amount) AS avg_expense,
      MAX(e.amount) AS max_expense,
      MIN(e.amount) AS min_expense
    FROM "Expense" e
    INNER JOIN "Property" p ON e."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
      AND e.date BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('month', e.date)
  ),
  income_data AS (
    -- Mock income data for now - should be replaced with actual RentPayment data
    SELECT
      DATE_TRUNC('month', CURRENT_DATE) AS month,
      50000 + RANDOM() * 10000 AS total_income
  ),
  monthly_metrics AS (
    SELECT
      COALESCE(e.month, i.month) AS month,
      COALESCE(i.total_income, 50000) AS income,
      COALESCE(e.total_expenses, 0) AS expenses,
      COALESCE(i.total_income, 50000) - COALESCE(e.total_expenses, 0) AS net_income,
      CASE
        WHEN COALESCE(i.total_income, 50000) > 0
        THEN ((COALESCE(i.total_income, 50000) - COALESCE(e.total_expenses, 0)) / COALESCE(i.total_income, 50000)) * 100
        ELSE 0
      END AS net_margin
    FROM expense_data e
    FULL OUTER JOIN income_data i ON e.month = i.month
    ORDER BY month
  )
  SELECT json_build_object(
    'monthlyData', json_agg(monthly_metrics),
    'totalIncome', (SELECT SUM(income) FROM monthly_metrics),
    'totalExpenses', (SELECT SUM(expenses) FROM monthly_metrics),
    'netIncome', (SELECT SUM(net_income) FROM monthly_metrics),
    'avgMonthlyIncome', (SELECT AVG(income) FROM monthly_metrics),
    'avgMonthlyExpenses', (SELECT AVG(expenses) FROM monthly_metrics),
    'netMargin', (
      SELECT CASE
        WHEN SUM(income) > 0
        THEN (SUM(net_income) / SUM(income)) * 100
        ELSE 0
      END FROM monthly_metrics
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to calculate maintenance metrics
CREATE OR REPLACE FUNCTION calculate_maintenance_metrics(
  p_user_id TEXT,
  p_property_id TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH maintenance_data AS (
    SELECT
      mr.*,
      u."propertyId"
    FROM "MaintenanceRequest" mr
    INNER JOIN "Unit" u ON mr."unitId" = u.id
    INNER JOIN "Property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
      AND (p_property_id IS NULL OR u."propertyId" = p_property_id)
      AND mr."createdAt" BETWEEN p_start_date AND p_end_date
  ),
  metrics AS (
    SELECT
      COUNT(*) AS total_requests,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_requests,
      COUNT(*) FILTER (WHERE status = 'OPEN') AS open_requests,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_requests,
      AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))/3600) FILTER (WHERE "completedAt" IS NOT NULL) AS avg_completion_hours,
      SUM(COALESCE("actualCost", "estimatedCost", 0)) AS total_cost,
      AVG(COALESCE("actualCost", "estimatedCost", 0)) AS avg_cost,
      COUNT(*) FILTER (WHERE priority = 'EMERGENCY') AS emergency_count,
      COUNT(*) FILTER (WHERE priority = 'HIGH') AS high_priority_count
    FROM maintenance_data
  )
  SELECT json_build_object(
    'totalRequests', total_requests,
    'completedRequests', completed_requests,
    'openRequests', open_requests,
    'inProgressRequests', in_progress_requests,
    'completionRate', CASE
      WHEN total_requests > 0
      THEN (completed_requests::FLOAT / total_requests) * 100
      ELSE 0
    END,
    'avgCompletionHours', COALESCE(avg_completion_hours, 0),
    'totalCost', COALESCE(total_cost, 0),
    'avgCost', COALESCE(avg_cost, 0),
    'emergencyCount', emergency_count,
    'highPriorityCount', high_priority_count,
    'efficiency', CASE
      WHEN avg_completion_hours > 0
      THEN (24 / avg_completion_hours) * 100  -- 24 hours as baseline
      ELSE 0
    END
  ) INTO v_result
  FROM metrics;

  RETURN v_result;
END;
$$;

-- Function to calculate property performance metrics
CREATE OR REPLACE FUNCTION calculate_property_performance(
  p_user_id TEXT,
  p_property_id TEXT,
  p_period TEXT DEFAULT 'monthly'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_interval INTERVAL;
BEGIN
  -- Determine interval based on period
  v_interval := CASE p_period
    WHEN 'daily' THEN INTERVAL '1 day'
    WHEN 'weekly' THEN INTERVAL '1 week'
    WHEN 'monthly' THEN INTERVAL '1 month'
    WHEN 'yearly' THEN INTERVAL '1 year'
    ELSE INTERVAL '1 month'
  END;

  WITH property_data AS (
    SELECT
      p.*,
      COUNT(DISTINCT u.id) AS total_units,
      COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED') AS occupied_units,
      SUM(u.rent) AS total_potential_rent,
      SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED') AS actual_rent
    FROM "Property" p
    LEFT JOIN "Unit" u ON p.id = u."propertyId"
    WHERE p."ownerId" = p_user_id
      AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  ),
  expense_data AS (
    SELECT
      e."propertyId",
      SUM(e.amount) AS total_expenses,
      AVG(e.amount) AS avg_expense
    FROM "Expense" e
    WHERE e."propertyId" IN (SELECT id FROM property_data)
      AND e.date >= CURRENT_DATE - v_interval
    GROUP BY e."propertyId"
  ),
  maintenance_data AS (
    SELECT
      u."propertyId",
      COUNT(mr.id) AS maintenance_count,
      SUM(COALESCE(mr."actualCost", mr."estimatedCost", 0)) AS maintenance_cost
    FROM "MaintenanceRequest" mr
    INNER JOIN "Unit" u ON mr."unitId" = u.id
    WHERE u."propertyId" IN (SELECT id FROM property_data)
      AND mr."createdAt" >= CURRENT_DATE - v_interval
    GROUP BY u."propertyId"
  )
  SELECT json_build_object(
    'properties', json_agg(
      json_build_object(
        'propertyId', pd.id,
        'propertyName', pd.name,
        'totalUnits', pd.total_units,
        'occupiedUnits', pd.occupied_units,
        'occupancyRate', CASE
          WHEN pd.total_units > 0
          THEN (pd.occupied_units::FLOAT / pd.total_units) * 100
          ELSE 0
        END,
        'potentialRent', pd.total_potential_rent,
        'actualRent', pd.actual_rent,
        'totalExpenses', COALESCE(ed.total_expenses, 0),
        'maintenanceCost', COALESCE(md.maintenance_cost, 0),
        'maintenanceCount', COALESCE(md.maintenance_count, 0),
        'netIncome', COALESCE(pd.actual_rent, 0) - COALESCE(ed.total_expenses, 0) - COALESCE(md.maintenance_cost, 0),
        'roi', CASE
          WHEN COALESCE(ed.total_expenses, 0) + COALESCE(md.maintenance_cost, 0) > 0
          THEN ((COALESCE(pd.actual_rent, 0) - COALESCE(ed.total_expenses, 0) - COALESCE(md.maintenance_cost, 0)) /
                (COALESCE(ed.total_expenses, 0) + COALESCE(md.maintenance_cost, 0))) * 100
          ELSE 0
        END
      )
    )
  ) INTO v_result
  FROM property_data pd
  LEFT JOIN expense_data ed ON pd.id = ed."propertyId"
  LEFT JOIN maintenance_data md ON pd.id = md."propertyId";

  RETURN v_result;
END;
$$;

-- Function to calculate dashboard summary statistics
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH summary AS (
    SELECT
      (SELECT COUNT(*) FROM "Property" WHERE "ownerId" = p_user_id) AS total_properties,
      (SELECT COUNT(*) FROM "Unit" u
       INNER JOIN "Property" p ON u."propertyId" = p.id
       WHERE p."ownerId" = p_user_id) AS total_units,
      (SELECT COUNT(*) FROM "Unit" u
       INNER JOIN "Property" p ON u."propertyId" = p.id
       WHERE p."ownerId" = p_user_id AND u.status = 'OCCUPIED') AS occupied_units,
      (SELECT COUNT(*) FROM "Tenant" t
       INNER JOIN "Lease" l ON t.id = l."tenantId"
       INNER JOIN "Unit" u ON l."unitId" = u.id
       INNER JOIN "Property" p ON u."propertyId" = p.id
       WHERE p."ownerId" = p_user_id AND l.status = 'ACTIVE') AS active_tenants,
      (SELECT COUNT(*) FROM "MaintenanceRequest" mr
       INNER JOIN "Unit" u ON mr."unitId" = u.id
       INNER JOIN "Property" p ON u."propertyId" = p.id
       WHERE p."ownerId" = p_user_id AND mr.status IN ('OPEN', 'IN_PROGRESS')) AS pending_maintenance,
      (SELECT SUM(u.rent) FROM "Unit" u
       INNER JOIN "Property" p ON u."propertyId" = p.id
       WHERE p."ownerId" = p_user_id AND u.status = 'OCCUPIED') AS monthly_revenue,
      (SELECT SUM(e.amount) FROM "Expense" e
       INNER JOIN "Property" p ON e."propertyId" = p.id
       WHERE p."ownerId" = p_user_id
       AND e.date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_expenses
  )
  SELECT json_build_object(
    'totalProperties', total_properties,
    'totalUnits', total_units,
    'occupiedUnits', occupied_units,
    'occupancyRate', CASE
      WHEN total_units > 0
      THEN (occupied_units::FLOAT / total_units) * 100
      ELSE 0
    END,
    'activeTenants', active_tenants,
    'pendingMaintenance', pending_maintenance,
    'monthlyRevenue', COALESCE(monthly_revenue, 0),
    'monthlyExpenses', COALESCE(monthly_expenses, 0),
    'netIncome', COALESCE(monthly_revenue, 0) - COALESCE(monthly_expenses, 0),
    'profitMargin', CASE
      WHEN COALESCE(monthly_revenue, 0) > 0
      THEN ((COALESCE(monthly_revenue, 0) - COALESCE(monthly_expenses, 0)) / monthly_revenue) * 100
      ELSE 0
    END
  ) INTO v_result
  FROM summary;

  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_financial_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_maintenance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_property_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;