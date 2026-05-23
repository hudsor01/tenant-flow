# Requirements: TenantFlow v2.0 — Dashboard Command Center

**Defined:** 2026-05-22
**Core Value:** The authenticated owner dashboard at `/dashboard` becomes a restrained, professional B2B command center — KPI visibility above the fold, polished charts, a real DataTable with column controls + saved presets, full keyboard/dark-mode/mobile a11y. Every dollar amount handled correctly throughout the data path (no `*100`/`÷100` round-trip).

**Source spec:** `.planning/MILESTONE-CONTEXT.md` (copy of the user's parked plan at `/Users/richard/.claude/plans/i-want-to-enhance-hazy-island.md`).

## Cross-Cutting Constraints (apply to ALL requirements)

**Design-token alignment** (inherited from v1.0 honesty milestone):
- Color: `--color-*` tokens only (oklch); never hex/rgb/named colors. Status states via `--color-{success,warning,info,destructive}`.
- Surfaces: `bg-background`, `bg-card`, `bg-muted` — never `bg-white`.
- Text: `text-foreground`, `text-muted-foreground` — never bare `text-muted` or hex.
- Spacing: `--spacing-*` scale only.
- Radius: `--radius-{sm,md,lg,xl,2xl,full}` only.
- Shadow: `--shadow-{sm,md,lg,xl,2xl}` only.
- Animation: `--duration-*` + `--ease-*` tokens; never inline ms.
- Chart colors: `--color-chart-{1..5}` for data viz.
- Icons: `lucide-react` only.

The `design-token-drift.test.ts` Vitest guard from Phase 11 (v1.0) continues to enforce in CI.

**No `*100` / `/100` revenue arithmetic anywhere.** `get_dashboard_data_v2` returns dollars; the v1.0→v2.0 cleanup ends the round-trip permanently. Any new file or edit that introduces a `* 100` or `/ 100` on a currency value fails the perfect-PR gate.

**Restrained B2B aesthetic.** No `@magicui` / `@aceternity` flash. The `ui/bento-grid.tsx` marketing component is unsuitable for the KPI bento — use a plain `@container` CSS grid of `Stat` tiles.

**Independently shippable phases.** Each phase ships as one atomic PR through the perfect-PR gate (two consecutive zero-finding deep review cycles). The dashboard must never break mid-milestone.

## v2 Requirements

Each maps to roadmap phases (1-7). Source: `.planning/MILESTONE-CONTEXT.md` § "Component substitution map" + § "Critical files".

### KPI Visibility (KPI) — Phase 3

- [ ] **KPI-01**: 6-tile KPI bento row replaces the one-line text header on `/dashboard`. Tiles: Revenue, Occupancy, Active Leases, Open Maintenance, Properties, Units.
- [ ] **KPI-02**: Each tile renders via `ui/stat.tsx` `Stat` shell (already vendored) — `StatLabel` + `StatValue` + `StatTrend` + optional `StatDescription`.
- [ ] **KPI-03**: KPI numbers animate via `ui/number-ticker.tsx` `NumberTicker` (already vendored) with `prefers-reduced-motion` guard.
- [ ] **KPI-04**: `StatTrend` arrow uses Lucide arrow (preferred over `animated-trend-indicator.tsx` which carries an inline-style violation).
- [ ] **KPI-05**: Sparklines on Revenue + Occupancy tiles only — `KpiSparkline` component (NEW) = axis-less Recharts `Area` in `ChartContainer`.
- [ ] **KPI-06**: Section reveals stagger via `ui/blur-fade.tsx` `BlurFade` (already vendored), max ~4 reveals, reduced-motion aware.
- [ ] **KPI-07**: KPI grid uses `@container` CSS grid auto-fit, NOT `ui/bento-grid.tsx` (that's a marketing component with absolute backgrounds + hover-reveal CTAs).

### Charts + Data Visualization (CHART) — Phase 4

- [ ] **CHART-01**: New `RevenueAreaChart` replaces `revenue-overview-chart.tsx`. Refreshed Recharts `Area` with 30d / 6mo toggle.
- [ ] **CHART-02**: New `OccupancyDonutChart` — Recharts donut with center label + legend, reading from `stats.units` returned by `get_dashboard_data_v2`.
- [ ] **CHART-03**: Chart colors source exclusively from `--color-chart-{1..5}` tokens.
- [ ] **CHART-04**: Dark-mode contrast verified — no invisible series, no white-on-white legend swatches, no missing axis-label contrast.
- [ ] **CHART-05**: Chart loading skeletons match the chart's actual rendered shape (no skeleton-then-empty mutual-exclusion violation, per Phase 14 D-04 pattern).
- [ ] **CHART-06**: Charts dynamically imported via `next/dynamic` with `ssr: false` and CSS-only loading skeletons (project performance convention).

### Portfolio DataTable (DT) — Phase 5

- [ ] **DT-01**: Replace `portfolio-table.tsx` + `portfolio-toolbar.tsx` + `portfolio-pagination.tsx` with vendored DiceUI DataTable composition.
- [ ] **DT-02**: New `useClientDataTable` hook — thin variant of `src/hooks/use-data-table.ts` for client-side (one-array) data (`manualPagination/Sorting/Filtering: false`).
- [ ] **DT-03**: New `portfolio-columns.tsx` column model with `aria-sort` on every sortable header.
- [ ] **DT-04**: Faceted status filter via `DataTableFacetedFilter` (already vendored).
- [ ] **DT-05**: Column visibility via `DataTableViewOptions` (already vendored).
- [ ] **DT-06**: Row virtualization via `@tanstack/react-virtual` `useVirtualizer` (already installed).
- [ ] **DT-07**: Grid / table view toggle — atomic state in `dashboard-store.ts` `viewMode`.
- [ ] **DT-08**: Saved filter presets persist in `localStorage` via new `dashboard-presets-store.ts` (Zustand `persist` slice).
- [ ] **DT-09**: Live filter / sort / page state in `nuqs` URL params (replaces bespoke Zustand state). Trim `dashboard-store.ts` to `viewMode` only.

### Polish, A11y, Bug Fix (POLISH) — Phases 1, 6, 7

- [ ] **POLISH-01**: **Drop every `*100` in the revenue path.** Specifically `src/app/(owner)/dashboard/page.tsx` lines 71, 92, 107 (and any other `* 100` on a currency variable). `get_dashboard_data_v2` returns dollars; do not re-multiply.
- [ ] **POLISH-02**: **Drop every `/100` in the revenue path.** Specifically `formatDashboardCurrency` (rename to `formatCurrency`, no division) and `revenue-overview-chart.tsx:41` (deleted with the chart). Net effect: in-memory values become correct (currently 100× wrong); display stays correct (the bug cancelled itself).
- [ ] **POLISH-03**: Delete `owner-dashboard.tsx` (near-duplicate of `dashboard.tsx`), `chart-area-interactive.tsx`, dashboard-filters duplicates, the second `portfolio-toolbar.tsx`, `skeletons.tsx`. Extract the shared data transform into one place.
- [ ] **POLISH-04**: Dark-mode audit on every new dashboard surface — toggle theme, scan for white-on-white, invisible badges, `bg-white` references.
- [ ] **POLISH-05**: Keyboard a11y — visible focus rings on every interactive element, icon-button `aria-label`s, skip-to-content reachable from header.
- [ ] **POLISH-06**: 375px responsive — zero horizontal scroll; portfolio table forces grid view at the mobile breakpoint.
- [ ] **POLISH-07**: Skeleton ↔ empty-state mutual exclusion (Phase 14 D-04 pattern: route-scoped `loading.tsx` if streaming is involved; never co-render skeleton + empty state).
- [ ] **POLISH-08**: Reduced-motion guard on every animation (`NumberTicker`, `BlurFade`, chart transitions, any CSS animation).
- [ ] **POLISH-09**: E2E smoke for `/dashboard` (synthetic owner; KPI numbers match `get_dashboard_data_v2`; occupancy donut matches `stats.units`; DataTable sort/filter/column-visibility/preset save+restore work; grid/table toggle works).
- [ ] **POLISH-10**: Phase-2 additive `get_dashboard_data_v2` migration for per-property `open_maintenance` (or ship the column hidden by default if the RPC change is too invasive). RLS owner-isolation test extends the existing dual-client pattern in `tests/integration/rls/`.
- [ ] **POLISH-11**: `collection_rate` — resolve compute-or-drop in Phase 2 discuss-phase. TenantFlow demolished rent facilitation; the field is likely uncomputable and should be dropped from the KPI set rather than fabricated as `0`. **Never fabricate a metric.**
- [ ] **POLISH-12**: Final design-token sweep across every new dashboard file — `design-token-drift.test.ts` must stay green.

## Future Requirements

Deferred to v2.1+ if preset persistence outgrows localStorage:

- **DT-FUTURE-01**: Server-side saved view persistence (Supabase table + RLS); UI hooks into `dashboard-presets-store.ts` so existing UX doesn't change.
- **DT-FUTURE-02**: Shareable view URLs (encode preset payload in nuqs URL, copyable from the preset menu).

## Out of Scope

| Feature | Reason |
|---------|--------|
| New product capabilities beyond the dashboard surface | v2.0 is a focused UI/UX redesign, not a feature expansion. New capabilities go to v2.1+. |
| `ui/bento-grid.tsx` as the KPI container | Marketing component (absolute image backgrounds, hover-reveal CTAs, fixed 18rem rows). Unsuitable for compact KPI tiles. |
| `@magicui` / `@aceternity` flash | Restrained B2B aesthetic per the parked plan. |
| `animated-trend-indicator.tsx` | Carries an inline-style violation. Use `StatTrend` + Lucide arrow instead. |
| `*100` / `/100` revenue arithmetic ANYWHERE | Cross-cutting hard rule. v2.0 ends the bug; future re-introduction fails the perfect-PR gate. |
| Fabricated metrics (e.g., `collectionRate = 0` when uncomputable) | Honesty principle inherited from v1.0. If a metric can't be computed, drop the tile — don't lie. |
| Server-side saved view persistence | Deferred to DT-FUTURE-01. v2.0 ships localStorage-only. |
| Shareable view URLs | Deferred to DT-FUTURE-02. |
| Rent payment facilitation re-introduction | Demolished April 2026. Never re-add. `collection_rate` follow-on is the closest field; resolve in Phase 2 discuss. |
| Visual redesign outside `/dashboard` | This milestone only touches authenticated owner dashboard surface. Marketing surfaces are v1.0-validated; do not regress them. |

## Traceability

Updated by `gsd-roadmapper` during roadmap creation. See ROADMAP.md for canonical phase assignments.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KPI-01 | Phase 3 | Pending |
| KPI-02 | Phase 3 | Pending |
| KPI-03 | Phase 3 | Pending |
| KPI-04 | Phase 3 | Pending |
| KPI-05 | Phase 3 | Pending |
| KPI-06 | Phase 3 | Pending |
| KPI-07 | Phase 3 | Pending |
| CHART-01 | Phase 4 | Pending |
| CHART-02 | Phase 4 | Pending |
| CHART-03 | Phase 4 | Pending |
| CHART-04 | Phase 4 | Pending |
| CHART-05 | Phase 4 | Pending |
| CHART-06 | Phase 4 | Pending |
| DT-01 | Phase 5 | Pending |
| DT-02 | Phase 5 | Pending |
| DT-03 | Phase 5 | Pending |
| DT-04 | Phase 5 | Pending |
| DT-05 | Phase 5 | Pending |
| DT-06 | Phase 5 | Pending |
| DT-07 | Phase 5 | Pending |
| DT-08 | Phase 5 | Pending |
| DT-09 | Phase 5 | Pending |
| POLISH-01 | Phase 1 | Pending |
| POLISH-02 | Phase 1 | Pending |
| POLISH-03 | Phase 1 | Pending |
| POLISH-04 | Phase 6 | Pending |
| POLISH-05 | Phase 6 | Pending |
| POLISH-06 | Phase 6 | Pending |
| POLISH-07 | Phase 6 | Pending |
| POLISH-08 | Phase 6 | Pending |
| POLISH-09 | Phase 7 | Pending |
| POLISH-10 | Phase 2 | Pending |
| POLISH-11 | Phase 2 | Pending |
| POLISH-12 | Phase 7 | Pending |

**Coverage:**
- v2 requirements: 34 total (KPI: 7, CHART: 6, DT: 9, POLISH: 12)
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-22*
*Source spec: `.planning/MILESTONE-CONTEXT.md` (parked plan: `i-want-to-enhance-hazy-island.md`)*
