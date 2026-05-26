# Phase 4: Charts — Research

**Researched:** 2026-05-26
**Domain:** Dashboard UI (Recharts area + donut), additive RPC migration, RLS test
**Confidence:** HIGH (every claim either verified against repo source, official docs/skill, or CONTEXT.md lock)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: 6-month revenue series via additive RPC extension**
Mirror the Phase 2 pattern. The existing `get_dashboard_data_v2` time_series block emits exactly 30 daily points (`generate_series(current_date - 29, current_date, '1 day')`); no 6-month aggregate exists anywhere in the schema. Phase 4 ships:
- **Additive migration:** `supabase/migrations/{TIMESTAMP}_phase4_revenue_trend_6mo.sql` — `CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(...)` with one new CTE that aggregates `lease.rent_amount` (or the same source `time_series` already uses) by month for the last 6 calendar months, then emits `time_series.monthly_revenue_6mo: jsonb[]` (one entry per month: `{ "month": "YYYY-MM", "value": <sum_dollars> }`).
- **Source CTE reuse:** the existing `time_series` block reads `leases` already; the new 6mo aggregate joins the same source (no second table scan). Preserve the shared-CTE invariant from Phase 2 D-02.
- **MCP-apply protocol:** apply via `mcp__supabase__apply_migration`, then `mcp__supabase__list_migrations` to reconcile the prod-assigned timestamp with the repo filename per `migration-mcp-prod-drift.md` memory.
- **Type regen:** `bun run db:types` after migration lands (atomic — see CLAUDE.md § Database).
- **Frontend boundary mapper:** extend `src/hooks/api/use-owner-dashboard.ts` to read the new `monthly_revenue_6mo` field and emit it on `OwnerDashboardData.timeSeries.monthlyRevenue6mo: { month: string; value: number }[]`.
- **RLS test:** dual-client ownerA/ownerB integration test in `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` confirming owner-isolation (mirrors Phase 2 D-04).
- **Both series are dollars** (no `/100` anywhere). Phase 1 D-01 fix carries through.

**D-02: Layout — 3-up row (Revenue col-2 / Donut col-1 / Quick Actions col-1)** — `lg:grid-cols-4` wrapper stays; donut at `lg:col-span-1` ~250px; mobile collapses to single column.

**D-03: Donut center + legend** — center `87%` over `Occupied`; legend below as `● Occupied N  ● Vacant N` using `--color-chart-2` (occupied) + `--color-chart-5` (vacant); `role="img"` + computed `aria-label`; real `<ul><li>` (colorblind-friendly); `units.total === 0` → empty-state, never `0%` donut.

**D-04: 30d/6mo toggle UX** — segmented control in CardHeader right slot; local `useState<'30d' | '6mo'>` (NOT nuqs); default `30d`; data swap drives X-axis formatter + CardDescription; reduced-motion gates `isAnimationActive` via `useReducedMotion()`.

**D-05: Component file structure** — new `revenue-area-chart.tsx` + `occupancy-donut-chart.tsx` under `src/components/dashboard/components/`; delete old `revenue-overview-chart.tsx` in same PR (no transitional rename); `dashboard.tsx` swaps the dynamic import pair; `revenueTrend` prop is replaced by reading from the upstream React Query selector slice (planner's call on thin re-mapper vs direct).

**D-06: Loading-skeleton shape match** — each chart owns CSS-only skeleton inside the dynamic-import `loading:` callback; revenue skeleton = Card shell + animated `bg-muted` rectangle + static disabled segmented control (preserves header height); donut skeleton = Card shell + `rounded-full` circle + 2-pill legend row. No layout shift on data arrival.

**D-07: BlurFade reveal-density coordination with Phase 3** — Phase 4 charts MUST NOT wrap cards in `<BlurFade>` (Phase 3 already consumed all 6 reveals). Chart entrance is Recharts-native via `isAnimationActive` (gated on reduced-motion).

**D-08: Empty-state copy (honesty principle)** — Revenue empty (both windows or one window): `No revenue data yet` + `Add a lease to start tracking revenue`. Donut empty (`units.total === 0`): `No units yet — add a property to see occupancy`. No fabricated zero-line chart, no `0%` donut. Final copy.

**D-09: Dark-mode contrast verification** — all colors via `--color-chart-{1..5}` tokens; axis labels `--color-muted-foreground`; legend swatches visible against `--color-card` both modes; `design-token-drift.test.ts` is CI gate.

**D-10: No new query-key factories; no new hook** — the new RPC field rides on existing `ownerDashboardKeys`/`ownerDashboardQueries` factory. Boundary mapper at `use-owner-dashboard.ts` gets one new line for `monthlyRevenue6mo`. Zero new `useQuery` call sites.

**D-11 [informational]:** Perfect-PR merge gate (two consecutive zero-finding deep review cycles).
**D-12 [informational]:** No emojis. No hex/rgb/`bg-white`/inline-ms. Lucide icons only.
**D-13 [informational]:** `git commit` with sandbox disabled. NEVER `--no-verify` / `LEFTHOOK_EXCLUDE`.
**D-14 [informational]:** After every code-fixer return, run `git status --short` + `git diff --stat` to verify what landed.
**D-15 [informational]:** Synthetic test owners only (`e2e-owner-a@tenantflow.app` + `e2e-owner-b@tenantflow.app`); `subscription_status = 'active'` (NOT `'trialing'`).

### Claude's Discretion

- Exact x-axis tick formatter: `Mar 12` vs `03/12` for 30d; `Mar` vs `Mar 2026` vs `Mar '26` for 6mo. Planner picks the lower-noise option. (UI-SPEC § 2.4 already resolved: `Mar 12` and `Mar`.)
- Whether the segmented control is shadcn `<Tabs>` vs `<ToggleGroup>` — depends on inventory. (UI-SPEC § 4.1 resolved: `<Tabs>`.)
- Exact chart heights: `h-[300px]` revenue, `h-[240px]` donut. (UI-SPEC § 2.9 / § 3.2 resolved.)
- Whether to keep shared `chartConfig` in `dashboard-types.ts` or inline per-chart. (UI-SPEC § 16 resolved: per-chart inline; drop the shared one if no other consumers.)

### Deferred Ideas (OUT OF SCOPE)

- Chart drill-down navigation (click bar → property route, click wedge → leases filter)
- Custom date-range picker beyond 30d/6mo presets
- Per-property revenue chart (revenue stacked by property)
- Per-property occupancy donut
- `chart-area-interactive.tsx` reconsideration (preserved by Phase 1 D-13a)
- `activeTenants` trend honest computation
- DataTable refactor (Phase 5)
- Polish/a11y sweep (Phase 6)

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHART-01 | New `RevenueAreaChart` replaces `revenue-overview-chart.tsx`. Refreshed Recharts `Area` with 30d / 6mo toggle. | Existing chart at `src/components/dashboard/components/revenue-overview-chart.tsx` (verified — 96 lines) provides direct prior art for Recharts area pattern; `<Tabs>` primitive at `src/components/ui/tabs.tsx` (verified vendored) drives the toggle; D-04 + UI-SPEC § 4 provide complete contract. |
| CHART-02 | New `OccupancyDonutChart` — Recharts donut with center label + legend, reading from `stats.units`. | `DashboardStats.units` (verified at `src/types/stats.ts:48-59`) provides `occupied`, `vacant`, `total`. Recharts `Pie` + `Label position="center"` is the canonical shadcn donut pattern (CITED: shadcn.io/patterns/chart-pie-donut). NO existing donut in codebase — pure greenfield component. |
| CHART-03 | Chart colors source exclusively from `--color-chart-{1..5}` tokens. | Tokens verified in `src/app/globals.css` (oklch values present). `design-token-drift.test.ts` (verified at `src/app/__tests__/design-token-drift.test.ts`) is the CI gate that blocks any hex/rgb literal in JSX strings. |
| CHART-04 | Dark-mode contrast verified — no invisible series, no white-on-white legend swatches, no missing axis-label contrast. | UI-SPEC § 9 provides per-element light/dark token table. The Phase 3 `ChartContainer` machinery already publishes `--color-{key}` scoped per chart, theme-aware via the `theme` map in `ChartConfig`. Manual smoke at execute time; drift test enforces tokens. |
| CHART-05 | Chart loading skeletons match the chart's actual rendered shape (no skeleton-then-empty mutual-exclusion violation, per Phase 14 D-04 pattern). | D-06 + UI-SPEC § 7 provide per-chart skeleton component contracts. `Skeleton` primitive at `src/components/ui/skeleton.tsx` (verified) ships `bg-muted` + `animate-pulse` and respects global `prefers-reduced-motion` guard. |
| CHART-06 | Charts dynamically imported via `next/dynamic` with `ssr: false` and CSS-only loading skeletons. | Existing pattern at `src/components/dashboard/dashboard.tsx:17-23` (verified) shows `dynamic(...)` + `{ ssr: false, loading: ... }`. Phase 4 replaces one dynamic import with two; each carries its own shape-matching skeleton. |

</phase_requirements>

---

## Summary

Phase 4 is a UI-driven phase with one Postgres tail: an additive RPC migration to extend `get_dashboard_data_v2` with a 6-month aggregate `monthly_revenue_6mo` JSONB array. Frontend ships two new dynamically-imported Recharts components (`RevenueAreaChart` with 30d/6mo toggle, `OccupancyDonutChart` with center label + legend), each carrying its own shape-matching skeleton. Everything inherits the Phase 1 milestone-wide UI-SPEC and the locked Phase 4 UI-SPEC (six-dimension approval already shipped in `04-UI-SPEC.md`).

Three architectural realities shape the plan:

1. **The RPC has a fresh `auth.uid() = p_user_id` guard** added in `20260524012602_phase2_dashboard_rpc_auth_guard_message_align.sql` (cycle 10/11 of Phase 2). The Phase 4 migration MUST preserve this guard — it's at the top of the function body and rejects cross-owner calls with `'Access denied: cannot request data for another user'`. The RLS test must mirror Phase 2's pattern (`error?.message).toMatch(/access denied/i)`), NOT the older "empty result" assertion documented in Phase 2's `02-03-PLAN.md` (which was superseded by the cycle-4/10 follow-up).

2. **The revenue source is `all_leases.rent_amount` summed via lease-coverage date math**, not a payments table (TenantFlow does not facilitate rent). The existing 30d series sums `l.rent_amount` for leases where `lease_status = 'active'` AND `start_date <= series_date` AND `(end_date IS NULL OR end_date >= series_date)`. The new 6mo CTE mirrors this exact rule, aggregating per calendar month for the trailing 6 months. The shared-CTE invariant means the new aggregate joins existing CTEs (`all_leases`, `date_series`) — no second table scan.

3. **The Recharts mock is missing the `<Label>` export.** Phase 4's donut center uses `<Label position="center" content={...}>`, but `src/test/mocks/recharts.tsx` does not export `Label`. Wave 0 MUST extend the mock or the donut tests will crash at import time. This is a non-obvious but blocking dependency.

**Primary recommendation:** Three waves — Wave 1 (additive migration + RLS test + boundary mapper line + new types), Wave 2 (`RevenueAreaChart` + skeleton + tests), Wave 3 (`OccupancyDonutChart` + skeleton + tests + mount in `dashboard.tsx` + delete `revenue-overview-chart.tsx`). Recharts mock extension is a Wave-0 micro-task colocated with Wave 2 setup.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| 6-month revenue aggregate (last 6 calendar months sums) | Database / Storage | — | Same shared-scan invariant as Phase 2: server aggregates; client receives ready-to-render JSON. No frontend math required for the value layer. |
| RLS owner-isolation enforcement | Database / Storage | — | `auth.uid() = p_user_id` guard at function top + `owner_user_id = p_user_id` filter on every shared CTE. SECURITY DEFINER bypasses RLS, so guard is the authoritative gate. |
| Boundary mapping (snake_case RPC → camelCase frontend) | API / Backend (frontend's API boundary) | — | `fetchOwnerDashboardData` in `src/hooks/api/use-owner-dashboard.ts` is the single seam. Phase 4 adds one mapped field (`monthlyRevenue6mo`). |
| Chart series rendering (area + donut) | Browser / Client | — | Pure SVG via Recharts; runs after `next/dynamic` resolves the chunk. `ssr: false` keeps it out of the SSR/RSC path entirely. |
| Toggle state (`30d` ↔ `6mo`) | Browser / Client | — | Ephemeral `useState` (D-04). Not URL-persisted; not shared across components; not server-rendered. |
| Loading skeleton (code-split fetch + data fetch) | Browser / Client | — | CSS-only. Dynamic import's `loading:` callback fires until the chart bundle resolves. Same shell during React Query loading state. |
| Empty-state branch render | Browser / Client | — | Branch on `data.length === 0` (revenue) or `units.total === 0` (donut). No server-side empty-state computation; honest user-facing copy. |
| Reduced-motion gating | Browser / Client | — | `useReducedMotion()` hook (Phase 3 canonical) listens to `(prefers-reduced-motion: reduce)` matchMedia; result is passed as `isAnimationActive` prop. |
| Dark-mode color resolution | Browser / Client | CDN / Static (CSS bundle) | Tokens live in `globals.css` `@theme`; resolved at browser paint via CSS custom properties. No runtime JS theming. |

---

## Standard Stack

### Core

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `recharts` | `^3.8.1` (verified `package.json:line` matched) [CITED: package.json + project skill] | Both Area + Donut chart primitives | Already canonical in project (used by KpiSparkline + the existing revenue chart). Same major version across phases. |
| `radix-ui` (Tabs primitive) | `^1.4.3` (verified `package.json`) [VERIFIED: codebase + radix docs] | Segmented-control accessibility (`role="tablist"`, arrow-key cycling, Enter/Space activation) | shadcn vendored wrapper at `src/components/ui/tabs.tsx` (verified) imports from `radix-ui`. Already used elsewhere on the dashboard chrome. |
| `next` | `16.2.6` (verified `package.json`) [VERIFIED: codebase] | `next/dynamic` for SSR-disabled lazy chart imports | Existing convention; React 19 + Next 16 + Turbopack. |
| `@tanstack/react-query` | `^5.100.10` (verified `package.json`) [VERIFIED: codebase] | Inherits `ownerDashboardQueries.analytics.pageData()` — no new query keys (D-10) | Already wired; Phase 4 consumes the existing factory. |

### Supporting

| Library | Version (verified) | Purpose | When to Use |
|---------|-------------------|---------|-------------|
| `vitest` | `^4.1.6` (verified `package.json`) [VERIFIED: codebase] | Unit test runner for both new chart components | Project standard. `vi.hoisted()` for any mock referenced in `vi.mock()`. |
| `jsdom` | `^29.1.1` (verified `package.json`) [VERIFIED: codebase] | DOM environment for Vitest | Project standard. |
| `@supabase/supabase-js` | `^2.105.4` (verified `package.json`) [VERIFIED: codebase] | RLS integration test client (`createTestClient` harness) | Phase 4 RLS test uses the same client harness as Phase 2. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff (and why we don't) |
|------------|-----------|------------------------------|
| `<Tabs>` for segmented control | `<ToggleGroup>` | Both vendored. UI-SPEC § 4.1 resolved: `<Tabs>` chosen for cleaner `value`/`onValueChange` binding and an established `data-state="active"` styling. The discussion is closed. |
| Recharts `<Pie>` with inner radius (donut) | Hand-rolled SVG arc paths | Don't hand-roll: D3 arc math is correct-and-debugged in Recharts; we'd reinvent angle math, label positioning, accessibility. The 2-wedge donut pattern is exactly what Recharts targets. |
| New 6mo RPC endpoint | Additive extension to existing `get_dashboard_data_v2` | New endpoint = re-scan of `leases` table per call. CONTEXT.md D-01 + Phase 2 D-02 lock the shared-CTE invariant: 1 RPC call, 1 set of CTE scans. |
| Client-side 6mo aggregation from 180+ daily points | Server-side monthly aggregate | Client agg = ship 180+ data points the user never sees, plus client-side date math correctness risk. Server agg = 6 points, server-computed, RLS-safe. |
| nuqs URL persistence for the 30d/6mo toggle | Local `useState` | D-04 LOCKED. Toggle is ephemeral chart-UI state; nuqs reserved for Phase 5 DataTable where URL-share semantics matter. |

**Installation:** No new npm packages. All dependencies already present in `package.json`.

```bash
# No `npm install` / `bun install` needed for Phase 4.
# Verified via `grep -E '"(recharts|radix-ui|next|react|@tanstack/react-query|vitest|jsdom)":' package.json`
```

**Version verification:** Confirmed via codebase grep against `package.json` directly (network registry calls would not change the project's locked versions; the lockfile is source of truth).

---

## Package Legitimacy Audit

> No new packages installed. Phase 4 is a code-only + migration phase using already-vendored libraries.

| Package | Registry | Age (in lockfile) | Source Repo | slopcheck | Disposition |
|---------|----------|-------------------|-------------|-----------|-------------|
| `recharts` | npm | ~3 yrs at v3 (verified package.json) | github.com/recharts/recharts | n/a — already installed | No change |
| `radix-ui` | npm | already installed | github.com/radix-ui | n/a — already installed | No change |
| `next` | npm | 16.2.6 already installed | github.com/vercel/next.js | n/a — already installed | No change |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

*slopcheck not invoked because no `*install*` step lives in the Phase 4 plan. The planner does not need to gate any package via `checkpoint:human-verify` — there are no installs to gate.*

---

## Project Constraints (from CLAUDE.md)

Treat these with the same authority as locked decisions:

**Zero Tolerance Rules (relevant to Phase 4):**
- No `any` types — use `unknown` with type guards
- No barrel files / re-exports — import directly from defining file
- No duplicate types — search `src/types/` before creating any new type
- No commented-out code — delete it
- No inline styles — Tailwind utilities or `globals.css` custom properties only
- No emojis in code — Lucide Icons for UI
- No `as unknown as` type assertions — use typed mapper functions at RPC/PostgREST boundaries
- No string literal query keys — always use `queryOptions()` factories (Phase 4 adds zero new keys per D-10)
- No `@radix-ui/react-icons` — `lucide-react` is the sole icon library

**TypeScript strictness:** Full strict mode incl. `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Prefix unused callback params with `_` or remove them.

**Architecture rules relevant to Phase 4:**
- Max 300 lines per component, 50 lines per function
- Server Components by default; `'use client'` only for hooks / event handlers / browser APIs (both Phase 4 charts use `'use client'` because they call hooks + use Recharts)
- All `amount` columns store dollars as `numeric(10,2)`; never multiply/divide by 100 outside Stripe API boundary

**Testing rules relevant to Phase 4:**
- Unit: Vitest 4 + jsdom, 80% coverage threshold (lefthook pre-commit enforced)
- `vi.hoisted()` for any mock referenced in `vi.mock()`
- `.rejects.toMatchObject({ message: expect.stringContaining(...) })` instead of `.rejects.toThrow('string')` (chai 6 bug)
- RLS integration tests hit prod via dual-client (ownerA/ownerB), authenticated as synthetic test owners only
- Sequential RLS tests; rate limit ~45 sign-ins/min — don't run `bun run test:integration` twice in 60s

**Database rules:**
- Migrations: `supabase/migrations/YYYYMMDDHHmmss_description.sql` (lowercase SQL per `sql-migration-rules` skill)
- RLS on every table (Phase 4 migration touches only a function, not a table — no new RLS policies)
- `supabase.ts` is generated — never edit manually; `bun run db:types` is atomic
- Migrations via MCP `apply_migration` get prod-assigned timestamps that may not match repo filename — reconcile via `mcp__supabase__list_migrations` (per `migration-mcp-prod-drift.md` memory)
- All `amount` columns store dollars; convert to cents only at Stripe API boundary

**Git workflow:**
- NEVER push directly to main; always feature branch → push → `gh pr create`
- Lefthook pre-commit runs gitleaks, lockfile-verify, lint, typecheck, unit-tests
- NEVER `--no-verify` / `LEFTHOOK_EXCLUDE` (D-13 carries this forward); run `git commit` with sandbox disabled

**Component conventions relevant to Phase 4:**
- Use shadcn `Switch` for toggles (not relevant — Phase 4 uses `Tabs`)
- `text-muted-foreground` for muted text; never bare `text-muted`
- `bg-background` for surfaces; never `bg-white`
- Icon-only buttons need `aria-label`
- shadcn vendored at `src/components/ui/` — consume, don't reimplement

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ BROWSER (Phase 4 surface area)                                       │
│                                                                      │
│  /dashboard page                                                     │
│   └─ DashboardContent (page.tsx)                                     │
│       ├─ useDashboardCharts()  ←──── selector slice                  │
│       │   { timeSeries: { monthlyRevenue, monthlyRevenue6mo } }      │
│       │                                                              │
│       └─ <Dashboard kpiData revenueTrend propertyPerformance ...>    │
│           └─ chart row (lg:grid-cols-4)                              │
│               ├─ next/dynamic(RevenueAreaChart) ─┐  col-span-2       │
│               │   loading: <RevenueAreaChartSkeleton /> ┴── (Wave 0  │
│               │     until bundle resolves OR no data yet)            │
│               │                                                      │
│               │   <RevenueAreaChart                                  │
│               │     monthlyRevenue={daily}                           │
│               │     monthlyRevenue6mo={monthly}                      │
│               │   >                                                  │
│               │     useState<'30d'|'6mo'>      ← D-04 local          │
│               │     useReducedMotion()         ← Phase 3 hook        │
│               │     ChartContainer ← shadcn wrapper                  │
│               │       Recharts <AreaChart>                           │
│               │         <Area isAnimationActive={!reducedMotion}     │
│               │              animationDuration={800} />              │
│               │     <Tabs value=... onValueChange=...>               │
│               │       <TabsList>                                     │
│               │         <TabsTrigger value="30d">30d                 │
│               │         <TabsTrigger value="6mo">6mo                 │
│               │                                                      │
│               ├─ next/dynamic(OccupancyDonutChart) ─┐  col-span-1    │
│               │   loading: <OccupancyDonutChartSkeleton /> ┘         │
│               │                                                      │
│               │   <OccupancyDonutChart units={{occupied,vacant,total}}>
│               │     useReducedMotion()                               │
│               │     branch: units.total === 0 ? empty-state :        │
│               │       ChartContainer + PieChart + Pie + Label center │
│               │     <ul><li> legend (real markup, colorblind-safe)   │
│               │                                                      │
│               └─ <Card data-tour="quick-actions"> col-span-1         │
│                   (unchanged — Phase 3 left it; Phase 4 leaves it)   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ React Query cache (existing
                              │   `ownerDashboardKeys.analytics.pageData()`)
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│ BOUNDARY MAPPER (src/hooks/api/use-owner-dashboard.ts:218-294)      │
│                                                                      │
│  fetchOwnerDashboardData():                                          │
│    supabase.rpc("get_dashboard_data_v2", { p_user_id: user.id })     │
│    → narrow JSONB into OwnerDashboardData                            │
│    → emit  timeSeries.monthlyRevenue (existing 30d)                  │
│            timeSeries.monthlyRevenue6mo (NEW — Phase 4 D-01)         │
│                                                                      │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▲
                              │ PostgREST RPC call (single round-trip)
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│ POSTGRES (supabase/migrations/{TIMESTAMP}_phase4_revenue_trend_6mo) │
│                                                                      │
│  get_dashboard_data_v2(p_user_id uuid) — SECURITY DEFINER            │
│    1. AUTH GUARD: raise if p_user_id != auth.uid()                   │
│    2. Shared CTEs (single table scan each):                          │
│         owner_properties, all_units, all_leases, active_leases,      │
│         all_maintenance                                              │
│    3. NEW CTE: ts_revenue_6mo                                        │
│         generates 6 month buckets via                                │
│         date_trunc('month', generate_series(...))                    │
│         sums all_leases.rent_amount per month using                  │
│         lease-coverage (start_date / end_date)                       │
│    4. time_series JSON now carries:                                  │
│         monthly_revenue (existing 30d) + monthly_revenue_6mo (NEW)   │
│    5. Returns one jsonb                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

The donut's data source is `stats.units` — already returned by the unaltered Phase 2 RPC; no migration needed for the donut.

### Recommended Project Structure

```
src/
├── components/dashboard/components/
│   ├── revenue-area-chart.tsx              # NEW — D-05
│   ├── revenue-area-chart-skeleton.tsx     # NEW — colocated OR inline (planner pick)
│   ├── occupancy-donut-chart.tsx           # NEW — D-05
│   ├── occupancy-donut-chart-skeleton.tsx  # NEW — colocated OR inline (planner pick)
│   ├── __tests__/
│   │   ├── revenue-area-chart.test.tsx     # NEW
│   │   └── occupancy-donut-chart.test.tsx  # NEW
│   ├── kpi-bento-row.tsx                   # existing (Phase 3) — untouched
│   ├── kpi-sparkline.tsx                   # existing (Phase 3) — pattern reference
│   ├── revenue-overview-chart.tsx          # DELETED in this PR (D-05)
│   └── … (portfolio-*, etc. — untouched)
├── components/dashboard/
│   └── dashboard.tsx                       # EDITED — swap dynamic import; rearrange 3-up
├── components/dashboard/dashboard-types.ts # EDITED — drop chartConfig (if no other consumers)
├── hooks/api/use-owner-dashboard.ts        # EDITED — add monthlyRevenue6mo field (+ type)
├── types/analytics.ts                      # EDITED — add MonthlyRevenuePoint (or similar)
├── types/database-rpc.ts                   # EDITED (optional) — TimeSeries shape extension
├── app/(owner)/dashboard/page.tsx          # EDITED — read monthlyRevenue6mo from selector
├── test/mocks/recharts.tsx                 # EDITED — export <Label> mock (Wave 0 prereq)
supabase/migrations/
└── {PROD_TIMESTAMP}_phase4_revenue_trend_6mo.sql  # NEW — additive RPC migration
tests/integration/rls/
└── dashboard-rpc-revenue-6mo.test.ts       # NEW — dual-client RLS test
```

### Pattern 1: Additive RPC Migration via CREATE OR REPLACE

**What:** Extend the single owner-dashboard RPC with one new CTE + one new JSONB key without altering its signature.

**When to use:** Any field addition to the JSON response shape. NEVER for breaking changes (those need a `_v3` versioned function).

**Example (skeleton — full body adapted from `20260524012602_phase2_dashboard_rpc_auth_guard_message_align.sql`):**

```sql
-- migration: phase 4 (CHART-01) — add 6-month revenue aggregate to time_series
-- purpose: ship a server-side trailing-6-months revenue series for the new
--          RevenueAreaChart "6mo" toggle window. Without this CTE the toggle
--          would have to client-aggregate from the 30-day daily series, which
--          is impossible (30 days does not cover 6 months) — or hit a
--          separate RPC, which would re-scan the leases table.
-- safety: additive only. No destructive drops. Preserves the cycle-10 auth
--          guard (auth.uid() = p_user_id → raise) at the top of the function
--          body. Backwards-compatible: existing callers see the new
--          `monthly_revenue_6mo` key alongside `monthly_revenue` and ignore
--          unknown keys at the boundary mapper.
-- shared-CTE invariant: the new ts_revenue_6mo CTE joins the existing
--          all_leases CTE (already filtered to owner) — no new table scan.

create or replace function public.get_dashboard_data_v2(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
begin
  -- SECURITY: PRESERVED from cycle-10/11 migration
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  with
  -- [...all existing shared CTEs preserved verbatim...]
  -- owner_properties, all_units, all_leases, active_leases, all_maintenance
  -- [...all existing aggregates: unit_agg, property_agg, lease_agg, ...]
  -- [...existing trends: trend_occupancy, trend_revenue, trend_tenants, trend_maintenance]
  -- [...existing date_series CTE for 30-day time series]
  -- [...existing ts_occupancy + ts_revenue CTEs]

  -- NEW CTE — 6-month revenue aggregate
  -- Last 6 calendar months (trailing). Each bucket is "YYYY-MM" of the
  -- first day of that month. Sums lease rent_amount for any lease that
  -- was active during ANY part of that month (consistent with the 30d
  -- series' lease-coverage rule).
  month_series as (
    select date_trunc('month', d)::date as month_start
    from generate_series(
      date_trunc('month', current_date) - interval '5 months',
      date_trunc('month', current_date),
      '1 month'::interval
    ) d
  ),

  ts_revenue_6mo as (
    select jsonb_agg(
      jsonb_build_object('month', to_char(rev.month_start, 'YYYY-MM'),
                         'value', rev.value)
      order by rev.month_start
    ) as data
    from (
      select
        ms.month_start,
        coalesce(sum(l.rent_amount), 0)::numeric as value
      from month_series ms
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= (ms.month_start + interval '1 month' - interval '1 day')
        and (l.end_date is null or l.end_date >= ms.month_start)
      group by ms.month_start
    ) rev
  ),

  -- [...existing perf_unit_counts, perf_lease_revenues, perf_potential_revenues, perf_open_maintenance...]
  -- [...existing property_perf + recent_activities CTEs preserved verbatim...]

  select jsonb_build_object(
    'stats',        jsonb_build_object(...),       -- unchanged
    'trends',       jsonb_build_object(...),       -- unchanged
    'time_series',  jsonb_build_object(
      'occupancy_rate',       coalesce(tso.data, '[]'::jsonb),
      'monthly_revenue',      coalesce(tsr.data, '[]'::jsonb),
      'monthly_revenue_6mo',  coalesce(ts6.data, '[]'::jsonb)  -- NEW
    ),
    'property_performance', pp.data,
    'activities',           ra.data
  ) into v_result
  from
    property_agg pa
    -- [...existing cross joins...]
    cross join ts_revenue_6mo ts6   -- NEW
    -- [...existing cross joins...]
  ;

  return v_result;
end;
$function$;

grant execute on function public.get_dashboard_data_v2(uuid) to authenticated;
grant execute on function public.get_dashboard_data_v2(uuid) to service_role;
```

Source: derived from `supabase/migrations/20260524012602_phase2_dashboard_rpc_auth_guard_message_align.sql` (verified — current head function body). Sums-via-lease-coverage rule mirrors lines 220-256 of that file (`ts_revenue` CTE).

### Pattern 2: Recharts Donut with Shadcn ChartContainer

**What:** A 2-wedge `PieChart` with `innerRadius` > 0, `<Label position="center">` for the percent value, and a separate `<ul>`-based legend below (NOT the Recharts `Legend` component — that doesn't ship semantic list markup).

**When to use:** Categorical-proportion display where the absolute counts matter AND the total fits comfortably in the center.

**Example:**

```tsx
// Source: src/components/dashboard/components/occupancy-donut-chart.tsx (Phase 4 — see UI-SPEC § 3.3)
// Pattern matches CITED: shadcn.io/patterns/chart-pie-donut + recharts.org Pie API
"use client";

import { Pie, PieChart, Label } from "recharts";
import { ChartContainer } from "#components/ui/chart";
import { useReducedMotion } from "#hooks/use-reduced-motion";

interface OccupancyDonutChartProps {
  units: { occupied: number; vacant: number; total: number };
}

const donutConfig = {
  occupied: { label: "Occupied", color: "var(--color-chart-2)" },
  vacant:   { label: "Vacant",   color: "var(--color-chart-5)" },
} as const;

export function OccupancyDonutChart({ units }: OccupancyDonutChartProps) {
  const reducedMotion = useReducedMotion();

  if (units.total === 0) {
    // honesty (D-08): no fabricated 0% donut
    return (/* empty-state Card per UI-SPEC § 6.2 */);
  }

  const occupancyPercent = Math.round((units.occupied / units.total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Occupancy</CardTitle>
        <CardDescription>Across all units</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={`Occupancy donut: ${occupancyPercent} percent occupied (${units.occupied} of ${units.total} units)`}
          className="h-[180px] w-full"
        >
          <ChartContainer config={donutConfig} className="!aspect-auto h-full w-full">
            <PieChart>
              <Pie
                data={[
                  { name: "Occupied", value: units.occupied, fill: "var(--color-chart-2)" },
                  { name: "Vacant",   value: units.vacant,   fill: "var(--color-chart-5)" },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                strokeWidth={0}
                isAnimationActive={!reducedMotion}
                animationDuration={800}
                animationEasing="ease-out"
              >
                <Label
                  position="center"
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox)) return null;
                    return (
                      <text x={viewBox.cx} y={viewBox.cy}
                            textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} dy="-0.4em"
                               className="fill-foreground text-stat font-bold tabular-nums">
                          {occupancyPercent}%
                        </tspan>
                        <tspan x={viewBox.cx} dy="1.6em"
                               className="fill-muted-foreground text-sm">
                          Occupied
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
        <ul className="mt-4 flex items-center justify-center gap-6 text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden="true"
                  className="inline-block size-2.5 rounded-full bg-[var(--color-chart-2)]" />
            <span className="text-muted-foreground">Occupied</span>
            <span className="font-semibold tabular-nums text-foreground">{units.occupied}</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true"
                  className="inline-block size-2.5 rounded-full bg-[var(--color-chart-5)]" />
            <span className="text-muted-foreground">Vacant</span>
            <span className="font-semibold tabular-nums text-foreground">{units.vacant}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: 30d/6mo toggle with Tabs

**What:** Local `useState` driving a controlled `<Tabs value=.. onValueChange=..>` inside the CardHeader's right slot, with the chart body swapping data source + X-axis formatter based on the value.

**Example:**

```tsx
// Source: src/components/dashboard/components/revenue-area-chart.tsx (Phase 4 — see UI-SPEC § 2 + § 4)
"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "#components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "#components/ui/chart";
import { useReducedMotion } from "#hooks/use-reduced-motion";
import { formatCurrency } from "#lib/utils/currency";

type RevenueWindow = "30d" | "6mo";

interface RevenueAreaChartProps {
  monthlyRevenue: { date: string; value: number }[];       // existing
  monthlyRevenue6mo: { month: string; value: number }[];   // NEW Phase 4
}

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--color-chart-1)" },
} as const;

export function RevenueAreaChart({ monthlyRevenue, monthlyRevenue6mo }: RevenueAreaChartProps) {
  const [window, setWindow] = useState<RevenueWindow>("30d");
  const reducedMotion = useReducedMotion();

  const data = window === "30d" ? monthlyRevenue : monthlyRevenue6mo;
  const dataKey = window === "30d" ? "date" : "month";
  const isEmpty = data.length === 0;

  const tickFormatter = (raw: string): string => {
    if (window === "30d") {
      return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const [year, month] = raw.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", { month: "short" });
  };

  return (
    <Card className="lg:col-span-2" data-tour="charts-section">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>{window === "30d" ? "Last 30 days" : "Last 6 months"}</CardDescription>
        </div>
        <Tabs value={window} onValueChange={(v) => setWindow(v as RevenueWindow)}>
          <TabsList>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="6mo">6mo</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-base font-semibold text-foreground">No revenue data yet</p>
            <p className="text-sm text-muted-foreground">Add a lease to start tracking revenue</p>
          </div>
        ) : (
          <ChartContainer config={revenueConfig} className="h-[300px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-revenue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey={dataKey} tickLine={false} axisLine={false}
                     tickMargin={8} tickFormatter={tickFormatter} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8}
                     tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label: string) => tickFormatter(label)}
                    formatter={(value) => [
                      formatCurrency(Number(value), { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                      "Revenue",
                    ]}
                  />
                }
              />
              <Area
                dataKey="value"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={!reducedMotion}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

### Anti-Patterns to Avoid

- **`as unknown as { time_series: ... }`** — use a typed narrowing block following the `mapDocumentRow` pattern (CLAUDE.md). Phase 4's mapper line adds `monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? []`; the `as` narrowing for `result` already exists.
- **Recharts `<Legend>` component for the donut** — D-03 mandates real `<ul><li>` for colorblind a11y. The Recharts Legend renders a `<ul>` internally but with `role="list"` overrides applied — using our own `<ul>` keeps the semantic markup honest.
- **Inline `style={{ animationDuration: '800ms' }}`** — Tailwind utility OR vendor-API prop only. Phase 4 passes `animationDuration={800}` as a JSX integer prop to Recharts; the design-token-drift scanner ignores integer JSX props (only string-literal `"NNNms"` is caught).
- **Hand-rolled `setTimeout(..., 1500)` chart entrance animation** — Recharts ships `animationDuration` + `animationEasing` props; reduce to `isAnimationActive={!reducedMotion}` for a11y compliance.
- **`* 100` or `/ 100` on any currency variable anywhere in either chart file** — banned cross-cutting. The Y-axis formatter does `value / 1000` (chart-axis thousands tick) which is EXEMPT per UI-SPEC § 8.2, but no currency division/multiplication is permitted.
- **Wrapping chart cards in `<BlurFade>`** — D-07 forbids this; Phase 3 consumed the page's 6-reveal budget.
- **Adding a new `useQuery` call for the 6mo series** — D-10 forbids. The data rides on the existing `ownerDashboardKeys.analytics.pageData()` factory; one new boundary-mapper line is all that's needed.
- **`{ ssr: false, loading: () => <ChartLoadingSkeleton /> }` (the shared bars skeleton)** — D-06 requires shape-matching skeletons per chart. The legacy `ChartLoadingSkeleton` (5 animated bars) does NOT match the area or donut shape and would cause layout shift.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Donut hole + center label positioning | Custom SVG `<path d="M...A..."/>` + manual angle math | Recharts `<Pie innerRadius outerRadius>` + `<Label position="center" content={...}>` | D3 arc geometry is correct + already debugged; manual SVG arc-flag math is error-prone for edge cases (zero values, 100% values). |
| Reduced-motion subscription | New `useState` + `matchMedia` + `addEventListener` per chart | `useReducedMotion` hook at `src/hooks/use-reduced-motion.ts` (verified Phase 3 canonical) | Single source per UI-SPEC § 5.1 + Phase 3 03-UI-SPEC § 5.4. SSR-safe, debounced via React state. |
| Segmented control with active-state styling + arrow-key cycling | Two `<button>` elements + bespoke `useState` + click handlers | shadcn `<Tabs>` + `<TabsList>` + `<TabsTrigger>` (verified vendored) | Radix `TabsPrimitive` ships `role="tablist"`, arrow-key navigation, Enter/Space activation, `data-state="active"`, focus-visible ring. |
| Currency formatting at tooltip | `Number(value).toLocaleString()` + manual `$` prefix | `formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })` from `#lib/utils/currency` (verified at `src/lib/utils/currency.ts:26`) | Phase 1 D-09a canonical; locale + currency-code + fraction-digit handling is centralized. |
| 6-month aggregation in JavaScript from 180+ daily points | Client-side `reduce` over a fetched daily array | Server-side `ts_revenue_6mo` CTE returning pre-aggregated 6 points | Client-side aggregation would require fetching 180+ datapoints (RPC redesign), client-side date-bucket math (timezone risk), and downstream developer ambiguity. Server agg is RLS-safe, owner-scoped, and idiomatic. |
| RPC field type narrowing for the new field | `as unknown as { time_series: { monthly_revenue_6mo: ... }}` | Add to the existing `result as { ... }` narrowing in `fetchOwnerDashboardData` + `MonthlyRevenuePoint` type in `src/types/analytics.ts` | CLAUDE.md Zero Tolerance Rule #8. The `mapDocumentRow` pattern is the project idiom. |
| Loading state for the donut while data fetches | Single global loading skeleton over the dashboard | Per-chart shape-matched skeleton wrapped in `next/dynamic` `loading:` | D-06 + UI-SPEC § 7 — code-split skeleton AND data-loading skeleton render in the same cell, then transition into either empty-state or real chart. No layout shift. |

**Key insight:** Phase 4 is unusual in how *little* it should build. The hard parts (RLS scoping, motion handling, currency formatting, segmented-control a11y, Recharts donut math) are all solved by existing components — Phase 4's contribution is *composition*, not invention. The migration is the only "new" code, and even that copies a verified template.

---

## Common Pitfalls

### Pitfall 1: Calling the old "empty result for cross-owner" RLS contract

**What goes wrong:** The original Phase 2 plan asserted ownerA passing ownerB's `p_user_id` returns an empty `property_performance` array. That contract was superseded by the cycle-4 / cycle-10 follow-up migration that added an `auth.uid() = p_user_id` guard at the top of the function body. The current RPC RAISES `'Access denied: cannot request data for another user'`.

**Why it happens:** The Phase 2 `02-03-PLAN.md` documents the old contract; the actual shipped test (`tests/integration/rls/dashboard-rpc-open-maintenance.test.ts`) was rewritten over cycles 4 + 10 to assert the new error pattern.

**How to avoid:** Phase 4's RLS test MUST mirror the SHIPPED Phase 2 test, not its original plan. Use `expect(data).toBeNull(); expect(error).not.toBeNull(); expect(error?.message).toMatch(/access denied/i);` for the cross-owner isolation case.

**Warning signs:** The test asserts `result.property_performance.toEqual([])` and passes in CI but fails post-merge.

### Pitfall 2: Recharts mock missing `<Label>` export

**What goes wrong:** The `OccupancyDonutChart` imports `Label` from `recharts`. Vitest aliases `recharts` → `src/test/mocks/recharts.tsx` (verified at `vitest.config.ts:51-52`). The mock does NOT export `Label`. Tests crash at module load with `Label is not exported from 'recharts'`.

**Why it happens:** No prior dashboard component used `<Label>` from Recharts (the existing area chart uses XAxis/YAxis text and the KPI sparkline uses no labels).

**How to avoid:** Wave 0 micro-task: extend `src/test/mocks/recharts.tsx` to export a `Label` mock that renders its `content` render-prop output (or a `data-testid="pie-label"` `<g>`).

**Warning signs:** First donut test run fails with `Element type is invalid` or `Label is not exported`.

```tsx
// Add to src/test/mocks/recharts.tsx
interface LabelProps {
  position?: string;
  content?: ((args: { viewBox?: { cx: number; cy: number } }) => ReactNode) | ReactNode;
}

export const Label = ({ position, content }: LabelProps) => {
  if (typeof content === "function") {
    return (
      <g data-testid="pie-label" data-position={position}>
        {content({ viewBox: { cx: 0, cy: 0 } })}
      </g>
    );
  }
  return <g data-testid="pie-label" data-position={position}>{content}</g>;
};
```

### Pitfall 3: Recharts default 1500ms animation overruns the project's motion budget

**What goes wrong:** Recharts' built-in default `animationDuration` is 1500ms. Phase 4's dashboard mounts after the Phase-3 bento row's BlurFade waves (which complete at ~500ms). A 1500ms chart animation would still be playing after the user has already scanned the KPI numbers, feeling laggy.

**Why it happens:** No one explicitly sets `animationDuration` unless they read the prop docs.

**How to avoid:** UI-SPEC § 5.3 LOCKED — pass `animationDuration={800}` + `animationEasing="ease-out"` on both `<Area>` and `<Pie>`. Matches Phase 3's `NumberTicker.duration={800}` for vocabulary consistency.

**Warning signs:** Chart entrance feels "draggy"; chart row paints with visible delay relative to the bento row.

### Pitfall 4: `vendored Tabs uses bg-primary on active`, not `bg-background`

**What goes wrong:** UI-SPEC § 4.3 documents the segmented-control active state as `bg-background` + `--shadow-sm` (citing the "shadcn baseline"). But the project's vendored `Tabs` at `src/components/ui/tabs.tsx:46` overrides it to `data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md`.

**Why it happens:** The vendored Tabs were locally restyled (lines 45-49 — "primary blue matching sidebar" per the comment).

**How to avoid:** Two options for the planner:
- **(A) Accept the project's actual style** — the UI-SPEC's "accent tightening" claim (§ 17) is invalidated by the vendored Tabs already consuming `bg-primary`. Update the UI-SPEC § 4.3 + § 17 to reflect reality.
- **(B) Override per-instance** — pass `className="data-[state=active]:!bg-background data-[state=active]:!text-foreground data-[state=active]:!shadow-sm"` on `<TabsTrigger>` to force the documented visual.

Recommend (A): the project decided primary-blue active tabs are canonical, and the Phase 4 spec should match. The 10% accent slot tightening claim is moot.

**Warning signs:** The toggle's active pill is blue (`--color-primary`) in production but the UI-SPEC table says white surface. Checker Dimension-3 will flag the mismatch.

### Pitfall 5: `next/dynamic` `loading` callback only fires for code-split fetch, NOT for data-fetch loading

**What goes wrong:** Developers assume the skeleton renders whenever React Query is loading. It does not. `next/dynamic`'s `loading:` callback fires ONLY during the JS bundle's download. Once the bundle resolves, the actual component takes over and is responsible for its own data-loading branch.

**Why it happens:** Conflating "lazy import" with "lazy data".

**How to avoid:** Each chart component MUST also handle its empty-data state internally (Phase 4 charts branch on `data.length === 0` → empty-state, otherwise render). Phase 4 ships the empty-state branch inside the chart component, NOT relying solely on the dynamic-import skeleton.

**Warning signs:** Initial page load shows skeleton, but on subsequent navigations from `/properties` → `/dashboard` (where the JS chunk is cached), the chart momentarily renders an "empty" raw chart before data arrives.

### Pitfall 6: Forgetting `mcp__supabase__list_migrations` reconcile after MCP apply

**What goes wrong:** Calling `mcp__supabase__apply_migration` writes a migration to prod with a server-assigned timestamp that almost never matches the local filename. If the file isn't renamed, the next CI run sees a "missing" migration and may attempt to re-apply, hitting `function already exists` errors.

**Why it happens:** It's easy to forget the reconcile step when the apply succeeds.

**How to avoid:** Plan task explicitly calls `mcp__supabase__list_migrations`, reads the prod `version` for the new migration name, renames the file. Mandatory per `migration-mcp-prod-drift.md` memory.

**Warning signs:** Two files matching `*phase4_revenue_trend_6mo*` exist; OR `git diff` shows the file content unchanged but the filename has a different timestamp.

### Pitfall 7: `bun run db:types` before MCP apply

**What goes wrong:** Running `db:types` before the migration lands captures the OLD schema. The new `monthly_revenue_6mo` JSONB key is invisible to TypeScript; the boundary mapper line that reads it will silently emit `undefined`.

**Why it happens:** Type regen feels like a "prep" step; easy to do early.

**How to avoid:** Sequence enforced in the plan: (1) Write migration → (2) MCP apply → (3) Reconcile filename → (4) `bun run db:types`. Phase 2 D-06 codified this; Phase 4 mirrors.

**Warning signs:** `supabase.ts` regen produces no diff; OR boundary mapper line that reads `monthly_revenue_6mo` lints clean but the runtime value is undefined.

### Pitfall 8: Sandbox blocks `git commit` (lefthook hooks)

**What goes wrong:** Running `git commit` in the default sandbox fails because lefthook's hooks invoke `bun run` commands that need filesystem + network access (gitleaks, typecheck against `node_modules`).

**Why it happens:** The agent runs in the sandboxed Bash by default.

**How to avoid:** D-13 carries the v1.0/v2.0 lesson — commit with `dangerouslyDisableSandbox: true`. NEVER use `--no-verify` or set `LEFTHOOK_EXCLUDE` to bypass; that re-introduces the bug the perfect-PR gate exists to prevent.

**Warning signs:** Commit fails with `EACCES` or `operation not permitted` on a file outside `.`; agent considers `--no-verify` as a fix.

### Pitfall 9: Recharts `ResponsiveContainer` zero-sized parent on first mount

**What goes wrong:** Recharts measures its parent via `ResizeObserver` and emits a console warning `The width(-1) and height(-1) of chart should be greater than 0` if the parent is zero-sized at the moment of measurement.

**Why it happens:** Inherited from Battle-test Session 8 — addressed in the project's `ChartContainer` at `src/components/ui/chart.tsx:71-75` via a `requestAnimationFrame` mount gate.

**How to avoid:** Use `ChartContainer` (already canonical) — the gate is built in. Do NOT use `<RechartsPrimitive.ResponsiveContainer>` directly.

**Warning signs:** Console warning at chart mount; chart paints with wrong initial size, then jumps.

### Pitfall 10: Synthetic test owners with `subscription_status = 'trialing'` get redirected to `/pricing`

**What goes wrong:** The proxy middleware redirects users with `subscription_status NOT IN ('active', 'trialing')` to `/pricing`. There's a `expire_trials()` SECURITY DEFINER function that flips `trialing → expired` whenever `trial_ends_at < now()`. A synthetic test owner with `trialing` status silently expires after the trial window and starts redirecting.

**Why it happens:** It looks reasonable to set test accounts as `trialing` to mimic real onboarding; but the trial expiration cron silently breaks the test.

**How to avoid:** D-15 confirms: synthetic test owners MUST stay `'active'`. Don't flip them to trialing. CLAUDE.md memory documents this as the root cause of the PR #674 post-merge CI failure.

**Warning signs:** RLS test passes locally / on the PR branch but fails on post-merge CI with a 401 redirect.

---

## Code Examples

(Patterns above already cover the three primary surfaces. Additional smaller patterns below.)

### Adding the new field to the boundary mapper

```tsx
// src/hooks/api/use-owner-dashboard.ts — extend fetchOwnerDashboardData
// Source: existing pattern at lines 218-294 (verified)

const result = data as {
  stats: DashboardStats;
  trends: Record<string, MetricTrend>;
  time_series: Record<string, TimeSeriesDataPoint[]> & {
    monthly_revenue_6mo?: MonthlyRevenuePoint[];  // NEW Phase 4
  };
  property_performance: PropertyPerformanceRpcResponse[];
  activities: ActivityItem[];
};

// …property_performance mapping unchanged…

return {
  stats: result.stats,
  activity: result.activities ?? [],
  metricTrends: { /* unchanged */ },
  timeSeries: {
    occupancyRate: result.time_series?.occupancy_rate ?? [],
    monthlyRevenue: result.time_series?.monthly_revenue ?? [],
    monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? [],  // NEW Phase 4
  },
  propertyPerformance,
};
```

Plus extend the `OwnerDashboardData` + `DashboardChartsData` interfaces (lines 167-192 of the same file).

### Adding the new type to analytics.ts

```tsx
// src/types/analytics.ts — add right after TimeSeriesDataPoint

// 6-month aggregate revenue point — emitted by ts_revenue_6mo CTE in
// supabase/migrations/{TIMESTAMP}_phase4_revenue_trend_6mo.sql
// `month` is "YYYY-MM" (first day of month); `value` is sum in dollars.
export interface MonthlyRevenuePoint {
  month: string;   // "YYYY-MM"
  value: number;   // dollars
}
```

### Mount swap in `dashboard.tsx`

```tsx
// src/components/dashboard/dashboard.tsx — replace lines 17-23 + lines 177-206

// Replace single import:
const RevenueAreaChart = dynamic(
  () => import("./components/revenue-area-chart").then(m => m.RevenueAreaChart),
  { ssr: false, loading: () => <RevenueAreaChartSkeleton /> }
);
const OccupancyDonutChart = dynamic(
  () => import("./components/occupancy-donut-chart").then(m => m.OccupancyDonutChart),
  { ssr: false, loading: () => <OccupancyDonutChartSkeleton /> }
);

// Rearrange chart row (was 1 chart + Quick Actions; becomes 3-up):
<div className="grid gap-6 lg:grid-cols-4" data-tour="trends-section">
  <RevenueAreaChart
    monthlyRevenue={revenueTrend.monthlyRevenue}
    monthlyRevenue6mo={revenueTrend.monthlyRevenue6mo}
  />
  <OccupancyDonutChart units={stats.units} />
  <Card data-tour="quick-actions">
    {/* existing Quick Actions unchanged */}
  </Card>
</div>
```

Note: the existing `revenueTrend` is a `{ month, revenue }[]` re-mapping at `page.tsx:61-68`. Phase 4 either (A) drops the re-mapping and passes `chartsData.timeSeries.monthlyRevenue` + `monthlyRevenue6mo` directly to `<Dashboard>`, OR (B) extends the re-mapper to handle both windows. Planner's call (D-05, claude's discretion noted).

---

## Runtime State Inventory

> **Phase 4 is not a rename/refactor phase, but it IS a delete-and-replace phase (per D-05 the old `revenue-overview-chart.tsx` is deleted in the same PR).** Including this section for completeness re: the deleted file.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `revenue-overview-chart.tsx` reads from the React Query cache only; no persistent storage references the component name. | None. |
| Live service config | None — no external service references the chart filename. | None. |
| OS-registered state | None — no system service tracks this file. | None. |
| Secrets/env vars | None — chart consumes the publishable Supabase client only. | None. |
| Build artifacts | Vercel builds the chunk-hashed JS bundle on every deploy; deleting the source file removes its chunk automatically on the next deploy. | None (automatic). |

**Other deletion impact:** `src/components/dashboard/dashboard-types.ts` exports `chartConfig` (single-entry: `revenue → var(--chart-1)`). Phase 4's per-chart inline configs (UI-SPEC § 16) make this export dead. Grep for `import { chartConfig }` before deleting:

```bash
grep -rn "import.*chartConfig" src/
# Expected: 1 hit, in revenue-overview-chart.tsx (which is also being deleted)
# If grep returns 0 hits → delete `chartConfig` from dashboard-types.ts
# If grep returns >1 hit → keep `chartConfig` (other consumers exist)
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bun` | Local commands (`bun run db:types`, `bun run test:unit`, `bun run test:integration`, `bun run typecheck`, `bun run lint`) | ✓ | 1.3.14 (verified `bun --version`) | none required |
| `node` | Lefthook hooks, `bun`-orchestrated commands | ✓ | v26.0.0 (verified `node --version`) | none required |
| Supabase MCP | `mcp__supabase__apply_migration`, `mcp__supabase__list_migrations`, `mcp__supabase__execute_sql` for migration apply + verification | ✓ | (in agent env per server instructions) | none — MCP is the only authorized prod-write path per CLAUDE.md |
| `supabase` CLI | Type regen (called by `bun run db:types` via `scripts/db-types.sh`) | ✓ (assumed — `bun run db:types` already documented in CLAUDE.md as the canonical regen) | n/a | none required |
| `.env.local` | Integration tests need `NEXT_PUBLIC_SUPABASE_URL`, publishable key, `E2E_OWNER_A_EMAIL`, `E2E_OWNER_A_PASSWORD`, `E2E_OWNER_B_EMAIL`, `E2E_OWNER_B_PASSWORD` | ✓ (assumed present — Phase 2 RLS test ships) | n/a | none required |
| Synthetic owner accounts on prod | RLS test dual-client | ✓ (`e2e-owner-a@tenantflow.app` + `e2e-owner-b@tenantflow.app` configured `active`) | n/a | none — these MUST stay `active`, never `trialing` |
| GitHub branch protection | Phase 4 PR merge | ✓ (per project memory `branch-protection-config.md`) | n/a | none required |

**Missing dependencies with no fallback:** none — all required.

**Missing dependencies with fallback:** none.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (verified `package.json`) |
| Config file | `vitest.config.ts` (verified — includes `recharts` alias at line 51-52 mapping to `src/test/mocks/recharts.tsx`) |
| Quick run command | `bun run test:unit -- --run src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` |
| Full suite command | `bun run test:unit` (lefthook pre-commit; 80% coverage threshold enforced) |
| Integration suite command | `bun run test:integration` (RLS dual-client against prod) |
| Phase gate | `bun run validate:quick` (types + lint + unit) + `bun run test:integration` green before `/gsd-verify-work 4` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CHART-01 | Toggle switches CardDescription `Last 30 days` ↔ `Last 6 months` | unit | `bun run test:unit -- --run src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` | ❌ Wave 0 |
| CHART-01 | Area renders with `dataKey="value"` and series stroke `var(--color-chart-1)` (or `var(--color-revenue)` post-config resolution) | unit | same | ❌ Wave 0 |
| CHART-02 | Donut center value is `87%` for `{ occupied: 87, vacant: 13, total: 100 }` | unit | `bun run test:unit -- --run src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` | ❌ Wave 0 |
| CHART-02 | Donut empty branch when `units.total === 0` shows `No units yet` | unit | same | ❌ Wave 0 |
| CHART-02 | Donut legend renders as `<ul>` with two `<li>` (NOT `<div role="list">`) | unit | same | ❌ Wave 0 |
| CHART-02 | Computed `aria-label` matches `"Occupancy donut: {N} percent occupied ({occupied} of {total} units)"` | unit | same | ❌ Wave 0 |
| CHART-03 | All Phase 4 file color references are tokens (no hex/rgb in JSX strings) | unit | `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` | ✓ (existing gate) |
| CHART-04 | Dark-mode visual smoke | manual-only | (browser smoke during execute-phase; Phase 6 polishes) | n/a |
| CHART-05 | Skeleton renders inside Card shell with `lg:col-span-2` matching loaded chart | unit | Both chart test files include a skeleton snapshot test | ❌ Wave 0 |
| CHART-05 | Skeleton ↔ empty-state mutual exclusion (data branch logic) | unit | revenue test asserts `monthlyRevenue.length === 0 + window === '30d'` → empty-state, NOT skeleton | ❌ Wave 0 |
| CHART-06 | `dashboard.tsx` uses `dynamic(... { ssr: false, loading: () => <Skeleton /> })` for both | unit | dashboard test pins the dynamic import options (or integration check via snapshot) | partial — existing dashboard.test exists; needs Phase 4 update |
| CHART-01 + D-01 | New `monthly_revenue_6mo` field present in RPC response for caller's own properties | integration | `bun run test:integration -- --run tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` (subset) | ❌ Wave 1 |
| CHART-01 + D-01 | Cross-owner RPC call returns `'Access denied'` error (auth guard preserved) | integration | same | ❌ Wave 1 |

### Sampling Rate

- **Per task commit:** `bun run validate:quick` (typecheck + lint + unit — pre-commit hook enforced)
- **Per wave merge:** full unit suite (`bun run test:unit`) — pre-commit hook enforces 80% coverage
- **Phase gate:** unit + integration both green before `/gsd-verify-work 4`
- **PR gate:** `checks` + `e2e-smoke` + `rls-security` CI workflows (per project CLAUDE.md CI Pipeline)
- **Perfect-PR:** two consecutive zero-finding deep review cycles (D-11)

### Wave 0 Gaps

- [ ] `src/test/mocks/recharts.tsx` — **extend with `Label` export** (Pitfall 2). Without this, the donut test crashes on import.
- [ ] `src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` — covers CHART-01, CHART-03, CHART-05, CHART-06
- [ ] `src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` — covers CHART-02, CHART-03, CHART-05
- [ ] `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` — covers CHART-01 + D-01 RLS isolation
- [ ] (Optional) update `src/components/dashboard/__tests__/dashboard.test.tsx` (if it exists) to assert the new pair of dynamic imports — verify via `grep -l "dashboard.test" src/components/dashboard/__tests__/` first.

*Framework install: not needed — Vitest already installed.*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing Supabase Auth (`@supabase/ssr` cookie session); RPC's `auth.uid()` is enforced by Supabase. |
| V3 Session Management | yes | Inherited — no Phase 4 changes to session handling. |
| V4 Access Control | **yes (critical)** | The `auth.uid() = p_user_id` guard at the top of `get_dashboard_data_v2` is the access-control boundary. Phase 4 migration MUST preserve this guard verbatim. Per-CTE `where owner_user_id = p_user_id` is defense-in-depth, not sufficient on its own because SECURITY DEFINER bypasses RLS. |
| V5 Input Validation | partial | Only frontend input is the `useState<'30d'|'6mo'>` value — typed union; no runtime validation needed. RPC parameter is `p_user_id uuid` typed at the boundary. |
| V6 Cryptography | n/a | No new cryptographic operations in Phase 4. |
| V7 Error Handling and Logging | yes | The cross-owner RPC call returns a sanitized `'Access denied: cannot request data for another user'` — never exposes internal data; standard project pattern (matches 20+ other stats RPCs per RLS test commentary). |
| V8 Data Protection | yes | RLS owner-isolation on all underlying tables (`leases`, `units`, `properties`, `maintenance_requests`) preserved; new aggregate operates only within already-owner-scoped CTEs. |

### Known Threat Patterns for the Phase 4 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-owner data exfil via direct PostgREST RPC call | Information Disclosure | `auth.uid() = p_user_id` guard at function top (preserved); RLS test pins the rejection contract |
| SQL injection via SECURITY DEFINER | Tampering | `SET search_path TO 'public'` preserved; no `EXECUTE` / dynamic SQL in the function body |
| Leaking owner UUID via error message | Information Disclosure | Generic `Access denied` message; doesn't echo the offending uuid |
| Migration replay creating duplicate function | Tampering / DoS | MCP-prod-drift reconcile protocol (D-01 + Pitfall 6); single matching file post-rename |
| XSS via chart tooltip / Recharts rendering user-influenced strings | Tampering | Recharts text rendering escapes by default; donut center `<tspan>` rendering uses interpolated number (`occupancyPercent`), not user-supplied string |
| Inline styles bypassing CSP | Tampering | All Phase 4 styling via Tailwind classes / `globals.css` vars; no `style={{...}}` per Zero Tolerance Rule #5 |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Revenue chart hardcoded title "Revenue Overview" + subtitle "Monthly revenue for the past 6 months" with daily data | New `RevenueAreaChart` with `30d/6mo` toggle and honest subtitle | Phase 4 (this phase) | Title becomes honest about the active window; users can flip to the matching aggregation |
| `revenue-overview-chart.tsx` uses `var(--color-revenue)` (chart-config scoped var) | New chart uses `var(--color-chart-1)` token directly OR scoped `var(--color-revenue)` via per-chart `ChartConfig` (functionally identical via shadcn `ChartStyle`) | Phase 4 | Cleaner; per-chart configs make each chart self-contained |
| `chart-area-interactive.tsx` (kept by Phase 1 D-13a) | Used elsewhere; NOT consolidated in Phase 4 (deferred to v3.0) | n/a | n/a — out of scope |
| Recharts default 1500ms animation | 800ms pinned per chart (matches Phase 3 NumberTicker duration) | Phase 4 | Chart entrance feels coordinated with bento row |
| Hardcoded `0` for collection rate (legacy v1) | Removed entirely in Phase 2 (POLISH-11) | Phase 2 | Honesty principle |
| RPC return type narrowed via `as unknown as` | Boundary mapper pattern with explicit type narrowing | Phase 1 → Phase 2 → carries to Phase 4 | Zero `any`; zero `as unknown as` |
| `auth.uid()` not re-asserted inside SECURITY DEFINER | Explicit `auth.uid() = p_user_id` guard at function top | Phase 2 cycle 4 + 10 | Closes cross-owner exfil hole |

**Deprecated/outdated:**
- `revenue-overview-chart.tsx` — deleted in Phase 4 (D-05). Don't preserve as a transitional alias.
- `chartConfig` single-entry export in `dashboard-types.ts` — delete if no other consumer survives the Phase 4 chart swap.
- Phase 2 `02-03-PLAN.md`'s "ownerA → ownerB.id returns empty array" RLS contract — superseded by the cycle-4/10 auth guard; follow the SHIPPED test pattern instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The shipped Phase 2 RLS test (`dashboard-rpc-open-maintenance.test.ts`) is the canonical pattern for Phase 4's RLS test, NOT the original `02-03-PLAN.md` | Pitfall 1 + Validation Architecture | Following the older plan would write a test that fails (the contract changed) |
| A2 | The vendored project Tabs uses `data-[state=active]:bg-primary` (not the documented shadcn `bg-background` baseline) | Pitfall 4 | UI-SPEC § 4.3 + § 17 claims are factually wrong against the live primitive; checker Dimension-3 will flag the mismatch unless the spec is updated |
| A3 | Phase 4's choice for the 6mo CTE shape (last 6 *calendar* months, trailing, `YYYY-MM` key per first-day-of-month) is the correct interpretation of D-01 | Pattern 1 + Open Question Q1 | Calendar-month math (Dec → May) vs trailing-N-days-as-6mo could materially shift the chart's first bucket |
| A4 | Lease-coverage rule for the 6mo aggregate mirrors the existing 30d rule (`lease_status = 'active' AND lease covers ANY part of the month`) | Pattern 1 | A stricter "lease active for the whole month" rule would lower numbers; spec doesn't pin this |
| A5 | Recharts mock's `<Label>` extension renders the `content` render-prop output correctly under jsdom (test snapshot-equivalent) | Pitfall 2 | If the mock fails to render `<tspan>` inside the SVG `<text>`, the donut tests would need a different assertion strategy (e.g., assert via the constructed `aria-label`) |
| A6 | The 6mo aggregate values fit in the existing JSONB shape without `bigint` overflow at TS boundary (max ~$10M/month aggregate × 6 = $60M; comfortably within `Number.MAX_SAFE_INTEGER`) | Pattern 1 | If any owner exceeds $9 quadrillion in monthly rent, this would fail — implausible |
| A7 | `dashboard-data.ts`'s `chartConfig` is not consumed outside `revenue-overview-chart.tsx` (which is being deleted) | Runtime State Inventory | If another file silently imports it, deleting it breaks the import — mitigated by grep step in the plan |
| A8 | The skeleton + empty-state mutual exclusion is achieved by the dynamic-import `loading:` callback firing only during code-split fetch, not data fetch | Pitfall 5 | If `loading:` does fire during data fetch in Next 16, both skeleton + empty-state could co-render — Phase 14 D-04 v1.0 pattern documented the avoidance |
| A9 | `bun run test:integration` against prod uses the `e2e-owner-a@tenantflow.app` / `e2e-owner-b@tenantflow.app` credentials from `.env.local` AND those accounts have `subscription_status = 'active'` (NOT trialing) | D-15 + Pitfall 10 | If trialing flipped expired, dashboard test redirects to `/pricing` and 401s |
| A10 | UI-SPEC § 16's resolution "per-chart configs (each new chart defines its own minimal `ChartConfig` inline). `dashboard-types.ts` `chartConfig` is dropped or kept only if it has consumers outside `revenue-overview-chart.tsx`" is the binding interpretation | Project Structure | Could re-debate; planner should accept and move on |

---

## Open Questions

1. **6-month bucket starting point — calendar or trailing?**
   - What we know: D-01 says "trailing 6 months" but also "monthly aggregate by month for the last 6 calendar months." UI-SPEC § 2.4 tick formatter outputs `Mar` for the 6mo window — implies calendar-month labels, not "trailing 30-day buckets".
   - What's unclear: edge-case behavior for the current month — does the most recent bucket represent the partial current month (Dec 1 → today) or the most recent complete month (November)?
   - Recommendation: **Use last 6 calendar months including the partial current month.** Bucket via `date_trunc('month', generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), '1 month'))`. Most recent bucket = partial month-to-date. Most intuitive for "how am I doing this month?" UX. Sample code in Pattern 1.

2. **Timezone for the 6mo aggregation?**
   - What we know: The existing 30d series uses `current_date` (no timezone qualifier) and `to_char(d, 'YYYY-MM-DD')`. Postgres `current_date` evaluates in the session timezone — Supabase prod default is UTC.
   - What's unclear: Whether owners in non-UTC timezones could see a partial-day off-by-one for the most recent bucket.
   - Recommendation: **UTC, matching existing 30d series.** The 6mo view buckets monthly, so a few hours of timezone drift at the bucket boundary is sub-pixel on the chart. Don't introduce a new timezone column. The Phase 1 `expandDateBoundary` helper (used in Phase 64 of v2.6) handled this for daily date math — Phase 4's monthly buckets are coarse enough that it's not needed.

3. **Keep `revenueTrend` re-mapper in `page.tsx:61-68` or drop it?**
   - What we know: Currently re-maps `{ date, value }` → `{ month, revenue }`. Phase 4 changes the chart's prop interface to accept both `monthlyRevenue` AND `monthlyRevenue6mo` directly from the selector's `chartsData.timeSeries`.
   - What's unclear: Whether other consumers exist for the `revenueTrend` shape (search needed).
   - Recommendation: **Drop the re-mapper.** Pass `chartsData.timeSeries.monthlyRevenue` and `chartsData.timeSeries.monthlyRevenue6mo` straight through `<Dashboard>` to `<RevenueAreaChart>`. The transform is a Phase-1-era artifact; Phase 4's selector path is cleaner. Update `DashboardProps` to swap `revenueTrend: { month, revenue }[]` for `monthlyRevenue: { date, value }[] + monthlyRevenue6mo: { month, value }[]` (or a `revenue: { daily, monthly }` nested type to keep `DashboardProps` tidy).

4. **`chartConfig` in `dashboard-types.ts` — delete or keep?**
   - What we know: Single-entry (`revenue: { label, color: 'var(--chart-1)' }`). Only consumer is `revenue-overview-chart.tsx` (being deleted).
   - What's unclear: Static check needed via `grep -rn "import.*chartConfig" src/`.
   - Recommendation: **Delete** if grep returns zero remaining consumers. Otherwise leave it.

5. **Should the integration test create a multi-month lease fixture to verify the 6mo bucketing math?**
   - What we know: Phase 2 test only inserts one current open maintenance request. A 6mo test could simply assert the array has length 6 and the keys are correct `YYYY-MM` strings.
   - What's unclear: Whether to additionally fixture a lease spanning multiple months and assert the per-bucket value math.
   - Recommendation: **Phase 4 test asserts shape only** (length === 6, every entry has `month` matching `^\d{4}-\d{2}$` and `value` is a non-negative number), NOT value math. Value-correctness math is implicit in the migration's CTE; pinning specific dollar values would require fragile fixtures. The auth-guard rejection test remains the primary RLS isolation pin.

---

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/20260524012602_phase2_dashboard_rpc_auth_guard_message_align.sql` — current RPC source (verified head; the file Phase 4 extends). Lines 13-27 (auth guard), 220-256 (existing 30d revenue CTE — the bucketing rule template).
- `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` — shipped Phase 2 RLS test (242 lines; verified). The canonical pattern, not the older `02-03-PLAN.md`.
- `src/components/ui/chart.tsx` — `ChartContainer` implementation (verified, lines 46-96; rAF mount gate at lines 71-75).
- `src/components/ui/tabs.tsx` — vendored Tabs (verified; line 46 reveals `bg-primary` active state, NOT shadcn-baseline `bg-background`).
- `src/components/ui/skeleton.tsx` — Skeleton primitive (verified; `bg-muted` + `animate-pulse`).
- `src/components/dashboard/components/revenue-overview-chart.tsx` — existing chart (verified; 96 lines; the prior art pattern).
- `src/components/dashboard/components/kpi-sparkline.tsx` — Phase 3 Recharts area pattern with `ChartContainer` (verified).
- `src/hooks/use-reduced-motion.ts` — Phase 3 canonical motion hook (verified).
- `src/hooks/api/use-owner-dashboard.ts` — boundary mapper (verified lines 218-294).
- `src/test/mocks/recharts.tsx` — Recharts mock (verified; missing `Label` export — Wave 0 dependency).
- `src/types/stats.ts` — `UnitStats` shape (verified lines 48-59; donut data source).
- `src/types/analytics.ts` — `TimeSeriesDataPoint` (verified lines 15-19; existing 30d type).
- `src/types/database-rpc.ts` — `PropertyPerformanceRpcResponse` shape (verified).
- `src/app/globals.css` — `--color-chart-1..5` tokens verified (`oklch` values present).
- `src/app/__tests__/design-token-drift.test.ts` — drift guard scanner (verified; CI gate).
- `CLAUDE.md` — project conventions, Zero Tolerance Rules, testing rules, db rules (verified).
- `.claude/skills/sql-migration-rules/SKILL.md` — Supabase migration file conventions (verified).
- `.planning/phases/02-data-layer-rpc/02-CONTEXT.md` — Phase 2 D-02 + D-03 + D-04 (the additive-migration pattern; verified).
- `.planning/phases/04-charts/04-CONTEXT.md` — Phase 4 locked decisions (D-01..D-15) (verified).
- `.planning/phases/04-charts/04-UI-SPEC.md` — Phase 4 design contract, 6-dimension approval (verified — full 1003 lines).
- `.planning/REQUIREMENTS.md` — CHART-01..CHART-06 specs (verified).
- `.planning/ROADMAP.md` — Phase 4 success criteria (verified).
- `.planning/STATE.md` — project state, Phase 3 status, lessons carried forward (verified).
- `package.json` — verified versions of recharts 3.8.1, radix-ui 1.4.3, next 16.2.6, react 19.2.6, vitest 4.1.6, @tanstack/react-query 5.100.10.

### Secondary (MEDIUM confidence)

- shadcn.io/patterns/chart-pie-donut — donut pattern reference (CITED: WebFetch). Confirms `Pie` + `PieChart` + `Label position="center"` + `innerRadius` are the canonical shadcn approach.
- recharts.org/en-US/api — API reference (404 on the specific Area/Pie pages during research; relied on Context7-equivalent code-pattern verification via the existing project usage instead).
- Project memory: `migration-mcp-prod-drift.md` (referenced; not re-read but cited via CONTEXT.md + CLAUDE.md).

### Tertiary (LOW confidence)

- None — all factual claims are verified or cited from authoritative project artifacts.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library version verified against `package.json`; every primitive verified against the actual vendored source file.
- Architecture: HIGH — RPC pattern verified by reading the current head migration in full; frontend pattern verified by reading the existing chart + Phase 3 sparkline; boundary-mapper pattern verified at lines 218-294 of `use-owner-dashboard.ts`.
- Pitfalls: HIGH — every pitfall is documented from a verified file (mock at `recharts.tsx`, Tabs styling at `tabs.tsx`, auth guard at the cycle-10 migration, etc.).
- Validation Architecture: HIGH — Vitest config verified; existing dashboard tests verified; Wave-0 gaps enumerated against actual file system.

**Research date:** 2026-05-26
**Valid until:** 2026-06-25 (30 days; the codebase moves fast but Phase 4's surface area is well-bounded; the auth-guard and Recharts/shadcn dependencies are stable)
