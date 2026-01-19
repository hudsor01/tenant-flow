-- Migration: Add Missing RPC Functions
-- Purpose:
--   1. Create calculate_maintenance_metrics function for maintenance analytics
--   2. Create get_property_performance_analytics function for property performance
--   3. Create upsert_rent_payment function for atomic payment recording
--
-- These functions are referenced in the codebase but were missing from the database.

-- ============================================================================
-- FUNCTION 1: calculate_maintenance_metrics
-- Returns maintenance cost and request metrics for a property owner
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_maintenance_metrics(
  p_user_id uuid DEFAULT NULL,
  user_id uuid DEFAULT NULL,
  user_id_param uuid DEFAULT NULL,
  uid uuid DEFAULT NULL
)
RETURNS TABLE (
  total_cost bigint,
  avg_cost numeric,
  total_requests bigint,
  emergency_count bigint,
  high_priority_count bigint,
  normal_priority_count bigint,
  low_priority_count bigint,
  completed_count bigint,
  open_count bigint,
  in_progress_count bigint,
  avg_resolution_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Resolve user_id from any of the accepted parameter names
  v_user_id := COALESCE(p_user_id, user_id, user_id_param, uid);

  IF v_user_id IS NULL THEN
    -- Return empty metrics if no user provided
    RETURN QUERY SELECT
      0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(COALESCE(mr.actual_cost, mr.estimated_cost, 0)), 0)::bigint AS total_cost,
    COALESCE(AVG(COALESCE(mr.actual_cost, mr.estimated_cost, 0)), 0)::numeric AS avg_cost,
    COUNT(*)::bigint AS total_requests,
    COUNT(*) FILTER (WHERE mr.priority = 'urgent')::bigint AS emergency_count,
    COUNT(*) FILTER (WHERE mr.priority = 'high')::bigint AS high_priority_count,
    COUNT(*) FILTER (WHERE mr.priority = 'normal')::bigint AS normal_priority_count,
    COUNT(*) FILTER (WHERE mr.priority = 'low')::bigint AS low_priority_count,
    COUNT(*) FILTER (WHERE mr.status = 'completed')::bigint AS completed_count,
    COUNT(*) FILTER (WHERE mr.status = 'open')::bigint AS open_count,
    COUNT(*) FILTER (WHERE mr.status = 'in_progress')::bigint AS in_progress_count,
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (mr.completed_at - mr.created_at)) / 3600
      ) FILTER (WHERE mr.completed_at IS NOT NULL),
      0
    )::numeric AS avg_resolution_hours
  FROM maintenance_requests mr
  WHERE mr.owner_user_id = v_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.calculate_maintenance_metrics IS 'Returns maintenance cost and request metrics for a property owner. Accepts multiple parameter names for flexibility.';

-- ============================================================================
-- FUNCTION 2: get_property_performance_analytics
-- Returns property performance data with occupancy, revenue, and expenses
-- Expenses are queried through maintenance_requests table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_timeframe text DEFAULT '30d',
  p_limit integer DEFAULT NULL
)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  occupancy_rate numeric,
  total_revenue bigint,
  total_expenses bigint,
  net_income bigint,
  timeframe text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days integer;
  v_start_date date;
BEGIN
  -- Parse timeframe to days
  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;

  RETURN QUERY
  WITH property_units AS (
    SELECT
      p.id AS prop_id,
      p.name AS prop_name,
      u.id AS unit_id,
      u.status AS unit_status
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
  ),
  property_occupancy AS (
    SELECT
      pu.prop_id,
      pu.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM property_units pu
    GROUP BY pu.prop_id, pu.prop_name
  ),
  property_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.owner_user_id = p_user_id
    LEFT JOIN rent_payments rp ON rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  ),
  property_expenses AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(e.amount), 0)::bigint AS expenses
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id
      AND e.expense_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(pr.revenue, 0) AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses,
    (COALESCE(pr.revenue, 0) - COALESCE(pe.expenses, 0))::bigint AS net_income,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN property_revenue pr ON pr.prop_id = po.prop_id
  LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT COALESCE(p_limit, 100);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) TO service_role;

COMMENT ON FUNCTION public.get_property_performance_analytics IS 'Returns property performance analytics including occupancy, revenue, expenses (via maintenance), and net income.';

-- ============================================================================
-- FUNCTION 3: upsert_rent_payment
-- Atomic upsert for rent payments - idempotent for webhook retries
-- SERVICE_ROLE ONLY - not accessible by authenticated users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_rent_payment(
  p_lease_id uuid,
  p_tenant_id uuid,
  p_amount integer,
  p_currency text,
  p_status text,
  p_due_date text,
  p_paid_date text,
  p_period_start text,
  p_period_end text,
  p_payment_method_type text,
  p_stripe_payment_intent_id text,
  p_application_fee_amount integer
)
RETURNS TABLE (
  id uuid,
  was_inserted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
  v_was_inserted boolean;
BEGIN
  -- Check if payment already exists by stripe_payment_intent_id (unique constraint)
  SELECT rp.id INTO v_existing_id
  FROM rent_payments rp
  WHERE rp.stripe_payment_intent_id = p_stripe_payment_intent_id;

  IF v_existing_id IS NOT NULL THEN
    -- Payment already exists, return existing ID
    id := v_existing_id;
    was_inserted := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Insert new payment
  INSERT INTO rent_payments (
    lease_id,
    tenant_id,
    amount,
    currency,
    status,
    due_date,
    paid_date,
    period_start,
    period_end,
    payment_method_type,
    stripe_payment_intent_id,
    application_fee_amount
  ) VALUES (
    p_lease_id,
    p_tenant_id,
    p_amount,
    p_currency,
    p_status::payment_status,
    p_due_date::date,
    p_paid_date::timestamptz,
    p_period_start::date,
    p_period_end::date,
    p_payment_method_type,
    p_stripe_payment_intent_id,
    p_application_fee_amount
  )
  RETURNING rent_payments.id INTO v_new_id;

  id := v_new_id;
  was_inserted := true;
  RETURN NEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another process inserted the same payment
    -- Return the existing payment ID
    SELECT rp.id INTO v_existing_id
    FROM rent_payments rp
    WHERE rp.stripe_payment_intent_id = p_stripe_payment_intent_id;

    id := v_existing_id;
    was_inserted := false;
    RETURN NEXT;
END;
$$;

-- Only grant to service_role (not authenticated users)
-- This function should only be called by webhooks with admin privileges
GRANT EXECUTE ON FUNCTION public.upsert_rent_payment(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer) TO service_role;

COMMENT ON FUNCTION public.upsert_rent_payment(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer) IS 'Atomic upsert for rent payments. Idempotent for webhook retries. SERVICE_ROLE ONLY.';

-- ============================================================================
-- Add performance indexes
-- ============================================================================

-- Index for faster maintenance metrics calculation
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_owner_priority
ON maintenance_requests(owner_user_id, priority);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_owner_status
ON maintenance_requests(owner_user_id, status);

-- Index for faster expense queries by maintenance request and date
CREATE INDEX IF NOT EXISTS idx_expenses_mr_date
ON expenses(maintenance_request_id, expense_date);

-- Index for faster rent payment queries by date
CREATE INDEX IF NOT EXISTS idx_rent_payments_paid_date
ON rent_payments(paid_date)
WHERE paid_date IS NOT NULL;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON INDEX idx_maintenance_requests_owner_priority IS 'Composite index for maintenance metrics by owner and priority';
COMMENT ON INDEX idx_maintenance_requests_owner_status IS 'Composite index for maintenance metrics by owner and status';
COMMENT ON INDEX idx_expenses_mr_date IS 'Composite index for expense queries by maintenance request and date';
COMMENT ON INDEX idx_rent_payments_paid_date IS 'Partial index for rent payments with paid dates';
