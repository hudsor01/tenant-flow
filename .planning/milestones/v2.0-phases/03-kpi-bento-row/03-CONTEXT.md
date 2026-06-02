---
phase: 3
phase_name: KPI Bento Row
milestone: v2.0
slug: kpi-bento-row
status: locked
discussed: 2026-05-23
depends_on: [1, 2]
inherits_ui_spec: ".planning/phases/01-foundation-dedup/01-UI-SPEC.md"
requirements: [KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06, KPI-07]
---

# Phase 3 — KPI Bento Row: CONTEXT

## Goal

Replace the one-line text header on `/dashboard` with a 6-tile KPI bento row — using the already-vendored `Stat` + `NumberTicker` + `BlurFade` primitives and a plain `@container` CSS grid (NOT `ui/bento-grid.tsx`). Sparklines on Revenue + Occupancy only. Reduced-motion respected on every animation surface.

## Domain

UI phase. Adds Section B (between the page header and the chart row). Read-only display of metrics already provided by `get_dashboard_data_v2`. Does NOT introduce new data fetches; consumes the existing `OwnerDashboardData.stats` + `metricTrends` + `timeSeries` from `use-owner-dashboard.ts`.

OUT OF SCOPE:
- New charts (Phase 4)
- DataTable refactor (Phase 5)
- KPI tile click navigation / drill-down (deferred — see D-03)
- New trend signals beyond what `metricTrends` already provides
- Mobile-specific layout (Phase 6 polish)

## Locked Decisions

### D-01: Tile order — financial-first hierarchy
Left-to-right (and wrapping order on narrower viewports):
1. **Revenue** (Monthly) — with 30-day sparkline + trend
2. **Occupancy** (Rate %) — with 30-day sparkline + trend
3. **Active Leases** — count + trend
4. **Open Maintenance** — count + trend
5. **Properties** — count (no trend signal exists)
6. **Units** — count (no trend signal exists)

Rationale: financial signal first matches landlord product mental model; sparkline tiles cluster at the leading edge for visual weight; count-only tiles (Properties, Units) trail without trend ornament.

### D-02: Sparkline data source — RPC `timeSeries` (30-day daily)
The unified RPC already emits `timeSeries.occupancy_rate` + `timeSeries.monthly_revenue` as 30-day daily series (`TimeSeriesDataPoint[]`). Phase 3 reads these directly — NO new fetcher, NO new RPC. The `KpiSparkline` component renders the array as an axis-less Recharts `Area` inside `ChartContainer`.

Trend direction colors (per Phase 1 UI-SPEC § Status Map):
- Up trend → `--color-success` stroke + low-opacity fill
- Down trend → `--color-warning` (Revenue/Occupancy down is warning, not destructive — destructive is reserved for errors per the UI-SPEC)
- Stable → `--color-muted-foreground`

### D-03: Tiles are NOT clickable in Phase 3
Static read-only display. No `<a>`, no `<Link>`, no `onClick`. Rationale:
- Phase 3's scope per ROADMAP is "replace the one-line header" — adding navigation expands scope.
- The left nav already provides primary navigation to `/properties`, `/leases`, `/maintenance`, etc.
- Tile-as-link adds focus-trap + a11y review surface that Phase 6 would audit anyway.
- If interactive tiles are wanted later, they're a separable Phase 5+ enhancement on top of the static surface.

### D-04: Trend indicators from `metricTrends` (RPC-provided)
`OwnerDashboardData.metricTrends` already exposes `occupancyRate`, `activeTenants`, `monthlyRevenue`, `openMaintenance` (each is `MetricTrend | null`). Map:
- Revenue tile → `metricTrends.monthlyRevenue`
- Occupancy tile → `metricTrends.occupancyRate`
- Active Leases tile → `metricTrends.activeTenants`
- Open Maintenance tile → `metricTrends.openMaintenance`
- Properties tile → no trend (omit `<StatTrend>`)
- Units tile → no trend (omit `<StatTrend>`)

When `metricTrends.<field>` is `null`, render the tile WITHOUT the trend indicator (no fabricated `0%` per the v1.0 honesty principle — this is the same rule as POLISH-11/D-01 from Phase 2).

### D-05: BlurFade reveal stagger — 80ms × 4 reveals max
Per Phase 1 UI-SPEC § Motion Budget: "BlurFade ≤ 4 reveals per page." With 6 tiles + the chart row + the portfolio toolbar already revealing in waves, Phase 3 collapses tile reveals into 2 logical waves:
- Wave A: tiles 1-3 (Revenue, Occupancy, Active Leases) reveal together with 80ms stagger
- Wave B: tiles 4-6 (Open Maintenance, Properties, Units) reveal 160ms after Wave A with 80ms stagger

Reduced-motion users see all 6 tiles appear immediately (no BlurFade wrapping, no stagger).

### D-06: NumberTicker duration ≤ 800ms; reduced-motion → final value immediately
NumberTicker is reserved for KPI tile values ONLY (per Phase 1 UI-SPEC). Each tile's primary value (`$1,234`, `87%`, `42`) animates from 0 to final on first reveal. Subsequent renders (e.g., data refresh) animate from previous value to new value. Per UI-SPEC, `prefers-reduced-motion: reduce` → static value, no tick.

### D-07: Tile shell — `Stat` primitive with default density
Use the vendored `ui/stat.tsx` `Stat` shell:
```
<Stat>
  <StatLabel>Revenue</StatLabel>
  <StatValue><NumberTicker value={metrics.totalRevenue} format="currency" /></StatValue>
  <StatTrend direction={trend?.trend ?? 'stable'} value={trend?.percentChange ?? 0} />
  <StatDescription>This month</StatDescription>
  {sparkline && <KpiSparkline data={sparklineData} />}
</Stat>
```
Per UI-SPEC density:default — `bg-card`, `rounded-lg`, `border`, `p-4` (`p-6` at `@4xl` container size). Sparkline tiles add `h-16` sparkline below `StatDescription`.

### D-08: Loading state — Skeleton tiles in identical grid layout
On first load (no data yet), render 6 `<Skeleton>` rectangles in the same `@container` grid — so the layout doesn't reflow when data lands. Skeleton tile height matches the tallest sparkline-bearing tile so all 6 skeletons render uniformly. Reuse existing skeleton component patterns (per UI-SPEC density:default).

### D-09: Empty state — actual zero values, no fabrication
If `stats.revenue.monthly === 0`, render `$0` (NOT "No data yet" or "—"). Same for `occupancyRate: 0%` (NOT "No occupancy data"). If `metricTrends.<field>` is `null` (genuinely no trend data — e.g., first month of operation), omit the trend indicator entirely (D-04). Phase 1's POLISH-11 honesty principle applies: never fabricate, never paper-over.

### D-10: `@container` grid — `auto-fit minmax(180px, 1fr)`
The grid container uses `@container` queries (NOT viewport media queries). Default: `grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4`. At `@4xl` container width (≥896px), bump to `gap-6`. At `@xl` (≥640px), wraps to 3 cols naturally via auto-fit. At narrowest (≤375px per UI-SPEC), wraps to 1 column.

NOT `ui/bento-grid.tsx` — that's marketing layout (forbidden for KPI tiles per Phase 1 UI-SPEC § Forbidden Imports).

### D-11: Sparkline component — new `KpiSparkline` in `src/components/dashboard/components/`
New file: `src/components/dashboard/components/kpi-sparkline.tsx`. Props:
```typescript
interface KpiSparklineProps {
  data: TimeSeriesDataPoint[];
  trend: 'up' | 'down' | 'stable';
  ariaLabel: string;
}
```
Renders an axis-less Recharts `Area` inside `ChartContainer` (per Phase 1 UI-SPEC Recharts pattern). Height fixed at 64px (`h-16`). Color from trend (D-02). No tooltips (sparkline is decorative; the actual value is the KPI digits above). `aria-label` describes the metric ("Revenue trend over the last 30 days, currently $X, trending up").

### D-12: New tile-orchestration component — `KpiBentoRow`
New file: `src/components/dashboard/components/kpi-bento-row.tsx`. Receives `OwnerDashboardData` (the existing fetcher shape) and renders the 6-tile `@container` grid. Wraps each tile in `BlurFade` (D-05) with reduced-motion respect. Consumed by `dashboard.tsx` (replacing the current header `<p>` element).

## Canonical Refs (MANDATORY)

- `.planning/PROJECT.md` — milestone vision
- `.planning/REQUIREMENTS.md` § KPI-01..KPI-07 — Phase 3 requirement specs
- `.planning/ROADMAP.md` § Phase 3 — success criteria
- `.planning/phases/01-foundation-dedup/01-CONTEXT.md` — Phase 1 deferred section explicitly hands KPI work to Phase 3
- `.planning/phases/01-foundation-dedup/01-UI-SPEC.md` — milestone-wide design contract (inherits — Phase 3 writes its own UI-SPEC extending this)
- `.planning/phases/02-data-layer-rpc/02-CONTEXT.md` — Phase 2 data layer (Phase 3 consumes its outputs)
- `src/hooks/api/use-owner-dashboard.ts` — fetcher; emits `OwnerDashboardData` with `stats`, `metricTrends`, `timeSeries` consumed by Phase 3
- `src/components/dashboard/dashboard.tsx` — Phase 3 modifies this file to replace the header with the KpiBentoRow
- `src/components/ui/stat.tsx` — Stat shell + StatLabel + StatValue + StatTrend + StatDescription
- `src/components/ui/number-ticker.tsx` — NumberTicker (Phase 2 v1.0 hardened the IntersectionObserver + rAF cleanup; Phase 3 consumer)
- `src/components/ui/blur-fade.tsx` — BlurFade
- `src/components/ui/chart.tsx` + `chart-tooltip.tsx` — shadcn chart primitives (KpiSparkline consumer)
- `CLAUDE.md` — Zero Tolerance Rules, accessibility, design-token discipline
- `src/types/sections/dashboard.ts` — DashboardMetrics interface (post-Phase-2 — `collectionRate` already dropped)
- `src/lib/utils/currency.ts` — `formatCurrency` (use `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }` per Phase 1 D-09a)
- `src/types/analytics.ts` — TimeSeriesDataPoint (KpiSparkline input type)

## Code Context

### Reusable Assets
- **`Stat` / `StatLabel` / `StatValue` / `StatTrend` / `StatDescription`** in `ui/stat.tsx` — already vendored, used by the marketing site; Phase 3 is the first dashboard consumer.
- **`NumberTicker`** in `ui/number-ticker.tsx` — hardened in v1.0 Phase 2 (one-shot IntersectionObserver, rAF cleanup, reduced-motion respect).
- **`BlurFade`** in `ui/blur-fade.tsx` — reveal animation primitive.
- **`ChartContainer`** in `ui/chart.tsx` — shadcn Recharts wrapper. `KpiSparkline` renders inside this.
- **`OwnerDashboardData`** at `use-owner-dashboard.ts` — single fetcher; emits stats + metricTrends + timeSeries.
- **`formatCurrency`** at `lib/utils/currency.ts` — canonical formatter (Phase 1 D-09a).
- **Phase 1 UI-SPEC tokens** (`--color-card`, `--color-success`, `--color-warning`, `--color-muted-foreground`) — used by tile shells and sparklines.

### Established Patterns
- **No inline styles** (Zero Tolerance Rule 5) — all visual variants go through Tailwind utilities + design tokens.
- **`size-N` not `h-N w-N`** for icon containers (Phase 1 cycle-4 finding).
- **Lucide icons only** for trend indicators (`ArrowUp`, `ArrowDown`, `Minus`) — NOT `animated-trend-indicator.tsx` (KPI-04 forbids it; inline-style violation).
- **`aria-hidden` on decorative icons + `aria-label` on icon-only interactive elements** — Phase 1 baseline.
- **Reduced-motion respect** is non-negotiable — every animation surface checks `matchMedia('(prefers-reduced-motion: reduce)')`.
- **`@container` queries** (NOT viewport queries) for tile layout — Phase 1 UI-SPEC.
- **`design-token-drift.test.ts`** runs in CI — any new design token use must be from the existing palette.

### Integration Points
- **`dashboard.tsx` header replacement** — the current `<p className="text-sm text-muted-foreground">...units occupied | ...this month</p>` (post-Phase-1 final state) becomes the `<KpiBentoRow data={dashboardData} />` mount point.
- **`OwnerDashboardData` consumer** — `KpiBentoRow` receives the data via prop drilling from `dashboard.tsx` (which itself consumes via `useDashboardData()` selector hooks). No new hook needed.
- **`design-token-drift.test.ts`** — every new color reference must be from `globals.css` `@theme` block; CI gate.
- **Phase 1 inline `<span aria-hidden="true">|</span>` separator** in `dashboard.tsx:172` — Phase 3 deletes that whole `<p>` element (header replaced wholesale).
- **No new query-key factories needed** — `KpiBentoRow` is a presentation component; data fetching is upstream.

## UI-SPEC follow-on

Phase 3 requires its own `03-UI-SPEC.md` (per ROADMAP — Phase 3 is a UI phase). Spawned by `/gsd-ui-phase 3` after this CONTEXT.md commits. The UI-SPEC will design:
- Per-tile micro-layout (label position, value typography, trend chip placement, sparkline anchor)
- Container queries (specific breakpoints + grid behavior)
- Color usage map for status colors on sparklines
- Motion timing (BlurFade delay coefficients, NumberTicker easing curve)
- A11y hooks (region landmarks, aria-labels for sparklines, focus order)

`03-UI-SPEC.md` inherits from `01-UI-SPEC.md` (milestone-wide). Phase 3 is forbidden from inventing new design tokens; only the existing palette + density scale are allowed.

## Visible Changes At Merge
1. `/dashboard` no longer shows the one-line "X of Y units occupied | $Z this month" header.
2. In its place, a 6-tile bento row with animated KPI values + trend chips + 2 sparklines.
3. First-load: 6 Skeleton tiles in identical grid; data lands → smooth swap via BlurFade.
4. Reduced-motion users: tiles + values appear instantly with NO BlurFade and NO NumberTicker animation.
5. Dark mode: tiles inherit `--color-card` from the existing palette (already validated).

## Deferred (for future phases)
- **Clickable KPI tiles → drill-down navigation** — separable enhancement, Phase 5+ or v3.0 milestone.
- **Custom date-range for sparklines** (30d / 6mo toggle) — that's Phase 4's chart toggle territory. Phase 3 keeps fixed-30-day sparklines.
- **Per-tile color variants** (e.g., red Open Maintenance border when > N open) — visual signal beyond the trend chip; Phase 6 polish candidate if user feedback warrants it.
- **Per-tile contextual help (popovers / tooltips on label)** — out of scope.
- **Persisting tile order via nuqs** — DataTable feature (Phase 5), not Phase 3.
- **Bento layout variants beyond auto-fit** (e.g., asymmetric large/small tiles) — explicitly OUT per ROADMAP (D-10 + KPI-07).
