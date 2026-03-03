-- migration: phase 2 — drop remaining unused indexes on payment/lease/tenant tables
-- purpose: migration 20260301065605 intentionally kept indexes on leases, rent_payments,
--          tenants, and tenant_invitations because payment features were expected to
--          activate soon. after cross-referencing with actual frontend query patterns,
--          11 of these indexes have zero scans AND no matching query pattern. they add
--          write amplification on every INSERT/UPDATE with no read benefit.
--
-- methodology: each index was validated against:
--   1. pg_stat_user_indexes (zero idx_scan since database creation)
--   2. actual frontend PostgREST query patterns in apps/frontend/src/hooks/api/
--   3. RLS policy evaluation paths
--   4. redundancy with other existing composite indexes
--
-- affected tables: leases, rent_payments, tenants, tenant_invitations
--
-- safety: indexes dropped here are never used by any current query path.
--   each drop is idempotent (DROP INDEX IF EXISTS).
--   all unique constraints and primary keys are preserved.

-- ============================================================================
-- leases: currently 12 indexes on 0 rows — dropping 2
-- ============================================================================

-- zero scans. partial index on lease_status = 'draft' with lead_paint columns.
-- no frontend query filters on lead paint compliance status.
-- the leases table has 0 rows — this index has never been useful.
drop index if exists idx_leases_lead_paint_compliance;

-- references the old column name property_owner_id (renamed to owner_user_id).
-- postgres auto-tracked the rename, so this is functionally a standalone
-- (owner_user_id) index. redundant with idx_leases_owner_status which is a
-- composite (owner_user_id, lease_status) that covers owner_user_id-only lookups
-- via its leading column.
drop index if exists idx_leases_property_owner_id;

-- ============================================================================
-- rent_payments: currently 11 indexes on 0 rows — dropping 3
-- ============================================================================

-- standalone (status) index with zero scans.
-- redundant: idx_rent_payments_status_date covers (status, due_date) and
-- idx_rent_payments_due_date_status covers (due_date, status).
-- both composites serve all frontend queries that filter on status.
drop index if exists idx_rent_payments_status;

-- standalone (tenant_id) index with zero scans.
-- redundant: idx_rent_payments_tenant_status covers (tenant_id, status) and
-- idx_rent_payments_tenant_id_created_at covers (tenant_id, created_at).
-- both composites serve all frontend queries that filter on tenant_id.
drop index if exists idx_rent_payments_tenant_id;

-- standalone (paid_date) index with zero scans.
-- no frontend query filters on paid_date alone — paid_date is only returned
-- as a display column, never used as a WHERE clause filter.
drop index if exists idx_rent_payments_paid_date;

-- ============================================================================
-- tenants: currently 3 indexes — dropping 1
-- ============================================================================

-- boolean column (identity_verified) with zero scans.
-- no frontend query filters on identity_verified.
-- low cardinality boolean columns are poor index candidates even with data.
-- KEPT: idx_tenants_user_id (RLS hot path), tenants_stripe_customer_id_unique (data integrity)
drop index if exists idx_tenants_identity_verified;

-- ============================================================================
-- tenant_invitations: currently 9 indexes on 0 rows — dropping 5
-- ============================================================================

-- standalone (status) with zero scans.
-- redundant: idx_tenant_invitations_property_status covers (property_id, status).
-- frontend list query doesn't filter by status alone.
drop index if exists idx_tenant_invitations_status;

-- (accepted_by_user_id) with zero scans.
-- the accepted_by_user_id column is set when an invitation is accepted,
-- but no query ever looks up invitations by acceptor.
drop index if exists idx_tenant_invitations_accepted_by_user_id;

-- (type) with zero scans.
-- no frontend query filters by invitation type.
drop index if exists idx_tenant_invitations_type;

-- (unit_id) with zero scans.
-- no frontend query filters invitations by unit_id alone.
-- the property_status composite covers property-level lookups.
drop index if exists idx_tenant_invitations_unit_id;

-- partial composite (property_id) WHERE status = 'accepted' with zero scans.
-- very specific partial index that has never been used.
-- idx_tenant_invitations_property_status covers the general case.
drop index if exists idx_tenant_invitations_property_accepted;

-- ============================================================================
-- summary of what's KEPT and why
-- ============================================================================
-- leases (10 remaining):
--   idx_leases_owner_status (owner_user_id, lease_status) — primary query pattern
--   idx_leases_dates (owner_user_id, start_date, end_date) — dashboard trends
--   idx_leases_owner_unit (owner_user_id, unit_id) — lease-by-unit lookup
--   idx_leases_unit_id — foreign key + wizard unit selection
--   idx_leases_primary_tenant_id — tenant filter in lease list
--   idx_leases_stripe_subscription_id — stripe webhook lookups
--   idx_leases_draft — wizard creates drafts (partial, small)
--   idx_leases_pending_signature — signature flow (partial, small)
--   idx_leases_subscription_pending — stripe retry flow (partial, small)
--   idx_leases_auto_pay_enabled — autopay cron job (partial, small)
--
-- rent_payments (8 remaining):
--   idx_rent_payments_lease_id — tenant portal payments
--   idx_rent_payments_status_date (status, due_date) — upcoming/overdue queries
--   idx_rent_payments_due_date_status (due_date, status) — range queries
--   idx_rent_payments_tenant_status (tenant_id, status) — tenant payment filtering
--   idx_rent_payments_tenant_id_created_at — payment history ordering
--   idx_rent_payments_stripe_payment_intent_id — stripe webhook lookups
--   idx_rent_payments_rent_due_id — rent_due FK lookups
--   idx_rent_payments_rent_due_unique_succeeded — dedup constraint (unique partial)
--
-- tenants (2 remaining):
--   idx_tenants_user_id — RLS hot path (get_current_tenant_id)
--   tenants_stripe_customer_id_unique — data integrity constraint
--
-- tenant_invitations (4 remaining):
--   idx_tenant_invitations_email — auth callback lookup
--   idx_tenant_invitations_lease_id — lease FK (partial, lease_id is not null)
--   idx_tenant_invitations_property_owner_id — owner filter
--   idx_tenant_invitations_property_status (property_id, status) — composite

-- ============================================================================
-- update planner statistics for tables that lost indexes
-- ============================================================================
analyze leases;
analyze rent_payments;
analyze tenants;
analyze tenant_invitations;
