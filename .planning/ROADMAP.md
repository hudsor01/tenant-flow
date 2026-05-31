# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- 🚧 **v2.0 Dashboard Command Center** — Phases 1-7 (in planning; major-version phase reset)

---

# v2.0 Dashboard Command Center

**Defined:** 2026-05-22
**Granularity:** fine (7 phases)
**Branch template:** `gsd/phase-{phase}-{slug}`
**Numbering:** reset to 1-7 (major-version → fresh sequence; v1.0's phases 1-15 archived)
**Coverage:** 34/34 requirements mapped ✓
**Source spec:** `.planning/MILESTONE-CONTEXT.md`

## Core Value

The authenticated owner dashboard at `/dashboard` becomes a restrained, professional B2B command center — KPI visibility above the fold, polished charts, a real DataTable with column controls + saved presets, full keyboard/dark-mode/mobile a11y. Every dollar amount handled correctly throughout the data path (no `*100`/`÷100` round-trip).

## Cross-Cutting Constraints (apply to every phase)

- **Design-token alignment** — `--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`, `--color-chart-{1..5}` only. `design-token-drift.test.ts` Vitest guard (v1.0 Phase 11) continues to enforce.
- **No `*100` / `/100` revenue arithmetic anywhere.** Cross-cutting hard rule; any new file or edit that re-introduces it fails the perfect-PR gate.
- **Restrained B2B aesthetic.** No `@magicui` / `@aceternity` flash. `ui/bento-grid.tsx` (marketing component) is forbidden for KPI tiles.
- **Independently shippable.** Each phase ships as one atomic PR through the perfect-PR gate (two consecutive zero-finding deep review cycles). The dashboard must never break mid-milestone.
- **Zero Tolerance Rules** (CLAUDE.md): no `any`, no barrel files, no duplicate types, no commented-out code, no inline styles, no `as unknown as`, no string-literal query keys, lucide-react only.

## Dependency Order

```
1 → 2 → (3 ∥ 4) → 5 → 6 → 7
```

Phases 1 and 2 are invisible foundation. Phases 3 and 4 each *add* a new region — they can ship in parallel (no file overlap). Phase 5 is the only swap (atomic PR replacing the hand-rolled portfolio table). Phase 6 is polish over already-shipped surfaces. Phase 7 is invisible verification.

## Phases

- [x] **Phase 1: Foundation & Dedup** — Delete duplicates, fix the `*100`/`÷100` revenue bug, extract shared transform, produce milestone-wide UI-SPEC. Zero visible change.
- [x] **Phase 2: Data Layer & RPC** — Additive RPC migration for per-property `open_maintenance`; resolve compute-or-drop on `collection_rate`; RLS owner-isolation test.
- [x] **Phase 3: KPI Bento Row** — 6-tile KPI grid with sparklines on Revenue + Occupancy. Adds Section B.
- [x] **Phase 4: Charts** — `RevenueAreaChart` refresh (30d/6mo toggle) + new `OccupancyDonutChart`. Adds Section C.
- [x] **Phase 5: Portfolio DataTable** — Replace hand-rolled table with DiceUI DataTable: client hook, column model, faceted filter, column visibility, virtualization, grid/table toggle, saved presets, nuqs URL state.
- [ ] **Phase 6: Polish & A11y** — Dark-mode audit, keyboard a11y, 375px responsive, skeleton/empty mutual exclusion, reduced-motion.
- [ ] **Phase 7: Verification** — E2E coverage for `/dashboard` + final design-token sweep.

## Phase Details

### Phase 1: Foundation & Dedup
**Slug:** `dashboard-foundation-dedup`
**Goal:** Strip duplicate/dead dashboard code, kill the `*100`/`÷100` revenue round-trip, extract one shared data transform, and produce the milestone-wide UI-SPEC the remaining phases inherit (aesthetic, tokens, dark-mode rules, breakpoints, motion budget).
**Depends on:** Nothing (first phase)
**Requirements:** POLISH-01, POLISH-02, POLISH-03
**Success Criteria** (what must be TRUE):
  1. Visiting `/dashboard` after the merge shows the same KPI numbers as before (the `*100`/`÷100` bug visually cancelled itself, so display is unchanged — but in-memory values are now correct).
  2. `src/components/dashboard/owner-dashboard.tsx`, `chart-area-interactive.tsx`, the duplicate `dashboard-filters*.tsx`, the second `portfolio-toolbar.tsx`, and `skeletons.tsx` no longer exist in the repo.
  3. Repo-wide grep for `* 100` and `/ 100` against currency variables in `src/app/(owner)/dashboard/` and `src/components/dashboard/` returns zero hits.
  4. `design-token-drift.test.ts` passes; milestone-wide UI-SPEC committed at `.planning/phases/01-dashboard-foundation-dedup/UI-SPEC.md` (aesthetic, tokens, dark-mode rules, breakpoints, motion budget) and inherited by all later phases.
**Plans:** 3 plans (3 waves — serialized)
- [ ] 01-01-PLAN.md — **Wave 1.** Bug fix (drop `*100` in page.tsx + `/100` in revenue-overview-chart.tsx) + extract pure `transformDashboardData` module + wire into use-dashboard-hooks selectors (D-12a interpretation #2)
- [ ] 01-02-PLAN.md — **Wave 2** (depends on 01-01). Currency utility consolidation: delete duplicate `formatDashboardCurrency`; swap 3 callers to canonical `formatCurrency` with no-cents options object (D-09a / RC-7)
- [ ] 01-03-PLAN.md — **Wave 3** (depends on 01-01 + 01-02). Dedup deletions: 5 files + 1 test (owner-dashboard.tsx + its test, dashboard-filters{,-compact,-utils}, top-level portfolio-toolbar.tsx, skeletons.tsx); chart-area-interactive.tsx PRESERVED per D-13a. Owns the canonical D-03 / UI-SPEC § Appendix A `*100`/`/100` grep sweep (only runnable after Wave 1+2 land + owner-dashboard.tsx is deleted in Task 1).
**UI hint:** yes

### Phase 2: Data Layer & RPC
**Slug:** `dashboard-data-layer-rpc`
**Goal:** Make the dashboard's data inputs honest — additive migration for per-property `open_maintenance` (locked D-02), and drop `collection_rate` from the KPI set per the v1.0 honesty principle (locked D-01: TenantFlow does not facilitate rent payments, no payment data exists, never fabricate `0`).
**Depends on:** Phase 1
**Requirements:** POLISH-10, POLISH-11
**Success Criteria** (what must be TRUE):
  1. Querying `get_dashboard_data_v2` as an authenticated owner returns a real per-property `open_maintenance` count for each row (or the column is documented as ship-hidden until Phase 5 wires it).
  2. The portfolio data model contains no hardcoded `0` for `collectionRate` — either the field is dropped from the KPI set or sourced from a real RPC value (resolution captured in the Phase 2 discuss artifact).
  3. `tests/integration/rls/` includes a dual-client (ownerA/ownerB) test confirming the migrated RPC respects owner isolation under RLS.
  4. `bun run test:integration` passes on the new test against prod.
**Plans:** 3 plans (3 waves — serialized)
- [ ] 02-01-PLAN.md — **Wave 1.** Additive migration extending `get_dashboard_data_v2` with `perf_open_maintenance` CTE + `open_maintenance` JSON key; MCP `apply_migration` to prod; reconcile filename with prod timestamp; regenerate `src/types/supabase.ts`.
- [ ] 02-02-PLAN.md — **Wave 2** (depends on 02-01). Frontend wiring: add `open_maintenance: number` to `PropertyPerformance` + `PropertyPerformanceRpcResponse`; drop `collectionRate` from `DashboardMetrics`; update fetcher mapper, page.tsx re-mapper, `transformDashboardData`, and the inline `dashboard.tsx` portfolio transform to source real `open_maintenance` instead of hardcoded `0`.
- [ ] 02-03-PLAN.md — **Wave 3** (depends on 02-02). Dual-client RLS integration test at `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts` (happy-path + cross-owner isolation); `bun run test:integration` against prod; manual checkpoint confirming portfolio table renders real maintenance counts.

### Phase 3: KPI Bento Row
**Slug:** `dashboard-kpi-bento-row`
**Goal:** Replace the one-line text header with a 6-tile KPI bento row (Revenue, Occupancy, Active Leases, Open Maintenance, Properties, Units) using already-vendored `Stat` + `NumberTicker` + `BlurFade` primitives, with sparklines on Revenue + Occupancy only.
**Depends on:** Phase 1 (UI-SPEC), Phase 2 (real KPI values)
**Requirements:** KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06, KPI-07
**Success Criteria** (what must be TRUE):
  1. `/dashboard` renders 6 KPI tiles above the chart row (Revenue, Occupancy, Active Leases, Open Maintenance, Properties, Units).
  2. Revenue and Occupancy tiles each render an axis-less Recharts `Area` sparkline; the other four tiles do not.
  3. Each tile's numeric value animates via `NumberTicker`; users with `prefers-reduced-motion: reduce` see the final value with no animation.
  4. The KPI grid uses an `@container` CSS grid auto-fit layout (not `ui/bento-grid.tsx`); section reveals stagger via `BlurFade` with at most ~4 reveals.
**Plans:** 3 plans (3 waves — serialized)
- [x] 03-01-PLAN.md — **Wave 1.** KpiSparkline component (KPI-05) + pure helpers (formatTrendPercent, sparklineConfigForTrend, KpiTileConfig). Axis-less Recharts Area inside ChartContainer; trend-direction color via ChartConfig.theme map; role='img' + aria-label; no animation.
- [x] 03-02-PLAN.md — **Wave 2** (depends on 03-01). KpiBentoRow orchestrator + 6 tiles (KPI-01/02/03/04/06/07) + shared useReducedMotion hook. 6 Stat-shell tiles in D-01 order with @container grid (auto-fit minmax(180px,1fr)), NumberTicker value animation (KpiNumberTicker reduced-motion wrapper), Lucide trend chips with !text-[var(--color-warning)] down override, BlurFade waves A {0,1,2} + B {4,5,6}, skeleton ↔ data branch, buildTileAriaLabel a11y.
- [x] 03-03-PLAN.md — **Wave 3** (depends on 03-01 + 03-02). Mount KpiBentoRow into dashboard.tsx (replace legacy <p> header at lines 172-186; preserve <h1> + data-testid). Extend DashboardProps with kpiData: KpiBentoRowProps. Construct kpiData in page.tsx from useDashboardStats() + useDashboardCharts(). Manual visual checkpoint (browser path or MCP RPC inspection alternate).
**UI hint:** yes

### Phase 4: Charts
**Slug:** `dashboard-charts`
**Goal:** Ship the new charts row — `RevenueAreaChart` (refreshed Recharts area with 30d/6mo toggle, no `/100`) and a brand-new `OccupancyDonutChart` (center label + legend, sourcing from `stats.units`).
**Depends on:** Phase 1 (UI-SPEC)
**Requirements:** CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06
**Success Criteria** (what must be TRUE):
  1. `/dashboard` renders a revenue area chart with a 30d / 6mo toggle that updates the visible series; values are correct dollars (no residual `/100`).
  2. `/dashboard` renders an occupancy donut chart with a center label and legend; the count matches `stats.units` returned by `get_dashboard_data_v2`.
  3. Chart series colors source exclusively from `--color-chart-{1..5}`; dark-mode contrast is verified (no invisible series, no white-on-white legend swatches).
  4. Both charts dynamically import via `next/dynamic` with `ssr: false` and shape-matching CSS-only loading skeletons (no skeleton ↔ empty co-render).
**Plans:** 4 plans (3 waves — 04-01a + 04-01b parallel in Wave 1)
- [x] 04-01a-PLAN.md — **Wave 1.** Database half of data layer: Recharts test mock Label export (Wave-0 prereq for Plan 04-03 donut tests); additive migration extending get_dashboard_data_v2 with month_series + ts_revenue_6mo CTEs and the monthly_revenue_6mo time_series key (D-01); MCP apply + filename reconcile + bun run db:types regen. Split out from original 04-01 so the ~300-line SECURITY DEFINER CREATE OR REPLACE has its own context window.
- [x] 04-01b-PLAN.md — **Wave 1** (depends on 04-01a). TS/test half of data layer: MonthlyRevenuePoint type + boundary mapper line emitting monthlyRevenue6mo; dual-client RLS integration test pinning the cycle-10 /access denied/i contract.
- [x] 04-02-PLAN.md — **Wave 2** (depends on 04-01a + 04-01b). RevenueAreaChart (CHART-01) + colocated RevenueAreaChartSkeleton + 12 Vitest specs. Local useState 30d/6mo toggle, shadcn Tabs in CardHeader right slot, formatCurrency in tooltip, var(--color-chart-1) area stroke + gradient, animationDuration={800} + isAnimationActive={\!useReducedMotion()}, honest empty-state copy. NO mount yet (dashboard.tsx still uses old chart).
- [x] 04-03-PLAN.md — **Wave 3** (depends on 04-01a + 04-01b + 04-02). OccupancyDonutChart (CHART-02) + colocated OccupancyDonutChartSkeleton + 11 Vitest specs. Atomic swap (single commit): reshape DashboardProps (drop revenueTrend, add monthlyRevenue + monthlyRevenue6mo + units) + drop revenueTrend transform in page.tsx + mount the chart pair in dashboard.tsx via next/dynamic (3-up layout per D-02: Revenue col-span-2 + Donut col-span-1 + Quick Actions col-span-1). Delete revenue-overview-chart.tsx atomically. Drop chartConfig from dashboard-types.ts if no surviving consumers. Manual visual checkpoint (3-up layout + toggle + dark-mode + skeleton ↔ data transition).
**UI hint:** yes

### Phase 5: Portfolio DataTable
**Slug:** `dashboard-portfolio-datatable`
**Goal:** Replace the hand-rolled portfolio table with the vendored DiceUI DataTable composition — new `useClientDataTable` hook, `portfolio-columns.tsx` column model with `aria-sort`, faceted status filter, column visibility, virtualization, grid/table view toggle, saved presets in localStorage, live filter/sort/page state in nuqs URL params.
**Depends on:** Phase 1 (UI-SPEC), Phase 2 (real per-property values)
**Requirements:** DT-01, DT-02, DT-03, DT-04, DT-05, DT-06, DT-07, DT-08, DT-09
**Success Criteria** (what must be TRUE):
  1. Clicking a sortable column header on the portfolio table sorts the rows and exposes `aria-sort` on that header; keyboard users can sort via Tab + Enter/Space.
  2. The faceted status filter and column-visibility menu both work; selected filters and sort persist in the URL (refresh restores state) via nuqs.
  3. The user can save a filter preset, refresh the page, and re-apply that preset from the preset menu (localStorage via Zustand `persist`).
  4. The grid/table view toggle works; `dashboard-store.ts` is trimmed to `viewMode` only; the table virtualizes long lists via `useVirtualizer`.
  5. The hand-rolled `portfolio-table.tsx`, `portfolio-toolbar.tsx`, and `portfolio-pagination.tsx` no longer exist in the repo.
**Plans:** 5 plans (3 waves)
- [x] 05-01a-PLAN.md — **Wave 1.** `useClientDataTable` hook (DT-02): fork of `use-data-table.ts` with manual flags off + nuqs mirror kept; URL-compatible with the server hook (DT-09 foundation). Hook unit tests (manual-flags / page-count-recompute / nuqs round-trip / URL hydration).
- [x] 05-01b-PLAN.md — **Wave 1.** `portfolio-columns.tsx` 7-column `ColumnDef<PortfolioRow>[]` (DT-03) + extend `DataTableColumnHeader` to emit `aria-sort` + keyboard sort (DT-03 a11y); status `meta.options` for the faceted filter (DT-04) + per-column `meta.label` (DT-05). Column-model + aria-sort tests.
- [x] 05-02-PLAN.md — **Wave 2** (depends on 05-01a + 05-01b). Compose `PortfolioDataTable`: vendored shell + faceted status filter (DT-04) + column visibility (DT-05) + always-on virtualized tbody (DT-06, D-2) + grid/table toggle reading the same rows (DT-07, D-5). Controlled component, NO mount. Component tests.
- [x] 05-03a-PLAN.md — **Wave 3** (depends on 05-01a + 05-02). `dashboard-presets-store.ts` Zustand `persist` slice: full-snapshot presets (DT-08, D-1) + live `columnVisibility` (D-3). Preset round-trip + persistence + SSR-safety tests. (6 tests)
- [x] 05-03b-PLAN.md — **Wave 3** (depends on 05-02 + 05-03a). Atomic swap: trimmed `dashboard-store.ts` to `viewMode` only + deleted the 3 dead selector hooks (DT-09); rewrote `dashboard.tsx` to mount `PortfolioDataTable` + `PortfolioPresetMenu` (DT-01, DT-08); nuqs URL state (DT-09); DELETED the 3 hand-rolled files (criterion #5). 5 swap-integrity + preset/URL tests; full suite (106,141) green. Perfect-PR gate pending.
**UI hint:** yes

### Phase 6: Polish & A11y
**Slug:** `dashboard-polish-a11y`
**Goal:** Polish over shipped surfaces — dark-mode audit, keyboard a11y, 375px responsive layout, skeleton/empty mutual exclusion, reduced-motion guards.
**Depends on:** Phases 3, 4, 5 (polishes their output)
**Requirements:** POLISH-04, POLISH-05, POLISH-06, POLISH-07, POLISH-08
**Success Criteria** (what must be TRUE):
  1. Toggling between light and dark mode on `/dashboard` reveals no white-on-white text, no invisible badges, and zero `bg-white` references in the dashboard subtree.
  2. Tab-navigating through `/dashboard` reveals a visible focus ring on every interactive element; every icon-only button has an `aria-label`; the skip-to-content link works from the dashboard header.
  3. At 375px viewport width, `/dashboard` has zero horizontal scroll; the portfolio table forces grid view at the mobile breakpoint.
  4. Loading states never co-render a skeleton AND an empty state; route-scoped `loading.tsx` covers the streaming case (Phase 14 D-04 pattern from v1.0).
  5. Users with `prefers-reduced-motion: reduce` see no `NumberTicker`, `BlurFade`, or chart-transition animations.
**Plans:** TBD

### Phase 7: Verification
**Slug:** `dashboard-verification`
**Goal:** Lock the milestone — Playwright E2E coverage for `/dashboard` (synthetic owner, real prod data) and a final design-token drift sweep across every new dashboard file.
**Depends on:** Phases 3, 4, 5, 6 (verifies all visible surfaces)
**Requirements:** POLISH-09, POLISH-12
**Success Criteria** (what must be TRUE):
  1. The Playwright E2E suite includes a `/dashboard` smoke test against a synthetic owner: KPI numbers match `get_dashboard_data_v2`, occupancy donut matches `stats.units`, DataTable sort/filter/column-visibility/preset-save+restore work, grid/table toggle works.
  2. `bun run test:e2e` passes locally and the GitHub `e2e-smoke` check passes on the Phase 7 PR.
  3. `design-token-drift.test.ts` runs clean over every new dashboard file (no hex, no rgb, no `bg-white`, no inline ms durations).
  4. The merged PR closes the v2.0 milestone with 34/34 requirements satisfied per traceability.
**Plans:** TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation & Dedup | v2.0 | 3/3 | Shipped (PR #744) | 2026-05-22 |
| 2. Data Layer & RPC | v2.0 | 3/3 | Shipped (PR #745) | 2026-05-22 |
| 3. KPI Bento Row | v2.0 | 3/3 | Shipped (PR #746) | 2026-05-26 |
| 4. Charts | v2.0 | 4/4 | Shipped (PR #748) | 2026-05-28 |
| 5. Portfolio DataTable | v2.0 | 5/5 | Shipped (PR #763) | 2026-05-31 |
| 6. Polish & A11y | v2.0 | 0/0 | Not started | - |
| 7. Verification | v2.0 | 0/0 | Not started | - |

## Coverage Validation

| Category | Count | Phase(s) |
|----------|-------|----------|
| KPI (KPI-01..07) | 7 | Phase 3 |
| CHART (CHART-01..06) | 6 | Phase 4 |
| DT (DT-01..09) | 9 | Phase 5 |
| POLISH (POLISH-01..12) | 12 | Phase 1 (01/02/03), Phase 2 (10/11), Phase 6 (04..08), Phase 7 (09/12) |
| **Total** | **34** | **All mapped, no orphans, no double-mapping ✓** |

---

# v1.0 Archive (Shipped 2026-05-22)

<details>
<summary>✅ v1.0 Marketing Surface Honesty (Phases 1-15) — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Critical Stop-Bleed (Blog Unpublish + Pricing Placeholder) (2/2 plans) — PR #686
- [x] Phase 2: Frontend Correctness (NumberTicker + Mobile) (2/2 plans) — PR #687
- [x] Phase 3: Routing & Legal-URL Aliases (1/1 plan) — merged inline
- [x] Phase 4: Persona & Copy Honesty (2/2 plans) — PR #688
- [x] Phase 5: Pricing Restructure (2/2 plans) — PR #689
- [x] Phase 6: Blog Rebuild + n8n Redesign (4/4 plans) — PR #690
- [x] Phase 7: Pricing-Card Chrome (2/2 plans) — PR #735
- [x] Phase 8: Nav, Active States & Dead Links (1/1 plan) — PR #736
- [x] Phase 9: Page-Level Cleanup (1/1 plan) — PR #737
- [x] Phase 10: CTA & Conversion Standardization (2/2 plans) — PR #738 + #739 (followup)
- [x] Phase 11: Design-Token Alignment & Resources Page (2/2 plans) — PR #740
- [x] Phase 12: SEO Metadata, Schema & Content Cleanup (3/3 plans) — PR #741
- [x] Phase 13: Performance & Conversion Polish (1/1 plan) — PR #742
- [x] Phase 14: Battle Test Findings Remediation (4/4 plans) — PR #705 + #708/#718-#724 followups
- [x] Phase 15: v1.0 Milestone Cleanup (5/5 plans) — PR #743

Audit round 3 verdict: PERFECT BY ALL MEASURES. Full milestone summary in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) and [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md).

</details>

---
*Last updated: 2026-05-26 — Phase 4 plans drafted (04-01 data layer + RLS, 04-02 RevenueAreaChart, 04-03 OccupancyDonutChart + mount + cleanup)*
