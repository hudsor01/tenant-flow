---
phase: 51-core-crud-migration-properties-units-tenants-leases
plan: 02
status: complete
completed: 2026-02-21
---

# Phase 51-02 Summary: Units PostgREST Migration + Properties/Units NestJS Deletion

## Objective

Migrate units domain to PostgREST and delete the NestJS properties and units backend modules. Eliminates dead NestJS code for the first two migrated domains.

## Tasks Completed

### Task 1: Migrate unit-keys.ts to PostgREST
**Status: Already complete (from prior work)**

`unit-keys.ts` was already fully migrated to PostgREST with:
- All 5 query options using `supabase.from('units')` with `createClient()` and `handlePostgrestError()`
- Correct `UNIT_SELECT_COLUMNS` fixed to match actual DB schema (added `rent_currency`, `rent_period`; removed non-existent `floor`, `deposit_amount`)
- Returns `PaginatedResponse<Unit>` with `pagination` object for list queries
- Returns `Unit[]` for byProperty/listByProperty queries
- Stats computed via multiple parallel PostgREST aggregation queries

**Fix applied:** `UNIT_SELECT_COLUMNS` was incorrect — included `floor` and `deposit_amount` which don't exist in the DB, and was missing `rent_currency` and `rent_period` which do exist. Corrected to match `supabase.ts` generated types.

### Task 2: Migrate use-unit.ts mutations to PostgREST
**Status: Complete**

Removed all `apiRequest` calls from `use-unit.ts` mutations:

- `useCreateUnitMutation` — now uses `supabase.from('units').insert({ ...data, owner_user_id: userId }).select().single()`; gets `userId` from `supabase.auth.getUser()`
- `useUpdateUnitMutation` — now uses `supabase.from('units').update(updatePayload).eq('id', id).select().single()`
- `useDeleteUnitMutation` — soft-delete via `supabase.from('units').update({ status: 'inactive' }).eq('id', id)`

Removed imports: `apiRequest`, `useUser` (replaced by direct `supabase.auth.getUser()`)
Added imports: `createClient`, `handlePostgrestError`

### Task 3: Delete NestJS properties and units modules
**Status: Complete**

Deleted entire directories:
- `apps/backend/src/modules/properties/` (20 files: controller, service, module, spec, 3 DTOs, utils, 5 services, 2 analytics services)
- `apps/backend/src/modules/units/` (14 files: controller, service, module, spec, 3 DTOs, 4 services)

Updated `apps/backend/src/app.module.ts`:
- Removed `import { PropertiesModule }` and `import { UnitsModule }` lines
- Removed `PropertiesModule` and `UnitsModule` from the `@Module({ imports: [] })` array

**Cross-module dependency fix:** `financial.service.ts` imported `PropertyAccessService` from the deleted properties module. Resolution:
- Created `apps/backend/src/modules/financial/property-access.service.ts` — moved the service to the financial module (its only consumer)
- Updated `financial.module.ts` to import local `PropertyAccessService` and add it to providers/exports
- Updated `financial.service.ts` and two spec files to import from `./property-access.service` instead of `../properties/services/property-access.service`

**Pre-existing fix:** Backend `tsconfig.json` was missing `"multer"` from the `types` array, causing `Express.Multer.File` type errors in `owner-dashboard` and `users` modules. Added `"multer"` to fix this unrelated pre-existing issue.

## Verification Results

| Check | Result |
|-------|--------|
| `grep apiRequest use-unit.ts` | Empty (zero calls) |
| `grep apiRequest unit-keys.ts` | Empty (comment only) |
| `ls apps/backend/src/modules/properties/` | No such file or directory |
| `ls apps/backend/src/modules/units/` | No such file or directory |
| `grep PropertiesModule\|UnitsModule app.module.ts` | No matches |
| `pnpm --filter @repo/frontend typecheck` | Zero errors |
| `pnpm --filter @repo/backend typecheck` | Zero errors |
| Frontend unit tests | 960 pass, 9 fail (all in use-tenant.test.tsx — pre-existing, tenant domain not yet migrated) |

## Artifacts

| Path | Purpose |
|------|---------|
| `apps/frontend/src/hooks/api/query-keys/unit-keys.ts` | Unit query options using supabase.from() PostgREST (fixed column list) |
| `apps/frontend/src/hooks/api/use-unit.ts` | Unit mutation hooks using PostgREST (all apiRequest removed) |
| `apps/backend/src/modules/financial/property-access.service.ts` | Relocated PropertyAccessService (only consumer was financial module) |
| `apps/backend/src/app.module.ts` | PropertiesModule and UnitsModule removed |
| `apps/backend/tsconfig.json` | Added "multer" to types array (pre-existing fix) |

## Key Decisions

- `useCreateUnitMutation` gets `owner_user_id` via `supabase.auth.getUser()` (consistent with properties pattern from 51-01)
- `useDeleteUnitMutation` soft-deletes via `status: 'inactive'` (consistent with properties pattern)
- `PropertyAccessService` relocated to `financial` module rather than being inlined — cleaner separation, easier to find when financial module is eventually deleted in Phase 57
- Backend Multer type error fixed (added `"multer"` to tsconfig) since it was blocking zero-error typecheck requirement
