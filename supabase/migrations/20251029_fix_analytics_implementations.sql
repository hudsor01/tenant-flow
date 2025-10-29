-- Implement Real Analytics Functions
-- Replace placeholder implementations with actual calculations

-- Update get_occupancy_trends to use real data
CREATE OR REPLACE FUNCTION public.get_occupancy_trends(p_user_id uuid, p_months integer DEFAULT 12)
RETURNS TABLE(
  period text,
  occupancy_rate numeric
)
LANGUAGE sql STABLE AS $$
  WITH month_series AS (
    SELECT
      generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * (p_months - 1)),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) as month_start
  ),
  monthly_stats AS (
    SELECT
      ms.month_start,
      COUNT(u.id) as total_units,
      COUNT(CASE
        WHEN EXISTS (
          SELECT 1 FROM lease l
          WHERE l.unitId = u.id
            AND l.status = 'ACTIVE'
            AND l.startDate <= (ms.month_start + INTERVAL '1 month' - INTERVAL '1 day')
            AND l.endDate >= ms.month_start
        ) THEN 1
      END) as occupied_units
    FROM month_series ms
    CROSS JOIN unit u
    JOIN property p ON u.propertyId = p.id
    WHERE p.ownerId = p_user_id
      AND u.createdAt <= (ms.month_start + INTERVAL '1 month' - INTERVAL '1 day')
    GROUP BY ms.month_start
  )
  SELECT
    to_char(mst.month_start, 'YYYY-MM') as period,
    CASE
      WHEN mst.total_units > 0 THEN ROUND((mst.occupied_units::FLOAT / mst.total_units::FLOAT) * 100, 2)
      ELSE 0
    END as occupancy_rate
  FROM monthly_stats mst
  ORDER BY mst.month_start;
$$;

-- Update get_revenue_trends to use real data
CREATE OR REPLACE FUNCTION public.get_revenue_trends(p_user_id uuid, p_months integer DEFAULT 12)
RETURNS TABLE(
  period text,
  revenue numeric,
  growth numeric,
  previous_period_revenue numeric
)
LANGUAGE sql STABLE AS $$
  WITH month_series AS (
    SELECT
      generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * (p_months - 1)),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) as month_start
  ),
  monthly_revenue AS (
    SELECT
      ms.month_start,
      COALESCE(SUM(rp.amount), 0) / 100.0 as current_revenue,
      LAG(COALESCE(SUM(rp.amount), 0) / 100.0) OVER (ORDER BY ms.month_start) as prev_revenue
    FROM month_series ms
    LEFT JOIN rent_payment rp ON EXISTS (
        SELECT 1 FROM lease l
        JOIN unit u ON l.unitId = u.id
        JOIN property p ON u.propertyId = p.id
        WHERE p.ownerId = p_user_id
          AND rp.tenantId = l.tenantId
          AND rp.status = 'SUCCEEDED'
          AND rp.paidAt >= ms.month_start
          AND rp.paidAt < (ms.month_start + INTERVAL '1 month')
      )
    GROUP BY ms.month_start
    ORDER BY ms.month_start
  )
  SELECT
    to_char(mr.month_start, 'YYYY-MM') as period,
    mr.current_revenue as revenue,
    CASE
      WHEN mr.prev_revenue > 0 THEN
        ROUND(((mr.current_revenue - mr.prev_revenue) / mr.prev_revenue) * 100, 2)
      ELSE 0
    END as growth,
    COALESCE(mr.prev_revenue, 0) as previous_period_revenue
  FROM monthly_revenue mr;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_occupancy_trends(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_trends(uuid, integer) TO authenticated;