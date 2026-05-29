---
phase: 4
phase_name: Charts
milestone: v2.0
slug: charts
status: locked
discussed: 2026-05-26
depends_on: [1, 2, 3]
inherits_ui_spec: ".planning/phases/01-foundation-dedup/01-UI-SPEC.md"
requirements: [CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06]
---

# Phase 4 — Charts: CONTEXT

## Goal

Ship the new charts row on `/dashboard`:
1. New `RevenueAreaChart` (replaces `revenue-overview-chart.tsx`) — refreshed Recharts area with a **30d / 6mo** toggle.
2. New `OccupancyDonutChart` — Recharts donut with center label + legend, sourcing from `stats.units` returned by `get_dashboard_data_v2`.

Both `next/dynamic` + `ssr:false` + CSS-only loading skeletons. All series colors from `--color-chart-{1..5}`. Dark-mode contrast verified.

## Domain

UI phase + one additive RPC migration (for the 6-month revenue series). Adds Section C (the charts row, between the KPI bento row shipped in Phase 3 and the portfolio table). Read-only display of metrics already provided by `get_dashboard_data_v2` plus one new field (`revenue_trend_6mo`).

**OUT OF SCOPE:**
- Drill-down navigation from chart bars/wedges (deferred)
- Hover-to-isolate or click-to-filter chart interactions (deferred)
- DataTable refactor (Phase 5)
- Polish/a11y sweep (Phase 6)
- Per-property charts (donut is aggregate-only; revenue is aggregate-only)
- Custom date ranges beyond 30d/6mo (e.g., user-picked windows)

## Locked Decisions

### D-01: 6-month revenue series via additive RPC extension
Mirror the Phase 2 pattern. The existing `get_dashboard_data_v2` time_series block emits exactly 30 daily points (`generate_series(current_date - 29, current_date, '1 day')`); no 6-month aggregate exists anywhere in the schema. Phase 4 ships:

- **Additive migration:** `supabase/migrations/{TIMESTAMP}_phase4_revenue_trend_6mo.sql` — `CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(...)` with one new CTE that aggregates `lease.rent_amount` (or the same source `time_series` already uses) by month for the last 6 calendar months, then emits `time_series.monthly_revenue_6mo: jsonb[]` (one entry per month: `{ "month": "YYYY-MM", "value": <sum_dollars> }`).
- **Source CTE reuse:** the existing `time_series` block reads `leases` already; the new 6mo aggregate joins the same source (no second table scan). Preserve the shared-CTE invariant from Phase 2 D-02.
- **MCP-apply protocol:** apply via `mcp__supabase__apply_migration`, then `mcp__supabase__list_migrations` to reconcile the prod-assigned timestamp with the repo filename per `migration-mcp-prod-drift.md` memory.
- **Type regen:** `bun run db:types` after migration lands (atomic — see CLAUDE.md § Database).
- **Frontend boundary mapper:** extend `src/hooks/api/use-owner-dashboard.ts` to read the new `monthly_revenue_6mo` field and emit it on `OwnerDashboardData.timeSeries.monthlyRevenue6mo: { month: string; value: number }[]`.
- **RLS test:** dual-client ownerA/ownerB integration test in `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` confirming owner-isolation (mirrors Phase 2 D-04).
- **Both series are dollars** (no `/100` anywhere). Phase 1 D-01 fix carries through.

### D-02: Layout — 3-up row (Revenue col-2 / Donut col-1 / Quick Actions col-1)
The current `lg:grid-cols-4` grid in `dashboard.tsx:178` stays. Components rearrange:
- `<RevenueAreaChart />` — `lg:col-span-2`
- `<OccupancyDonutChart />` — `lg:col-span-1`
- `<Card data-tour="quick-actions">` (existing Quick Actions block) — `lg:col-span-1` (already col-span-1; no change)

Donut renders cleanly at ~250px container width. On `<lg` breakpoints, the grid collapses 1-column per the existing Tailwind responsive behavior — donut stacks below revenue, Quick Actions stacks below donut. No new media queries needed.

### D-03: Donut center + legend
- **Center:** large occupancy % (e.g., `87%`) stacked over a small `Occupied` label. Typography matches KPI bento `StatValue` / `StatDescription` hierarchy (see Phase 3 D-07 — same primitive can be reused or its tokens mirrored).
- **Legend:** rendered below the donut as a horizontal row: `● Occupied N  ● Vacant N`. Color swatches use `--color-chart-2` (occupied) and `--color-chart-5` (vacant) per Phase 1 UI-SPEC § 2.1. Counts are raw integers from `stats.units.occupied` and `stats.units.vacant`.
- **a11y:** the donut wrapper has `role="img"` + `aria-label="Occupancy donut: 87% occupied (87 of 100 units)"` (computed). Legend entries are real `<ul><li>` elements (colorblind-friendly — wedge color is not the only signal).
- **Honesty:** if `stats.units.total === 0` (new owner, no units), render an empty-state message inside the card (`"No units yet — add a property to see occupancy"`) instead of a `0%` donut. Same v1.0 POLISH-11 / Phase 1 D-09 honesty rule.

### D-04: 30d/6mo toggle UX
- **Placement:** segmented control in the Revenue card's `<CardHeader>` right slot. Use shadcn `<Tabs>` or `<ToggleGroup>` (whichever the project's component inventory already vendors — see `src/components/ui/`).
- **State:** local `useState<'30d' | '6mo'>` inside `RevenueAreaChart`. NOT nuqs URL persistence. Rationale: the toggle is ephemeral chart UI state, not cross-component or cross-route state; Phase 5 will adopt nuqs for the DataTable where URL-share semantics actually matter.
- **Default:** `30d` on first render. Matches the prior-art revenue chart's window and keeps the initial paint identical in shape to what the user expects (post-Phase-1 fix, just refreshed).
- **Data wiring:** `30d` reads `OwnerDashboardData.timeSeries.monthlyRevenue` (daily, existing); `6mo` reads `monthlyRevenue6mo` (monthly, new from D-01). The toggle swaps the data slice; the same `<RevenueAreaChart>` body re-renders with the new series. X-axis tick formatter switches between day-format (`Mar 12`) and month-format (`Mar`).
- **CardDescription updates with the toggle:** "Last 30 days" ↔ "Last 6 months". Non-fabricated subtitle.
- **Reduced-motion:** the toggle does NOT animate the chart transition on `prefers-reduced-motion: reduce`. Recharts default animation respects this via the shared reduced-motion hook (`src/hooks/use-reduced-motion.ts` from Phase 3) — pass `isAnimationActive={!reducedMotion}` to the `<Area>`.

### D-05: Component file structure
- **New file:** `src/components/dashboard/components/revenue-area-chart.tsx` — `RevenueAreaChart` (replaces `revenue-overview-chart.tsx`).
- **New file:** `src/components/dashboard/components/occupancy-donut-chart.tsx` — `OccupancyDonutChart`.
- **Delete:** `src/components/dashboard/components/revenue-overview-chart.tsx` in the same PR (the file gets fully replaced; no transitional rename). Atomic-commit-per-change per Phase 1 D-15.
- **Update:** `src/components/dashboard/dashboard.tsx` swaps the `RevenueOverviewChart` dynamic import for the new pair (`RevenueAreaChart` + `OccupancyDonutChart`). `revenueTrend` prop on `Dashboard` is replaced by reading from the upstream React Query selector slice (or kept as-is if a thin re-mapper makes consumption cleaner — planner's call, but the data source MUST be the new `timeSeries.monthlyRevenue` / `monthlyRevenue6mo` from the boundary mapper).

### D-06: Loading-skeleton shape match (CHART-05)
Each chart owns its own CSS-only skeleton component that matches the rendered shape (NO `dynamic`'s built-in spinner, NO mutual-exclusion violation per Phase 14 D-04):
- **Revenue skeleton:** Card shell + animated `bg-muted` rectangular bar matching the chart's `h-[Xpx]` body. Toggle control is rendered as a static disabled segmented control to preserve the header height.
- **Donut skeleton:** Card shell + `rounded-full` `bg-muted` circle matching the donut diameter + a 2-pill legend row below (also `bg-muted`).
- **Both are inside the same dynamic-import `loading:` callback.** The skeleton renders in the same container space as the real chart (no layout shift on data arrival).

### D-07: BlurFade reveal-density coordination with Phase 3
Phase 1 UI-SPEC § 5.2: ≤ 4-6 BlurFade reveals per page. Phase 3 already uses 6 reveals (one per KPI tile, with coefficient-3 skipped for inter-wave gap). Phase 4 charts MUST NOT wrap the chart cards in `<BlurFade>` — the chart row appears immediately after the bento row reveals, with no additional motion. The Recharts area/donut entrance is handled by Recharts' own `isAnimationActive` (gated on reduced-motion per D-04).

### D-08: Empty-state copy (honesty principle)
- **Revenue chart, both windows empty:** render the Card shell + a centered empty-state inside the chart body — `"No revenue data yet"` + sub-line `"Add a lease to start tracking revenue"`. No fabricated zero-line chart.
- **Revenue chart, 6mo empty but 30d populated** (edge: brand-new owner): same empty-state in the 6mo view; toggle still works and 30d still renders. No fabrication.
- **Donut, `stats.units.total === 0`:** see D-03 — render `"No units yet — add a property to see occupancy"` inside the card; no donut.
- **All copy is final and non-fabricated** per v1.0 POLISH-11 / Phase 1 D-09.

### D-09: Dark-mode contrast verification (CHART-04)
- All chart colors source from `--color-chart-{1..5}` tokens (Phase 1 UI-SPEC § 2.1) which already define light + dark mode variants.
- Axis labels use `--color-muted-foreground`; gridlines use a low-opacity border token (mirror the existing `revenue-overview-chart.tsx` pattern; planner picks the exact token from the UI-SPEC inventory).
- Legend swatches MUST be visible against `--color-card` in both modes (Phase 1 UI-SPEC § 3 + § 5.2 dark-mode requirements).
- Manual smoke test in both modes during execute-phase; the existing `design-token-drift.test.ts` is the CI gate.

### D-10: No new query-key factories; no new hook
The new RPC field rides on the existing `ownerDashboardKeys`/`ownerDashboardQueries` factory. The boundary mapper at `use-owner-dashboard.ts` gets one new line for `monthlyRevenue6mo`. No new `useQuery` call sites.

### D-11: Cross-cutting (universal — [informational], parser-recognized)
- **D-11 [informational]:** Perfect-PR merge gate applies (two consecutive zero-finding deep review cycles).
- **D-12 [informational]:** No emojis in code. No hex/rgb/`bg-white`/inline-ms. Lucide icons only. Per CLAUDE.md Zero Tolerance Rules.
- **D-13 [informational]:** `bun install --frozen-lockfile` fails in command sandbox — run `git commit` with sandbox disabled. NEVER `--no-verify` / `LEFTHOOK_EXCLUDE` (HANDOFF blocking anti-pattern carried forward from v1.0 + reaffirmed by Phase 2/3).
- **D-14 [informational]:** After every code-fixer sub-agent return, run `git status --short` + `git diff --stat` to verify what actually landed against what the agent reported (Phase 10 IN-01/IN-02 lesson + Phase 2/3 reaffirmed).
- **D-15 [informational]:** Synthetic test owners only (`e2e-owner-a@tenantflow.app` + `e2e-owner-b@tenantflow.app`) for the new RLS test. Their `subscription_status` MUST stay `'active'` (NOT `'trialing'`) to survive `expire_trials()` — see project memory for the post-merge CI failure root cause.

### Claude's Discretion

- Exact x-axis tick formatter: `Mar 12` vs `03/12` for 30d; `Mar` vs `Mar 2026` vs `Mar '26` for 6mo. Planner picks the lower-noise option.
- Whether the segmented control is shadcn `<Tabs>` vs `<ToggleGroup>` — depends on which the project's component inventory already vendors (see `src/components/ui/`).
- Exact chart heights: `h-[300px]` for revenue (mirroring the existing 400px feels heavy at col-span-2; planner picks based on visual balance), `h-[240px]` for donut (donut + legend stack).
- Whether to keep `chartConfig` import in `dashboard-types.ts` or inline the chart config per-chart (the existing single shared `chartConfig` only had one entry — `revenue` — so per-chart config files may be cleaner). Planner's call.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 source-of-truth
- `.planning/REQUIREMENTS.md` § CHART-01..CHART-06 — Phase 4 requirement specs
- `.planning/ROADMAP.md` § "Phase 4: Charts" — goal + 4 success criteria + dep order
- `.planning/PROJECT.md` — milestone vision, value statement
- `.planning/phases/01-foundation-dedup/01-CONTEXT.md` § deferred — explicit hand-off ("new charts → Phase 4"; revenue-overview-chart.tsx fully deleted here per D-13a partial deferral)
- `.planning/phases/01-foundation-dedup/01-UI-SPEC.md` — milestone-wide design contract (Phase 4 writes its own `04-UI-SPEC.md` extending this)
- `.planning/phases/02-data-layer-rpc/02-CONTEXT.md` — additive-migration + MCP-reconcile + RLS-test pattern that Phase 4 mirrors for the 6mo series
- `.planning/phases/03-kpi-bento-row/03-CONTEXT.md` — Phase 3 reduced-motion hook (`use-reduced-motion.ts`) is the canonical motion gate

### Live-code anchors (read before writing any code)
- `src/components/dashboard/components/revenue-overview-chart.tsx` — current revenue chart; deleted in Phase 4 and replaced by `revenue-area-chart.tsx`
- `src/components/dashboard/dashboard.tsx` — chart-row mount site (currently revenue + Quick Actions); Phase 4 swaps in the new chart pair
- `src/components/dashboard/dashboard-types.ts` — current `chartConfig` (single-entry); Phase 4 may relocate or replace
- `src/app/(owner)/dashboard/page.tsx` — current `revenueTrend` intermediate transform (lines ~61-68); Phase 4 either replaces it with a direct read from `OwnerDashboardData.timeSeries.monthlyRevenue` or keeps it as a thin re-mapper. The new `monthlyRevenue6mo` slice flows through the same selector path.
- `src/hooks/api/use-owner-dashboard.ts:218-290` — boundary mapper; one new line for `monthlyRevenue6mo`
- `src/hooks/use-reduced-motion.ts` — Phase 3 canonical hook; Phase 4 charts use this to gate `isAnimationActive`
- `src/components/ui/chart.tsx` + `chart-tooltip.tsx` — shadcn Recharts wrapper; both Phase 4 charts render inside `<ChartContainer>`
- `src/components/ui/card.tsx` — Card shell (already used by `revenue-overview-chart.tsx`); both charts use this shell
- `src/components/ui/tabs.tsx` OR `src/components/ui/toggle-group.tsx` — segmented control primitive for the 30d/6mo toggle (planner picks based on inventory)
- `src/types/stats.ts` § `DashboardStats.units` (`UnitStats` at lines 48-52) — donut data source (`occupied`, `vacant`, `total`)
- `src/types/analytics.ts` § `TimeSeriesDataPoint` — existing 30d series type; the new 6mo type is `{ month: string; value: number }` per D-01
- `supabase/migrations/20260301070000_unified_dashboard_rpc.sql` — current RPC; the file Phase 4's additive migration extends (via additive migration, not in-place edit)
- `supabase/migrations/2026052*phase2*.sql` — Phase 2 migration files; Phase 4 mirrors their pattern (SECURITY DEFINER, SET search_path, ::int cast on counts)

### Cross-cutting standards (inherited)
- `CLAUDE.md` — Zero Tolerance Rules (no `any`, no barrel files, no duplicate types, no inline styles, no `as unknown as`, no string-literal query keys, lucide-react only); § Database (migrations + MCP reconcile); § Security (RLS); § Testing (integration vs prod)
- `src/app/__tests__/design-token-drift.test.ts` — CI gate; every Phase 4 color reference must be from the existing palette
- `.planning/MILESTONES.md` § "Lessons Carried Forward to v2.0" — sandbox-disabled commits, code-fixer verification, user-directive-is-the-directive
- `.claude/projects/-Users-richard-Developer-tenant-flow/memory/migration-mcp-prod-drift.md` — MUST follow the prod-timestamp reconcile protocol for the Phase 4 migration

### Reference implementation (UI-SPEC + plan structure)
- `.planning/phases/03-kpi-bento-row/03-UI-SPEC.md` — canonical structure for a per-phase UI-SPEC inheriting from `01-UI-SPEC.md`; Phase 4 mirrors this format
- `.planning/phases/03-kpi-bento-row/03-PLAN.md` (three plans) — execution structure (one plan per logical wave); Phase 4 may follow the same shape

## Code Context

### Reusable Assets
- **`ChartContainer`** in `ui/chart.tsx` — shadcn Recharts wrapper; both Phase 4 charts render inside this (same pattern as Phase 3's `KpiSparkline`).
- **`Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent`** — both chart components reuse this shell (already used by the existing `revenue-overview-chart.tsx`).
- **`useReducedMotion`** at `src/hooks/use-reduced-motion.ts` — Phase 3 canonical hook; Phase 4 imports it directly to gate `isAnimationActive`.
- **`OwnerDashboardData`** at `use-owner-dashboard.ts` — single fetcher; Phase 4 reads its existing `stats` + `timeSeries.monthlyRevenue` and one new `timeSeries.monthlyRevenue6mo` field.
- **`formatCurrency`** at `lib/utils/currency.ts` — canonical formatter (Phase 1 D-09a); used in Recharts tooltips and Y-axis tick formatters.
- **`stats.units.occupied` / `vacant` / `total`** — donut data source; already in `DashboardStats.units` (Phase 2's RPC already returns this).
- **Phase 1 UI-SPEC tokens** — `--color-chart-1` (revenue), `--color-chart-2` (occupied), `--color-chart-5` (vacant), `--color-muted-foreground` (axis labels).
- **Phase 2 additive-migration pattern** — exact template for the 6mo series migration + RLS test.

### Established Patterns
- **`next/dynamic` + `ssr:false` + custom loading skeleton** — already used by the existing `RevenueOverviewChart` dynamic import in `dashboard.tsx:17-23`. Phase 4 mirrors this for both new charts (with shape-matching skeletons per D-06).
- **`isAnimationActive={!reducedMotion}`** — standard Recharts pattern for honoring `prefers-reduced-motion`. Phase 3's `KpiSparkline` uses `isAnimationActive={false}` (sparklines never animate); Phase 4's full charts animate by default but gate on reduced motion.
- **Color via `var(--color-*)` strings on Recharts components** — `stroke="var(--color-chart-1)"` (already used in `revenue-overview-chart.tsx`). NOT hex / NOT `oklch()` literals.
- **`ChartTooltip` + `ChartTooltipContent`** — shadcn-recommended tooltip composition (already used by `revenue-overview-chart.tsx`). Phase 4 carries this forward.
- **No `* 100` / `/ 100`** on any currency variable anywhere (Phase 1 UI-SPEC § 1, banned arithmetic).
- **Atomic-commit-per-change** — Phase 4 has one migration commit, one boundary-mapper commit, one revenue-chart commit, one donut commit, one mount commit, one delete-old-revenue commit, one UI-SPEC commit. Match Phase 1/3 discipline.
- **`@container` queries preferred over media queries** — for in-chart responsive behavior if needed (Phase 1 UI-SPEC § 4.2). The lg:grid-cols-4 wrapper stays as media-query Tailwind because it predates Phase 1.

### Integration Points
- **`get_dashboard_data_v2` RPC** — Phase 4 adds one new JSONB key (`time_series.monthly_revenue_6mo`) via additive migration. Existing call sites unchanged; new boundary mapper line.
- **React Query hook `use-owner-dashboard.ts`** — one new field mapped (`monthlyRevenue6mo`); zero new fetch calls; existing query keys unchanged.
- **`dashboard.tsx:17-23` dynamic import** — Phase 4 replaces the single `RevenueOverviewChart` dynamic import with two (`RevenueAreaChart` + `OccupancyDonutChart`).
- **`dashboard.tsx:178-205` chart row** — `lg:grid-cols-4` grid stays; the 3-up arrangement per D-02 just rearranges children.
- **`design-token-drift.test.ts`** — CI gate; every Phase 4 color string must reference a token defined in `globals.css` `@theme`.
- **RLS test infrastructure** — `tests/integration/rls/` dual-client pattern; new file `tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts` follows the Phase 2 reference.

## Specific Ideas

- User explicitly chose **3-up layout** (Revenue col-2 / Donut col-1 / Quick Actions col-1) — Quick Actions stays in its existing col-span-1 slot, no relocation. Donut renders at ~250px container width.
- User explicitly chose **center: 87% / Occupied with legend below** for the donut — `● Occupied N  ● Vacant N`. Counts are raw integers (per occupied/vacant breakdown).
- User explicitly chose **segmented control top-right + local useState + default 30d** for the toggle — NO nuqs URL persistence (the toggle is ephemeral chart state, not cross-component).
- User explicitly chose **RPC extension** for the 6mo series rather than dropping the toggle or deferring — the additive migration is the honest answer (the 6mo data doesn't exist; we make it exist correctly rather than fabricate).
- The v2.0 milestone bar is "perfect by all measures" — Phase 4 maintains the zero-finding perfect-PR gate (cycles 6+7 zero on Phase 1, 10+11 on Phase 2, 7+8 on Phase 3).

## Deferred Ideas

- **Chart drill-down navigation** (click bar → `/properties/[id]`, click wedge → `/leases?status=vacant`) — separable enhancement, v3.0 candidate
- **Custom date-range picker for revenue** (beyond 30d/6mo presets) — v3.0 candidate; Phase 4 keeps the two presets
- **Per-property revenue chart** (revenue broken out by property as a stacked area) — v3.0 candidate; Phase 4 stays aggregate
- **Per-property occupancy donut** (one donut per property) — v3.0 candidate; Phase 4 stays aggregate
- **`chart-area-interactive.tsx` reconsideration** — Phase 1 D-13a kept it because it has active consumers under `/analytics/overview` + `/properties/units`; Phase 4 does NOT touch it. A future v3.0 unified-chart-library phase may consolidate.
- **`activeTenants` trend honest computation** — KPI bento Phase 3 D-04 surfaces this; trend exists via `metricTrends.activeTenants` but is not currently mapped to a tile. Out of scope for Phase 4 (chart phase, not KPI tile phase).

---

*Phase: 04-charts*
*Context gathered: 2026-05-26*
