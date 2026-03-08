# Phase 17: Hooks Consolidation - Research

**Researched:** 2026-03-08
**Domain:** TanStack Query v5 hook patterns, mutation factories, Suspense integration
**Confidence:** HIGH

## Summary

Phase 17 modernizes 85+ hook files across `src/hooks/api/` and `src/hooks/`. The work spans five distinct areas: (1) splitting 7 oversized files under 300 lines, (2) expanding `useSuspenseQuery` from 1 file to 17+ Suspense boundaries, (3) deduplicating overlapping hook logic, (4) removing the dead `react-hook-form` dependency (already migrated -- zero imports remain), and (5) adding `mutationOptions()` factories for 98 mutation call sites across 34 files.

The codebase already has strong patterns to follow. `queryOptions()` factories exist in 13 files under `src/hooks/api/query-keys/`. The `use-dashboard-hooks.ts` file demonstrates the `useSuspenseQuery` pattern with stable select functions. The `mutation-keys.ts` file provides centralized mutation keys (225 lines) that will pair naturally with `mutationOptions()` factories. The ownerDashboardKeys invalidation graph (8 hook files, 5 component files, 22 call sites) is the highest-risk area during any restructuring.

**Primary recommendation:** Process work in dependency order -- split oversized files first (no consumer changes), then add mutationOptions() factories (additive), then convert useSuspenseQuery (behavioral change per component), then deduplicate and remove dead code last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 7 files currently exceed 300 lines: report-keys.ts (503), property-keys.ts (450), tenant-keys.ts (400), financial-keys.ts (389), use-data-table.ts (316), lease-keys.ts (316), use-tenant-mutations.ts (312)
- Claude decides the split strategy per file based on logical groupings within each file
- Files barely over 300 lines may be brought under via minor refactoring rather than splitting
- All components currently inside Suspense boundaries must be converted from useQuery to useSuspenseQuery
- Currently only use-dashboard-hooks.ts uses useSuspenseQuery; 20+ Suspense boundaries exist across pages
- Also add Suspense boundaries where obviously beneficial (e.g., detail pages without them) -- not limited to existing boundaries
- Claude decides per case whether overlapping hooks should be merged or kept separate
- Shared query logic should be extracted into query-keys factories where it makes deduplication cleaner
- Owner vs tenant domain separation is generally intentional -- don't blindly merge across domains
- Confirmed dead hooks (zero imports in src/ and tests/) should be deleted entirely
- All 17 files currently using react-hook-form must be migrated to TanStack Form -- note: investigation shows migration is ALREADY COMPLETE (zero imports of react-hook-form in src/), only the package.json dependency remains
- TanStack Form is the project standard (already a dependency, used alongside react-hook-form)
- After migration, remove react-hook-form from package.json dependencies
- Add mutationOptions() factories alongside existing queryOptions() pattern in query-keys/
- Mirrors the queryOptions() pattern: centralized, type-safe mutation definitions
- Each domain key file gets corresponding mutation options
- Claude decides organization: co-locate in existing key files or separate mutation-keys/ directory
- User trusts Claude's judgment on all technical decisions for this phase
- "Knip is not reliable enough to put any amount of blind trust into" -- verify dead hooks via grep before deleting

### Claude's Discretion
- Exact split points for each oversized file
- Which Suspense boundaries to add (beyond existing ones)
- How to restructure overlapping hooks (merge, extract shared logic, or keep separate)
- Whether to consolidate small related hook files that could logically be one file
- Query key factory internal organization
- mutationOptions() file organization (co-locate vs separate directory)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOD-02 | Expand `useSuspenseQuery` usage to components inside Suspense boundaries beyond current 5 dashboard calls | 17 existing Suspense boundaries mapped; conversion pattern from use-dashboard-hooks.ts verified; data type narrowing documented |
| MOD-04 | Migrate all react-hook-form usage (17 files) to TanStack Form and remove react-hook-form dependency | Investigation confirms migration is ALREADY COMPLETE -- zero `from 'react-hook-form'` imports exist. Only package.json dependency removal needed |
| MOD-05 | Add mutationOptions() factories for all mutation hooks, mirroring queryOptions() pattern | `mutationOptions()` verified available in @tanstack/react-query 5.90.21; 98 mutation call sites across 34 files mapped; existing mutation-keys.ts provides key foundation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.90.21 | Server state management | Already installed; provides queryOptions(), mutationOptions(), useSuspenseQuery |
| @tanstack/react-form | 1.28.3 | Form state management | Already the sole form library in use (react-hook-form has zero imports) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | (installed) | Toast notifications | Mutation success/error feedback in onSuccess/onError callbacks |
| nuqs | (installed) | URL state management | Used by use-data-table.ts for pagination/sort state |

### Already Dead (Remove)
| Library | Version | Reason |
|---------|---------|--------|
| react-hook-form | 7.71.2 | Zero imports in src/. Migration completed in prior work. Remove from package.json |

**Installation:**
```bash
pnpm remove react-hook-form
# No new packages needed -- all required libraries already installed
```

## Architecture Patterns

### Current Hook Organization
```
src/hooks/
  api/
    query-keys/               # 13 queryOptions() factory files + 1 test + 1 mapper
    __tests__/                 # 11 hook test files
    mutation-keys.ts           # Centralized mutation key constants (225 lines)
    use-*.ts                   # 50+ hook files (queries + mutations)
  use-*.ts                     # 17 utility hooks (data-table, toast, media-query, etc.)
```

### Pattern 1: mutationOptions() Factory
**What:** Centralized mutation configuration mirroring queryOptions() pattern
**When to use:** Every mutation hook that currently inlines its config in useMutation()
**Recommendation:** Co-locate in existing query-key files, not a separate directory. This keeps domain logic together and avoids a new import path.

```typescript
// In src/hooks/api/query-keys/property-keys.ts (or new property-mutation-options.ts)
import { mutationOptions } from '@tanstack/react-query'
import { mutationKeys } from '../mutation-keys'

export const propertyMutations = {
  create: () => mutationOptions({
    mutationKey: mutationKeys.properties.create,
    mutationFn: async (data: PropertyCreate): Promise<Property> => {
      const supabase = createClient()
      const user = await getCachedUser()
      const ownerId = requireOwnerUserId(user?.id)
      const { data: created, error } = await supabase
        .from('properties')
        .insert({ ...data, owner_user_id: ownerId })
        .select()
        .single()
      if (error) handlePostgrestError(error, 'properties')
      return created as Property
    }
  }),
  // ... more mutations
}

// In the hook file:
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...propertyMutations.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
      toast.success('Property created successfully')
    },
    onError: (err) => handleMutationError(err, 'Create property'),
  })
}
```

**Key insight:** `mutationOptions()` is an identity function for type inference (like `queryOptions()`). It does NOT include onSuccess/onError/onSettled -- those stay in the hook because they need `useQueryClient()` for cache invalidation.

### Pattern 2: useSuspenseQuery Conversion
**What:** Replace useQuery with useSuspenseQuery for components inside Suspense boundaries
**When to use:** Any component rendered as a child of `<Suspense>` or `<DeferredSection>`
**Impact:** Data type changes from `TData | undefined` to `TData` (never undefined)

```typescript
// BEFORE: useQuery inside Suspense boundary
function PropertyInsightsSection() {
  const { data, isLoading } = useQuery(propertyQueries.insights())
  if (isLoading) return <Skeleton />  // redundant -- Suspense handles this
  if (!data) return null              // redundant -- Suspense handles this
  return <Insights data={data} />     // data is TData | undefined
}

// AFTER: useSuspenseQuery
function PropertyInsightsSection() {
  const { data } = useSuspenseQuery(propertyQueries.insights())
  return <Insights data={data} />     // data is TData (never undefined)
}
```

**Important constraints:**
- `useSuspenseQuery` does NOT support `enabled` option (query always executes)
- `useSuspenseQuery` does NOT support `placeholderData`
- Components using `skipToken` or conditional `enabled` cannot convert
- The Suspense boundary MUST exist in an ancestor component

### Pattern 3: File Splitting Strategy
**What:** Split oversized files at logical domain boundaries
**Threshold:** 300 lines per file (project rule)

| File | Lines | Split Strategy |
|------|-------|----------------|
| report-keys.ts | 503 | Split: core CRUD queries vs analytics/report-type queries |
| property-keys.ts | 450 | Split: list/detail queries vs stats/performance/insights queries |
| tenant-keys.ts | 400 | Split: tenant CRUD queries vs invitation queries |
| financial-keys.ts | 389 | Split: overview/statements vs tax document queries |
| use-data-table.ts | 316 | Minor refactor: extract parser config constants or type definitions |
| lease-keys.ts | 316 | Minor refactor: inline type cleanup to bring under 300 |
| use-tenant-mutations.ts | 312 | Minor refactor: tighten code, remove extra whitespace/comments |

### Anti-Patterns to Avoid
- **Splitting mutationOptions from their query-key file:** Keep domain logic together. Don't create a parallel `mutation-keys/` directory tree mirroring `query-keys/`.
- **Moving invalidation logic into mutationOptions:** Cache invalidation requires `useQueryClient()` which is a hook -- it cannot be called from a factory function. Keep `onSuccess`/`onError`/`onSettled` in the hook wrapper.
- **Converting components outside Suspense to useSuspenseQuery:** This will crash. Only convert components that are already rendered inside `<Suspense>` boundaries.
- **Merging owner and tenant domain hooks:** These are intentionally separate for RLS context isolation. Don't consolidate `use-maintenance.ts` (owner) with `use-tenant-maintenance.ts` (tenant).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mutation type inference | Manual generic params on useMutation | `mutationOptions()` from @tanstack/react-query | Identity function providing full type inference -- same pattern as queryOptions() |
| Suspense loading states | Manual isLoading checks inside Suspense children | `useSuspenseQuery` | Eliminates undefined data handling; Suspense boundary handles loading |
| Mutation key management | Ad-hoc string arrays | Existing `mutation-keys.ts` | Already centralized with 225 lines of well-structured keys |

**Key insight:** `mutationOptions()` was added to @tanstack/react-query specifically to mirror `queryOptions()`. It is a simple identity function that infers types. Do not write a custom wrapper.

## Common Pitfalls

### Pitfall 1: Breaking ownerDashboardKeys Invalidation Graph
**What goes wrong:** Restructuring mutation hooks drops or changes invalidation calls, causing stale dashboard data
**Why it happens:** 22 invalidation sites across 13 files all reference `ownerDashboardKeys.all` -- easy to miss one during refactoring
**How to avoid:** Before and after each mutation hook change, grep for `ownerDashboardKeys` and verify the count is unchanged
**Warning signs:** Dashboard stats not updating after property/tenant/lease/maintenance mutations
**Verification command:** `grep -r "ownerDashboardKeys" src/ | wc -l` (must remain >= 22)

### Pitfall 2: useSuspenseQuery with Conditional Queries
**What goes wrong:** Converting a query that uses `enabled: someCondition` to useSuspenseQuery crashes because useSuspenseQuery always executes
**Why it happens:** useSuspenseQuery does not support the `enabled` option
**How to avoid:** Audit each conversion target for `enabled`, `skipToken`, or conditional logic. If present, either lift the condition to the parent (render conditionally) or keep as useQuery.
**Warning signs:** Component using `enabled: !!id` or `skipToken` pattern

### Pitfall 3: Circular Dependencies When Co-locating Mutation Options
**What goes wrong:** Adding mutation options to query-key files that import from other query-key files creates circular deps
**Why it happens:** Mutation invalidation logic often references keys from other domains (e.g., property mutations invalidate tenant lists)
**How to avoid:** mutationOptions() factories only contain mutationKey + mutationFn. Invalidation logic stays in the hook file. The factory files never import from each other for invalidation purposes -- only for shared types or fetchers.
**Warning signs:** TypeScript error "Cannot access X before initialization" or module resolution loops

### Pitfall 4: Test Files Breaking After Hook Restructuring
**What goes wrong:** Existing 11 hook test files import specific functions/types from hook files. Splitting or moving exports breaks imports.
**Why it happens:** Tests import internal implementation details that change during refactoring
**How to avoid:** Update test imports as part of each split task. Run `pnpm test:unit -- --run src/hooks/api/__tests__/` after each change.
**Warning signs:** Import errors in test files after splitting

### Pitfall 5: Removing react-hook-form Breaks Transitive Dependencies
**What goes wrong:** Some component types or test utilities might transitively depend on react-hook-form types
**Why it happens:** Type definitions can reference react-hook-form even without runtime imports
**How to avoid:** After `pnpm remove react-hook-form`, run `pnpm typecheck` to catch any type-level breakage
**Warning signs:** TypeScript errors mentioning react-hook-form types after removal

## Code Examples

### mutationOptions() Factory (verified from installed @tanstack/react-query 5.90.21)
```typescript
// Source: node_modules/@tanstack/react-query/build/modern/mutationOptions.d.ts
// Two overloads:
// 1. With mutationKey (returns WithRequired<UseMutationOptions, 'mutationKey'>)
// 2. Without mutationKey (returns Omit<UseMutationOptions, 'mutationKey'>)

import { mutationOptions } from '@tanstack/react-query'

// With key (recommended -- matches existing mutationKeys pattern)
const createProperty = mutationOptions({
  mutationKey: mutationKeys.properties.create,
  mutationFn: async (data: PropertyCreate): Promise<Property> => {
    // ... implementation
  }
})

// Usage in hook:
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
    }
  })
}
```

### useSuspenseQuery with queryOptions() (verified from use-dashboard-hooks.ts)
```typescript
// Source: src/hooks/api/use-dashboard-hooks.ts (existing pattern)
import { useSuspenseQuery } from '@tanstack/react-query'

// Stable select function OUTSIDE component (referential equality)
const selectStats = (data: OwnerDashboardData): DashboardStatsData => ({
  stats: data.stats,
  metricTrends: data.metricTrends
})

export function useDashboardStatsSuspense() {
  return useSuspenseQuery({
    ...DASHBOARD_BASE_QUERY_OPTIONS,
    select: selectStats
  })
}

// Note: data is DashboardStatsData, never undefined
// No isLoading, no error states -- Suspense + ErrorBoundary handle those
```

### Converting a Suspense-wrapped Component
```typescript
// BEFORE: Redundant loading/null checks
function MaintenanceInsightsSection() {
  const { data: response, isLoading } = useQuery(maintenanceQueries.list())
  if (isLoading) return <Skeleton />
  const requests = response?.data ?? []
  return <InsightsDisplay requests={requests} />
}

// AFTER: Clean with useSuspenseQuery
function MaintenanceInsightsSection() {
  const { data: response } = useSuspenseQuery(maintenanceQueries.list())
  return <InsightsDisplay requests={response.data} />
}
```

## Codebase Inventory

### Files Over 300 Lines (must split/refactor)
| File | Lines | Category |
|------|-------|----------|
| report-keys.ts | 503 | query-keys |
| property-keys.ts | 450 | query-keys |
| tenant-keys.ts | 400 | query-keys |
| financial-keys.ts | 389 | query-keys |
| use-data-table.ts | 316 | utility hook |
| lease-keys.ts | 316 | query-keys |
| use-tenant-mutations.ts | 312 | mutation hook |

### Existing Suspense Boundaries (17 total)
| Location | Child Component | Currently Uses |
|----------|-----------------|----------------|
| dashboard/page.tsx | DashboardContent | useDashboardStats/Charts (already uses useQuery select pattern) |
| properties/page.tsx | PropertyInsightsSection | useQuery |
| leases/page.tsx | LeaseInsightsSection | useQuery |
| maintenance-view.client.tsx | MaintenanceInsightsSection | useQuery |
| inspections/[id]/page.tsx | InspectionDetailWrapper | useQuery |
| tenants/[id]/page.tsx | TenantDetailsWrapper | useQuery |
| tenants/[id]/edit/page.tsx | TenantEditForm | useQuery |
| maintenance/[id]/page.tsx | MaintenanceDetailsWrapper | useQuery |
| tenant/maintenance/request/[id]/page.tsx | TenantMaintenanceRequestDetails | useQuery |
| tenant/payments/methods/page.tsx | PaymentMethods | useQuery |
| owner/payments/methods/page.tsx | PaymentMethods | useQuery |
| login/page.tsx | LoginPageContent | useSearchParams (no data query) |
| accept-invite/page.tsx | AcceptInviteContent | useQuery |
| auth/confirm-email/page.tsx | ConfirmEmailContent | useSearchParams (no data query) |
| stripe/success/page.tsx | SuccessContent | useSearchParams (no data query) |
| stripe/cancel/page.tsx | CancelContent | useSearchParams (no data query) |
| deferred-section.tsx | Various (Activity API wrapper) | Depends on children |

**Conversion targets:** 10 boundaries with data queries. 4 boundaries use only URL params (no conversion needed). 3 boundaries need individual investigation.

### Mutation Call Sites Summary
- **34 hook files** contain 98 `useMutation({` calls
- **20 component/page files** contain 27 inline `useMutation({` calls (also candidates for mutationOptions)
- **Total:** 125 mutation definitions across 54 files

### ownerDashboardKeys Invalidation Map (HIGH RISK)
| File | Call Sites |
|------|------------|
| use-property-mutations.ts | 4 (create, markSold, update, delete) |
| use-lease-mutations.ts | 4 (delete, create, update, softDelete) |
| use-tenant-mutations.ts | 3 (create, update, delete) |
| use-maintenance.ts | 3 (create, update, statusChange) |
| use-unit.ts | 3 (create, update, delete) |
| use-vendor.ts | 3 (create, update, delete) |
| use-lease-lifecycle-mutations.ts | 2 (terminate, renew) |
| use-owner-dashboard.ts | 5 (key definitions) |
| use-dashboard-hooks.ts | 1 (key import) |
| lease-creation-wizard.tsx | 1 (inline mutation) |
| properties/page.tsx | 1 (inline mutation) |
| dashboard test | 1 (test reference) |

**Total verified references:** ~31 across 12 files

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual mutation key arrays | `mutationOptions()` factory | TanStack Query v5.32+ | Type-safe mutation configs, mirrors queryOptions() |
| useQuery inside Suspense | useSuspenseQuery | TanStack Query v5.0 | Data is never undefined, cleaner components |
| react-hook-form | @tanstack/react-form | Already migrated | Zero react-hook-form imports remain in src/ |

**Deprecated/outdated:**
- `react-hook-form` 7.71.2: Listed in package.json but zero imports in src/. Pure dead dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 (jsdom) |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test:unit -- --run src/hooks/` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD-02 | useSuspenseQuery used in Suspense-wrapped components | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/` | Existing tests cover hook behavior |
| MOD-04 | react-hook-form removed from dependencies | unit | `pnpm typecheck` (catches type breakage after removal) | N/A -- removal verification |
| MOD-05 | mutationOptions() factories exist for all mutations | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/` | Existing tests need updates |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/hooks/`
- **Per wave merge:** `pnpm test:unit && pnpm typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. The 11 hook test files in `src/hooks/api/__tests__/` will need import path updates when files are split, but no new test infrastructure is needed.

## Open Questions

1. **Inline mutations in components**
   - What we know: 27 inline `useMutation({` calls exist in 20 component/page files (outside hooks)
   - What's unclear: Should these be extracted into hook files and given mutationOptions factories, or left inline since they are component-specific?
   - Recommendation: Extract only if the mutation is reused across files. Single-use inline mutations can stay but should still reference mutationKeys for consistency.

2. **use-data-table.ts at 316 lines**
   - What we know: Only 16 lines over limit. Uses nuqs + @tanstack/react-table integration.
   - What's unclear: Whether splitting makes the code harder to understand (tightly coupled state logic).
   - Recommendation: Try to bring under 300 via minor refactoring (extract type definitions, consolidate constants) rather than a disruptive split.

3. **DeferredSection Suspense boundary**
   - What we know: `deferred-section.tsx` wraps children in Suspense + React Activity API. Used in 1 location.
   - What's unclear: Whether children of DeferredSection are conversion targets for useSuspenseQuery.
   - Recommendation: Investigate what components are passed as children. If they use useQuery, they are conversion candidates.

## Sources

### Primary (HIGH confidence)
- Installed `@tanstack/react-query` 5.90.21 -- mutationOptions.d.ts, useSuspenseQuery.d.ts verified from node_modules
- Codebase grep results -- all file counts, import analysis, and dependency checks from live codebase
- Existing `use-dashboard-hooks.ts` -- verified useSuspenseQuery pattern in production use

### Secondary (MEDIUM confidence)
- CONTEXT.md user decisions -- locked decisions on file splitting thresholds and migration scope
- CLAUDE.md project conventions -- 300-line rule, query key factory pattern, mutation invalidation requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and verified in node_modules
- Architecture: HIGH - patterns verified from existing codebase (use-dashboard-hooks.ts, mutation-keys.ts)
- Pitfalls: HIGH - invalidation graph mapped from actual grep results; useSuspenseQuery constraints verified from type definitions
- File inventory: HIGH - all line counts and import analysis from live codebase

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no dependency changes expected)
