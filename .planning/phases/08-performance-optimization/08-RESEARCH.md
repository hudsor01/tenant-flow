# Phase 8: Performance Optimization - Research

**Researched:** 2026-03-06
**Domain:** Frontend data fetching, bundle optimization, list virtualization, Edge Function parallelization
**Confidence:** HIGH

## Summary

Phase 8 addresses 24 performance requirements plus DOC-01 (CLAUDE.md update). The work falls into six distinct domains: (1) tenant portal waterfall elimination, (2) bundle code-splitting via `next/dynamic`, (3) query consolidation (maintenance stats, lease stats), (4) unbounded query hardening, (5) Edge Function parallelization, and (6) global query behavior tuning (`refetchOnWindowFocus`, `use client` audit).

The codebase is well-structured for these changes. `@tanstack/react-virtual` (3.13.19) is already installed. `next/dynamic` is already used in 2 files (pattern established). TanStack Query factories exist for all domains. Edge Functions already use `Promise.all` in 3 of 13 functions. The main risk is the tenant portal waterfall (PERF-01/02), which requires either a composite RPC or parallel `useQueries` refactor across 4 hooks that each independently resolve `tenant_id`.

**Primary recommendation:** Start with the global defaults (PERF-05, PERF-09) and bundle splitting (PERF-03, PERF-04) as they have the widest impact with lowest risk. Follow with Edge Function parallelization (low coupling), then tackle tenant portal waterfall and query consolidation RPCs (higher complexity). Save `use client` audit and CSS cleanup for last (mechanical, no breakage risk).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All 4 list views (properties, tenants, leases, maintenance) get `@tanstack/react-virtual` with fixed row heights per list type, overscan 5-10 rows, skeleton placeholders, always-on virtualization, one pattern across all lists
- Global `refetchOnWindowFocus` changed from `'always'` to `true` (only refetch if past staleTime)
- Exception: tenant payment queries (amount due, payment history) and rent_due queries keep `'always'`
- Remove the 15 redundant `refetchOnWindowFocus: false` overrides across hooks
- Dynamic import Recharts via `next/dynamic` in all statically-importing files
- Dynamic import `react-markdown` + rehype/remark on blog page
- Add `optimizePackageImports` to `next.config.ts`
- Chart loading animation: Rising bars (3-5 bars of varying height that pulse/grow upward, brand colors, gentle opacity transitions)
- Blog loading animation: Left-to-right text-reveal effect (content lines appear sequentially, horizontal typewriter feel)
- `next/image` replaces raw `<img>` in file-upload-item with standard blur placeholder (no custom animation)
- Remove stale CSS `@source` paths in `globals.css`
- Loading animations are CSS/SVG only (no JS animation libraries, zero bundle impact)
- Targeted `'use client'` audit focusing on leaf components that only receive props and render JSX
- No Supabase Realtime in this phase

### Claude's Discretion
- Exact fixed row heights per list type (determined during implementation)
- Whether minor `'use client'` refactoring cases are worth the change volume
- RPC function signatures for consolidated maintenance stats (7 queries -> 1) and lease stats (6 queries -> 1)
- Edge Function parallelization approach (which queries are truly independent)
- Tenant portal waterfall resolution strategy (composite RPC vs `useQueries` parallel)
- `tenant-invitation-validate` cache header duration

### Deferred Ideas (OUT OF SCOPE)
- Supabase Realtime subscriptions (WebSocket subscriptions for payments, maintenance, notifications) -- belongs in its own phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Tenant portal amountDue 5-step waterfall parallelized | Codebase analysis of `use-tenant-payments.ts` shows 5 sequential queries; recommend composite RPC or Promise.all strategy |
| PERF-02 | Shared tenant ID resolution -- single cached query reused across all 8 tenant portal hooks | Each of 4 hooks independently queries `tenants.select('id').eq('user_id', user.id).single()`; extract to shared queryOptions |
| PERF-03 | Recharts code-split via `next/dynamic` in all 18 statically-importing files | 18 files found importing from 'recharts'; `next/dynamic` pattern already exists in codebase |
| PERF-04 | `react-markdown` + rehype/remark dynamically imported on blog pages | Single file `src/app/blog/[slug]/page.tsx` statically imports react-markdown + 3 plugins |
| PERF-05 | `refetchOnWindowFocus` default changed from `'always'` to `true` | `query-provider.tsx` line 81 has `'always'`; 15 override sites identified for removal |
| PERF-06 | `@tanstack/react-virtual` used for property, tenant, lease, maintenance lists | Package already installed (3.13.19); list page components identified |
| PERF-07 | Maintenance stats consolidated from 7 HEAD queries to single grouped RPC | `maintenance-keys.ts` stats() runs 7 parallel `.select('id', { count: 'exact', head: true })` queries |
| PERF-08 | Lease stats consolidated from 6 queries to single RPC | `lease-keys.ts` stats() runs 6 parallel queries (5 HEAD counts + 1 data fetch) |
| PERF-09 | `optimizePackageImports` added to `next.config.ts` | `recharts` is already in Next.js default list; add others like `@tanstack/*`, `date-fns` |
| PERF-10 | `stripe-webhooks` email rendering optimized | `payment-intent-succeeded.ts` already parallelizes DB lookups and emails; investigate React email renderAsync overhead |
| PERF-11 | `stripe-webhooks` sequential charge retrieval + late_fee query parallelized | Charge retrieval (line 63) happens before receipt emails; late_fee query (line 193) is sequential |
| PERF-12 | `stripe-autopay-charge` 3 sequential DB lookups parallelized with `Promise.all()` | Steps 3, 3b, rent_due fetch are all independent of each other after validation |
| PERF-13 | `stripe-rent-checkout` sequential DB queries parallelized where independent | Steps 2-4 (tenant, rent_due, duplicate check) are partially independent |
| PERF-14 | Blog queries add pagination and column filtering (not `select('*')` unbounded) | `use-blogs.ts` has 4 queries all using `.select('*')` with no `.limit()` on list queries |
| PERF-15 | Maintenance `urgent()` and `overdue()` queries add `.limit()` | Both in `maintenance-keys.ts` have no limit -- could return unbounded results |
| PERF-16 | Tenant portal maintenance counts computed via DB (not fetch-all-then-count-in-JS) | `use-tenant-maintenance.ts` fetches all rows, then filters in JS for open/inProgress/completed counts |
| PERF-17 | `select('*')` on join queries replaced with specific column selections | `lease-keys.ts` expiring(), detail(); `property-keys.ts` detail all use `select('*')` |
| PERF-18 | Notifications query selects specific columns (not `select('*')`) | `use-notifications.ts` line 63 uses `.select('*', { count: 'exact' })` |
| PERF-19 | Duplicate `get_occupancy_trends_optimized` calls deduplicated | Called in 5 files with separate query keys; should share via analytics-keys pattern |
| PERF-20 | Expiring leases query adds `.limit()` | `lease-keys.ts` expiring() has no limit |
| PERF-21 | Raw `<img>` in file-upload-item replaced with `next/image` | `file-upload-item.tsx` line 40 uses `<img>` with biome-ignore comment |
| PERF-22 | Stale CSS `@source` paths in `globals.css` removed | Lines 4-5 reference `../../../apps*.{ts,tsx}` and `../../../components*.{ts,tsx}` (stale monorepo paths) |
| PERF-23 | Edge Function `tenant-invitation-validate` response gets short cache headers | Currently returns no cache headers; validation responses are stable for the invitation lifetime |
| PERF-24 | 408 `'use client'` files audited -- remove directive from non-interactive leaf components | 408 files with `'use client'` found; Phase 5 already removed 91 -- this is a targeted second pass |
| DOC-01 | CLAUDE.md rewritten to reflect current codebase state after phase completes | Recurring requirement; update after all performance changes |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-virtual` | 3.13.19 | List virtualization | Already installed; fixed-height virtualizer for all 4 list views |
| `@tanstack/react-query` | 5.90.21 | Server state management | Already core; `queryOptions()` factories for all consolidated RPCs |
| `next/dynamic` | (Next.js 16.1.6) | Code splitting | Built-in lazy loading with SSR control; already used in 2 files |
| `next/image` | (Next.js 16.1.6) | Image optimization | Built-in; replaces raw `<img>` in file-upload-item |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 3.7.0 | Charts | Already installed; dynamically imported behind `next/dynamic` |
| react-markdown | 10.1.0 | Markdown rendering | Already installed; dynamically imported on blog page only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-virtual` | `react-window` / `react-virtuoso` | react-virtual already installed, same team as react-query, smallest bundle |
| Composite RPC for tenant waterfall | `useQueries` parallel | RPC is single round-trip; useQueries is N round-trips but no migration needed |
| New RPC for maintenance stats | Keep 7 HEAD queries | HEAD queries are already parallel but 7 HTTP round-trips vs 1 RPC call |

**No new packages needed.** All required libraries are already in `package.json`.

## Architecture Patterns

### Recommended Execution Order
```
Wave 1: Global defaults + bundle splitting (PERF-05, PERF-09, PERF-03, PERF-04, PERF-22)
Wave 2: Edge Function parallelization (PERF-10, PERF-11, PERF-12, PERF-13, PERF-23)
Wave 3: Query hardening -- unbounded queries, select('*'), dedup (PERF-14-20)
Wave 4: Tenant portal waterfall + shared tenant ID (PERF-01, PERF-02, PERF-16)
Wave 5: RPC consolidation -- maintenance stats + lease stats (PERF-07, PERF-08)
Wave 6: Virtualization (PERF-06)
Wave 7: use client audit + cleanup + CLAUDE.md (PERF-21, PERF-24, DOC-01)
```

### Pattern 1: Dynamic Import with Custom Loading Animation
**What:** Wrap chart components in `next/dynamic` with brand-specific loading states
**When to use:** All 18 Recharts-importing files and the blog markdown page

```typescript
// Chart dynamic import with rising bars loading animation
import dynamic from 'next/dynamic'

const RevenueChart = dynamic(
  () => import('#components/dashboard/components/revenue-overview-chart'),
  {
    ssr: false,
    loading: () => <ChartLoadingSkeleton />
  }
)

// ChartLoadingSkeleton: CSS-only rising bars animation
// BlogLoadingSkeleton: CSS-only text-reveal animation
// Both are zero-bundle-impact (no JS animation libraries)
```

### Pattern 2: Shared Tenant ID Resolution
**What:** Extract tenant ID lookup into a shared `queryOptions()` that all tenant portal hooks depend on
**When to use:** PERF-02 -- 4 hooks each independently query `tenants.select('id').eq('user_id', user.id).single()`

```typescript
// In use-tenant-portal-keys.ts or new shared file
export const tenantIdQuery = () => queryOptions({
  queryKey: [...tenantPortalKeys.all, 'tenant-id'],
  queryFn: async () => {
    const supabase = createClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Not authenticated')
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user.id)
      .single()
    return data?.id ?? null
  },
  staleTime: 10 * 60 * 1000, // tenant_id never changes within session
  gcTime: 30 * 60 * 1000,
})

// Hooks consume via useQuery + enabled pattern:
const { data: tenantId } = useQuery(tenantIdQuery())
const payments = useQuery({
  ...tenantPaymentQueries.payments(),
  enabled: !!tenantId,
})
```

### Pattern 3: Fixed-Height Virtualization Wrapper
**What:** Consistent virtualization component used across all 4 list views
**When to use:** PERF-06 -- properties, tenants, leases, maintenance lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

function VirtualizedList<T>({
  items,
  rowHeight,
  overscan = 5,
  renderItem,
}: {
  items: T[]
  rowHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index]!, virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Pattern 4: Edge Function Query Parallelization
**What:** Group independent DB queries into `Promise.all()` blocks
**When to use:** PERF-12, PERF-13 -- sequential lookups where results are independent

```typescript
// Before (sequential):
const { data: existingPayment } = await supabase.from('rent_payments')...
const { data: leaseTenant } = await supabase.from('lease_tenants')...
const { data: rentDue } = await supabase.from('rent_due')...

// After (parallel where independent):
const [existingPaymentResult, leaseTenantsResult, rentDueResult] = await Promise.all([
  supabase.from('rent_payments').select('id')...
  supabase.from('lease_tenants').select('responsibility_percentage')...
  supabase.from('rent_due').select('amount, due_date, autopay_attempts')...
])
```

### Pattern 5: RPC Consolidation for Stats
**What:** Replace N HEAD queries with a single RPC that returns grouped counts
**When to use:** PERF-07 (maintenance 7 queries -> 1 RPC), PERF-08 (lease 6 queries -> 1 RPC)

```sql
-- Example: get_maintenance_stats(p_user_id uuid)
-- Returns JSON with counts per status in a single query
CREATE OR REPLACE FUNCTION get_maintenance_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'open', count(*) FILTER (WHERE status = 'open'),
      'assigned', count(*) FILTER (WHERE status = 'assigned'),
      'in_progress', count(*) FILTER (WHERE status = 'in_progress'),
      'needs_reassignment', count(*) FILTER (WHERE status = 'needs_reassignment'),
      'completed', count(*) FILTER (WHERE status = 'completed'),
      'cancelled', count(*) FILTER (WHERE status = 'cancelled'),
      'on_hold', count(*) FILTER (WHERE status = 'on_hold'),
      'total', count(*)
    )
    FROM maintenance_requests
    WHERE owner_user_id = p_user_id
  );
END;
$$;
```

### Anti-Patterns to Avoid
- **Don't dynamically import components that are below the fold AND small:** Only worth it for heavy libraries (Recharts ~200KB, react-markdown ~80KB)
- **Don't create a "universal loader":** Each loading animation should be specific to its content type (chart bars for charts, text lines for blog)
- **Don't parallelize dependent queries:** If query B needs the result of query A, they must stay sequential
- **Don't remove `refetchOnWindowFocus: false` from auth-provider:** Auth state should not refetch on every tab switch
- **Don't use `ssr: false` on server components:** `next/dynamic` with `ssr: false` only works in client components

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| List virtualization | Custom scroll handler with IntersectionObserver | `@tanstack/react-virtual` (already installed) | Handles edge cases: resize observers, scroll restoration, overscan, dynamic measurement |
| Code splitting | Manual `React.lazy()` + `Suspense` | `next/dynamic` | Integrates with Next.js SSR, provides loading prop, handles SSR disable |
| Image optimization | Custom lazy loading with `loading="lazy"` | `next/image` | Automatic srcset, blur placeholder, WebP conversion, CDN caching |
| Query deduplication | Custom cache for shared tenant ID | TanStack Query `queryOptions()` with `staleTime` | Built-in dedup, cache invalidation, refetch coordination |

## Common Pitfalls

### Pitfall 1: Dynamic Import Breaks Chart Props Types
**What goes wrong:** When wrapping a component in `next/dynamic`, TypeScript may lose the component's prop types
**Why it happens:** `dynamic(() => import(...))` returns `ComponentType<{}>` by default
**How to avoid:** Use the generic parameter: `dynamic<ChartProps>(() => import(...))`
**Warning signs:** Props not type-checked, TypeScript any warnings

### Pitfall 2: Virtualizer Scroll Container Missing Height
**What goes wrong:** Virtual list renders nothing or renders all items
**Why it happens:** The scroll container (parentRef) needs an explicit height constraint
**How to avoid:** Always set `h-[calc(100vh-XXpx)]` or similar fixed height on the scroll container
**Warning signs:** `getTotalSize()` returns 0, all items render simultaneously

### Pitfall 3: refetchOnWindowFocus Removal Breaks Payment Data
**What goes wrong:** Tenant sees stale payment data after returning to tab
**Why it happens:** Removing `refetchOnWindowFocus: false` from tenant payment hooks without setting `'always'`
**How to avoid:** Keep `refetchOnWindowFocus: 'always'` specifically on `tenantPaymentQueries.amountDue()` and `tenantPaymentQueries.payments()` per user decision
**Warning signs:** Amount due displays stale data after tab switch

### Pitfall 4: Edge Function Promise.all Fails Fast
**What goes wrong:** One failed query in `Promise.all` causes all results to be lost
**Why it happens:** `Promise.all` rejects on first failure
**How to avoid:** Use `Promise.allSettled` when queries can independently succeed/fail, or keep `Promise.all` when any single failure should abort the operation
**Warning signs:** Intermittent 500 errors on Edge Functions after parallelization

### Pitfall 5: RPC Migration Needed for Stats Consolidation
**What goes wrong:** New RPC function not deployed, frontend breaks
**Why it happens:** PERF-07 and PERF-08 require new SQL migration files AND frontend changes in the same plan
**How to avoid:** Write migration first, test RPC independently, then update frontend query
**Warning signs:** `rpc is not a function` errors, missing function in Supabase

### Pitfall 6: `<img>` in file-upload-item Uses Object URLs
**What goes wrong:** `next/image` cannot optimize blob: or data: URLs from `URL.createObjectURL()`
**Why it happens:** file-upload-item creates preview URLs for user-uploaded files before they're on a server
**How to avoid:** The biome-ignore comment on line 39 explains this. Keep `<img>` for the dynamic file preview (blob URLs). PERF-21 may only apply to the static/remote image path, not the createObjectURL path
**Warning signs:** next/image error about unrecognized protocol

### Pitfall 7: Stale CSS @source Paths Break Tailwind Scanning
**What goes wrong:** After removing stale paths, some Tailwind classes stop working
**Why it happens:** The stale paths might overlap with valid paths
**How to avoid:** Verify that the remaining `@source "..*.{ts,tsx}"` covers all component files in the flattened project structure
**Warning signs:** Missing styles after CSS cleanup

## Code Examples

### Dynamic Import for Recharts (PERF-03)
```typescript
// Before:
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// After:
import dynamic from 'next/dynamic'

const RevenueChart = dynamic(
  () => import('./revenue-overview-chart'),
  {
    ssr: false,
    loading: () => <ChartRisingBarsLoader />
  }
)
```

### refetchOnWindowFocus Global Change (PERF-05)
```typescript
// src/providers/query-provider.tsx
// Change line 81:
refetchOnWindowFocus: true,  // was: 'always'

// Payment hooks keep explicit override:
// src/hooks/api/use-tenant-payments.ts
refetchOnWindowFocus: 'always',  // exception: payment data is time-sensitive
```

### Blog Dynamic Import (PERF-04)
```typescript
// src/app/blog/[slug]/page.tsx
import dynamic from 'next/dynamic'

const MarkdownContent = dynamic(
  () => import('./markdown-content'),  // extract to separate component
  {
    ssr: false,
    loading: () => <BlogTextRevealLoader />
  }
)
```

### Edge Function Parallelization (PERF-12)
```typescript
// stripe-autopay-charge: Steps 3, 3b, and rent_due fetch are independent
const [existingPaymentResult, leaseTenantsResult, rentDueResult] = await Promise.all([
  supabase.from('rent_payments').select('id')
    .eq('rent_due_id', rent_due_id).eq('tenant_id', tenant_id)
    .in('status', ['succeeded', 'processing']).maybeSingle(),
  supabase.from('lease_tenants').select('responsibility_percentage')
    .eq('lease_id', lease_id).eq('tenant_id', tenant_id).maybeSingle(),
  supabase.from('rent_due').select('amount, due_date, autopay_attempts')
    .eq('id', rent_due_id).single(),
])
```

### Cache Headers for tenant-invitation-validate (PERF-23)
```typescript
// Add Cache-Control to successful validation responses
return new Response(
  JSON.stringify({ valid: true, email: invitation.email, ... }),
  {
    status: 200,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300',  // 5 minutes -- invitation data is stable
    }
  }
)
```

### Unbounded Query Fix (PERF-14, PERF-15, PERF-20)
```typescript
// Before (unbounded):
.select('*')
.eq('status', 'published')
.order('published_at', { ascending: false })

// After (bounded with pagination):
.select('id, title, slug, excerpt, published_at, category, reading_time, cover_image_url')
.eq('status', 'published')
.order('published_at', { ascending: false })
.limit(20)  // or use pagination range
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `refetchOnWindowFocus: 'always'` | `refetchOnWindowFocus: true` | TanStack Query v5 best practice | Prevents redundant refetches within staleTime window |
| Static Recharts imports | `next/dynamic` code splitting | Next.js 13+ (stable) | Chart JS excluded from initial bundle on non-chart pages |
| 7 HEAD queries for maintenance stats | Single RPC with FILTER aggregates | PostgreSQL 9.4+ FILTER clause | 7 HTTP round-trips reduced to 1 |
| `select('*')` for list queries | Explicit column selection | Always been best practice | Less data transfer, no accidental sensitive field exposure |
| Independent tenant ID resolution in each hook | Shared cached queryOptions | TanStack Query v5 | 8x redundant DB queries eliminated |

**Important note on optimizePackageImports:** `recharts` and `lucide-react` are ALREADY in the Next.js default optimized list. Adding `optimizePackageImports` in `next.config.ts` is only needed for additional packages not on the default list. The main bundle benefit comes from `next/dynamic` code splitting (PERF-03), not `optimizePackageImports`.

## Detailed Codebase Analysis

### Tenant Portal Waterfall (PERF-01, PERF-02)

**Current flow in `use-tenant-payments.ts` amountDue():**
1. `getCachedUser()` -- get auth user
2. `tenants.select('id').eq('user_id', user.id).single()` -- resolve tenant ID
3. `leases.select(...).eq('lease_tenants.tenant_id', tenantRecord.id)` -- get active lease
4. `stripe_connected_accounts.select('charges_enabled')` -- check if owner can charge
5. `rent_due.select(...)` -- get next rent due
6. `rent_payments.select('id')` -- check if already paid

Steps 2-6 are sequential. Steps 4 and 5 could run in parallel once step 3 completes.

**Recommendation (Claude's discretion):** Use `useQueries` parallel pattern rather than a composite RPC. Rationale:
- No SQL migration required
- Steps 2 is shared (PERF-02), step 3 depends on 2, steps 4+5 can parallel after 3, step 6 depends on 5
- This gives 3 "rounds" instead of 5, plus tenant ID caching eliminates round 1 on subsequent calls

### Redundant Tenant ID Resolution (PERF-02)

**Files that independently resolve tenant ID:**
1. `use-tenant-payments.ts` -- amountDue() and payments()
2. `use-tenant-lease.ts` -- dashboard(), lease(), documents()
3. `use-tenant-maintenance.ts` -- maintenance()
4. `use-tenant-autopay.ts` -- autopay()

Each does: `supabase.from('tenants').select('id').eq('user_id', user.id).single()`

**Solution:** Shared `tenantIdQuery()` queryOptions with long staleTime (tenant ID is immutable). All hooks consume via `useQuery` + `enabled` pattern.

### Recharts Import Sites (PERF-03)

18 files import from `recharts`:
1. `src/components/dashboard/chart-area-interactive.tsx`
2. `src/app/(owner)/analytics/property-performance/property-charts.tsx`
3. `src/app/(owner)/analytics/occupancy/occupancy-charts.tsx`
4. `src/app/(owner)/analytics/maintenance/maintenance-charts.tsx`
5. `src/app/(owner)/analytics/leases/lease-charts.tsx`
6. `src/app/(owner)/analytics/financial/financial-charts.tsx`
7. `src/components/analytics/property-charts.tsx`
8. `src/components/analytics/maintenance-charts.tsx`
9. `src/components/analytics/lease-charts.tsx`
10. `src/components/ui/chart.tsx`
11. `src/components/reports/sections/financial-report-section.tsx`
12. `src/components/reports/sections/maintenance-report-section.tsx`
13. `src/components/reports/sections/property-report-section.tsx`
14. `src/components/reports/sections/tenant-report-section.tsx`
15. `src/components/dashboard/components/revenue-overview-chart.tsx`
16. `src/app/(owner)/reports/analytics/analytics-occupancy-chart.tsx`
17. `src/app/(owner)/reports/analytics/analytics-payment-methods-chart.tsx`
18. `src/app/(owner)/reports/analytics/analytics-revenue-chart.tsx`

**Strategy:** Wrap the import point at the CONSUMER level (the parent that renders the chart component), not inside chart.tsx (which is a shared utility). The `next/dynamic` wrapper goes on the component that uses chart components, with `ssr: false`.

### refetchOnWindowFocus Override Sites (PERF-05)

Files with `refetchOnWindowFocus: false` that should be REMOVED (will inherit global `true`):
1. `use-tenant-settings.ts` (line 82)
2. `use-tenant-lease.ts` (lines 102, 207, 254)
3. `use-payments.ts` (lines 156, 188)
4. `use-tenant-maintenance.ts` (line 139)
5. `use-owner-dashboard.ts` (lines 73, 100, 133, 163, 261)
6. `use-dashboard-hooks.ts` (line 189)
7. `use-tenant-autopay.ts` (line 113)
8. `dashboard-graphql-keys.ts` (line 162)

Files with `refetchOnWindowFocus: true` that should KEEP `'always'` (payment exception):
1. `use-tenant-payments.ts` (lines 194, 248) -- change to `'always'`

Files with `refetchOnWindowFocus: false` that should KEEP (auth provider):
1. `auth-provider.tsx` (line 89) -- auth state should not refetch on focus

### Occupancy Trends Dedup (PERF-19)

`get_occupancy_trends_optimized` is called in:
1. `use-owner-dashboard.ts` -- ownerDashboardQueries.tenants.occupancyTrends()
2. `use-analytics.ts` -- analyticsQueries.leasePageData() (line 66)
3. `use-analytics.ts` -- analyticsQueries.maintenancePageData() (line 107 -- uses different RPC but similar pattern)
4. `use-analytics.ts` -- analyticsQueries.occupancyPageData() (line 151)
5. `query-keys/report-keys.ts` (line 215, 352)
6. `query-keys/property-keys.ts` (line 378)

These use DIFFERENT query keys, so TanStack Query doesn't deduplicate them. Need to create a shared `occupancyTrendsQuery()` in `analytics-keys.ts` (same pattern as `revenueTrendsQuery`).

### Edge Function Parallelization Analysis

**stripe-autopay-charge (PERF-12):**
- Step 3 (duplicate check): independent
- Step 3b (lease_tenants): independent
- rent_due fetch: independent
- All three can run in `Promise.all` after body validation
- Step 4 (connected account): depends on owner_user_id from body (already available)
- Step 6 (unit -> property_id): depends on unit_id from body (already available)
- Steps 3, 3b, rent_due, connected account, and unit can ALL run in parallel

**stripe-rent-checkout (PERF-13):**
- Step 2 (tenant): independent after auth
- Step 3 (rent_due): independent after auth
- These two can run in parallel
- Step 4 (duplicate check): depends on rent_due_id (from body, already available)
- Step 5 (lease): depends on rent_due.lease_id (must wait for step 3)
- Step 6 (connected account): depends on lease.owner_user_id (must wait for step 5)
- Step 9 (unit): depends on lease.unit_id (must wait for step 5)
- Optimal: parallel [tenant, rent_due, duplicate_check], then sequential [lease -> parallel [connected_account, unit]]

**stripe-webhooks payment-intent-succeeded (PERF-10, PERF-11):**
- Already well-parallelized! Lines 131-138 use `Promise.all` for 4 DB lookups
- Lines 155-159 use `Promise.all` for 4 more lookups
- The charge retrieval + late_fee query (lines 63, 193) are sequential but in different phases
- Charge retrieval for fee calculation (line 63) happens before the RPC call -- could be parallelized with it IF we restructure
- Late fee query (line 193) happens after email data is gathered -- harder to parallelize
- **Main opportunity:** The charge retrieval on line 63 and the late_fee query on line 193 could be grouped better, but the existing code already parallelizes the biggest bottleneck (4 DB lookups). The improvement here is marginal.

### File Upload Image (PERF-21)

`file-upload-item.tsx` line 39-40:
```tsx
// biome-ignore lint/performance/noImgElement: dynamic file URLs from user uploads don't work well with Next.js Image optimization
<img src={url} alt={file.name} className="size-full object-cover" />
```

The `<img>` is used with `URL.createObjectURL(file)` which produces `blob:` URLs. `next/image` does NOT support blob URLs. The biome-ignore comment is correct and intentional. **This requirement may need to be marked as N/A or reinterpreted** -- the only `<img>` tag uses blob URLs that cannot be optimized by `next/image`. If the requirement means "for remote/stored images", there are no raw `<img>` tags for those.

### CSS @source Paths (PERF-22)

`globals.css` lines 4-6:
```css
@source "../../../apps*.{ts,tsx}";
@source "../../../components*.{ts,tsx}";
@source "..*.{ts,tsx}";
```

Lines 4-5 are stale monorepo paths (`../../../apps*`, `../../../components*`). These reference the old `apps/frontend/` structure from before the 2026-03-03 flattening. Line 6 (`..*.{ts,tsx}`) is the correct catch-all for the current flat structure. Remove lines 4-5.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit + component) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm validate:quick` (types + lint + unit) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Tenant portal amountDue parallelized | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant-payments.test.ts` | Likely needs creation |
| PERF-02 | Shared tenant ID resolution | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant-portal-keys.test.ts` | Needs creation |
| PERF-03 | Recharts dynamically imported | manual-only | Verify with `next build` + bundle analysis | N/A |
| PERF-04 | react-markdown dynamically imported | manual-only | Verify with `next build` + bundle analysis | N/A |
| PERF-05 | refetchOnWindowFocus changed to true | unit | Check query-provider defaults in test | Existing provider tests may cover |
| PERF-06 | Virtualization on 4 list views | component | `pnpm test:component` | Needs creation |
| PERF-07 | Maintenance stats RPC | integration | `pnpm test:rls` (verify RPC exists) | RLS test if applicable |
| PERF-08 | Lease stats RPC | integration | `pnpm test:rls` | RLS test if applicable |
| PERF-09 | optimizePackageImports added | manual-only | `pnpm typecheck` | N/A |
| PERF-10 | Webhook email optimization | unit | `pnpm test:unit -- --run` (if test exists) | May exist |
| PERF-11-13 | Edge Function parallelization | manual-only | Edge Function deploy + test | N/A |
| PERF-14-20 | Query hardening | unit | Existing hook tests verify query shape | Partial coverage |
| PERF-21 | next/image for file-upload | manual-only | Visual verification | N/A |
| PERF-22 | CSS cleanup | manual-only | `pnpm dev` + verify styles | N/A |
| PERF-23 | Cache headers on invitation validate | manual-only | curl test | N/A |
| PERF-24 | use client audit | manual-only | `pnpm typecheck && pnpm lint` | N/A |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** `pnpm validate:quick` + `pnpm test:rls` (if new RPCs added)

### Wave 0 Gaps
- [ ] Migration files for `get_maintenance_stats()` and `get_lease_stats()` RPCs -- needed before PERF-07/08 frontend work
- [ ] Verify `pnpm typecheck` passes with current codebase before starting phase

## Open Questions

1. **PERF-21: `<img>` in file-upload-item**
   - What we know: The only `<img>` tag uses `URL.createObjectURL()` blob URLs which `next/image` cannot optimize
   - What's unclear: Whether the requirement means something beyond this single usage
   - Recommendation: Mark as N/A with explanation, or apply `next/image` only if there's a remote image path (there isn't)

2. **PERF-10: Webhook email rendering optimization**
   - What we know: `payment-intent-succeeded.ts` already parallelizes most DB lookups and uses `Promise.allSettled` for emails
   - What's unclear: What further optimization is expected -- pre-built HTML templates would eliminate `renderAsync` but lose React email composability
   - Recommendation: The charge retrieval (line 63) can be parallelized with the RPC call. Beyond that, the code is already well-optimized. Focus on the second charge retrieval (line 172 -- duplicate call to same charge) which could be avoided by passing the first result.

3. **PERF-19: Occupancy trends dedup scope**
   - What we know: 5+ call sites with different query keys
   - What's unclear: Whether all call sites can share the same cached result (they may pass different params)
   - Recommendation: Create shared `occupancyTrendsQuery(months)` in analytics-keys.ts, parameterized by months. Same-month calls will dedup.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct reading of all referenced files in `src/hooks/api/`, `src/providers/`, `supabase/functions/`, `src/app/`
- [Next.js optimizePackageImports docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) -- default list includes recharts, lucide-react
- [Next.js Lazy Loading guide](https://nextjs.org/docs/app/guides/lazy-loading) -- `next/dynamic` with `ssr: false`
- [TanStack Virtual Introduction](https://tanstack.com/virtual/latest/docs/introduction) -- fixed height virtualizer API
- [TanStack Virtual Fixed Example](https://tanstack.com/virtual/latest/docs/framework/react/examples/fixed) -- reference implementation

### Secondary (MEDIUM confidence)
- [Vercel blog: How we optimized package imports](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) -- background on optimizePackageImports
- [TanStack Virtual Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer) -- useVirtualizer options

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in codebase
- Architecture patterns: HIGH -- patterns derived from existing codebase conventions
- Pitfalls: HIGH -- identified from direct code analysis of specific files
- Edge Function parallelization: HIGH -- analyzed exact dependency chains in each function
- Tenant portal waterfall: HIGH -- traced full query chain in use-tenant-payments.ts

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no fast-moving dependencies)
