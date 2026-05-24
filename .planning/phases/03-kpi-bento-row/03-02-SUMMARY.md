---
phase: 03-kpi-bento-row
plan: 02
subsystem: dashboard-ui
tags: [kpi-bento-row, blur-fade, number-ticker, reduced-motion, stat-shell, container-queries]
requirements-completed:
  - KPI-01 (6-tile bento — built; mount closure in plan 03-03)
  - KPI-02 (Stat shell consumed as-is, font-semibold preserved)
  - KPI-03 (NumberTicker with reduced-motion defense-in-depth wrapper)
  - KPI-04 (Lucide arrows for trend; no animated-trend-indicator import)
  - KPI-06 (BlurFade waves A/B with 80ms stagger; reduced-motion bypass)
  - KPI-07 (@container grid auto-fit minmax(180px, 1fr); no bento-grid.tsx)
completed: 2026-05-24
executor: |
  Wave 2 was launched as a background subagent (aba1f0725fab48d54) that
  hit a server rate-limit mid-Task-3 after Tasks 1+2 had already committed
  (commits 9fd4121e9 useReducedMotion hook + 3e75fde75 helpers extension).
  Tasks 3+4 completed inline by the orchestrator on the same branch to
  unblock the wave.

key-files:
  created:
    - src/hooks/use-reduced-motion.ts (Task 1; background subagent)
    - src/hooks/__tests__/use-reduced-motion.test.ts (Task 1; background subagent)
    - src/components/dashboard/components/kpi-bento-row.tsx (Task 3; inline)
    - src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx (Task 3; inline)
  modified:
    - src/components/dashboard/components/kpi-helpers.ts (Task 2 — extended with buildTileAriaLabel + KpiBentoRowProps; background subagent)

decisions:
  - "D-04 honesty: Properties + Units tiles emit NO `<StatTrend>` (no metricTrends signal exists); other 4 tiles emit `<StatTrend>` only when the corresponding metricTrends.<field> is non-null. Verified by Test 3 + Test 4."
  - "D-05 wave math implemented exactly: tiles 0/1/2 → BlurFade delay {0,1,2}; tiles 3/4/5 → delay {4,5,6}. Coefficient 3 SKIPPED intentionally as inter-wave gap. Total stagger window: 0 to 480ms across both waves (UI-SPEC § 7.2 + § 7.6 declared overrides)."
  - "D-06 NumberTicker duration 800ms locked at each tile invocation. Reduced-motion users see the static `Intl.NumberFormat` output via the KpiNumberTicker defense-in-depth wrapper (UI-SPEC § 5.4)."
  - "D-07 Stat shell consumed as-is — font-semibold (600) preserved from the vendored shell; not overridden to font-bold (700) per the parent UI-SPEC § 2.6 weight table. UI-SPEC § 2.3 declared override accepted by checker."
  - "D-08 Skeleton fallback renders the SAME `@container` grid wrapper as the loaded-tiles branch so the layout doesn't reflow on data arrival. The skeleton branch uses `data-testid=kpi-bento-row-loading` to distinguish from the loaded `data-testid=kpi-bento-row`."
  - "D-09 honesty: when `safeOccupancy` is NaN, `Number.isFinite` guard substitutes 0. Verified by Test 10 (no crash + Occupancy tile renders 0%)."
  - "D-10 grid pattern: `grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4` baseline; `@4xl/kpi-bento:gap-6` at container ≥ 896px. Inline-style PROP carries ONLY `containerType: 'inline-size'` + `containerName: 'kpi-bento'` (sole Phase 3 inline-style exemption; UI-SPEC § 3.1 + § 13.1)."
  - "B-1 cycle-1 fix honored: KpiBentoRow reads `stats.revenue.monthly`, `stats.units.occupancyRate`, `stats.leases.active`, `stats.maintenance.open`, `stats.properties.total`, `stats.units.total` from `KpiBentoRowProps.stats: DashboardStats | null`. No `metrics.*` references anywhere in the component."
  - "Down-trend override: `tile.trend.trend === 'down'` adds `!text-[var(--color-warning)] dark:!text-[var(--color-warning)]` to the StatTrend. The `!` prefix is required to win specificity over vendored Stat's baseline `text-red-600`. Verified by Test 8."

metrics:
  files_created: 4
  files_modified: 1
  insertions: ~440 (kpi-bento-row.tsx ~315 + kpi-bento-row.test.tsx ~290 + use-reduced-motion + test from Tasks 1-2)
  typecheck: clean
  lint: clean (after biome auto-format)
  unit_tests: 10/10 KpiBentoRow + 8/8 helpers + 4/4 sparkline + (hook tests from Task 1)
  design_token_drift: 2704/2704 pass

verification:
  bunx_tsc_noEmit: exit 0
  bunx_biome_check: exit 0 (after auto-format)
  kpi_bento_row_test_count: 10
  forbidden_imports_grep: 0 matches (no bento-grid, no animated-trend-indicator, no @radix-ui/react-icons)
  inline_style_count_kpi_bento_row: 1 (the containerType/containerName grid wrapper)
  any_or_as_unknown_as: 0 matches
---

# Phase 03 Plan 02: KpiBentoRow Orchestrator + Tiles + Reduced-Motion Hook — Execution Summary

## Outcome

POLISH-10 — wait, wrong phase memo. **KPI-01 through KPI-07** closed at the component layer. Phase 3 plan 03-03 then mounts the component into `/dashboard` and replaces the legacy one-line header.

## Tasks

| Task | Status | Executor | Evidence |
|------|--------|----------|----------|
| T1 — `useReducedMotion` shared hook + test | DONE | background subagent | commit `9fd4121e9` |
| T2 — Extend `kpi-helpers.ts` with `buildTileAriaLabel` + `KpiBentoRowProps` | DONE | background subagent | commit `3e75fde75` |
| T3 — Build `KpiBentoRow` orchestrator (6 tiles, BlurFade waves, NumberTicker wrapper, Skeleton fallback, sparklines on 0+1, trend chips per D-04, @container grid, down-trend warning override) + 10 component tests | DONE | inline (rate-limit recovery) | commit pending after this SUMMARY |
| T4 — Gate sweep (design-token drift + typecheck + biome + forbidden-imports + inline-style count) | DONE | inline | all gates exit 0 |

## Background-Agent Failure & Inline Recovery

The Wave 2 executor agent (id `aba1f0725fab48d54`) was spawned via the orchestrator's `Agent(subagent_type=gsd-executor)` call. After successfully landing Tasks 1+2 in two atomic commits, the agent's underlying API surface returned a server rate-limit error (`Server is temporarily limiting requests · Rate limited`). The agent's transcript shows 81 tool uses across ~2.5 hours of wall time before the failure — Tasks 1+2 commits visible in `git log`, but neither `src/components/dashboard/components/kpi-bento-row.tsx` nor its test file existed on disk.

Recovery path: orchestrator inlined the remainder of Plan 03-02 — wrote the component + the 10-case test suite + ran the gates — to preserve the wave's serial progress without spawning a fresh executor that risked the same rate-limit. Same branch (`gsd/phase-3-kpi-bento-row`), same commit lineage, atomic per-task discipline preserved.

## D-05 Wave Math Verification

```
Tile 0 Revenue          → BlurFade delay={0} → 0ms
Tile 1 Occupancy        → BlurFade delay={1} → 80ms
Tile 2 Active leases    → BlurFade delay={2} → 160ms
                          (intentional gap; coefficient 3 SKIPPED — Wave-A→Wave-B inter-wave 160ms pause)
Tile 3 Open maintenance → BlurFade delay={4} → 320ms
Tile 4 Properties       → BlurFade delay={5} → 400ms
Tile 5 Units            → BlurFade delay={6} → 480ms

Total stagger window: 0–480ms (UI-SPEC § 7.2 declared override vs parent ≤400ms cap)
Reveal count: 6 BlurFade wrappers (UI-SPEC § 7.6 declared override vs parent ≤4 cap; reduced-motion users bypass all 6)
```

## Test Coverage (10/10 passing)

1. Renders 6 tiles in D-01 order — pinned by querying `data-slot=stat-label` in tile order
2. Renders sparklines on tiles 0+1 only — `[role=img]` exactly 2 of 6 listitems
3. Properties + Units omit `<StatTrend>` — `[data-slot=stat-trend]` 0 in tiles 4-5, 1 in tiles 0-3
4. `metricTrends.monthlyRevenue === null` → Revenue trend chip omitted (D-09 honesty)
5. Skeleton ↔ tile-grid mutual exclusion — `data-testid=kpi-bento-row-loading` vs `data-testid=kpi-bento-row`
6. Revenue aria-label matches buildTileAriaLabel template: `"Revenue: $14,250 this month. Up 12 percent vs. last month."`
7. Reduced-motion bypasses BlurFade — no `will-change-transform` class anywhere when `matchMedia` returns matches:true
8. Down-trend override class applied — `!text-[var(--color-warning)]` regex match on Open Maintenance StatTrend
9. Sparkline-data-too-thin guard (data length < 2) → Revenue sparkline absent; Occupancy sparkline still present
10. NaN occupancy guard — `Number.isFinite` substitutes 0; renders `0%` without crash

## Carry-forward to Plan 03-03

- `KpiBentoRow` is built and tested in isolation.
- Plan 03-03 mounts `<KpiBentoRow {...kpiData} />` in `dashboard.tsx` replacing the legacy `<p>` header element.
- `KpiBentoRowProps` shape is locked: `{ isLoading, stats, metricTrends, timeSeries }`. Plan 03-03 wires `page.tsx` to construct that shape from existing `useDashboardStats() / useDashboardCharts()` hooks.
- After Plan 03-03 lands, the `/dashboard` page renders the new bento row in production.
