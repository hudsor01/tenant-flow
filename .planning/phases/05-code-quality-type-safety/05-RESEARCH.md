# Phase 5: Code Quality & Type Safety - Research

**Researched:** 2026-03-05
**Domain:** TypeScript type safety, TanStack Query v5 patterns, Next.js 16 component architecture, Supabase RPC typing
**Confidence:** HIGH

## Summary

Phase 5 is a large-scope refactoring phase covering 22 CODE requirements plus DOC-01. The work breaks down into five distinct domains: (1) eliminating type escape hatches (`as unknown as`, fake table casts), (2) query key consolidation to align with TanStack Query v5 `queryOptions` pattern, (3) splitting oversized files (9 hook files, 1 tour component, 1 Edge Function, 4 page components), (4) replacing stub hooks with real RPC-backed implementations, and (5) cleanup (dead code, duplicate components, `'use client'` audit).

Current codebase scan confirms: 55+ `as unknown as` casts across ~20 files, 2 fake table casts in `use-reports.ts`, 10 eslint-disable suppressions, 64 page files with `'use client'`, 9 hook files over 300 lines (6,593 total lines), 18+ TODO(phase-57) references, and a dead `SseProvider` in the provider tree.

**Primary recommendation:** Structure work in dependency order: (1) create missing RPCs and fix column references first (foundation), (2) eliminate type assertions and consolidate query keys (type layer), (3) split oversized files (structural), (4) audit `'use client'` and cleanup dead code (polish). This prevents rework from splitting files that need rewriting anyway.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All 8 stubs in `use-reports.ts` must be replaced with real implementations backed by real Postgres RPCs
- The `from('reports' as 'properties')` fake table cast must be eliminated -- real queries against real tables/RPCs
- If RPCs don't exist yet, create them. If the data model needs adjustment, adjust it.
- Tests must mirror real production behavior, not stub returns
- Zero tolerance for stubs globally -- any discovered stubs get the same treatment
- `tour.tsx` (1,732 lines): Verify against upstream Dice UI repository. Ensure code matches official source.
- `use-tenant-portal.ts` (1,431 lines): Split into flat domain files -- `use-tenant-payments.ts`, `use-tenant-maintenance.ts`, `use-tenant-lease.ts`, etc. No "portal" in filenames.
- `use-reports.ts` (923 lines): Full rewrite with real RPCs
- `stripe-webhooks/index.ts` (809 lines): Split into handler modules by event type
- All other oversized hook files: Analyze real vs stub code, split where domain boundaries exist
- Oversized page components: Refactor to extract subcomponents
- Naming convention: flat domain names (`use-tenant-payments.ts`), not prefixed
- Query key consolidation: Deep investigation of TanStack Query v5 official documentation required before changes
- All raw string literal query keys must be replaced
- `'use client'` full audit: Read Next.js 16 official documentation before auditing
- Full audit of all `'use client'` files (not just page files)
- Push directive down to leaf components where framework guidance supports it

### Claude's Discretion
- Specific RPC function signatures for report data (determined during research/planning based on existing schema)
- Exact split boundaries within oversized files (based on domain analysis)
- Whether to consolidate query key factories into `query-keys/` folder or keep co-located (determined by TanStack research findings)
- Order of operations for the refactoring (dependencies between tasks)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CODE-01 | Remove fake table cast `from('reports' as 'properties')` | Reports hooks need real RPCs or real table queries; existing RPCs identified (get_dashboard_stats, get_property_performance_analytics, get_expense_summary, etc.) |
| CODE-02 | Replace 50+ `as unknown as` type assertions with proper Database types | Supabase generated types return `Json` for RPCs; need mapper functions with runtime validation |
| CODE-03 | All mutation `onSuccess` use canonical query key factories | 3 patterns coexist; TanStack v5 `queryOptions` pattern is the standard |
| CODE-04 | All entity mutations invalidate `ownerDashboardKeys.all` | Already done in use-lease.ts, use-properties.ts, use-vendor.ts, use-tenant.ts; need audit of remaining |
| CODE-05 | Consolidate duplicate local types with `src/shared/types/` | 30+ local type defs in hooks; check against TYPES.md before any new types |
| CODE-06 | Stub hooks implemented or UI routes disabled | 8+ stubs in use-reports.ts, 5+ in use-financials.ts; must use real RPCs |
| CODE-07 | Delete duplicate `GeneralSettings` component | `src/app/(owner)/settings/components/general-settings.tsx` is orphan; `src/components/settings/general-settings.tsx` is canonical |
| CODE-08 | `useLeaseList` select function made pure (no setQueryData) | Confirmed: line 98-99 has `queryClient.setQueryData` inside `select` -- move to `onSuccess` or `useEffect` |
| CODE-09 | `tenantPortalQueries.payments()` column references fixed | Confirmed: `amount_cents` and `paid_at` used but DB columns are `amount` and `paid_date` |
| CODE-10 | `isSuccessfulPaymentStatus` uses correct status values | Must match `pending | processing | succeeded | failed | canceled` |
| CODE-11 | Hook files split to stay under 300 lines | 9 files identified; use-tenant-portal.ts (1431), use-reports.ts (923), use-tenant.ts (838), use-lease.ts (660), use-payments.ts (586), use-financials.ts (565), use-owner-dashboard.ts (562), use-billing.ts (546), use-inspections.ts (482) |
| CODE-12 | `tour.tsx` (1732 lines) split into subcomponents | Dice UI upstream has Tour component; verify alignment with official source |
| CODE-13 | `stripe-webhooks/index.ts` (809 lines) split into handler modules | Must maintain single `Deno.serve` entry point |
| CODE-14 | Page components exceeding 300 lines refactored | dashboard/page.tsx (373), properties/page.tsx (393), tenants/page.tsx (378), reports/generate/page.tsx (400) |
| CODE-15 | 63 `'use client'` page files audited | 64 page files confirmed with `'use client'`; push down to leaf components per Next.js 16 guidance |
| CODE-16 | 8 eslint-disable exhaustive-deps suppressions resolved | All 8 in use-owner-dashboard.ts (queryClient in deps); 2 in tour.tsx (useAsRef) |
| CODE-17 | Duplicate `get_revenue_trends_optimized` RPC calls deduplicated | 3 hooks call same RPC; share via single queryOptions factory |
| CODE-18 | `owner_user_id` access in use-tenant-portal.ts:365 fixed | Line 376 uses double-cast; needs proper `.select()` with typed column |
| CODE-19 | `@radix-ui/react-icons` removed | 1 usage in bento-grid.tsx (ArrowRightIcon); replace with lucide-react |
| CODE-20 | Dead `SseProvider` removed from provider tree | In `src/components/providers.tsx`; also remove `src/providers/sse-provider.tsx`, `src/providers/sse-context.ts`, `src/providers/use-sse.ts` |
| CODE-21 | TODO(phase-57) references cleaned up | 18+ references across use-reports.ts, use-financials.ts, sse-provider.tsx, reports/generate/page.tsx, template-definition.ts |
| CODE-22 | `console.log` for unhandled webhook events replaced | Line 446 in stripe-webhooks/index.ts uses `console.log` for unhandled event type |
| DOC-01 | CLAUDE.md rewritten to reflect current codebase state | Update after phase completes |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Query | 5.90.21 | Server state management | Already in use; `queryOptions` is the v5 standard pattern |
| Next.js | 16.1.6 | Framework | Already in use; Server Components by default |
| Supabase JS | 2.97.0 | Database client | Already in use; generated types from `supabase.ts` |
| TypeScript | (project version) | Type safety | Zero `any` tolerance per CLAUDE.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Dice UI (Tour) | Latest | Tour component upstream | Verify tour.tsx alignment |
| lucide-react | (project version) | Icons | Replace `@radix-ui/react-icons` |

### Alternatives Considered
None -- this phase uses only existing stack. No new libraries needed.

## Architecture Patterns

### Recommended Query Key Pattern (TanStack Query v5)

The official TanStack Query v5 pattern uses `queryOptions()` to co-locate queryKey + queryFn. This project already uses this pattern in `query-keys/*.ts` files. The recommendation is to **consolidate into `query-keys/` folder** for all domains.

**Rationale:** 7 files already exist in `query-keys/` (dashboard-graphql, inspection, lease, maintenance, property, tenant, unit). The remaining hooks (reports, financials, billing, payments, owner-dashboard) define keys inline. Moving to `query-keys/` achieves:
- Single location for all query key factories
- Co-located `queryOptions` for reuse across hooks
- Eliminates import cycles (hooks import from query-keys, never vice versa)

**Pattern:**
```typescript
// src/hooks/api/query-keys/report-keys.ts
import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'

export const reportQueries = {
  all: ['reports'] as const,
  lists: () => [...reportQueries.all, 'list'] as const,

  list: (offset: number, limit: number) =>
    queryOptions({
      queryKey: [...reportQueries.lists(), offset, limit] as const,
      queryFn: async () => {
        const supabase = createClient()
        const user = await getCachedUser()
        if (!user) throw new Error('Not authenticated')
        // Real RPC call, not stub
        const { data, error } = await supabase.rpc('get_report_list', {
          p_user_id: user.id,
          p_offset: offset,
          p_limit: limit
        })
        if (error) handlePostgrestError(error, 'reports')
        return data
      },
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000
    }),
}
```

### Recommended File Splitting Pattern

When splitting oversized hook files:
1. Extract query key factories to `query-keys/{domain}-keys.ts`
2. Extract query hooks (read) to `use-{domain}-queries.ts`
3. Extract mutation hooks (write) to `use-{domain}-mutations.ts`
4. Keep thin re-export barrel ONLY if needed for backward compatibility (temporary)
5. Update all import paths in consumers

**For use-tenant-portal.ts specifically (1,431 lines):**
```
src/hooks/api/
  query-keys/tenant-portal-keys.ts    # query factories
  use-tenant-payments.ts              # payment queries + mutations
  use-tenant-maintenance.ts           # maintenance queries + mutations
  use-tenant-lease.ts                 # lease queries
  use-tenant-settings.ts              # notification preferences, settings
  use-tenant-autopay.ts               # autopay toggle, setup, cancel
  use-tenant-dashboard.ts             # portal dashboard composite hook
```

### Recommended RPC Return Type Pattern

Supabase generated types return `Json` for all RPCs. The proper fix for `as unknown as` is:

```typescript
// Define a mapper function with runtime shape checking
function mapDashboardStats(data: unknown): DashboardStats {
  const raw = data as Record<string, unknown>
  return {
    totalProperties: Number(raw.total_properties ?? 0),
    totalUnits: Number(raw.total_units ?? 0),
    // ... etc
  }
}

// In queryFn:
const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: userId })
if (error) handlePostgrestError(error, 'dashboard stats')
return mapDashboardStats(data)
```

### `'use client'` Audit Pattern (Next.js 16)

Per official Next.js 16 guidance:
- Components are Server Components by default
- Add `'use client'` ONLY to files that use hooks (useState, useEffect, etc.), event handlers, or browser APIs
- Push the boundary as deep into the component tree as possible
- **Page files** (`page.tsx`) should be Server Components where possible -- extract interactive parts to client child components

**Audit approach for each `'use client'` page file:**
1. Does the page itself use hooks or event handlers? If yes, extract interactive parts to client components, keep page as server component
2. Does the page only render client components? Remove `'use client'` -- it's implicit via children
3. Does the page need `generateMetadata` or `generateStaticParams`? These require Server Component

### eslint-disable Resolution Pattern (CODE-16)

The 8 suppressions in `use-owner-dashboard.ts` all suppress `@tanstack/query/exhaustive-deps` because `queryClient` is in the closure but not in the dependency array. The fix:

```typescript
// Before (suppressed):
export function useDashboardStatsSuspense() {
  const queryClient = useQueryClient()
  return useSuspenseQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ownerDashboardKeys.analytics.stats(),
    queryFn: async () => {
      const data = await ensureDashboardData(queryClient)
      return { stats: data.stats, metricTrends: data.metricTrends }
    },
  })
}

// After (no suppression needed):
// Move ensureDashboardData to not depend on queryClient parameter,
// or include queryClient reference in the queryFn without it being a dep issue.
// The actual fix: queryClient IS stable (same reference per provider),
// so the real solution is to use queryClient inside queryFn via module-level
// import of QueryClient, or restructure to use initialData/placeholderData.
```

The 2 suppressions in `tour.tsx` for `react-hooks/exhaustive-deps` with `useAsRef` are legitimate if the upstream Dice UI pattern uses them -- verify against upstream.

### Anti-Patterns to Avoid
- **Side effects in `select`:** `select` must be pure (CODE-08). Use `onSuccess` callback or dedicate a `useEffect` for cache priming.
- **Fake table casts:** `from('reports' as 'properties')` is a type lie. Always query real tables or use RPCs.
- **String literal query keys:** `['blogs']`, `['auth']` etc. must use factory functions for invalidation safety.
- **`as unknown as` for RPC returns:** Use typed mapper functions instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query key management | Custom string concatenation | `queryOptions()` factory in `query-keys/` | Type-safe, co-located, TanStack v5 standard |
| RPC return typing | `as unknown as` casts | Mapper functions with runtime checks | Type-safe at boundaries, catches schema drift |
| Tour component | Custom implementation | Dice UI Tour (upstream source) | Maintained by Dice UI community, shadcn-compatible |
| Dashboard key invalidation | Manual key strings | `ownerDashboardKeys.all` constant | Single source of truth for cache invalidation |

## Common Pitfalls

### Pitfall 1: Splitting files without updating all consumers
**What goes wrong:** Import paths break across the codebase after splitting
**Why it happens:** Hook files are imported by 10-20+ components; easy to miss one
**How to avoid:** After each file split, run `pnpm typecheck` immediately. TypeScript will catch all broken imports.
**Warning signs:** Build failures after split

### Pitfall 2: Breaking public API during hook file splits
**What goes wrong:** Components depend on specific export names and return types
**Why it happens:** Renaming or restructuring changes the contract
**How to avoid:** Keep export names identical during initial split. Rename in a separate step if needed.
**Warning signs:** Component-level type errors

### Pitfall 3: Column name mismatches in tenant portal
**What goes wrong:** Queries reference `amount_cents` and `paid_at` but DB has `amount` and `paid_date`
**Why it happens:** Original code was written against a different schema version or assumed naming
**How to avoid:** Always verify column names against `src/shared/types/supabase.ts` generated types
**Warning signs:** Runtime errors from Supabase PostgREST (column not found)

### Pitfall 4: RPC return type `Json` vs actual shape
**What goes wrong:** Supabase types all RPCs as returning `Json`, leading to `as unknown as` everywhere
**Why it happens:** Supabase type generator doesn't parse PL/pgSQL return types deeply
**How to avoid:** Create typed mapper functions at the boundary. Each RPC gets a dedicated mapper.
**Warning signs:** Any `as unknown as` after an RPC call

### Pitfall 5: Removing `'use client'` from pages that need it
**What goes wrong:** Runtime errors because hooks can't be called in Server Components
**Why it happens:** Not checking if the page itself uses hooks vs just rendering client children
**How to avoid:** Grep for `use[A-Z]` hook calls, `useState`, `useEffect`, `onClick`, etc. in the page file before removing
**Warning signs:** "hooks can only be called inside the body of a function component" error

### Pitfall 6: Circular imports after query key extraction
**What goes wrong:** Moving query keys to `query-keys/` creates circular dependencies
**Why it happens:** Mutation hooks import query keys for invalidation, and query keys import types from hooks
**How to avoid:** Types go in shared types or a separate types file. Query keys never import from hook files.
**Warning signs:** Runtime `undefined` from circular imports

## Code Examples

### Fixing `as unknown as` for RPC calls (CODE-02)
```typescript
// BEFORE (bad):
const { data } = await supabase.rpc('get_dashboard_stats', { p_user_id: userId })
const stats = data as unknown as DashboardStats

// AFTER (good):
const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: userId })
if (error) handlePostgrestError(error, 'dashboard stats')

// Typed mapper -- validates shape at boundary
const stats: DashboardStats = {
  totalProperties: Number((data as Record<string, unknown>)?.total_properties ?? 0),
  totalUnits: Number((data as Record<string, unknown>)?.total_units ?? 0),
  occupancyRate: Number((data as Record<string, unknown>)?.occupancy_rate ?? 0),
  // ... map all fields
}
```

### Fixing select side effects (CODE-08)
```typescript
// BEFORE (impure select):
return useQuery({
  ...listQuery,
  select: response => {
    response?.data?.forEach?.(lease => {
      queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease)
    })
    return response
  },
})

// AFTER (pure select + separate cache priming):
const query = useQuery(listQuery)

// Prime individual lease caches from list data
useEffect(() => {
  if (query.data?.data) {
    for (const lease of query.data.data) {
      queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease)
    }
  }
}, [query.data, queryClient])

return query
```

### Fixing tenant portal column references (CODE-09)
```typescript
// BEFORE (wrong columns):
.select('id, amount_cents, status, paid_at, due_date, created_at, lease_id')
// amount_cents does not exist -- column is 'amount' (numeric dollars)
// paid_at does not exist -- column is 'paid_date'

// AFTER (correct columns):
.select('id, amount, status, paid_date, due_date, created_at, lease_id')
// amount is dollars (numeric(10,2)) -- no division needed for display
```

### Stripe webhook handler splitting (CODE-13)
```typescript
// stripe-webhooks/index.ts -- thin router
import { handlePaymentIntentSucceeded } from './handlers/payment-intent-succeeded.ts'
import { handleInvoicePaymentFailed } from './handlers/invoice-payment-failed.ts'
// ... etc

Deno.serve(async (req: Request) => {
  // ... env validation, signature verification, idempotency check (shared)

  switch (event.type) {
    case 'payment_intent.succeeded':
      return handlePaymentIntentSucceeded(event, supabase, stripe, env)
    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event, supabase, stripe, env)
    // ... etc
    default:
      console.warn(`[WEBHOOK] Unhandled event type: ${event.type}`)
      return new Response(JSON.stringify({ received: true }), { status: 200 })
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useQuery({ queryKey: [...] })` inline | `queryOptions()` factory | TanStack Query v5 (2023) | Type-safe query sharing across hooks |
| String literal query keys | Factory functions with `as const` | TanStack Query v5 best practice | Prevents key typos, enables hierarchy invalidation |
| `as unknown as Type` for RPC returns | Typed mapper functions | TypeScript best practice | Runtime safety at type boundary |
| `'use client'` on every file | Server Components by default, push `'use client'` to leaves | Next.js 13+ (App Router) | Smaller client bundles, better SSR |

**Deprecated/outdated:**
- `@tanstack/query/exhaustive-deps` lint rule: If queryClient is used inside queryFn, the rule flags it. The stable reference makes this safe -- but the better pattern is restructuring to avoid the closure.
- `@radix-ui/react-icons`: Project uses lucide-react; radix icons is a redundant dependency.

## Open Questions

1. **Reports table existence**
   - What we know: `from('reports' as 'properties')` indicates no `reports` table exists. But `reports` and `report_runs` appear in the RLS skill's "Owner-only CRUD" list.
   - What's unclear: Does a `reports` table exist in the DB schema but not in the generated types? Or is it truly missing?
   - Recommendation: Check `supabase.ts` for `reports` table. If it exists, use it directly. If not, the report hooks should use existing RPCs (get_dashboard_stats, get_property_performance_analytics, get_expense_summary, get_billing_insights, get_occupancy_trends_optimized, get_revenue_trends_optimized, get_maintenance_analytics) which already exist and return the needed data.

2. **Tour component upstream alignment**
   - What we know: Dice UI has a Tour component. The project's `tour.tsx` uses `@floating-ui/react-dom` and `@radix-ui/react-direction`.
   - What's unclear: How closely the current code matches upstream Dice UI source. Whether to replace wholesale or just verify.
   - Recommendation: Fetch the Dice UI Tour source during planning/implementation. If substantially different, replace with upstream. If aligned, just split into subcomponents.

3. **Scope of `'use client'` removal from pages**
   - What we know: 64 page files have `'use client'`. Many use hooks directly.
   - What's unclear: How many can truly become Server Components vs how many just need subcomponent extraction.
   - Recommendation: Start with a grep audit. Pages that only render client components (no direct hook/event usage) can drop `'use client'` immediately. Pages with hooks need extraction work.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (3 projects: unit, component, integration) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm validate:quick` (types + lint + unit tests) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CODE-01 | No fake table cast in use-reports | unit | `pnpm typecheck` (type error if reports table doesn't exist) | N/A (typecheck) |
| CODE-02 | No `as unknown as` in hooks | unit | `pnpm typecheck && grep -r "as unknown as" src/hooks/api/` | N/A (grep + typecheck) |
| CODE-03 | Canonical query keys in mutations | unit | `pnpm test:unit -- --run src/hooks/api/` | Partial |
| CODE-06 | Stub hooks return real data | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-reports.test.tsx` | Wave 0 |
| CODE-08 | select function pure | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-lease.test.tsx` | Partial |
| CODE-09 | Correct column names | unit | `pnpm typecheck` (type errors for wrong columns) | N/A (typecheck) |
| CODE-11 | Files under 300 lines | smoke | `find src/hooks/api -name "*.ts" | xargs wc -l | awk '$1>300'` | N/A (script) |
| CODE-15 | `'use client'` audit | smoke | `pnpm typecheck && pnpm build` | N/A (build) |
| CODE-16 | No eslint-disable suppressions | lint | `pnpm lint` | N/A (lint) |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** `pnpm validate:quick` + `pnpm build` + zero `as unknown as` in `src/hooks/api/` + zero `eslint-disable` suppressions

### Wave 0 Gaps
- [ ] `src/hooks/api/__tests__/use-reports.test.tsx` -- needs rewrite to test real RPC calls (not stubs)
- [ ] `src/hooks/api/__tests__/use-financials.test.tsx` -- needs creation for financial hook tests
- [ ] Migration files for any new RPCs needed by report hooks

## Sources

### Primary (HIGH confidence)
- Codebase scan -- direct file reading of all affected files (confirmed line counts, pattern locations, column names)
- `src/shared/types/supabase.ts` -- generated DB types confirming all existing RPCs and their signatures
- TanStack Query v5 official docs -- [Query Options Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-options), [Query Keys Guide](https://tanstack.com/query/v5/docs/react/guides/query-keys)
- Next.js official docs -- [use client directive](https://nextjs.org/docs/app/api-reference/directives/use-client), [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

### Secondary (MEDIUM confidence)
- [Dice UI](https://www.diceui.com/) -- Tour component confirmed available in component library
- [Dice UI GitHub](https://github.com/sadmann7/diceui) -- upstream source for tour verification
- Next.js 16 guidance on `'use client'` placement -- from official docs, confirmed Server Components default

### Tertiary (LOW confidence)
- Exact scope of `'use client'` removable from 64 page files -- needs per-file analysis during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, versions confirmed from package.json
- Architecture: HIGH -- patterns verified against TanStack Query v5 docs and existing codebase conventions
- Pitfalls: HIGH -- all issues confirmed by direct codebase scanning
- Stub replacement: MEDIUM -- existing RPCs identified but exact mapper shapes need implementation-time verification
- `'use client'` audit scope: MEDIUM -- 64 pages confirmed but individual analysis needed

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable patterns, no fast-moving dependencies)
