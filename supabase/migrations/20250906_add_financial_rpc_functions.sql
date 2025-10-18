-- Financial RPC functions to eliminate frontend calculations
-- Following CLAUDE.md principle: all calculations in database, zero business logic in React

-- Get financial overview with all calculations done in database
CREATE OR REPLACE FUNCTION get_financial_overview(
  p_user_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS JSON AS $$
DECLARE
  monthly_data JSON;
  summary_stats JSON;
BEGIN
  -- Get monthly financial data with calculations
  SELECT json_agg(
    json_build_object(
      'month', TO_CHAR(month_date, 'Mon'),
      'monthNumber', EXTRACT(MONTH FROM month_date)::INT,
      'scheduled', COALESCE(scheduled_amount, 0),
      'expenses', COALESCE(expense_amount, 0),
      'income', COALESCE(income_amount, 0)
    ) ORDER BY month_date
  ) INTO monthly_data
  FROM (
    SELECT 
      DATE_TRUNC('month', generate_series(
        DATE(p_year || '-01-01'),
        DATE(p_year || '-12-01'),
        INTERVAL '1 month'
      )) as month_date,
      
      -- Scheduled payments (from active leases)
      (SELECT COALESCE(SUM(l."rentAmount"), 0)
       FROM "lease" l
       JOIN "unit" u ON u.id = l."unitId"
       JOIN "property" p ON p.id = u."propertyId"
       WHERE p."userId" = p_user_id 
       AND l.status = 'ACTIVE'
       AND l."startDate" <= DATE_TRUNC('month', generate_series.generate_series) + INTERVAL '1 month' - INTERVAL '1 day'
       AND l."endDate" >= DATE_TRUNC('month', generate_series.generate_series)
      ) as scheduled_amount,
      
      -- Expense totals will pull from maintenance/expense tables once those aggregates are finalized
      0 as expense_amount,
      
      -- Income from rent payments (scheduled amount for now; replace with actual payment tracking when available)
      (SELECT COALESCE(SUM(l."rentAmount"), 0)
       FROM "lease" l
       JOIN "unit" u ON u.id = l."unitId" 
       JOIN "property" p ON p.id = u."propertyId"
       WHERE p."userId" = p_user_id
       AND l.status = 'ACTIVE'
       AND l."startDate" <= DATE_TRUNC('month', generate_series.generate_series) + INTERVAL '1 month' - INTERVAL '1 day'
       AND l."endDate" >= DATE_TRUNC('month', generate_series.generate_series)
      ) as income_amount
      
    FROM generate_series(
      DATE(p_year || '-01-01'),
      DATE(p_year || '-12-01'),
      INTERVAL '1 month'
    )
  ) monthly;

  -- Calculate summary statistics  
  SELECT json_build_object(
    'totalIncome', COALESCE(SUM(
      (json_array_elements(monthly_data)->>'income')::NUMERIC
    ), 0),
    'totalExpenses', COALESCE(SUM(
      (json_array_elements(monthly_data)->>'expenses')::NUMERIC  
    ), 0),
    'totalScheduled', COALESCE(SUM(
      (json_array_elements(monthly_data)->>'scheduled')::NUMERIC
    ), 0),
    'netIncome', COALESCE(SUM(
      (json_array_elements(monthly_data)->>'income')::NUMERIC - 
      (json_array_elements(monthly_data)->>'expenses')::NUMERIC
    ), 0)
  ) INTO summary_stats;

  -- Return combined data
  RETURN json_build_object(
    'chartData', monthly_data,
    'summary', summary_stats,
    'year', p_year
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get expense summary with categories (calculated in database)
CREATE OR REPLACE FUNCTION get_expense_summary(
  p_user_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS JSON AS $$
BEGIN
  -- Real expense calculations will plug in once expense tracking is wired up; return the expected structure for now
  RETURN json_build_object(
    'chartData', json_build_array(
      json_build_object(
        'groceries', 0,
        'transport', 0, 
        'other', 0,
        'month', 'Current'
      )
    ),
    'summary', json_build_object(
      'totalExpenses', 0,
      'maintenanceExpenses', 0,
      'operationalExpenses', 0,
      'monthlyAverage', 0
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dashboard financial stats (for dashboard overview)
CREATE OR REPLACE FUNCTION get_dashboard_financial_stats(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'totalRevenue', COALESCE(SUM(l."rentAmount"), 0),
      'monthlyRecurring', COALESCE(SUM(l."rentAmount"), 0),
      'occupancyRate', CASE 
        WHEN COUNT(u.id) > 0 THEN 
          ROUND((COUNT(l.id)::DECIMAL / COUNT(u.id) * 100), 1)
        ELSE 0 
      END,
      'activeLeases', COUNT(l.id),
      'totalUnits', COUNT(u.id)
    )
    FROM "property" p
    LEFT JOIN "unit" u ON u."propertyId" = p.id
    LEFT JOIN "lease" l ON l."unitId" = u.id AND l.status = 'ACTIVE'
    WHERE p."userId" = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
