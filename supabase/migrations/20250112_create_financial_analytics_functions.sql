-- ============================================================================
-- Migration: Create missing financial analytics RPC functions
-- Date: 2025-01-12
--
-- FUNCTIONS CREATED:
-- 1. calculate_net_operating_income - Calculate NOI per property
-- 2. get_lease_financial_summary - Get lease financial aggregates
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: calculate_net_operating_income
-- ============================================================================
-- Calculates Net Operating Income (NOI) for each property owned by the user
-- NOI = Total Revenue - Operating Expenses (excluding financing/depreciation)
CREATE OR REPLACE FUNCTION public.calculate_net_operating_income(p_user_id text)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  noi numeric,
  total_revenue numeric,
  total_expenses numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS property_id,
    p.name AS property_name,
    COALESCE(revenue.total, 0) - COALESCE(expenses.total, 0) AS noi,
    COALESCE(revenue.total, 0) AS total_revenue,
    COALESCE(expenses.total, 0) AS total_expenses
  FROM property p
  -- Calculate total revenue from rent payments
  LEFT JOIN LATERAL (
    SELECT SUM(rp.amount) / 100.0 AS total
    FROM rent_payment rp
    JOIN lease l ON rp."leaseId" = l.id
    JOIN unit u ON l."unitId" = u.id
    WHERE u."propertyId" = p.id
    AND rp.status = 'PAID'
    AND rp."paidAt" >= CURRENT_DATE - INTERVAL '12 months'
  ) revenue ON true
  -- Calculate total expenses (placeholder - can be extended with maintenance costs)
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(m.cost, 0)) AS total
    FROM maintenance_request m
    JOIN unit u ON m."unitId" = u.id
    WHERE u."propertyId" = p.id
    AND m.status = 'COMPLETED'
    AND m."completedAt" >= CURRENT_DATE - INTERVAL '12 months'
  ) expenses ON true
  WHERE p."ownerId" = p_user_id::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_net_operating_income(text) TO authenticated;

COMMENT ON FUNCTION public.calculate_net_operating_income IS 'Calculate Net Operating Income (NOI) per property. NOI = Revenue - Operating Expenses over the last 12 months.';

-- ============================================================================
-- FUNCTION 2: get_lease_financial_summary
-- ============================================================================
-- Aggregates financial metrics across all leases for a user
CREATE OR REPLACE FUNCTION public.get_lease_financial_summary(p_user_id text)
RETURNS TABLE (
  total_leases bigint,
  active_leases bigint,
  total_monthly_rent numeric,
  total_deposits numeric,
  total_outstanding_balance numeric,
  total_paid_amount numeric,
  total_pending_amount numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT l.id) AS total_leases,
    COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN l.id END) AS active_leases,
    COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."monthlyRent" / 100.0 ELSE 0 END), 0) AS total_monthly_rent,
    COALESCE(SUM(l."depositAmount" / 100.0), 0) AS total_deposits,
    COALESCE(
      (SELECT SUM(rp.amount / 100.0)
       FROM rent_payment rp
       JOIN lease l2 ON rp."leaseId" = l2.id
       JOIN unit u2 ON l2."unitId" = u2.id
       JOIN property p2 ON u2."propertyId" = p2.id
       WHERE p2."ownerId" = p_user_id::uuid
       AND rp.status IN ('PENDING', 'OVERDUE')),
      0
    ) AS total_outstanding_balance,
    COALESCE(
      (SELECT SUM(rp.amount / 100.0)
       FROM rent_payment rp
       JOIN lease l2 ON rp."leaseId" = l2.id
       JOIN unit u2 ON l2."unitId" = u2.id
       JOIN property p2 ON u2."propertyId" = p2.id
       WHERE p2."ownerId" = p_user_id::uuid
       AND rp.status = 'PAID'),
      0
    ) AS total_paid_amount,
    COALESCE(
      (SELECT SUM(rp.amount / 100.0)
       FROM rent_payment rp
       JOIN lease l2 ON rp."leaseId" = l2.id
       JOIN unit u2 ON l2."unitId" = u2.id
       JOIN property p2 ON u2."propertyId" = p2.id
       WHERE p2."ownerId" = p_user_id::uuid
       AND rp.status = 'PENDING'),
      0
    ) AS total_pending_amount
  FROM lease l
  JOIN unit u ON l."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_user_id::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lease_financial_summary(text) TO authenticated;

COMMENT ON FUNCTION public.get_lease_financial_summary IS 'Aggregate financial metrics across all leases including rent, deposits, and payment status.';
