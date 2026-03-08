---
phase: 17-hooks-consolidation
plan: 02
subsystem: hooks/api
tags: [mutation-options, tanstack-query, refactoring, code-consolidation]
dependency_graph:
  requires: [17-01]
  provides: [mutation-options-spread-pattern]
  affects: [use-property-mutations, use-tenant-mutations, use-tenant-invite-mutations, use-lease-mutations, use-lease-lifecycle-mutations, use-lease-signature-mutations, use-maintenance, use-unit, use-vendor]
tech_stack:
  added: []
  patterns: [mutationOptions-factory-spread, unknown-error-generic]
key_files:
  created:
    - src/hooks/api/query-keys/property-mutation-options.ts
    - src/hooks/api/query-keys/tenant-mutation-options.ts
    - src/hooks/api/query-keys/tenant-invite-mutation-options.ts
    - src/hooks/api/query-keys/lease-mutation-options.ts
    - src/hooks/api/query-keys/maintenance-mutation-options.ts
    - src/hooks/api/query-keys/unit-mutation-options.ts
    - src/hooks/api/query-keys/vendor-mutation-options.ts
  modified:
    - src/hooks/api/use-property-mutations.ts
    - src/hooks/api/use-tenant-mutations.ts
    - src/hooks/api/use-tenant-invite-mutations.ts
    - src/hooks/api/use-lease-mutations.ts
    - src/hooks/api/use-lease-lifecycle-mutations.ts
    - src/hooks/api/use-lease-signature-mutations.ts
    - src/hooks/api/use-maintenance.ts
    - src/hooks/api/use-unit.ts
    - src/hooks/api/use-vendor.ts
decisions:
  - "Use explicit TError=unknown generic in mutationOptions() factories to fix TS2379 exactOptionalPropertyTypes conflict"
  - "Remove explicit (error: unknown) annotations from onError callbacks -- let TypeScript infer error type from factory"
  - "Re-export MaintenanceUpdateMutationVariables from factory file to maintain public API"
  - "Vendor mutation keys defined inline in vendor-mutation-options.ts (not in centralized mutation-keys.ts)"

requirements-completed: [MOD-05]

metrics:
  duration: 30min
  completed: "2026-03-08"
---

# Phase 17 Plan 02: Core Owner mutationOptions Factories Summary

Refactored 9 core owner mutation hook files to spread mutationOptions() factories instead of inlining mutationFn, and fixed a TypeScript error type compatibility issue in the property mutation factory.

## One-liner

Core owner hooks spread mutationOptions factories with unknown error type for exactOptionalPropertyTypes compat

## What Was Done

### Task 1 (Previously completed)

mutationOptions() factories were created as separate files in `src/hooks/api/query-keys/`:
- property-mutation-options.ts, tenant-mutation-options.ts, tenant-invite-mutation-options.ts
- lease-mutation-options.ts, maintenance-mutation-options.ts, unit-mutation-options.ts, vendor-mutation-options.ts

Additionally, 4 hook files were already refactored by the prior executor:
- use-property-mutations.ts, use-tenant-mutations.ts, use-lease-mutations.ts, use-lease-lifecycle-mutations.ts, use-lease-signature-mutations.ts

### Task 2 (This execution)

Refactored the remaining 5 hook files to spread mutationOptions factories:

1. **use-tenant-invite-mutations.ts** -- 4 mutations (invite, resend, cancel, updateNotificationPreferences) now spread from tenantInviteMutations. Removed inline createClient/handlePostgrestError/mutationKeys imports.

2. **use-maintenance.ts** -- 3 mutations (create, update, delete) now spread from maintenanceMutations. Re-exported MaintenanceUpdateMutationVariables type from factory to maintain public API. Removed getCachedUser/requireOwnerUserId/createClient/handlePostgrestError/mutationKeys imports.

3. **use-unit.ts** -- 3 mutations (create, update, delete) now spread from unitMutations. Removed getCachedUser/requireOwnerUserId/createClient/handlePostgrestError/mutationKeys/UnitInput/UnitUpdate imports.

4. **use-vendor.ts** -- 5 mutations (create, update, delete, assign, unassign) now spread from vendorMutations. Removed getCachedUser/requireOwnerUserId imports (createClient/handlePostgrestError retained for query options in same file).

5. **property-mutation-options.ts** -- Added explicit `<TData, unknown, TVariables>` generics to all mutationOptions() calls.

6. **use-property-mutations.ts** -- Removed explicit `(error: unknown)` type annotations from onError callbacks (4 occurrences). Combined with the factory generic fix, this resolves the TS2379 error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2379 exactOptionalPropertyTypes error via two-part fix**
- **Found during:** Task 2 verification (typecheck)
- **Issue:** `mutationOptions()` defaults TError to `Error`, but `useMutation()` defaults to `unknown`. When spread together with `exactOptionalPropertyTypes: true`, the `throwOnError` callback parameter types conflict (contravariance: `(error: Error) => boolean` is not assignable to `(error: unknown) => boolean`).
- **Fix (part 1):** Added explicit `<TData, unknown, TVariables>` generic parameters to all 5 `mutationOptions()` calls in property-mutation-options.ts.
- **Fix (part 2):** Removed explicit `(error: unknown)` annotations from onError callbacks in use-property-mutations.ts, letting TypeScript infer error type from the factory.
- **Files modified:** src/hooks/api/query-keys/property-mutation-options.ts, src/hooks/api/use-property-mutations.ts

## Verification Results

- `pnpm typecheck` -- passes clean (0 errors)
- `pnpm test:unit -- --run src/hooks/api/__tests__/` -- 103 test files, 1415 tests pass
- `ownerDashboardKeys` reference count: 56 (unchanged from baseline, across 13 files)
- No circular dependency errors

## Decisions Made

1. **TError=unknown in factories:** Using `unknown` instead of `Error` as the error type generic in `mutationOptions()` ensures compatibility when spread into `useMutation()` under `exactOptionalPropertyTypes: true`. This is the correct approach per TanStack Query's type system.

2. **Inferred error types in hooks:** Removing explicit `(error: unknown)` annotations from onError callbacks lets TypeScript infer the error type from the factory, avoiding the contra-variance conflict with throwOnError.

3. **Re-export pattern for interface types:** When a mutation factory defines an interface (MaintenanceUpdateMutationVariables), the hook file re-exports it via `export type { ... } from '...'` to maintain the public API surface.
