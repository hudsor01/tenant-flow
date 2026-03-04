-- migration: phase 5 — index consolidation
-- purpose: final cleanup pass — remove redundant indexes, add missing composites
--          for real user query patterns identified in the frontend analysis.
--
-- this migration completes the 5-phase DB optimization:
--   phase 1: ANALYZE remaining tables (20260303120000)
--   phase 2: drop unused indexes on payment/lease/tenant tables (20260303130000)
--   phase 3: RLS function audit and hot path fixes (20260303140000)
--   phase 4: critical flow EXPLAIN ANALYZE + rent_due composite (20260303150000)
--   phase 5: index consolidation (this file)

-- ============================================================================
-- section 1: remove DUPLICATE indexes
-- ============================================================================

-- documents has TWO identical indexes on (entity_type, entity_id):
--   idx_documents_entity — created in base_schema
--   idx_documents_entity_type_entity_id — created in base_schema
-- both are btree on the same columns in the same order.
-- keeping idx_documents_entity_type_entity_id (more descriptive name).
drop index if exists idx_documents_entity;

-- ============================================================================
-- section 2: remove REDUNDANT standalone indexes
-- ============================================================================

-- notifications(created_at) standalone — zero value for notification queries.
-- all notification queries are RLS-filtered to user_id first, then ordered by
-- created_at. the standalone created_at index cannot help because:
--   1. the planner uses idx_notifications_user_id to filter by user first
--   2. then sorts the (small) result set in memory
-- the composite idx_notifications_user_unread (user_id, created_at DESC)
-- WHERE is_read = false already covers the unread badge query.
-- for the general "all notifications" query, we add a non-partial composite below.
drop index if exists idx_notifications_created_at;

-- ============================================================================
-- section 3: add MISSING composite indexes for real query patterns
-- ============================================================================

-- general notification pagination: all notifications for a user, newest first.
-- frontend: .from('notifications').select('*').order('created_at', { ascending: false })
-- RLS adds: WHERE user_id = auth.uid()
-- effective: WHERE user_id = $1 ORDER BY created_at DESC
--
-- idx_notifications_user_unread only covers is_read = false (partial index).
-- for the "all notifications" tab (no is_read filter), we need a non-partial
-- composite to avoid an in-memory sort.
create index if not exists idx_notifications_user_created
on public.notifications (user_id, created_at desc);

comment on index idx_notifications_user_created is
  'Composite for notification pagination: WHERE user_id = $1 ORDER BY created_at DESC. '
  'Covers the "all notifications" tab. The partial idx_notifications_user_unread '
  'covers the "unread only" tab (WHERE is_read = false).';

-- ============================================================================
-- section 4: index audit summary — what remains per table
-- ============================================================================
--
-- properties (5 indexes):
--   PK, idx_properties_owner_user_id, idx_properties_status,
--   idx_properties_property_type, idx_properties_created_at
--   all used by frontend queries.
--
-- units (2 indexes + PK):
--   PK, idx_units_property_id
--   idx_units_owner_user_id and idx_units_status were dropped in 20260301065605.
--   property_id covers the main query pattern. RLS uses owner_user_id via
--   properties join, not direct unit.owner_user_id filter.
--
-- leases (10 indexes + PK + exclusion constraint):
--   PK, leases_unit_date_overlap_exclusion (exclusion),
--   idx_leases_owner_status, idx_leases_dates, idx_leases_owner_unit,
--   idx_leases_unit_id, idx_leases_primary_tenant_id,
--   idx_leases_stripe_subscription_id,
--   idx_leases_draft (partial), idx_leases_pending_signature (partial),
--   idx_leases_subscription_pending (partial), idx_leases_auto_pay_enabled (partial)
--   reduced from 12 → 10 in phase 2. all remaining serve active patterns.
--
-- rent_payments (8 indexes + PK):
--   PK, idx_rent_payments_lease_id,
--   idx_rent_payments_status_date, idx_rent_payments_due_date_status,
--   idx_rent_payments_tenant_status (partial), idx_rent_payments_tenant_id_created_at,
--   idx_rent_payments_stripe_payment_intent_id,
--   idx_rent_payments_rent_due_id, idx_rent_payments_rent_due_unique_succeeded (unique partial)
--   reduced from 11 → 8 in phase 2. all remaining serve active patterns.
--
-- rent_due (3 indexes + PK):
--   PK, idx_rent_due_due_date, idx_rent_due_unit_id,
--   idx_rent_due_lease_id_due_date (added in phase 4)
--   all used by tenant portal queries.
--
-- maintenance_requests (2 indexes + PK):
--   PK, idx_maintenance_requests_owner_status (owner_user_id, status)
--   covers the primary query pattern (owner's maintenance by status).
--   reduced from 6+ → 2 in 20260301065605.
--
-- tenants (2 indexes + PK):
--   PK, idx_tenants_user_id, tenants_stripe_customer_id_unique
--   user_id is the RLS hot path. stripe_customer_id is data integrity.
--
-- tenant_invitations (4 indexes + PK):
--   PK, idx_tenant_invitations_email, idx_tenant_invitations_lease_id (partial),
--   idx_tenant_invitations_property_owner_id, idx_tenant_invitations_property_status
--   reduced from 9 → 4 in phase 2.
--
-- notifications (3 indexes + PK):
--   PK, idx_notifications_user_id,
--   idx_notifications_user_unread (partial, user_id + created_at WHERE is_read = false),
--   idx_notifications_user_created (user_id, created_at DESC) — added in this phase
--   reduced from 4 → 3 (dropped is_read and created_at standalone, added composite).
--
-- documents (2 indexes + PK):
--   PK, idx_documents_entity_type_entity_id, idx_documents_document_type
--   reduced from 3 → 2 (dropped duplicate idx_documents_entity).
--
-- inspections (4 indexes + PK):
--   PK, inspections_lease_id_idx, inspections_owner_user_id_idx,
--   inspections_property_id_idx, idx_inspections_unit_id
--   all cover active query patterns.
--
-- lease_tenants (2 indexes + PK + unique constraint):
--   PK, lease_tenants_lease_id_tenant_id_key (unique),
--   idx_lease_tenants_lease_id, idx_lease_tenants_tenant_id
--   both indexes used by RLS helper functions (get_tenant_*_ids, get_owner_lease_tenant_ids).
--
-- expenses (3 indexes + PK):
--   PK, idx_expenses_expense_date, idx_expenses_maintenance_request_id,
--   idx_expenses_mr_date (composite)
--   all serve active query patterns.
--
-- stripe_connected_accounts (1 index + PK):
--   PK, property_owners_user_id_key (unique on user_id)
--   user_id lookup used by get_current_property_owner_id() and frontend settings.

-- ============================================================================
-- update planner statistics for affected tables
-- ============================================================================
analyze notifications;
analyze documents;

-- ============================================================================
-- optimization complete — total index reduction across all 5 phases
-- ============================================================================
-- prior migrations (20260301065605 + 20260302061333): dropped ~42 indexes
-- phase 2 (20260303130000): dropped 11 indexes
-- phase 5 (this migration): dropped 2 indexes, added 1 composite
--
-- net across the entire optimization effort:
--   ~55 indexes removed
--   2 indexes added (rent_due composite in phase 4, notifications composite here)
--   1 RLS policy rewritten (lease_tenants_insert_owner in phase 3)
--   1 function optimized (get_owner_lease_tenant_ids in phase 3)
--   31+ tables freshly ANALYZE'd across phases 1-5
