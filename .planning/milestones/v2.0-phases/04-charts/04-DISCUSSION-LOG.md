# Phase 4: Charts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 04-charts
**Areas discussed:** 6-month series source, Layout placement, Donut center + legend, Toggle UX + state

---

## 6-month series source

**Premise verified pre-question:** `supabase/migrations/20260301070000_unified_dashboard_rpc.sql` line 224 emits `time_series` as exactly 30 daily points via `generate_series(current_date - 29, current_date, '1 day')`. 6-month aggregate does not exist anywhere in the schema. Either the RPC grows or the toggle goes.

| Option | Description | Selected |
|--------|-------------|----------|
| Extend RPC | Additive migration: add `revenue_trend_6mo` (6 monthly aggregates) to `get_dashboard_data_v2`. Mirrors Phase 2 pattern (same shared-CTE discipline, same RLS test addition). Honest data, ships with the chart. | ✓ |
| Drop the toggle | 30d-only revenue chart. Reword CHART-01 to remove the toggle. Smaller scope, ships faster, but the requirement explicitly calls for 30d/6mo. | |
| Defer to Phase 4.5 | Ship the 30d chart now; spin a follow-up phase for the RPC extension + toggle. Cleaner phase boundaries but ships incomplete vs. requirement. | |

**User's choice:** Extend RPC (Recommended)
**Notes:** Selected the option that honors the requirement honestly. Phase 2 already established the additive-migration + MCP-reconcile + RLS-test discipline; Phase 4 mirrors that pattern. Locked as D-01 in CONTEXT.md.

---

## Layout placement

| Option | Description | Selected |
|--------|-------------|----------|
| 3-up: Revenue 2 / Donut 1 / Quick Actions 1 | Single row, all visible above fold. Revenue stays primary (col-span-2), donut slots between (col-span-1), Quick Actions retains its spot (col-span-1). Tightest donut footprint but renders cleanly at ~250px. | ✓ |
| Revenue + Donut row, Quick Actions below | Charts get a dedicated row: Revenue col-span-3 + Donut col-span-1. Quick Actions drops to a new row below (full-width strip or trimmed Card). Cleaner chart focus, Quick Actions less prominent. | |
| Revenue full-width, Donut + QuickActions below | Revenue spans full row alone (col-span-4). Below: Donut (col-span-2) + Quick Actions (col-span-2). Biggest revenue chart, donut gets more room, Quick Actions stays prominent. | |

**User's choice:** 3-up: Revenue 2 / Donut 1 / Quick Actions 1 (Recommended)
**Notes:** Single-row arrangement keeps Quick Actions in its existing col-span-1 slot without rearranging the dashboard. The `lg:grid-cols-4` wrapper stays; only the children rearrange. Locked as D-02.

---

## Donut center + legend

| Option | Description | Selected |
|--------|-------------|----------|
| Center: 87% / Occupied. Legend: below | Center stacks large pct over small "Occupied" label. Legend below donut shows "Occupied N  Vacant N" with color swatches. Matches KPI bento typography hierarchy. | ✓ |
| Center: 87 / 100. Legend: right side | Center shows raw counts (occupied/total). Legend to the right of the donut, vertical stack with percentages. | |
| Center: 87%. Legend: none (just hover tooltip) | Minimal: just the % in the middle, no legend at all. Wedge details available via Recharts hover tooltip. Cleanest visually, but legend swatches are the standard for a11y/colorblind users. | |

**User's choice:** Center: 87% / Occupied. Legend: below (Recommended)
**Notes:** Picked the option with real `<ul><li>` legend entries (colorblind-friendly — wedge color is not the only signal). Wedge colors stay locked to `--color-chart-2` (occupied) + `--color-chart-5` (vacant) per Phase 1 UI-SPEC § 2.1. Locked as D-03.

---

## Toggle UX + state

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control top-right, local useState, default 30d | shadcn Tabs (or ToggleGroup) in CardHeader right slot. Local component state — no URL persistence (single chart, ephemeral). Default 30d matches the prior-art revenue chart on first load. | ✓ |
| Segmented control top-right, nuqs URL, default 30d | Same UI placement, but persist via nuqs (`?revenueRange=30d|6mo`). Survives reload, shareable. Slightly heavier; consistent with Phase 5 DataTable's nuqs usage. | |
| Segmented control top-right, local useState, default 6mo | Same as recommended but defaults to 6mo on first load — broader trend context out of the box. | |

**User's choice:** Segmented control top-right, local useState, default 30d (Recommended)
**Notes:** No nuqs — the toggle is ephemeral chart UI state, not cross-component or cross-route state. Phase 5 will adopt nuqs for the DataTable where URL-share semantics actually matter. Locked as D-04.

---

## Claude's Discretion

- Exact x-axis tick formatter (`Mar 12` vs `03/12` for 30d; `Mar` vs `Mar 2026` vs `Mar '26` for 6mo). Planner picks the lower-noise option.
- Whether the segmented control is shadcn `<Tabs>` vs `<ToggleGroup>` — depends on which the project's component inventory already vendors (see `src/components/ui/`).
- Exact chart heights: `h-[300px]` for revenue (mirroring the existing 400px feels heavy at col-span-2; planner picks based on visual balance), `h-[240px]` for donut (donut + legend stack).
- Whether to keep `chartConfig` import in `dashboard-types.ts` or inline the chart config per-chart.

## Deferred Ideas

- Chart drill-down navigation (click bar → `/properties/[id]`, click wedge → `/leases?status=vacant`) — v3.0 candidate
- Custom date-range picker for revenue (beyond 30d/6mo presets) — v3.0 candidate
- Per-property revenue chart (stacked area by property) — v3.0 candidate
- Per-property occupancy donut — v3.0 candidate
- `chart-area-interactive.tsx` reconsideration — Phase 4 does NOT touch it (Phase 1 D-13a kept it because it has active consumers under `/analytics/overview` + `/properties/units`); future v3.0 unified-chart-library phase may consolidate
- `activeTenants` trend wiring into a KPI tile — out of scope for Phase 4 (chart phase, not KPI tile phase)
