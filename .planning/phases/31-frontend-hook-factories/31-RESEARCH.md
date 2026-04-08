# Phase 31: Frontend Hook Factories - Research

**Researched:** 2026-04-03
**Domain:** TanStack Query hook patterns, TypeScript generic factories, React hook composition
**Confidence:** HIGH

## Summary

Phase 31 extracts two categories of repeated hook boilerplate into typed factories: (1) entity detail queries with optional list-cache placeholderData, and (2) mutation callback scaffolding (onSuccess/onError/onSettled) with toast, cache invalidation, and optional optimistic updates.

The codebase contains 18 mutation hook files totaling ~2,850 lines with highly repetitive patterns. Every mutation hook follows the same structure: spread a mutation options factory, add `onSuccess` with invalidation + toast, add `onError` with `handleMutationError`. The detail query pattern appears in 8 hooks (`useProperty`, `useLease`, `useTenant`, `useUnit`, `useVendor`, `useInspection`, `useTenantWithLease`, `useSubscription`) all sharing the same `queryOptions` + optional `placeholderData` from list cache structure.

**Primary recommendation:** Build two utility functions -- `useEntityDetail<T>()` as a React hook and `createMutationCallbacks()` as a plain function (not a hook) -- then systematically migrate all qualifying hooks across two plans.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `createMutationCallbacks()` includes optimistic update support -- not just the simple invalidate + toast + handleMutationError pattern. Factory accepts optional `onMutate` config for optimistic cache writes, query cancellation, and automatic rollback on error.
- **D-02:** Simple mutations (15+) use the basic invalidate + toast path. Complex mutations (mark-sold, lease lifecycle, etc.) use the optimistic update config. Both go through the same factory.
- **D-03:** Two plans. Plan 1: Build both factories + migrate 2-3 hooks as proof (useProperty + useVendor). Plan 2: Migrate all remaining hooks (8+ detail, 15+ mutation), verify 300-line limits, run full test suite.

### Claude's Discretion
- **Detail factory scope:** Claude decides whether `useEntityDetail<T>()` includes the placeholderData list-cache lookup as an opt-in feature or keeps it basic. The codebase shows properties/leases use placeholderData from list cache while simpler entities (vendors, tenants) don't -- Claude picks the API shape that covers both cleanly.
- Factory file locations within `src/hooks/`
- TypeScript generic constraints and config object shape
- Which hooks qualify as "proof" migrations in Plan 1
- Whether `staleTime` and `enabled` are configurable per-factory-call or use defaults

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRONT-02 | Entity detail query factory (`useEntityDetail<T>()`) used by 8+ hooks | 8 qualifying detail hooks identified with two patterns (with/without placeholderData); generic factory design documented below |
| FRONT-03 | Mutation callback factory (`createMutationCallbacks()`) used by 15+ hooks | 40+ qualifying mutations across 18 files; three tiers documented (simple, with-detail-update, optimistic) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives the planner MUST verify compliance with:

1. **No `any` types** -- factory generics must use constrained generics, never `any`
2. **No barrel files** -- import factory directly from its defining file, no `index.ts` re-export
3. **No duplicate types** -- factory types go in `src/types/` if shared, or colocated if factory-private
4. **Max 300 lines per file** -- refactored hook files must respect this limit
5. **Max 50 lines per function** -- factory functions must be composed, not monolithic
6. **Query keys from factories** -- all queryOptions must come from `src/hooks/api/query-keys/`
7. **No module-level Supabase client** -- `createClient()` inside each function (already in queryOptions factories)
8. **`handleMutationError` for onError** -- existing `#lib/mutation-error-handler` is the standard
9. **`ownerDashboardKeys.all` invalidation** -- most mutations must invalidate dashboard
10. **Path aliases** -- use `#hooks/*`, `#lib/*`, `#types/*` aliases
11. **File naming** -- kebab-case: `use-entity-detail.ts`, `create-mutation-callbacks.ts`
12. **No `as unknown as`** -- factory must not introduce type assertions
13. **1,469+ unit tests must pass** -- zero test failures after migration
14. **React Compiler** -- enabled; factories must be compatible (stable references, no dynamic hook calls)

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.96.1 | Query and mutation management | Already the project standard; queryOptions/mutationOptions factories are the v5 pattern |
| sonner | (installed) | Toast notifications | Already used by all mutation hooks for success/error toasts |
| TypeScript | strict mode | Type safety | Project uses full strict mode including exactOptionalPropertyTypes |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| #lib/mutation-error-handler | N/A | Standardized error handling | All mutation onError callbacks |
| #lib/postgrest-error-handler | N/A | Query error handling | All queryFn error paths |
| #lib/constants/query-config | N/A | QUERY_CACHE_TIMES | Default staleTime/gcTime for factory |

**No new packages required.** This phase is pure TypeScript refactoring using existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/hooks/
  use-entity-detail.ts              # NEW: useEntityDetail<T>() hook factory
  create-mutation-callbacks.ts       # NEW: createMutationCallbacks() utility
  api/
    use-properties.ts               # MODIFIED: uses useEntityDetail
    use-property-mutations.ts       # MODIFIED: uses createMutationCallbacks
    use-lease.ts                    # MODIFIED: uses useEntityDetail
    use-lease-mutations.ts          # MODIFIED: uses createMutationCallbacks
    use-tenant.ts                   # MODIFIED: uses useEntityDetail
    use-tenant-mutations.ts         # MODIFIED: uses createMutationCallbacks
    use-unit.ts                     # MODIFIED: uses both
    use-vendor.ts                   # MODIFIED: uses both
    use-inspections.ts              # MODIFIED: uses useEntityDetail
    ... (all other mutation files)  # MODIFIED: uses createMutationCallbacks
```

### Pattern 1: useEntityDetail<T>() -- Detail Query Hook Factory

**What:** A generic React hook that wraps `useQuery` with a `queryOptions` factory result and optional `placeholderData` sourced from list caches.

**When to use:** Any hook that fetches a single entity by ID using a `queryOptions` factory with `.single()`.

**Recommendation (Claude's Discretion):** Include `placeholderData` list-cache lookup as an opt-in feature via a `listQueryKey` config option. When provided, the factory searches list caches for the item; when omitted, no placeholderData is used. This cleanly covers both patterns found in the codebase.

**Proposed API shape:**
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { DefinedInitialDataOptions, UndefinedInitialDataOptions } from '@tanstack/react-query'

/**
 * Configuration for useEntityDetail factory
 */
interface EntityDetailConfig<T> {
  /** queryOptions factory result for this entity */
  queryOptions: UndefinedInitialDataOptions<T> | DefinedInitialDataOptions<T>
  /**
   * Optional: query key prefix for list caches to search for placeholderData.
   * When provided, searches all matching list caches for an item with matching `id`.
   * When omitted, no placeholderData lookup is performed.
   */
  listQueryKey?: readonly unknown[]
  /** The entity ID -- used to match within list cache data */
  id: string
}

/**
 * Generic hook factory for entity detail queries.
 *
 * Eliminates boilerplate for the pattern:
 *   queryOptions + useQueryClient + placeholderData list-cache lookup
 *
 * @example
 * // With list cache lookup (properties, leases, tenants, units)
 * export function useProperty(id: string) {
 *   return useEntityDetail<Property>({
 *     queryOptions: propertyQueries.detail(id),
 *     listQueryKey: propertyQueries.lists(),
 *     id,
 *   })
 * }
 *
 * // Without list cache lookup (vendors, inspections)
 * export function useVendor(id: string) {
 *   return useEntityDetail<Vendor>({
 *     queryOptions: vendorKeys.detail(id),
 *     id,
 *   })
 * }
 */
export function useEntityDetail<T extends { id: string }>(
  config: EntityDetailConfig<T>
) {
  const queryClient = useQueryClient()

  return useQuery({
    ...config.queryOptions,
    ...(config.listQueryKey
      ? {
          placeholderData: () => {
            const listCaches = queryClient.getQueriesData<
              { data?: T[] } | T[]
            >({ queryKey: config.listQueryKey })

            for (const [, response] of listCaches) {
              // Handle both { data: T[] } and T[] response shapes
              const items = Array.isArray(response)
                ? response
                : response?.data
              const item = items?.find(
                (entry) => entry.id === config.id
              )
              if (item) return item
            }
            return undefined
          },
        }
      : {}),
  })
}
```

**Key design decisions:**
- Generic constraint `T extends { id: string }` -- all entities have an `id` field
- `listQueryKey` is optional -- covers both with-placeholder and without-placeholder patterns
- Handles both `{ data: T[] }` (PaginatedResponse) and `T[]` response shapes from list caches
- Does NOT take over `staleTime`/`enabled` -- those remain in the `queryOptions` factory where they already are
- Returns the same `UseQueryResult<T>` as before -- zero API change for consumers

### Pattern 2: createMutationCallbacks() -- Mutation Callback Factory

**What:** A plain function (NOT a hook) that generates `onSuccess`, `onError`, and optionally `onMutate`/`onSettled` callbacks for `useMutation`.

**When to use:** Any mutation hook that follows the standard pattern of invalidate + toast + handleMutationError.

**Three tiers (per D-01 / D-02):**

**Tier 1 -- Simple (15+ hooks):** invalidate keys + toast success + handleMutationError
```typescript
// Before: 12-15 lines of boilerplate per mutation
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...propertyMutations.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
      toast.success('Property created successfully')
    },
    onError: error => handleMutationError(error, 'Create property')
  })
}

// After: 5-7 lines
export function useCreatePropertyMutation() {
  return useMutationWithCallbacks({
    ...propertyMutations.create(),
    ...createMutationCallbacks({
      invalidate: [propertyQueries.lists(), ownerDashboardKeys.all],
      successMessage: 'Property created successfully',
      errorContext: 'Create property',
    }),
  })
}
```

**Tier 2 -- With detail cache update (8+ hooks):** Same as Tier 1 plus `setQueryData` for the updated entity
```typescript
// Before
onSuccess: updatedProperty => {
  queryClient.setQueryData(
    propertyQueries.detail(updatedProperty.id).queryKey,
    updatedProperty
  )
  queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
  queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
  toast.success('Property updated successfully')
},

// After
...createMutationCallbacks({
  invalidate: [propertyQueries.lists(), ownerDashboardKeys.all],
  updateDetail: (result) => ({
    queryKey: propertyQueries.detail(result.id).queryKey,
    data: result,
  }),
  successMessage: 'Property updated successfully',
  errorContext: 'Update property',
})
```

**Tier 3 -- Optimistic (5-7 hooks):** Full optimistic update with cancel + snapshot + rollback
```typescript
// Used by: useMarkPropertySoldMutation, useDeleteLeaseOptimisticMutation,
//          useMarkTenantAsMovedOutMutation, useUpdateProfileMutation, etc.
...createMutationCallbacks({
  invalidate: [propertyQueries.lists(), ownerDashboardKeys.all],
  errorContext: 'Mark property as sold',
  optimistic: {
    cancel: [
      propertyQueries.detail(id).queryKey,
      propertyQueries.lists(),
    ],
    snapshot: (queryClient) => ({
      previousDetail: queryClient.getQueryData(propertyQueries.detail(id).queryKey),
      previousLists: queryClient.getQueriesData({ queryKey: propertyQueries.lists() }),
    }),
    rollback: (queryClient, context) => {
      if (context.previousDetail) {
        queryClient.setQueryData(propertyQueries.detail(id).queryKey, context.previousDetail)
      }
      // ... restore lists
    },
  },
})
```

**Proposed implementation approach:**

```typescript
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

/**
 * Configuration for simple mutation callbacks (Tier 1)
 */
interface SimpleMutationConfig<TData> {
  /** Query keys to invalidate on success */
  invalidate: ReadonlyArray<QueryKey | readonly unknown[]>
  /** Toast message on success */
  successMessage?: string
  /** Context string for handleMutationError (e.g., "Create property") */
  errorContext: string
  /** Optional: update a single detail cache entry on success */
  updateDetail?: (data: TData) => { queryKey: QueryKey; data: TData }
  /** Optional: remove a detail cache entry on success */
  removeDetail?: (data: TData, variables: unknown) => QueryKey
  /** Optional: custom onSuccess handler to run after standard operations */
  onSuccessExtra?: (data: TData) => void
}

/**
 * Configuration for optimistic mutation callbacks (Tier 3)
 * Extends simple config with onMutate/rollback.
 */
interface OptimisticMutationConfig<TData, TVariables, TContext>
  extends Omit<SimpleMutationConfig<TData>, 'invalidate'> {
  /** Keys to cancel + invalidate */
  invalidate: ReadonlyArray<QueryKey | readonly unknown[]>
  optimistic: {
    /** Query keys to cancel before mutation */
    cancel: ReadonlyArray<QueryKey | readonly unknown[]>
    /** Snapshot function: captures previous state for rollback */
    snapshot: (queryClient: QueryClient) => TContext
    /** Rollback function: restores previous state on error */
    rollback: (queryClient: QueryClient, context: TContext) => void
    /** Optional: apply optimistic update to cache */
    apply?: (queryClient: QueryClient, variables: TVariables) => void
  }
}

/**
 * Creates standard mutation callbacks (onSuccess, onError, onSettled).
 * Not a hook -- returns a plain object to spread into useMutation.
 *
 * Requires `useQueryClient()` to be called in the consuming hook.
 */
export function createMutationCallbacks<TData, TVariables = unknown>(
  queryClient: QueryClient,
  config: SimpleMutationConfig<TData>
): {
  onSuccess: (data: TData, variables: TVariables) => void
  onError: (error: unknown) => void
} {
  return {
    onSuccess: (data: TData, variables: TVariables) => {
      if (config.updateDetail) {
        const { queryKey, data: detailData } = config.updateDetail(data)
        queryClient.setQueryData(queryKey, detailData)
      }
      if (config.removeDetail) {
        const removeKey = config.removeDetail(data, variables)
        queryClient.removeQueries({ queryKey: removeKey })
      }
      for (const key of config.invalidate) {
        queryClient.invalidateQueries({ queryKey: key as QueryKey })
      }
      if (config.successMessage) {
        toast.success(config.successMessage)
      }
      config.onSuccessExtra?.(data)
    },
    onError: (error: unknown) => {
      handleMutationError(error, config.errorContext)
    },
  }
}
```

**Design choice: `queryClient` as parameter, not `useQueryClient()` inside.**
The factory is a plain function, not a hook. This means the consuming hook calls `useQueryClient()` once and passes the client in. This keeps the factory testable and avoids hook-rule violations if someone calls it outside a component.

**Wrapper hook for convenience:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationOptions } from '@tanstack/react-query'

/**
 * Convenience hook that combines useMutation + createMutationCallbacks.
 * Handles useQueryClient internally.
 */
export function useMutationWithCallbacks<TData, TError, TVariables>(
  mutationOptions: UseMutationOptions<TData, TError, TVariables>,
  callbackConfig: SimpleMutationConfig<TData>
) {
  const queryClient = useQueryClient()
  const callbacks = createMutationCallbacks<TData, TVariables>(
    queryClient,
    callbackConfig
  )
  return useMutation({
    ...mutationOptions,
    ...callbacks,
  })
}
```

### Anti-Patterns to Avoid
- **Hook-in-a-non-hook:** `createMutationCallbacks` MUST be a plain function, not call `useQueryClient()` internally. The consuming hook provides the queryClient.
- **Over-abstracting:** Do NOT try to abstract the optimistic update snapshot/rollback into a generic utility -- each mutation has different cache shapes. The factory provides the structure; the mutation provides the specifics.
- **Breaking the mutation options pattern:** Mutation factories (`propertyMutations.create()`) already exist and must remain untouched. `createMutationCallbacks` supplements them, not replaces them.
- **Dynamic hook calls:** React Compiler requires static hook call sites. Never call `useEntityDetail` inside a conditional or loop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query cache invalidation | Custom invalidation loops | `createMutationCallbacks` with `invalidate` array | Standard pattern eliminates per-mutation invalidation boilerplate |
| Toast success messages | Per-mutation toast calls | `createMutationCallbacks` with `successMessage` | All simple mutations follow identical toast pattern |
| Error handling | Custom onError implementations | `handleMutationError` (already exists) via factory | 118 usages already in codebase; factory makes it automatic |
| PlaceholderData list lookup | Per-hook list cache search | `useEntityDetail` with `listQueryKey` | 4 hooks have identical 10-line placeholderData patterns |

**Key insight:** The boilerplate is not complex -- it is repetitive. Each individual mutation callback is 5-15 lines of straightforward code. The factory's value is eliminating 150+ copy-paste sites, not solving a hard problem.

## Common Pitfalls

### Pitfall 1: TypeScript Generic Inference Failure
**What goes wrong:** Generic factory returns lose type inference when the config object is built inline, requiring explicit type annotations at every call site.
**Why it happens:** TypeScript cannot infer TData from `onSuccess: (data) => ...` when the config is a plain object.
**How to avoid:** Ensure `createMutationCallbacks` infers TData from the `updateDetail` callback parameter or the mutation options' TData. Test with a real migration before committing the API shape.
**Warning signs:** Call sites requiring `createMutationCallbacks<Property, PropertyCreate>(...)` explicit generics.

### Pitfall 2: PlaceholderData Cache Shape Mismatch
**What goes wrong:** List caches have inconsistent shapes -- some are `PaginatedResponse<T>` (`{ data: T[], total, pagination }`), others are `T[]` directly.
**Why it happens:** Different query factories return different shapes.
**How to avoid:** `useEntityDetail` must handle both shapes. The proposed pattern uses `Array.isArray(response) ? response : response?.data` to normalize.
**Warning signs:** `useEntityDetail` returns `undefined` placeholderData where the old hand-rolled code returned data.

### Pitfall 3: handleMutationSuccess vs toast.success Divergence
**What goes wrong:** Some hooks use `handleMutationSuccess(context, message)` (which includes logging + toast), while others use `toast.success(message)` directly.
**Why it happens:** `handleMutationSuccess` was added later (mutation-error-handler.ts) and not all hooks were migrated.
**How to avoid:** Factory should support both: `successMessage` (string, uses `toast.success`) and `successHandler` (uses `handleMutationSuccess`). Alternatively, standardize all to `handleMutationSuccess` during migration.
**Warning signs:** Inspection mutations and profile mutations use `handleMutationSuccess`; property/lease/tenant mutations use `toast.success`.

### Pitfall 4: Mutation Hooks with Custom Parameters Break Factory Pattern
**What goes wrong:** Some mutations accept additional parameters at the hook level (e.g., `useDeleteLeaseOptimisticMutation(options?: { onSuccess, onError })`, `useUpdateInspection(id: string)`).
**Why it happens:** Hooks that need caller-provided callbacks or pre-bound IDs have a different shape.
**How to avoid:** Don't force these into the factory. The factory handles the common case (15+ mutations); leave edge-case hooks as-is or give them a thin wrapper.
**Warning signs:** Trying to generalize `options?.onSuccess?.()` chaining into the factory config.

### Pitfall 5: Optimistic Update Context Type Erasure
**What goes wrong:** The `context` parameter in `onError` loses its type because TanStack Query infers it from `onMutate` return type. If `createMutationCallbacks` provides `onMutate`, the context type flows; if the consuming hook provides its own `onMutate`, the factory's rollback cannot access the context.
**Why it happens:** `useMutation` infers TContext from the `onMutate` return type. Mixing factory-provided and hook-provided callbacks breaks the chain.
**How to avoid:** For optimistic mutations (Tier 3), the factory provides the complete `onMutate`/`onError`/`onSettled` triple. Never mix factory-provided and manually-provided optimistic callbacks.
**Warning signs:** TypeScript errors on `context?.previousDetail` being `unknown`.

### Pitfall 6: Breaking React Compiler Memoization
**What goes wrong:** React Compiler assumes stable callback references. If the factory creates new function objects on every render, Compiler's memoization assumptions break.
**Why it happens:** `createMutationCallbacks` called inside a component creates new function objects each render.
**How to avoid:** `createMutationCallbacks` returns plain objects, and `useMutation` itself handles memoization. As long as the factory is not called conditionally or with unstable references, React Compiler is fine. The factory takes `queryClient` (stable ref from `useQueryClient()`) and config (should be stable or memoized).
**Warning signs:** Infinite re-renders or "too many renders" errors after migration.

## Code Examples

### Example 1: Simple Mutation (Tier 1) -- Before/After

**Before (use-property-mutations.ts, ~15 lines):**
```typescript
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...propertyMutations.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
      toast.success('Property created successfully')
    },
    onError: error => handleMutationError(error, 'Create property')
  })
}
```

**After (~8 lines):**
```typescript
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...propertyMutations.create(),
    ...createMutationCallbacks(queryClient, {
      invalidate: [propertyQueries.lists(), ownerDashboardKeys.all],
      successMessage: 'Property created successfully',
      errorContext: 'Create property',
    }),
  })
}
```

### Example 2: Detail Cache Update (Tier 2) -- Before/After

**Before (use-tenant-mutations.ts, ~12 lines):**
```typescript
export function useUpdateTenantMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...tenantMutations.update(),
    onSuccess: updatedTenant => {
      queryClient.setQueryData(tenantQueries.detail(updatedTenant.id).queryKey, updatedTenant)
      queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
      toast.success('Tenant updated successfully')
    },
    onError: error => handleMutationError(error, 'Update tenant')
  })
}
```

**After (~10 lines):**
```typescript
export function useUpdateTenantMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...tenantMutations.update(),
    ...createMutationCallbacks(queryClient, {
      invalidate: [tenantQueries.lists(), ownerDashboardKeys.all],
      updateDetail: (tenant) => ({
        queryKey: tenantQueries.detail(tenant.id).queryKey,
        data: tenant,
      }),
      successMessage: 'Tenant updated successfully',
      errorContext: 'Update tenant',
    }),
  })
}
```

### Example 3: Entity Detail with PlaceholderData -- Before/After

**Before (use-properties.ts, ~18 lines):**
```typescript
export function useProperty(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    ...propertyQueries.detail(id),
    placeholderData: () => {
      const listCaches = queryClient.getQueriesData<PaginatedResponse<Property>>({
        queryKey: propertyQueries.lists()
      })
      for (const [, response] of listCaches) {
        const item = response?.data?.find(p => p.id === id)
        if (item) return item
      }
      return undefined
    }
  })
}
```

**After (~6 lines):**
```typescript
export function useProperty(id: string) {
  return useEntityDetail<Property>({
    queryOptions: propertyQueries.detail(id),
    listQueryKey: propertyQueries.lists(),
    id,
  })
}
```

## Mutation Hook Inventory

### Qualifying Mutations by Tier

**Tier 1 -- Simple invalidate + toast + error (22+ mutations):**

| File | Hook | Keys Invalidated |
|------|------|-----------------|
| use-property-mutations.ts | useCreatePropertyMutation | lists, dashboard |
| use-property-mutations.ts | useDeletePropertyMutation | lists, units, dashboard |
| use-property-mutations.ts | useDeletePropertyImageMutation | detail images, lists |
| use-lease-mutations.ts | useCreateLeaseMutation | leases, tenants, units, dashboard |
| use-lease-mutations.ts | useDeleteLeaseMutation | detail, leases, tenants, units, dashboard |
| use-lease-lifecycle-mutations.ts | useTerminateLeaseMutation | leases, tenants, units, dashboard |
| use-lease-lifecycle-mutations.ts | useRenewLeaseMutation | detail + leases, dashboard |
| use-lease-signature-mutations.ts | useSendLeaseForSignatureMutation | detail, signature, lists |
| use-lease-signature-mutations.ts | useSignLeaseAsOwnerMutation | detail, signature, lists |
| use-lease-signature-mutations.ts | useSignLeaseAsTenantMutation | detail, signature, portal, lists |
| use-lease-signature-mutations.ts | useCancelSignatureRequestMutation | detail, signature, lists |
| use-lease-signature-mutations.ts | useResendSignatureRequestMutation | detail, signature, lists |
| use-tenant-mutations.ts | useCreateTenantMutation | lists, dashboard |
| use-tenant-mutations.ts | useDeleteTenantMutation | detail, lists, leases, dashboard |
| use-unit.ts | useCreateUnitMutation | units, properties, dashboard |
| use-unit.ts | useDeleteUnitMutation | detail, units, properties, leases, dashboard |
| use-vendor.ts | useCreateVendorMutation | lists, dashboard |
| use-vendor.ts | useDeleteVendorMutation | lists, dashboard |
| use-vendor.ts | useAssignVendorMutation | detail |
| use-vendor.ts | useUnassignVendorMutation | detail |
| use-inspection-mutations.ts | useCreateInspection | lists |
| use-inspection-mutations.ts | useCompleteInspection | detail, lists |
| use-inspection-mutations.ts | useSubmitForTenantReview | detail, lists |
| use-inspection-mutations.ts | useTenantReview | detail, lists |
| use-inspection-mutations.ts | useDeleteInspection | lists |
| use-inspection-photo-mutations.ts | useRecordInspectionPhoto | detail |
| use-inspection-photo-mutations.ts | useDeleteInspectionPhoto | detail |
| use-inspection-room-mutations.ts | useCreateInspectionRoom | detail |
| use-inspection-room-mutations.ts | useDeleteInspectionRoom | detail |
| use-expense-mutations.ts | useCreateExpenseMutation | expenses all |
| use-expense-mutations.ts | useDeleteExpenseMutation | expenses all |
| use-maintenance.ts | useMaintenanceRequestCreateMutation | lists, dashboard |
| use-maintenance.ts | useDeleteMaintenanceRequest | lists, dashboard |
| use-payment-mutations.ts | useRecordManualPaymentMutation | rent collection |
| use-billing-mutations.ts | useCreateSubscriptionMutation | subscriptions list |
| use-billing-mutations.ts | useCancelSubscriptionMutation | subscriptions list |
| use-tenant-invite-mutations.ts | useResendInvitationMutation | invitations, tenant lists |
| use-tenant-invite-mutations.ts | useCancelInvitationMutation | invitations, tenant lists |
| use-report-mutations.ts | useDownloadYearEndCsv | (success only, no invalidation) |
| use-report-mutations.ts | useDownload1099Csv | (success only, no invalidation) |

**Tier 2 -- With detail cache update (8+ mutations):**

| File | Hook | Detail Update |
|------|------|--------------|
| use-property-mutations.ts | useUpdatePropertyMutation | setQueryData on detail |
| use-lease-mutations.ts | useUpdateLeaseMutation | setQueryData on detail |
| use-tenant-mutations.ts | useUpdateTenantMutation | setQueryData on detail |
| use-unit.ts | useUpdateUnitMutation | setQueryData on detail |
| use-vendor.ts | useUpdateVendorMutation | setQueryData on detail |
| use-inspection-mutations.ts | useUpdateInspection | setQueryData on detail |
| use-lease-lifecycle-mutations.ts | useRenewLeaseMutation | setQueryData on detail |
| use-maintenance.ts | useMaintenanceRequestUpdateMutation | setQueryData on detail |

**Tier 3 -- Optimistic updates (5 mutations, stay hand-rolled or use optimistic config):**

| File | Hook | Complexity |
|------|------|-----------|
| use-property-mutations.ts | useMarkPropertySoldMutation | onMutate: cancel, snapshot detail + lists; rollback both |
| use-lease-mutations.ts | useDeleteLeaseOptimisticMutation | onMutate: cancel, snapshot detail + lists, remove from cache; rollback |
| use-tenant-mutations.ts | useMarkTenantAsMovedOutMutation | onMutate: cancel, snapshot 3 caches, incrementVersion + filter; rollback |
| use-profile-mutations.ts | useUpdateProfileMutation | onMutate: cancel, snapshot profile, optimistic merge |
| use-profile-mutations.ts | useUpdatePhoneMutation | onMutate: cancel, snapshot profile, optimistic merge |
| use-profile-avatar-mutations.ts | useUploadAvatarMutation | onMutate: cancel, snapshot profile |
| use-profile-avatar-mutations.ts | useRemoveAvatarMutation | onMutate: cancel, snapshot profile, optimistic null |
| use-profile-emergency-mutations.ts | useUpdateProfileEmergencyContactMutation | onMutate: cancel, snapshot, optimistic merge |
| use-profile-emergency-mutations.ts | useRemoveProfileEmergencyContactMutation | onMutate: cancel, snapshot, optimistic null |

**Excluded (do not migrate):**
- `use-auth-mutations.ts` -- auth mutations have unique patterns (router.push, clearAuthData, session management)
- `use-billing-mutations.ts:useBillingPortalMutation` -- inline mutationFn, not using factory pattern
- `use-pending-mutations.ts` -- not a mutation hook, it is a mutation state tracker
- `use-stripe-connect.ts` mutations -- inline mutationFn, window.location redirect patterns
- `use-payment-mutations.ts:useExportPaymentsMutation` -- blob download pattern, unique onSuccess
- `use-payment-mutations.ts:useSendTenantPaymentReminderMutation` -- dynamic key invalidation from variables
- `use-inspection-room-mutations.ts:useUpdateInspectionRoom` -- inline mutationFn, not using factory

### Detail Query Hooks Qualifying for useEntityDetail

| File | Hook | Has PlaceholderData | List Cache Shape |
|------|------|-------------------|-----------------|
| use-properties.ts | useProperty | YES | `PaginatedResponse<Property>` |
| use-lease.ts | useLease | YES | `{ data: Lease[] }` |
| use-tenant.ts | useTenant | YES | `{ data?: TenantWithLeaseInfo[] }` |
| use-unit.ts | useUnit | YES | `Unit[]` |
| use-vendor.ts | useVendor | NO | N/A |
| use-inspections.ts | useInspection | NO | N/A |
| use-tenant.ts | useTenantWithLease | NO | N/A |
| use-billing.ts | useSubscription | NO | N/A |

**Total: 8 qualifying hooks** (4 with placeholderData, 4 without).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useQuery({ queryKey, queryFn })` manual | `queryOptions()` factories | TanStack Query v5 (2023) | Already adopted; factory builds on this |
| `useMutation({ mutationFn })` with inline callbacks | `mutationOptions()` factories + spread | TanStack Query v5 (2023) | Already adopted for mutationFn; callbacks remain hand-written |
| Individual hook per entity detail | Generic `useEntityDetail<T>()` | This phase | Eliminates 8 near-identical hooks |

## Open Questions

1. **`handleMutationSuccess` vs `toast.success` standardization**
   - What we know: 9 hooks use `handleMutationSuccess` (includes logging), 25+ use `toast.success` directly
   - What's unclear: Should the factory standardize on one? `handleMutationSuccess` adds logging which is valuable.
   - Recommendation: Factory uses `handleMutationSuccess` by default (it already wraps `toast.success`). This adds logging to the 25+ mutations that currently skip it. No behavioral change to the user, better observability.

2. **Optimistic mutation abstraction level**
   - What we know: D-01 says factory supports optimistic updates. 9 hooks use optimistic patterns.
   - What's unclear: How much of the optimistic cancel/snapshot/rollback can the factory truly abstract without becoming more complex than the hand-written code?
   - Recommendation: For Plan 1 proof, implement Tier 1 and Tier 2 only. Tier 3 optimistic support can be a simple `optimistic` config with `cancel`/`snapshot`/`rollback` callbacks. If it does not reduce code meaningfully for 9 hooks, leave those hooks hand-written and document the decision. The 15+ target is easily met without Tier 3.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` (3 projects: unit, component, integration) |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:unit -- --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRONT-02 | `useEntityDetail<T>()` returns query result with optional placeholderData | unit | `pnpm test:unit -- --run src/hooks/use-entity-detail.test.ts -x` | Wave 0 |
| FRONT-03 | `createMutationCallbacks()` returns onSuccess/onError with invalidation + toast | unit | `pnpm test:unit -- --run src/hooks/create-mutation-callbacks.test.ts -x` | Wave 0 |
| FRONT-02 | Migrated detail hooks behave identically to originals | unit | `pnpm test:unit` (full suite regression) | Existing 1,469 tests |
| FRONT-03 | Migrated mutation hooks behave identically to originals | unit | `pnpm test:unit` (full suite regression) | Existing 1,469 tests |

### Sampling Rate
- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test:unit -- --coverage`
- **Phase gate:** Full suite green + `pnpm typecheck && pnpm lint` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/use-entity-detail.test.ts` -- covers FRONT-02 (factory unit tests)
- [ ] `src/hooks/create-mutation-callbacks.test.ts` -- covers FRONT-03 (factory unit tests)

Note: Existing 1,469 unit tests serve as regression tests for all migrated hooks. New factory tests validate the factories themselves; existing tests validate that migration preserves behavior.

## Sources

### Primary (HIGH confidence)
- Codebase analysis of 18 mutation hook files, 8 detail query hooks, 12 mutation options factories
- `@tanstack/react-query` v5.96.1 installed in project -- `queryOptions()`, `mutationOptions()`, `useQuery()`, `useMutation()` API verified from installed types
- `src/lib/mutation-error-handler.ts` -- `handleMutationError` and `handleMutationSuccess` API verified
- `src/lib/constants/query-config.ts` -- `QUERY_CACHE_TIMES` verified

### Secondary (MEDIUM confidence)
- TanStack Query v5 patterns for generic hook factories -- training data aligns with installed version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, pure internal refactoring
- Architecture: HIGH -- patterns derived directly from codebase analysis of 18 files
- Pitfalls: HIGH -- identified from actual code shape mismatches across the codebase (PaginatedResponse vs array, handleMutationSuccess vs toast.success)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- internal patterns, no external dependency changes)
