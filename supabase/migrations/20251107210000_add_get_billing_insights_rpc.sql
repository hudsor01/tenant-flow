-- Create RPC function to get billing insights in a single query
-- Consolidates 3 separate queries (revenue, MRR, churn) into one optimized function

CREATE OR REPLACE FUNCTION public.get_billing_insights(
  owner_id_param TEXT,
  start_date_param TIMESTAMPTZ DEFAULT NULL,
  end_date_param TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_revenue_val NUMERIC;
  mrr_val NUMERIC;
  total_payments_val INTEGER;
  overdue_payments_val INTEGER;
  churn_rate_val NUMERIC;
BEGIN
  -- Verify caller has access to this owner's data via RLS
  -- This will fail if the user doesn't have access
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = owner_id_param::TEXT
    AND (
      auth.uid()::TEXT = id
      OR id IN (
        SELECT ownerId::TEXT FROM property WHERE ownerId::TEXT = auth.uid()::TEXT
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to owner data';
  END IF;

  -- Calculate total revenue from PAID rent payments
  SELECT COALESCE(SUM(rp.amount), 0)
  INTO total_revenue_val
  FROM rent_payment rp
  INNER JOIN lease l ON rp.leaseId = l.id
  INNER JOIN unit u ON l.unitId = u.id
  INNER JOIN property p ON u.propertyId = p.id
  WHERE p.ownerId::TEXT = owner_id_param
    AND rp.status = 'PAID'
    AND (start_date_param IS NULL OR rp.paidAt >= start_date_param)
    AND (end_date_param IS NULL OR rp.paidAt <= end_date_param);

  -- Calculate MRR from active leases
  SELECT COALESCE(SUM(l.monthlyRent), 0)
  INTO mrr_val
  FROM lease l
  INNER JOIN unit u ON l.unitId = u.id
  INNER JOIN property p ON u.propertyId = p.id
  WHERE p.ownerId::TEXT = owner_id_param
    AND l.status = 'ACTIVE';

  -- Calculate churn rate (OVERDUE payments / total payments)
  SELECT
    COUNT(*)::INTEGER,
    COUNT(CASE WHEN rp.status = 'OVERDUE' THEN 1 END)::INTEGER
  INTO total_payments_val, overdue_payments_val
  FROM rent_payment rp
  INNER JOIN lease l ON rp.leaseId = l.id
  INNER JOIN unit u ON l.unitId = u.id
  INNER JOIN property p ON u.propertyId = p.id
  WHERE p.ownerId::TEXT = owner_id_param
    AND (start_date_param IS NULL OR rp.dueDate >= start_date_param)
    AND (end_date_param IS NULL OR rp.dueDate <= end_date_param);

  -- Calculate churn rate
  IF total_payments_val > 0 THEN
    churn_rate_val := overdue_payments_val::NUMERIC / total_payments_val::NUMERIC;
  ELSE
    churn_rate_val := 0;
  END IF;

  -- Return as JSON
  result := json_build_object(
    'totalRevenue', total_revenue_val,
    'mrr', mrr_val,
    'churnRate', churn_rate_val
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_billing_insights(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_billing_insights IS
  'Optimized billing insights calculation consolidating revenue, MRR, and churn rate queries';
