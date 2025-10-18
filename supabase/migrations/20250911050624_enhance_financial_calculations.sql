-- Enhanced Financial RPC functions to eliminate ALL frontend business logic
-- CRITICAL: Move revenue growth, profit margins, expense percentages to database
-- Following CLAUDE.md: zero math/business calculations in React components

-- Enhanced financial overview with ALL calculations (replaces frontend calculations)
CREATE OR REPLACE FUNCTION get_financial_overview_with_calculations(
  p_user_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS JSON AS $$
DECLARE
  monthly_data JSON;
  summary_stats JSON;
  previous_year_revenue NUMERIC := 0;
  current_year_revenue NUMERIC := 0;
  revenue_growth_percent NUMERIC := 0;
BEGIN
  -- Get monthly financial data with ALL calculations done in database
  SELECT json_agg(
    json_build_object(
      'month', TO_CHAR(month_date, 'Mon'),
      'monthNumber', EXTRACT(MONTH FROM month_date)::INT,
      'revenue', COALESCE(revenue_amount, 0),
      'expenses', COALESCE(expense_amount, 0),
      'profit', COALESCE(revenue_amount, 0) - COALESCE(expense_amount, 0),
      'displayRevenue', ROUND(COALESCE(revenue_amount, 0) / 100.0, 2),
      'displayExpenses', ROUND(COALESCE(expense_amount, 0) / 100.0, 2),
      'displayProfit', ROUND((COALESCE(revenue_amount, 0) - COALESCE(expense_amount, 0)) / 100.0, 2)
    ) ORDER BY month_date
  ) INTO monthly_data
  FROM (
    SELECT 
      DATE_TRUNC('month', generate_series(
        DATE(p_year || '-01-01'),
        DATE(p_year || '-12-01'),
        INTERVAL '1 month'
      )) as month_date,
      
      -- Revenue from active leases (in cents for precision)
      (SELECT COALESCE(SUM(l."rentAmount" * 100), 0)
       FROM "lease" l
       JOIN "unit" u ON u.id = l."unitId"
       JOIN "property" p ON p.id = u."propertyId"
       WHERE p."userId" = p_user_id 
       AND l.status = 'ACTIVE'
       AND l."startDate" <= DATE_TRUNC('month', generate_series.generate_series) + INTERVAL '1 month' - INTERVAL '1 day'
       AND l."endDate" >= DATE_TRUNC('month', generate_series.generate_series)
      ) as revenue_amount,
      
      -- Expenses (maintenance + operational costs, in cents)
      (SELECT COALESCE(SUM(
        CASE 
          WHEN mr."estimatedCost" IS NOT NULL THEN mr."estimatedCost" * 100
          ELSE 50000 -- Default $500 maintenance per property per month
        END
      ), 0)
       FROM "property" p
       LEFT JOIN "maintenance_request" mr ON mr."propertyId" = p.id 
         AND DATE_TRUNC('month', mr."createdAt") = DATE_TRUNC('month', generate_series.generate_series)
       WHERE p."userId" = p_user_id
      ) as expense_amount
      
    FROM generate_series(
      DATE(p_year || '-01-01'),
      DATE(p_year || '-12-01'),
      INTERVAL '1 month'
    )
  ) monthly;

  -- Calculate current year total revenue
  SELECT COALESCE(SUM((elem->>'revenue')::NUMERIC), 0) 
  INTO current_year_revenue
  FROM json_array_elements(monthly_data) elem;

  -- Calculate previous year revenue for growth calculation
  SELECT COALESCE(SUM(l."rentAmount" * 100), 0)
  INTO previous_year_revenue
  FROM "lease" l
  JOIN "unit" u ON u.id = l."unitId"
  JOIN "property" p ON p.id = u."propertyId"
  WHERE p."userId" = p_user_id 
  AND l.status = 'ACTIVE'
  AND EXTRACT(YEAR FROM l."startDate") = p_year - 1;

  -- Calculate revenue growth percentage (business logic moved from frontend)
  IF previous_year_revenue > 0 THEN
    revenue_growth_percent := ROUND(
      ((current_year_revenue - previous_year_revenue) / previous_year_revenue * 100.0), 1
    );
  ELSE
    revenue_growth_percent := 0;
  END IF;

  -- Calculate summary statistics with ALL business logic
  SELECT json_build_object(
    'totalRevenue', current_year_revenue,
    'totalExpenses', COALESCE(SUM((elem->>'expenses')::NUMERIC), 0),
    'netIncome', COALESCE(SUM((elem->>'profit')::NUMERIC), 0),
    'previousRevenue', previous_year_revenue,
    'revenueGrowth', revenue_growth_percent,
    'revenueGrowthFormatted', 
      CASE 
        WHEN revenue_growth_percent > 0 THEN '+' || revenue_growth_percent || '%'
        ELSE revenue_growth_percent || '%'
      END,
    -- Format currency for display (replaces frontend formatting)
    'totalRevenueFormatted', '$' || TO_CHAR(ROUND(current_year_revenue / 100.0), 'FM999,999,999'),
    'totalExpensesFormatted', '$' || TO_CHAR(ROUND(COALESCE(SUM((elem->>'expenses')::NUMERIC), 0) / 100.0), 'FM999,999,999'),
    'netIncomeFormatted', '$' || TO_CHAR(ROUND(COALESCE(SUM((elem->>'profit')::NUMERIC), 0) / 100.0), 'FM999,999,999')
  ) INTO summary_stats
  FROM json_array_elements(monthly_data) elem;

  -- Return combined data with all calculations complete
  RETURN json_build_object(
    'monthlyData', monthly_data,
    'totalRevenue', current_year_revenue,
    'totalExpenses', (summary_stats->>'totalExpenses')::NUMERIC,
    'netIncome', (summary_stats->>'netIncome')::NUMERIC,
    'previousRevenue', previous_year_revenue,
    'revenueChange', revenue_growth_percent,
    'summary', summary_stats,
    'year', p_year
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced expense summary with percentage calculations (replaces frontend math)
CREATE OR REPLACE FUNCTION get_expense_summary_with_percentages(
  p_user_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS JSON AS $$
DECLARE
  categories_data JSON;
  total_expenses NUMERIC := 0;
BEGIN
  -- Calculate expense categories with percentages (business logic from frontend)
  SELECT json_agg(
    json_build_object(
      'name', category_name,
      'amount', amount_cents,
      'displayAmount', '$' || TO_CHAR(ROUND(amount_cents / 100.0), 'FM999,999,999'),
      'percentage', CASE 
        WHEN total_amount > 0 THEN ROUND((amount_cents / total_amount * 100.0), 1)
        ELSE 0 
      END,
      'percentageFormatted', CASE 
        WHEN total_amount > 0 THEN ROUND((amount_cents / total_amount * 100.0), 1) || '%'
        ELSE '0%'
      END,
      'color', CASE category_name
        WHEN 'Maintenance' THEN '#ef4444'
        WHEN 'Utilities' THEN '#f59e0b'
        WHEN 'Insurance' THEN '#3b82f6'
        WHEN 'Property Tax' THEN '#8b5cf6'
        WHEN 'Management' THEN '#10b981'
        ELSE '#6b7280'
      END
    )
  ), SUM(amount_cents)
  INTO categories_data, total_expenses
  FROM (
    SELECT 
      'Maintenance' as category_name,
      COALESCE(SUM(COALESCE(mr."estimatedCost" * 100, 50000)), 0) as amount_cents,
      SUM(COALESCE(mr."estimatedCost" * 100, 50000)) OVER () as total_amount
    FROM "property" p
    LEFT JOIN "maintenance_request" mr ON mr."propertyId" = p.id 
      AND EXTRACT(YEAR FROM mr."createdAt") = p_year
    WHERE p."userId" = p_user_id
    
    UNION ALL
    
    SELECT 
      'Insurance' as category_name,
      COUNT(p.id) * 120000 as amount_cents, -- $1200 per property per year
      COUNT(p.id) * 120000 as total_amount
    FROM "property" p
    WHERE p."userId" = p_user_id
    
    UNION ALL
    
    SELECT 
      'Property Tax' as category_name,
      COUNT(p.id) * 200000 as amount_cents, -- $2000 per property per year
      COUNT(p.id) * 200000 as total_amount
    FROM "property" p
    WHERE p."userId" = p_user_id
  ) expense_categories;

  -- Return formatted expense data with all calculations
  RETURN json_build_object(
    'categories', categories_data,
    'totalExpenses', total_expenses,
    'totalExpensesFormatted', '$' || TO_CHAR(ROUND(total_expenses / 100.0), 'FM999,999,999'),
    -- Pre-calculate pie chart data (replaces frontend calculations)
    'pieChartData', (
      SELECT json_agg(
        json_build_object(
          'name', elem->>'name',
          'value', ROUND((elem->>'amount')::NUMERIC / 100.0, 2),
          'percentage', ROUND((elem->>'percentage')::NUMERIC, 1)
        )
      )
      FROM json_array_elements(categories_data) elem
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced dashboard financial stats with complete calculations
CREATE OR REPLACE FUNCTION get_dashboard_financial_stats_calculated(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  current_stats JSON;
  previous_stats JSON;
  revenue_change NUMERIC := 0;
  expense_change NUMERIC := 0;
BEGIN
  -- Get current month statistics
  SELECT json_build_object(
    'monthlyRevenue', COALESCE(SUM(l."rentAmount" * 100), 0),
    'monthlyExpenses', COALESCE(COUNT(DISTINCT p.id) * 58333, 0), -- ~$583.33 per property per month
    'occupancyRate', CASE 
      WHEN COUNT(u.id) > 0 THEN 
        ROUND((COUNT(l.id)::DECIMAL / COUNT(u.id) * 100.0), 1)
      ELSE 0 
    END,
    'activeLeases', COUNT(l.id),
    'totalUnits', COUNT(u.id)
  ) INTO current_stats
  FROM "property" p
  LEFT JOIN "unit" u ON u."propertyId" = p.id
  LEFT JOIN "lease" l ON l."unitId" = u.id AND l.status = 'ACTIVE'
  WHERE p."userId" = p_user_id;

  -- Get previous month for change calculations
  SELECT json_build_object(
    'monthlyRevenue', COALESCE(SUM(l."rentAmount" * 100), 0),
    'monthlyExpenses', COALESCE(COUNT(DISTINCT p.id) * 58333, 0)
  ) INTO previous_stats
  FROM "property" p
  LEFT JOIN "unit" u ON u."propertyId" = p.id
  LEFT JOIN "lease" l ON l."unitId" = u.id 
    AND l.status = 'ACTIVE'
    AND l."startDate" <= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day'
    AND l."endDate" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  WHERE p."userId" = p_user_id;

  -- Calculate percentage changes (business logic from frontend)
  IF (previous_stats->>'monthlyRevenue')::NUMERIC > 0 THEN
    revenue_change := ROUND(
      (((current_stats->>'monthlyRevenue')::NUMERIC - (previous_stats->>'monthlyRevenue')::NUMERIC) 
       / (previous_stats->>'monthlyRevenue')::NUMERIC * 100.0), 1
    );
  END IF;

  IF (previous_stats->>'monthlyExpenses')::NUMERIC > 0 THEN
    expense_change := ROUND(
      (((current_stats->>'monthlyExpenses')::NUMERIC - (previous_stats->>'monthlyExpenses')::NUMERIC) 
       / (previous_stats->>'monthlyExpenses')::NUMERIC * 100.0), 1
    );
  END IF;

  -- Return complete dashboard stats with all calculations and formatting
  RETURN json_build_object(
    'monthlyRevenue', (current_stats->>'monthlyRevenue')::NUMERIC,
    'monthlyExpenses', (current_stats->>'monthlyExpenses')::NUMERIC,
    'netIncome', (current_stats->>'monthlyRevenue')::NUMERIC - (current_stats->>'monthlyExpenses')::NUMERIC,
    'occupancyRate', (current_stats->>'occupancyRate')::NUMERIC,
    'activeLeases', (current_stats->>'activeLeases')::NUMERIC,
    'totalUnits', (current_stats->>'totalUnits')::NUMERIC,
    'revenueChange', revenue_change,
    'expenseChange', expense_change,
    -- Pre-calculated profit margin (business logic from frontend)
    'profitMargin', CASE 
      WHEN (current_stats->>'monthlyRevenue')::NUMERIC > 0 THEN
        ROUND(((current_stats->>'monthlyRevenue')::NUMERIC - (current_stats->>'monthlyExpenses')::NUMERIC) 
              / (current_stats->>'monthlyRevenue')::NUMERIC * 100.0, 1)
      ELSE 0
    END,
    -- Pre-formatted values for display
    'monthlyRevenueFormatted', '$' || TO_CHAR(ROUND((current_stats->>'monthlyRevenue')::NUMERIC / 100.0), 'FM999,999,999'),
    'monthlyExpensesFormatted', '$' || TO_CHAR(ROUND((current_stats->>'monthlyExpenses')::NUMERIC / 100.0), 'FM999,999,999'),
    'netIncomeFormatted', '$' || TO_CHAR(ROUND(((current_stats->>'monthlyRevenue')::NUMERIC - (current_stats->>'monthlyExpenses')::NUMERIC) / 100.0), 'FM999,999,999')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_financial_overview_with_calculations(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_summary_with_percentages(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_financial_stats_calculated(UUID) TO authenticated;