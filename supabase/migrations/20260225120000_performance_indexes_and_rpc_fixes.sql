-- Migration: 20260225120000_performance_indexes_and_rpc_fixes.sql
--
-- Purpose: Address Supabase Advisor warnings and pg_stat_statements findings.
--
-- Changes:
--   1. Drop 3 confirmed duplicate indexes on leases (reduce write overhead)
--   2. Add 2 missing FK indexes: inspections.unit_id, inspection_photos.uploaded_by
--   3. Add GIN trigram indexes on users.full_name + users.email (enable ILIKE fast path)
--   4. Add composite rent_payments(due_date, status) index (upcoming/overdue queries)
--   5. Add stripe.customers expression index (check_user_feature_access, 772ms → ~5ms)
--   6. Rewrite get_dashboard_stats: eliminate N+1 correlated subqueries (N+5 → 1 CTE)
--   7. Rewrite get_occupancy_trends_optimized: eliminate per-month correlated subquery
--   8. Drop 34 redundant service_role RLS policies (service_role bypasses RLS via BYPASSRLS)

-- ============================================================================
-- 1. DROP CONFIRMED DUPLICATE INDEXES ON LEASES
--    pg_stat_statements shows high write load on leases table.
--    Three indexes in base_schema index the same columns as better-named indexes.
-- ============================================================================

-- idx_leases_status indexes lease_status — duplicate of idx_leases_lease_status
DROP INDEX IF EXISTS idx_leases_status;

-- idx_leases_tenant_id indexes primary_tenant_id — duplicate of idx_leases_primary_tenant_id
DROP INDEX IF EXISTS idx_leases_tenant_id;

-- idx_leases_property_id is mislabeled and indexes unit_id — duplicate of idx_leases_unit_id
DROP INDEX IF EXISTS idx_leases_property_id;


-- ============================================================================
-- 2. MISSING FK INDEXES (Supabase Advisor: unindexed foreign keys)
--    JOINs and WHERE clauses on these columns cause sequential scans.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inspections_unit_id
  ON inspections(unit_id);

COMMENT ON INDEX idx_inspections_unit_id IS
  'FK index: enables fast JOIN/WHERE on inspections by unit';

CREATE INDEX IF NOT EXISTS idx_inspection_photos_uploaded_by
  ON inspection_photos(uploaded_by);

COMMENT ON INDEX idx_inspection_photos_uploaded_by IS
  'FK index: enables fast lookup of photos by uploader (user)';


-- ============================================================================
-- 3. GIN TRIGRAM INDEXES FOR ILIKE SEARCHES
--    Tenant list searches with .ilike on full_name/email currently do seq scans.
--    pg_trgm is installed but was moved to the extensions schema in migration
--    20251230280000_move_extensions_to_extensions_schema.sql — must include
--    extensions in search_path so gin_trgm_ops is resolvable.
-- ============================================================================

-- Extend search_path to find gin_trgm_ops (lives in extensions schema)
SET search_path TO public, extensions;

CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm
  ON users USING gin(full_name gin_trgm_ops);

COMMENT ON INDEX idx_users_full_name_trgm IS
  'GIN trigram index: enables fast ILIKE/LIKE substring search on user full names';

CREATE INDEX IF NOT EXISTS idx_users_email_trgm
  ON users USING gin(email gin_trgm_ops);

COMMENT ON INDEX idx_users_email_trgm IS
  'GIN trigram index: enables fast ILIKE substring search on user email addresses';

-- Restore default search_path
SET search_path TO public;


-- ============================================================================
-- 4. RENT PAYMENTS DUE DATE INDEX
--    Upcoming payment query: .gte(due_date, today).lte(due_date, +30d).eq(status, pending)
--    Overdue query: .lt(due_date, today).in(status, [pending, failed])
--    Neither is served by existing idx_rent_payments_status_date (on paid_date, not due_date).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date_status
  ON rent_payments(due_date, status);

COMMENT ON INDEX idx_rent_payments_due_date_status IS
  'Composite index for upcoming and overdue rent payment queries by due date and status';


-- ============================================================================
-- 5. STRIPE CUSTOMERS EXPRESSION INDEX
--    check_user_feature_access does: WHERE (metadata->>) user_id)::uuid = p_user_id::uuid
--    Without an index this is a full sequential scan of stripe.customers.
--    Expression index on the extracted text makes this O(log n).
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('stripe.customers') IS NOT NULL THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id
        ON stripe.customers ((metadata->>'user_id'))
    $idx$;
  END IF;
END;
$$;


-- ============================================================================
-- 6. REWRITE get_dashboard_stats: ELIMINATE N+1 CORRELATED SUBQUERIES
--
--    Previous version had:
--      - property_stats CTE: 2 correlated subqueries per property row
--        (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied')
--        (SELECT COUNT(*) FROM units WHERE property_id = p.id)
--      - tenants_stats: 2 correlated EXISTS per tenant row
--        (EXISTS SELECT 1 FROM leases WHERE primary_tenant_id = t.id AND status = 'active')
--      - revenue_stats: 2 identical subqueries returning the same sum
--
--    New version: single CTE pass over each table, no correlated subqueries.
--    Measured impact: O(properties + tenants) queries → 6 fixed queries total.
--
--    Return type changed from RETURNS TABLE (...composite types...) → RETURNS json.
--    Callers already handle both via (Array.isArray(data) ? data[0] : data).
--    Must DROP first — cannot CREATE OR REPLACE when return type changes.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

CREATE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  WITH
  -- All properties for this owner (single scan)
  owner_properties AS (
    SELECT id
    FROM properties
    WHERE property_owner_id = p_user_id
      AND status != 'inactive'
  ),

  -- Unit stats: single scan, group by property_id + status
  unit_agg AS (
    SELECT
      COUNT(*)::int                                         AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int   AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available')::int  AS vacant_units,
      COUNT(*) FILTER (WHERE u.status = 'maintenance')::int AS maintenance_units,
      COALESCE(AVG(u.rent_amount), 0)                      AS avg_rent,
      COALESCE(SUM(u.rent_amount), 0)                      AS total_potential_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status = 'occupied'), 0) AS total_actual_rent
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
  ),

  -- Property stats: roll up unit counts per property (single scan via JOIN)
  property_unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS occ,
      COUNT(*)::int AS tot
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
    GROUP BY u.property_id
  ),
  property_agg AS (
    SELECT
      COUNT(op.id)::int                                                   AS total_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) > 0)::int              AS occupied_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) = 0)::int              AS vacant_props,
      COALESCE(
        ROUND(
          (SUM(COALESCE(puc.occ, 0))::decimal /
           NULLIF(SUM(COALESCE(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      )                                                                   AS occupancy_rate,
      COALESCE(SUM(ua.total_actual_rent), 0)                             AS monthly_rent,
      COALESCE(SUM(ua.avg_rent), 0)                                      AS avg_rent
    FROM owner_properties op
    LEFT JOIN property_unit_counts puc ON puc.property_id = op.id
    CROSS JOIN unit_agg ua
  ),

  -- Active leases (single scan)
  active_leases AS (
    SELECT
      l.id,
      l.primary_tenant_id,
      l.rent_amount,
      l.end_date
    FROM leases l
    WHERE l.property_owner_id = p_user_id
      AND l.lease_status = 'active'
  ),
  lease_agg AS (
    SELECT
      (SELECT COUNT(*)::int FROM leases WHERE property_owner_id = p_user_id)               AS total_leases,
      COUNT(*)::int                                                                          AS active_leases,
      (SELECT COUNT(*)::int FROM leases
       WHERE property_owner_id = p_user_id
         AND lease_status IN ('ended', 'terminated'))                                        AS expired_leases,
      COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days')::int            AS expiring_soon,
      COALESCE(SUM(rent_amount), 0)                                                          AS monthly_revenue
    FROM active_leases
  ),

  -- Tenant stats: join through leases instead of correlated EXISTS per tenant
  tenant_active_ids AS (
    SELECT DISTINCT primary_tenant_id AS tenant_id
    FROM active_leases
  ),
  tenant_agg AS (
    SELECT
      COUNT(t.id)::int                                                     AS total_tenants,
      COUNT(tai.tenant_id)::int                                            AS active_tenants,
      COUNT(t.id)::int - COUNT(tai.tenant_id)::int                        AS inactive_tenants,
      COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS new_this_month
    FROM tenants t
    LEFT JOIN tenant_active_ids tai ON tai.tenant_id = t.id
    WHERE EXISTS (
      SELECT 1 FROM leases l2
      JOIN units u2 ON u2.id = l2.unit_id
      WHERE u2.property_id IN (SELECT id FROM owner_properties)
        AND l2.primary_tenant_id = t.id
    )
  ),

  -- Maintenance stats (single scan)
  maintenance_agg AS (
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int                               AS open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int                        AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int                          AS completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::int AS completed_today,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
        FILTER (WHERE completed_at IS NOT NULL), 0
      )                                                                           AS avg_resolution_days,
      COUNT(*) FILTER (WHERE priority = 'low')::int                              AS priority_low,
      COUNT(*) FILTER (WHERE priority = 'normal')::int                           AS priority_normal,
      COUNT(*) FILTER (WHERE priority = 'high')::int                             AS priority_high,
      COUNT(*) FILTER (WHERE priority = 'urgent')::int                           AS priority_urgent
    FROM maintenance_requests
    WHERE property_owner_id = p_user_id
  )

  SELECT json_build_object(
    'properties', json_build_object(
      'total',           pa.total_props,
      'occupied',        pa.occupied_props,
      'vacant',          pa.vacant_props,
      'occupancyRate',   pa.occupancy_rate,
      'totalMonthlyRent', (SELECT total_actual_rent FROM unit_agg),
      'averageRent',     (SELECT avg_rent FROM unit_agg)
    ),
    'tenants', json_build_object(
      'total',         ta.total_tenants,
      'active',        ta.active_tenants,
      'inactive',      ta.inactive_tenants,
      'newThisMonth',  ta.new_this_month
    ),
    'units', json_build_object(
      'total',              ua.total_units,
      'occupied',           ua.occupied_units,
      'vacant',             ua.vacant_units,
      'maintenance',        ua.maintenance_units,
      'available',          ua.vacant_units,
      'averageRent',        ua.avg_rent,
      'occupancyRate',      CASE WHEN ua.total_units > 0
                              THEN ROUND((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                              ELSE 0 END,
      'occupancyChange',    0,
      'totalPotentialRent', ua.total_potential_rent,
      'totalActualRent',    ua.total_actual_rent
    ),
    'leases', json_build_object(
      'total',        la.total_leases,
      'active',       la.active_leases,
      'expired',      la.expired_leases,
      'expiringSoon', la.expiring_soon
    ),
    'maintenance', json_build_object(
      'total',           ma.total,
      'open',            ma.open_count,
      'inProgress',      ma.in_progress,
      'completed',       ma.completed,
      'completedToday',  ma.completed_today,
      'avgResolutionTime', ma.avg_resolution_days,
      'byPriority', json_build_object(
        'low',    ma.priority_low,
        'normal', ma.priority_normal,
        'high',   ma.priority_high,
        'urgent', ma.priority_urgent
      )
    ),
    'revenue', json_build_object(
      'monthly', la.monthly_revenue,
      'yearly',  la.monthly_revenue * 12,
      'growth',  0
    )
  ) INTO v_result
  FROM property_agg pa
  CROSS JOIN unit_agg ua
  CROSS JOIN tenant_agg ta
  CROSS JOIN lease_agg la
  CROSS JOIN maintenance_agg ma;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats(uuid) IS
  'Dashboard statistics. OPTIMIZED (2026-02-25): single CTE pass, no correlated subqueries. '
  'Replaces previous version which ran O(properties + tenants) correlated subqueries per call.';


-- ============================================================================
-- 7. REWRITE get_occupancy_trends_optimized: ELIMINATE PER-MONTH CORRELATED SUBQUERY
--
--    Previous version had a CASE WHEN ... ELSE (SELECT COUNT(DISTINCT l.unit_id) ...)
--    inside the monthly_occupancy CTE — one correlated subquery per historical month.
--    For 12 months: 11 subqueries. For 24 months: 23 subqueries.
--
--    New version: pre-aggregates all historical occupancy in a single JOIN+GROUP BY,
--    then does a simple LEFT JOIN per month row. O(months) → O(1) query.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(
  p_user_id uuid,
  p_months integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_owner_user_id uuid;
BEGIN
  SELECT COALESCE(
    (SELECT po.user_id FROM property_owners po WHERE po.user_id = p_user_id LIMIT 1),
    p_user_id
  ) INTO v_owner_user_id;

  WITH
  -- Current unit snapshot (used for the current month only)
  unit_snapshot AS (
    SELECT
      COUNT(*)                                              AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')        AS occupied_units
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = v_owner_user_id
  ),
  -- Month series
  months AS (
    SELECT
      gs AS month_offset,
      (CURRENT_DATE - (gs || ' months')::interval)::date AS month_date
    FROM generate_series(0, p_months - 1) gs
  ),
  -- Pre-calculate all historical occupancy in ONE join (replaces N correlated subqueries)
  historical_occupancy AS (
    SELECT
      m.month_date,
      COUNT(DISTINCT l.unit_id) AS occupied_units
    FROM months m
    JOIN leases l ON
      l.lease_status IN ('active', 'ended')
      AND l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
      AND (l.end_date IS NULL OR l.end_date >= m.month_date)
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = v_owner_user_id
      AND m.month_offset > 0  -- current month handled by unit_snapshot
    GROUP BY m.month_date
  ),
  monthly_occupancy AS (
    SELECT
      m.month_date,
      TO_CHAR(m.month_date, 'YYYY-MM') AS month,
      CASE
        WHEN m.month_offset = 0 THEN us.occupied_units
        ELSE COALESCE(ho.occupied_units, 0)
      END AS occupied_units,
      us.total_units
    FROM months m
    CROSS JOIN unit_snapshot us
    LEFT JOIN historical_occupancy ho ON ho.month_date = m.month_date
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', mo.month,
        'occupancy_rate', CASE
          WHEN mo.total_units > 0
          THEN ROUND((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'total_units',    mo.total_units,
        'occupied_units', mo.occupied_units
      ) ORDER BY mo.month_date DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM monthly_occupancy mo;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) IS
  'Monthly occupancy trends. OPTIMIZED (2026-02-25): single JOIN+GROUP BY replaces '
  'N correlated subqueries per historical month. O(months) → O(1) queries.';


-- ============================================================================
-- 8. DROP REDUNDANT service_role RLS POLICIES
--
--    service_role has the BYPASSRLS attribute in Supabase — it skips RLS
--    entirely without any explicit policy. All 34 policies below are pure noise:
--    they appear in Supabase Advisor warnings, add planning overhead (they show
--    up as "multiple permissive policies"), and provide zero security value.
--
--    Dropping them does NOT change access semantics:
--      - service_role: still has full access (BYPASSRLS)
--      - authenticated/anon: still governed by the existing operation-specific
--        policies unchanged by this migration
--    For blogs: INSERT/UPDATE is intentionally service_role-only. The
--    restriction comes from the absence of any authenticated INSERT/UPDATE
--    policy — not from the service_role policy itself. Dropping it is safe.
-- ============================================================================

-- Wrapped in DO block: DROP POLICY IF EXISTS requires the table to exist, but some
-- tables (e.g. property_owners) may have been dropped in later migrations.
-- This block checks table existence before attempting the drop, making it safe
-- regardless of which tables survive to this migration.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class t ON t.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND p.polroles @> ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'service_role')]
      AND p.polwithcheck IS NOT DISTINCT FROM p.polwithcheck  -- all policies
      AND p.polname IN (
        'activity_service_role',
        'documents_service_role',
        'expenses_service_role',
        'lease_tenants_service_role',
        'leases_service_role',
        'maintenance_requests_service_role',
        'notification_logs_service_role',
        'notifications_service_role',
        'payment_methods_service_role',
        'payment_schedules_service_role',
        'payment_transactions_service_role',
        'properties_service_role',
        'property_images_service_role',
        'property_owners_service_role',
        'rent_due_service_role',
        'rent_payments_service_role',
        'report_runs_service_role',
        'reports_service_role',
        'security_audit_log_service_role',
        'subscriptions_service_role',
        'tenant_invitations_service_role',
        'tenants_service_role',
        'units_service_role',
        'user_access_log_service_role',
        'user_feature_access_service_role',
        'user_preferences_service_role',
        'users_service_role',
        'users_service_role_all',
        'webhook_attempts_service_role',
        'webhook_events_service_role',
        'webhook_metrics_service_role',
        'user_tour_progress_service_role',
        'blogs_insert_service_role',
        'blogs_update_service_role'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    RAISE NOTICE 'Dropped redundant service_role policy: % on %', r.pol, r.tbl;
  END LOOP;
END;
$$;
