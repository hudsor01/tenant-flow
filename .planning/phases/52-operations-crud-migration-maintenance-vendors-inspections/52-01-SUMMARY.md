# Phase 52-01 Summary: Maintenance & Vendor PostgREST Migration

**Status**: COMPLETE
**Date**: 2026-02-21
**Duration**: ~1 session
**Requirement**: CRUD-03

## What Was Done

Migrated maintenance and vendor hooks from apiRequest (NestJS) to Supabase PostgREST direct calls. Created the DB migration adding two new maintenance statuses ('assigned', 'needs_reassignment') required by the vendor assignment flow.

## Artifacts Produced

### DB Migration
- `supabase/migrations/20260221120000_add_maintenance_status_vendor_statuses.sql`
  - Drops existing `maintenance_requests_status_check` constraint
  - Adds new constraint with full set: open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold
  - Adds constraint comment documenting valid values

### Frontend Query Keys
- `apps/frontend/src/hooks/api/query-keys/maintenance-keys.ts` — fully migrated to PostgREST
  - `maintenanceQueries.list()`: supabase.from() with optional property_id join via `units!inner`
  - `maintenanceQueries.detail()`: includes `vendors(id, name, trade)` relation
  - `maintenanceQueries.stats()`: parallel HEAD queries for all 7 statuses
  - `maintenanceQueries.urgent()`: priority IN ('high', 'urgent') AND status NOT in (completed, cancelled)
  - `maintenanceQueries.overdue()`: scheduled_date < now() AND status NOT in (completed, cancelled)
  - `maintenanceQueries.tenantPortal()`: stub returning empty result with TODO(phase-53) comment

### Frontend Mutations
- `apps/frontend/src/hooks/api/use-maintenance.ts` — mutations migrated to PostgREST
  - `useMaintenanceRequestCreateMutation`: supabase.auth.getUser() + insert
  - `useDeleteMaintenanceRequest`: hard delete (no financial retention requirement)
  - `useMaintenanceRequestUpdateMutation`: supabase.from().update().select().single()

- `apps/frontend/src/hooks/api/use-vendor.ts` — fully rewritten to PostgREST
  - `vendorKeys.list()`: supabase.from('vendors') with filters (status, trade, search, pagination)
  - `vendorKeys.detail()`: supabase.from('vendors').eq('id', id).single()
  - `useCreateVendorMutation`: auth.getUser() + insert with owner_user_id
  - `useUpdateVendorMutation`: update by id with select
  - `useDeleteVendorMutation`: hard delete (no financial retention requirement)
  - `useAssignVendorMutation`: single update sets vendor_id + status='assigned'
  - `useUnassignVendorMutation`: single update sets vendor_id=null + status='needs_reassignment'

## Key Decisions

1. **Hard delete for maintenance requests and vendors**: Neither maintenance requests nor vendor records are financial records requiring 7-year retention. Hard delete used for both (consistent with plan spec).

2. **`useAssignVendorMutation` uses single PostgREST update**: Sets both `vendor_id` and `status='assigned'` atomically in one `.update()` call — no two-step operation.

3. **`useUnassignVendorMutation` sets `status='needs_reassignment'`**: Does NOT revert to 'open' — preserves audit trail that the request previously had a vendor. This is a new status added by the DB migration.

4. **`version` field excluded from DB payload**: `MaintenanceUpdateMutationVariables` keeps `version?: number` in the interface for future compatibility, but the parameter is not passed to PostgREST (which would reject unknown columns). The `_version` destructure with underscore prefix ensures TypeScript doesn't warn about unused variables.

5. **`tenantPortal()` deferred to Phase 53**: The tenant portal requires RLS filtering by the tenant's auth.uid() (not owner_user_id), which requires RPC functions or dedicated RLS policies not yet configured. Stub returns empty result.

6. **`VENDOR_SELECT_COLUMNS` explicit list**: No `select('*')` — explicit column list follows the established pattern from property-keys.ts and unit-keys.ts.

## Commits

1. `c8506df5` — `feat(52-01): add 'assigned' and 'needs_reassignment' to maintenance status constraint` (prior session)
2. `bc7f0102` — `feat(52-01): migrate maintenance-keys.ts to PostgREST direct calls`
3. `5fefb4b7` — `feat(52-01): migrate use-maintenance.ts mutations and use-vendor.ts to PostgREST`

## Must-Have Verification

- [x] `maintenance-keys.ts` queryFns call `supabase.from('maintenance_requests')` with no apiRequest calls
- [x] `use-maintenance.ts` mutations call `supabase.from('maintenance_requests').insert/update/delete` with no apiRequest calls
- [x] `use-vendor.ts` vendorKeys queryFns call `supabase.from('vendors')` and mutations call `.insert/update/delete` with no apiRequest calls
- [x] `useAssignVendorMutation` updates `maintenance_requests.vendor_id` and sets `status='assigned'` in single PostgREST update
- [x] `useUnassignVendorMutation` sets `maintenance_requests.vendor_id=null` and `status='needs_reassignment'` in single PostgREST update
- [x] DB migration adds 'assigned' and 'needs_reassignment' to `maintenance_requests` status check constraint
- [x] `pnpm --filter @repo/frontend typecheck` passes with zero errors after migration
