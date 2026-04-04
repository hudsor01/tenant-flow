# Phase 31: Frontend Hook Factories - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract repeated hook boilerplate for entity detail queries and mutation callbacks into typed factories, reducing per-hook code by 50%+. Two new utilities: `useEntityDetail<T>()` and `createMutationCallbacks()`. All existing tests must pass unchanged.

Requirements: FRONT-02, FRONT-03

</domain>

<decisions>
## Implementation Decisions

### Mutation Callback Depth
- **D-01:** `createMutationCallbacks()` includes optimistic update support — not just the simple invalidate + toast + handleMutationError pattern. Factory accepts optional `onMutate` config for optimistic cache writes, query cancellation, and automatic rollback on error.
- **D-02:** Simple mutations (15+) use the basic invalidate + toast path. Complex mutations (mark-sold, lease lifecycle, etc.) use the optimistic update config. Both go through the same factory.

### Migration Granularity
- **D-03:** Two plans. Plan 1: Build both factories + migrate 2-3 hooks as proof (useProperty + useVendor). Plan 2: Migrate all remaining hooks (8+ detail, 15+ mutation), verify 300-line limits, run full test suite.

### Claude's Discretion
- **Detail factory scope:** Claude decides whether `useEntityDetail<T>()` includes the placeholderData list-cache lookup as an opt-in feature or keeps it basic. The codebase shows properties/leases use placeholderData from list cache while simpler entities (vendors, tenants) don't — Claude picks the API shape that covers both cleanly.
- Factory file locations within `src/hooks/`
- TypeScript generic constraints and config object shape
- Which hooks qualify as "proof" migrations in Plan 1
- Whether `staleTime` and `enabled` are configurable per-factory-call or use defaults

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Dependencies
- `.planning/ROADMAP.md` — Phase 31 success criteria (useEntityDetail 8+ hooks, createMutationCallbacks 15+ hooks, 1469+ tests pass, 300-line limit)
- `.planning/phases/27-unified-mutation-hook/27-CONTEXT.md` — Established mutation options factory pattern and cache invalidation conventions

### Detail Query Pattern (to be factored)
- `src/hooks/api/use-properties.ts` — `useProperty(id)` with placeholderData from list cache
- `src/hooks/api/use-lease.ts` — `useLease(id)` with placeholderData from list cache
- `src/hooks/api/use-vendor.ts` — `useVendor(id)` simpler detail query (no placeholderData)
- `src/hooks/api/query-keys/property-keys.ts` — `propertyQueries.detail(id)` queryOptions pattern
- `src/hooks/api/query-keys/lease-keys.ts` — `leaseQueries.detail(id)` queryOptions pattern

### Mutation Callback Pattern (to be factored)
- `src/hooks/api/use-vendor.ts` — Simple CRUD mutations (create/update/delete) with invalidate + toast + handleMutationError
- `src/hooks/api/use-property-mutations.ts` — Complex mutations with optimistic updates (markSold has onMutate + rollback)
- `src/hooks/api/use-unit.ts` — Unit mutations with multi-key invalidation
- `src/hooks/api/use-tenant-mutations.ts` — Tenant mutations
- `src/hooks/api/use-lease-mutations.ts` — Lease mutations with lifecycle complexity

### Shared Utilities (already exist)
- `src/lib/mutation-error-handler.ts` — `handleMutationError()` used by all mutation hooks
- `src/lib/postgrest-error-handler.ts` — `handlePostgrestError()` used by all query hooks
- `src/hooks/api/use-owner-dashboard.ts` — `ownerDashboardKeys.all` invalidated by most mutations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleMutationError()` from `#lib/mutation-error-handler` — standard onError handler across 30 mutation hook files (118 calls)
- `handlePostgrestError()` from `#lib/postgrest-error-handler` — standard query error handler
- `ownerDashboardKeys.all` from `use-owner-dashboard.ts` — nearly every mutation invalidates this
- `toast` from `sonner` — 36 toast calls across 14 mutation files

### Established Patterns
- Mutation options factories in `query-keys/*-mutation-options.ts` provide `mutationKey` + `mutationFn`
- Mutation hooks spread the factory and add `onSuccess`/`onError`/`onSettled` callbacks
- Detail queries use `queryOptions()` with `.from(table).select(...).eq('id', id).single()`
- Some detail hooks wire `placeholderData` from list cache (properties, leases); others don't (vendors, tenants)
- `createClient()` inside each mutation/query function (no module-level client)

### Integration Points
- 34 files use `.single()` detail queries — candidates for `useEntityDetail`
- 30 mutation hook files with onSuccess/onError callbacks — candidates for `createMutationCallbacks`
- All mutation hooks import `useQueryClient` + `useMutation` + `toast` + `handleMutationError` — factory eliminates these repeated imports

### Scale
- 338 total onSuccess/onError occurrences across 40 files
- 155 invalidateQueries calls across 33 files
- 118 handleMutationError calls across 30 files

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-frontend-hook-factories*
*Context gathered: 2026-04-03*
