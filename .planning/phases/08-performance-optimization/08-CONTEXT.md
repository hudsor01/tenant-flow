# Phase 8: Performance Optimization - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate waterfalls, oversized bundles, redundant queries, and unbounded fetches across frontend hooks and Edge Functions. No new features — only optimization of existing data fetching, rendering, and bundle composition. Page loads should be fast with no unnecessary network requests, no chart libraries on non-chart pages, and no sequential queries where parallel is possible.

</domain>

<decisions>
## Implementation Decisions

### List virtualization
- All 4 list views (properties, tenants, leases, maintenance) get `@tanstack/react-virtual`
- Fixed row heights per list type (e.g., properties with images taller than text-only tenants)
- Overscan 5-10 rows above/below viewport with skeleton placeholders for unloaded rows
- Always-on virtualization — no threshold check, consistent rendering path regardless of list size
- One pattern across all lists for maintainability

### Data freshness strategy
- Global `refetchOnWindowFocus` changed from `'always'` to `true` (only refetch if past staleTime)
- Exception: tenant payment queries (amount due, payment history) and rent_due queries keep `'always'` — payment data is time-sensitive
- Global staleTime stays at 5 minutes (current value)
- Remove the 15 redundant `refetchOnWindowFocus: false` overrides across hooks — they inherit the new global `true` default
- No Supabase Realtime in this phase (deferred — see below)

### Bundle optimization & loading animations
- Dynamic import Recharts via `next/dynamic` in all 5 statically-importing files
- Dynamic import `react-markdown` + rehype/remark on blog page
- Add `optimizePackageImports` to `next.config.ts`
- **Chart loading animation:** Rising bars — 3-5 bars of varying height that pulse/grow upward, mimicking a bar chart building itself. Uses brand color palette with gentle opacity transitions. Feels intentional, not like a loading state.
- **Blog loading animation:** Left-to-right text-reveal effect — content lines appear sequentially mimicking writing flow. Horizontal typewriter feel, distinct from chart animation. Not a skeleton or spinner.
- `next/image` replaces raw `<img>` in file-upload-item with standard blur placeholder (no custom animation)
- Remove stale CSS `@source` paths in `globals.css`

### 'use client' audit
- Targeted pass focusing on leaf components that only receive props and render JSX (no hooks, no event handlers, no browser APIs)
- Count before/after directives for phase summary metric
- Claude's discretion on whether to refactor minor cases (extracting one onClick to a child component) vs flagging with TODO

### Claude's Discretion
- Exact fixed row heights per list type (determined during implementation based on actual content)
- Whether minor 'use client' refactoring cases are worth the change volume
- RPC function signatures for consolidated maintenance stats (7 queries -> 1) and lease stats (6 queries -> 1)
- Edge Function parallelization approach (which queries are truly independent)
- Tenant portal waterfall resolution strategy (composite RPC vs `useQueries` parallel)
- `tenant-invitation-validate` cache header duration

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/api/query-keys/` — 10 factory files with `queryOptions()` pattern — extend for new consolidated RPCs
- `src/hooks/api/query-keys/report-keys.ts` — uses `Promise.all` for multi-RPC queries (established parallel pattern)
- `src/providers/query-provider.tsx` — global query defaults at line 70-93 (staleTime, gcTime, refetchOnWindowFocus)
- `src/hooks/api/use-tenant-dashboard.ts` — composite `useTenantPortalDashboard()` calling 4 hooks (waterfall target)
- `src/hooks/api/use-tenant-portal-keys.ts` — shared tenant portal query key factory
- `next/dynamic` already used in 2 files (units page, query-provider) — pattern exists

### Established Patterns
- TanStack Query `queryOptions()` factories for all server state
- `handlePostgrestError` for error handling in all queries
- Hook files split by domain after Phase 5 (tenant-payments, tenant-lease, tenant-maintenance, etc.)
- Edge Functions use `Promise.all` in 3 of 13 functions — extend to remaining

### Integration Points
- `src/providers/query-provider.tsx` — change global refetchOnWindowFocus default
- `next.config.ts` — add optimizePackageImports
- 5 chart component files — wrap Recharts imports with `next/dynamic`
- `src/app/blog/[slug]/page.tsx` — wrap react-markdown with dynamic import
- 4 list page components — add virtualization wrapper
- `supabase/functions/stripe-autopay-charge/index.ts` — parallelize sequential DB lookups
- `supabase/functions/stripe-rent-checkout/index.ts` — parallelize independent queries
- `supabase/functions/stripe-webhooks/` — parallelize charge retrieval + late fee query

</code_context>

<specifics>
## Specific Ideas

- Chart loading animation should feel like the chart is "building itself" — rising bars with brand colors, not a generic spinner or skeleton
- Blog loading should feel like text being written — left-to-right reveal, mimicking writing flow
- Both loading animations should feel like intentional UX, not a "waiting" state
- Loading animations are CSS/SVG only (no JS animation libraries) to keep bundle impact zero

</specifics>

<deferred>
## Deferred Ideas

- **Supabase Realtime subscriptions** — Add WebSocket subscriptions for payments, maintenance requests, and notifications. Instant updates on tab without polling. User explicitly wants this as a broader feature (not just payments). Belongs in its own phase with reconnection handling, cleanup, and RLS channel testing.

</deferred>

---

*Phase: 08-performance-optimization*
*Context gathered: 2026-03-06*
