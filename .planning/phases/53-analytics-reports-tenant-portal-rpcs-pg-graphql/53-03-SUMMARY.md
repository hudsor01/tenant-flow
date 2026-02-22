# Plan 53-03 Summary: Tenant Portal Migration & Read-Only Maintenance Kanban

## Objective Achieved
Migrated all tenant portal hooks from NestJS `apiRequest()` to Supabase PostgREST direct
calls, and built a read-only maintenance kanban for the tenant portal UI.

## Changes Made

### `apps/frontend/src/hooks/api/use-tenant-portal.ts` (complete rewrite — 1217 lines)
- Removed all `apiRequest` calls (14 occurrences across 8 query/mutation functions)
- Added imports: `createClient`, `handlePostgrestError`, `toast` (sonner)
- Every queryFn uses **two-step tenant resolution**:
  1. `auth.uid()` → `tenants.id` (because `maintenance_requests.tenant_id` references `tenants.id`, not `auth.uid()`)
- Key migrations:
  - `dashboard()`: Joins `lease_tenants!inner(tenant_id)` to find active lease by tenant
  - `amountDue()`: 3-step chain — user → tenantRecord → lease → next unpaid `rent_payments`
  - `payments()`: Fetches `rent_payments` by lease_id; maps `amount_cents/100 → amount`
  - `autopay()`: Returns lease `stripe_subscription_id`; stubs setup/cancel with `toast.info()`
  - `maintenance()`: Inline two-step resolution; filters `maintenance_requests.tenant_id = tenantRecord.id`
  - `lease()`: Full nested join `units!inner → properties!inner`; PGRST116 → return null
  - `documents()`: Returns lease_document_url as document record array
  - `settings()`: Reads `tenants` table + `auth.getUser()` for email
  - `notificationPreferences()`: Reads/upserts `notification_settings` with defaults
- Autopay mutations (`setupAutopay`, `cancelAutopay`): stubbed with `toast.info('coming soon')` (Phase 54 Stripe Connect dependency)
- Fixed TypeScript error: Supabase `!inner` joins return arrays; cast `data as unknown as {...}` then use `[0]` indexing

### `apps/frontend/src/hooks/api/query-keys/maintenance-keys.ts`
- Replaced `tenantPortal()` TODO stub with working PostgREST query
- Two-step tenant resolution: `auth.uid()` → `tenants.id` → filter `maintenance_requests.tenant_id`
- Returns `{ requests, total, open, inProgress, completed }`

### `apps/frontend/src/components/tenant-portal/tenant-maintenance-kanban.tsx` (new file)
- Read-only 7-column kanban: open, assigned, in_progress, needs_reassignment, on_hold, completed, cancelled
- No dnd-kit (tenant portal is read-only, owner dashboard has drag-to-change-status)
- Hides empty columns except open/in_progress/completed (always shown)
- Props: `{ requests: MaintenanceRequest[] }`

### `apps/frontend/src/components/maintenance/maintenance-view.client.tsx`
- Added CONTEXT.md decision comment above `handleViewChange`:
  "Owner maintenance view supports kanban/list toggle. Only owner dashboard has drag-to-change-status."

## Technical Decisions
- **No RPC needed for tenant portal**: PostgREST with two-step tenant resolution is sufficient
- **Autopay stubs**: `toast.info()` not `throw Error` — unblocks UI without breaking it
- **maybeSingle() vs single()**: Used `maybeSingle()` for optional rows (next payment lookup)
- **PGRST116 handling**: Tenants with no active lease return `null` gracefully

## Tests
- All 966 existing tests pass (78 test files)
- No new tests added for `use-tenant-portal.ts` (covered by integration/E2E scope)
