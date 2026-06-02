---
phase: 3
discussed: 2026-05-23
---

# Phase 3 Discussion Log

## Domain Boundary

UI phase adding Section B (KPI bento row) between page header and chart row. Consumes existing `OwnerDashboardData` shape from `use-owner-dashboard.ts` — NO new data fetches, NO new RPCs.

ROADMAP locked the structural decisions before this phase:
- 6 tiles: Revenue, Occupancy, Active Leases, Open Maintenance, Properties, Units
- Sparklines on Revenue + Occupancy only
- Vendored primitives: `Stat` + `NumberTicker` + `BlurFade`
- `@container` grid (NOT `ui/bento-grid.tsx`)

## Discussion

All remaining decisions are implementation choices defaulted to defensible answers (per user pattern of fast-intuitive opinionated execution). Each is captured as a numbered D-NN decision in `03-CONTEXT.md`. The genuinely user-owned product call (interactive tiles vs static) was resolved by scope: tiles are NOT clickable in Phase 3 — adds focus-trap + a11y review surface that's separable enhancement work (Phase 5+ or v3.0).

### Decisions inventory (full table → `03-CONTEXT.md`)

| Decision | Choice | Why |
|----------|--------|-----|
| D-01 Tile order | Revenue → Occupancy → Active Leases → Open Maintenance → Properties → Units | Financial-first hierarchy; sparkline tiles cluster left; count-only tiles trail |
| D-02 Sparkline data | RPC `timeSeries` (30-day daily) | Already in payload, no new fetch |
| D-03 Click behavior | NOT clickable | Scope discipline; left nav handles navigation; reduces Phase-6 a11y review surface |
| D-04 Trend source | `metricTrends` for 4 tiles; Properties/Units omit | RPC already provides; null → omit (no fabrication) |
| D-05 BlurFade stagger | 80ms × 2 waves of 3 tiles | UI-SPEC budget: ≤4 reveals per page; reduced-motion → none |
| D-06 NumberTicker | ≤800ms; reduced-motion → static | UI-SPEC reserves NumberTicker for KPI values only |
| D-07 Tile shell | `Stat` primitive, density:default | Vendored shadcn primitive; UI-SPEC density scale |
| D-08 Loading state | Skeleton tiles in identical grid | Prevents layout reflow |
| D-09 Empty state | Actual zero values (`$0`, `0%`, `0`) | v1.0 honesty principle; never fabricate |
| D-10 Grid | `@container` auto-fit `minmax(180px, 1fr)` | UI-SPEC + KPI-07 explicit |
| D-11 New component | `KpiSparkline` in dashboard/components/ | Axis-less Recharts Area + ChartContainer |
| D-12 New component | `KpiBentoRow` in dashboard/components/ | Tile orchestration + BlurFade |

## Carry-forward Verification

Phase 1 CONTEXT.md `<deferred>` section explicitly carried:
- "Section-level visual designs — Phase 3 UI-SPEC (KPI), Phase 4 UI-SPEC (charts), Phase 5 UI-SPEC (DataTable). Phase 1 UI-SPEC is rules-only and inherited by these."

Phase 2 CONTEXT.md `<deferred>` section:
- (Phase 2 didn't carry forward to Phase 3 explicitly; the dependency is structural — Phase 3 consumes Phase 2's RPC outputs.)

## Deferred (out of Phase 3 scope)
- Interactive KPI tiles with drill-down navigation
- Sparkline 30d/6mo toggle (Phase 4 territory)
- Custom per-tile color variants
- Per-tile popover help
- nuqs URL state for tile order/visibility
- Bento layout variants beyond auto-fit
