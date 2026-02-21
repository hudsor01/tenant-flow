---
phase: 51-core-crud-migration-properties-units-tenants-leases
plan: 04
status: complete
completed: 2026-02-21
commits:
  - 73d1fcc79 feat(51-04): migrate leases domain to PostgREST + update test suite
  - badd45c01 feat(51-04): delete NestJS tenants and leases modules (Task 3)
---

# Phase 51-04 Summary: Leases Domain PostgREST Migration + Backend Module Deletion

## What Was Done

### Task 1: Migrate lease-keys.ts to PostgREST

Rewrote `apps/frontend/src/hooks/api/query-keys/lease-keys.ts` to use `supabase.from('leases')` PostgREST direct queries in place of `apiRequest` NestJS HTTP calls.

Key implementation details:
- `leaseQueries.list()` — applies `lease_status` filter (DB column name, not `status`); filters inactive by default with `.neq('lease_status', 'inactive')`; uses `{ count: 'exact' }` for pagination; joins `tenants:primary_tenant_id(...)` and `units(...)` via PostgREST
- `leaseQueries.detail()` — joins `units(*, properties(*))` in a single PostgREST select
- `leaseQueries.tenantPortalActive()` — queries with `.maybeSingle()` then remaps PostgREST plural join names (`units`, `tenants`) to singular names (`unit`, `tenant`) expected by `TenantPortalLease` type; returns `null` if no active lease
- `leaseQueries.expiring()` — range query on `end_date` with `.lte()` / `.gte()`
- `leaseQueries.stats()` — 6 parallel PostgREST count queries (no RPC `get_lease_stats` exists in DB)
- `leaseQueries.signatureStatus()` — reads `owner_signed_at`, `tenant_signed_at`, `sent_for_signature_at` columns and derives boolean `owner_signed` / `tenant_signed` (no boolean DB columns)
- `leaseQueries.analytics.*` — return `{}` stubs with `// TODO(phase-53): migrate analytics to RPC in Phase 53`

The `TenantPortalLease` type was redefined with `unit` (singular, with optional `property?`) and `tenant` (singular) to match what `(tenant)/tenant/lease/page.tsx` expects, avoiding `formatPropertyAddress` null vs undefined mismatch.

### Task 2: Migrate use-lease.ts mutations to PostgREST

Rewrote CRUD mutations in `apps/frontend/src/hooks/api/use-lease.ts` to use PostgREST:
- `useCreateLeaseMutation` — destructures `tenant_ids` from `LeaseCreate` (form-only field, not a DB column), gets `owner_user_id` via `supabase.auth.getUser()`, inserts via `supabase.from('leases').insert()`
- `useUpdateLeaseMutation` — `supabase.from('leases').update().eq('id', id).select().single()`
- `useDeleteLeaseMutation` / `useDeleteLeaseOptimisticMutation` — soft-delete via `lease_status: 'inactive'` (7-year financial records retention)
- `useTerminateLeaseMutation` — updates `lease_status: 'terminated'` + `end_date: new Date().toISOString()`
- `useRenewLeaseMutation` — updates `end_date` + `lease_status: 'active'`

DocuSeal signature mutations retained on NestJS apiRequest with `// TODO(phase-55): migrate to DocuSeal Edge Function` comments:
- `useSendLeaseForSignatureMutation`
- `useSignLeaseAsOwnerMutation`
- `useSignLeaseAsTenantMutation`
- `useCancelSignatureRequestMutation`
- `useResendSignatureRequestMutation`
- `useSignedDocumentUrl`

Test suite (`apps/frontend/src/hooks/api/__tests__/use-lease.test.tsx`) completely rewritten from fetch-mock + NestJS URL assertions to Supabase client mock pattern matching the unit-keys and tenant-keys test patterns.

### Task 3: Delete NestJS tenants and leases modules

Deleted entire NestJS module directories:
- `apps/backend/src/modules/tenants/` — all controllers, services, DTOs, spec files (~80 files)
- `apps/backend/src/modules/leases/` — all controllers, services, helpers, DTOs, spec files (~35 files)

Removed dependent files that imported from deleted modules:
- `apps/backend/src/modules/pdf/pdf-generation.processor.ts` — imported `LeaseQueryService`
- `apps/backend/src/modules/pdf/pdf-generation.processor.spec.ts`
- `apps/backend/src/modules/pdf/__tests__/docuseal-pdf-integration.spec.ts` — imported `LeaseSignatureService`, `LeasesService`, `LeaseSubscriptionService`
- `apps/backend/test/property/docuseal-submission-creation.property.spec.ts` — imported from deleted leases module
- `apps/backend/test/n1-queries.e2e.spec.ts` — imported `TenantRelationService`
- `apps/backend/test/integration/subscription-retry.integration.spec.ts` — imported `SubscriptionRetryService`, `LeaseSubscriptionService`

Fixed broken import in `apps/backend/src/modules/tenant-portal/settings/settings.controller.ts`:
- Was: `import { UpdateNotificationPreferencesDto } from '../../tenants/dto/notification-preferences.dto'`
- Fixed: Inlined the Zod-based DTO class directly into the controller file with a comment noting it was inlined from the deleted tenants module

Updated `apps/backend/src/app.module.ts`:
- Removed `import { LeasesModule }` and `import { TenantsModule }`
- Removed both modules from the imports array
- Updated header comment noting modules deleted in Phase 51

## Decisions Made

- **Lease status column name**: DB column is `lease_status` not `status` — all filters use `lease_status`
- **Signature status via DB columns**: `owner_signed_at`, `tenant_signed_at`, `sent_for_signature_at` columns exist; boolean `owner_signed`/`tenant_signed` derived from `_at !== null`
- **Soft-delete for leases**: `lease_status: 'inactive'` — preserves records for 7-year financial retention
- **`tenant_ids` form field**: excluded from DB insert (it's a frontend-only field for multi-tenant lease creation)
- **TenantPortalLease type**: uses `unit?` (optional, not `| null`) to avoid `formatPropertyAddress` expecting `undefined` but receiving `null`
- **Analytics stubs**: no RPCs exist for lease analytics — deferred to Phase 53 with TODO comments
- **`UpdateNotificationPreferencesDto` inlined**: rather than moving it to a shared location, it was inlined into the single consumer (`settings.controller.ts`) following KISS

## Verification Results

- `pnpm --filter @repo/frontend typecheck` — zero errors
- `pnpm --filter @repo/backend typecheck` — zero errors
- `ls apps/backend/src/modules/tenants/` — No such file or directory
- `ls apps/backend/src/modules/leases/` — No such file or directory
- `grep "TenantsModule\|LeasesModule" apps/backend/src/app.module.ts` — empty (no references)
- All pre-commit validation passed: lint, typecheck, unit tests across all packages
- 89 files changed (86 deleted), ~26,000 lines removed

## Phase 51 Completion

Phase 51-04 completes the core CRUD migration:
- Plan 01: Properties domain migrated to PostgREST
- Plan 02: Units domain migrated + properties/units NestJS modules deleted
- Plan 03: Tenants domain verified migrated
- Plan 04: Leases domain migrated + tenants/leases NestJS modules deleted

All four CRUD domains (properties, units, tenants, leases) now read/write directly via Supabase PostgREST. NestJS is no longer in the critical CRUD path for any core domain.
