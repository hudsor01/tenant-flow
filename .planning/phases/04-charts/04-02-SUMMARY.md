---
phase: 04-charts
plan: 02
subsystem: dashboard
tags: [chart, recharts, area-chart, revenue, skeleton, tabs, reduced-motion]
requirements: [CHART-01, CHART-03, CHART-05, CHART-06]
dependency_graph:
  requires: ["04-01a (MonthlyRevenuePoint type + RPC field)", "04-01b (boundary mapper)"]
  provides: ["RevenueAreaChart + RevenueAreaChartSkeleton named exports for Plan 04-03 next/dynamic mount"]
  affects: []
tech_stack:
  added: []
  patterns:
    - "Typed boundary helper at the union for two-shape Recharts data (RevenuePoint = TimeSeriesDataPoint | MonthlyRevenuePoint) — replaces an `as unknown as` cast at the JSX boundary"
    - "Per-chart inline ChartConfig (UI-SPEC § 16) — no import from dashboard-types.ts"
    - "rAF-aware tests: ChartContainer defers ResponsiveContainer mount one animation frame; tests query the recharts mock via findBy*/waitFor"
key_files:
  created:
    - src/components/dashboard/components/revenue-area-chart.tsx
    - src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
  modified: []
decisions:
  - "Single AreaChart with a typed union RevenuePoint widens DataPointType so the raw {date, value} and {month, value} arrays both flow through the same chart instance — avoids two near-duplicate AreaChart instances (which would have broken the 'exactly 1 isAnimationActive / animationDuration' acceptance criterion) and avoids fragment helpers (which would have broken Recharts' direct-children element discovery)"
  - "userEvent.setup() drives the Radix Tabs interaction; fireEvent.click on the trigger button does NOT dispatch the pointerdown/up chain Radix listens for, so onValueChange never fires"
  - "Animation discipline pinned at exactly 1 occurrence each: animationDuration={800} and isAnimationActive={!reducedMotion}. Comment that previously said 'as unknown as' rephrased to 'structural cast' so grep doesn't false-positive the zero-tolerance criterion"
metrics:
  duration_minutes: 30
  completed: 2026-05-26
  tasks: 2
  commits: 2
  files_created: 2
  files_modified: 0
  test_specs_added: 12
---

# Phase 04 Plan 02: RevenueAreaChart + Tests Summary

RevenueAreaChart component (Recharts area + 30d/6mo Tabs toggle + shape-matching skeleton) plus 12 Vitest specs pinning toggle, empty states, motion gate, and stroke token contract.

## Tasks Completed

| Task | Name                                                                                 | Commit       |
| ---- | ------------------------------------------------------------------------------------ | ------------ |
| 1    | RevenueAreaChart + colocated RevenueAreaChartSkeleton                                | `ea80af15b`  |
| 2    | Vitest pins (10 chart specs + 2 skeleton specs)                                      | `387392ddf`  |

## Deliverables

- **`src/components/dashboard/components/revenue-area-chart.tsx`** — 269 lines (≤ 300 cap).
  - `RevenueAreaChart` (default `30d` window via local `useState<'30d' | '6mo'>` — D-04).
  - `RevenueAreaChartSkeleton` (shape-matching `Card lg:col-span-2` + static `aria-hidden` segmented control + `h-[300px]` body — D-06 / CHART-05).
  - Per-window tick formatters: `format30dTick` → `"Mar 12"`; `format6moTick` → `"Mar"`. Both defensive on `NaN`.
  - Y-axis: `$Xk` (UI-SPEC § 8.2 declared `/1000` non-currency-arithmetic exemption).
  - Tooltip values flow through `formatCurrency` with whole-dollar fraction digits.
  - `isAnimationActive={!reducedMotion}` + `animationDuration={800}` + `animationEasing="ease-out"` (exactly 1 occurrence of each — design-token discipline).
  - 6 references to `var(--color-chart-1)` (gradient stops × 2, Area stroke, ChartConfig color, and supporting comments) — 0 references to legacy `var(--chart-1)`.
  - Empty-state branch: `"No revenue data yet"` + `"Add a lease to start tracking revenue"` (D-08).
  - 0 `any`, 0 `as unknown as`, 0 inline `style={}`, 0 hex literals, 0 `BlurFade` (D-07), 0 import from `../dashboard-types`.
- **`src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx`** — 235 lines, 12 specs, all green.

## Verification

```text
$ bunx vitest --run --project unit src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  23:11:36
   Duration  631ms

$ bunx vitest --run --project unit src/app/__tests__/design-token-drift.test.ts
 Test Files  1 passed (1)
      Tests  2708 passed (2708)
   Start at  23:11:47
   Duration  431ms

$ bun run typecheck
$ tsc --noEmit
(exit 0)

$ bun run lint src/components/dashboard/components/revenue-area-chart.tsx \
                src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
$ biome check ...
Checked 1 file in 5ms. No fixes applied.
(exit 0)

$ git diff --stat HEAD~2 HEAD -- src/components/dashboard/components/revenue-area-chart.tsx \
                                  src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
 .../__tests__/revenue-area-chart.test.tsx          | 234 +++++++++++++
 .../dashboard/components/revenue-area-chart.tsx    | 269 +++++++++++++++
 2 files changed, 503 insertions(+)
```

Lefthook pre-commit (gitleaks + lockfile-verify + biome + tsc + vitest with `--coverage`) ran on both commits and exited 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two TypeScript errors on first compile of Task 1 file**
- **Found during:** Task 1 (first `bun run typecheck` after Write).
- **Issue:** Recharts `AreaChart.data` is typed `ReadonlyArray<DataPointType>` and can't unify `TimeSeriesDataPoint[] | MonthlyRevenuePoint[]` to a single `ReadonlyArray<T>`. Separately, `ChartTooltipContent.labelFormatter` is typed `(label: ReactNode, payload) => ReactNode`, not `(iso: string) => string`.
- **Fix:** Added typed boundary helper `pickActiveSeries(window, ...)` returning `RevenuePoint[]` where `RevenuePoint = TimeSeriesDataPoint | MonthlyRevenuePoint`. Added `toAxisTickFormatter` + `toTooltipLabelFormatter` adapter helpers that coerce the boundary signature without introducing `as unknown as`.
- **Files modified:** `src/components/dashboard/components/revenue-area-chart.tsx`.
- **Commit:** `ea80af15b`.

**2. [Rule 1 - Bug] `fireEvent.click` did NOT trigger Radix Tabs `onValueChange`**
- **Found during:** Task 2 (initial test run — 3 specs failed because the description stayed "Last 30 days" after clicking the 6mo trigger).
- **Issue:** Radix Tabs listens for `pointerdown`/`pointerup`, not plain `click`. The first attempt used `@testing-library/react`'s `fireEvent.click` which dispatches a single MouseEvent.
- **Fix:** Switched to `userEvent.setup()` from `@testing-library/user-event` — the same pattern that other Radix-using tests in the repo (`documents-section.test.tsx`, `documents-vault.test.tsx`, `lease-action-buttons.test.tsx`) use. All toggle-sensitive specs now `await user.click(...)`.
- **Files modified:** `src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx`.
- **Commit:** `387392ddf`.

**3. [Rule 3 - Blocking] Synchronous queries failed on the rAF-deferred ChartContainer mount**
- **Found during:** Task 2 (first test-run cascade after the userEvent fix — chart-mock queries returned null because `ChartContainer` defers `<ResponsiveContainer>` until the next animation frame).
- **Issue:** Tests called `screen.getByTestId("area-chart")` synchronously after `render()`; the deferred mount meant the mock subtree wasn't in the DOM yet.
- **Fix:** Switched all chart-mock queries to `screen.findByTestId(...)` (async) which polls until the rAF fires. Same pattern as `kpi-sparkline.test.tsx`. Documented the rationale in the test file's module-level docstring.
- **Files modified:** `src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx`.
- **Commit:** `387392ddf`.

**4. [Rule 1 - Bug] Acceptance-criterion grep tripped on comment text**
- **Found during:** Task 1 final criteria sweep.
- **Issue:** A docstring comment mentioned "without an `as unknown as` cast at the JSX boundary" — celebrating the no-cast solution. The acceptance criterion `grep -c "as unknown as"` counts the literal string regardless of context, returning 1.
- **Fix:** Rephrased the comment to "without a structural cast at the JSX boundary". Same meaning, no false-positive.
- **Files modified:** `src/components/dashboard/components/revenue-area-chart.tsx`.
- **Commit:** Folded into `ea80af15b` (pre-commit fix).

**5. [Rule 1 - Bug] `vi.hoisted` grep count tripped on docstring**
- **Found during:** Task 2 final criteria sweep.
- **Issue:** A docstring comment mentioned `vi.hoisted()` for documentation purposes, making `grep -c "vi.hoisted" {file}` return 2 instead of the required exactly 1.
- **Fix:** Rephrased the comment to `"hoisted (see {@link useReducedMotionMock} below)"` — same documentation intent, no false-positive on the grep.
- **Files modified:** `src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx`.
- **Commit:** Folded into `387392ddf` (pre-commit fix).

### Architectural Decisions (no checkpoint needed)

- **Single `<AreaChart>` over per-window dual-component branches.** First instinct was to extract two siblings (`Revenue30dChart` + `Revenue6moChart`) so each had its own typed `data` prop. This would have produced TWO `<Area>` instances with literal `animationDuration={800}` and `isAnimationActive={!reducedMotion}` strings — breaking the "exactly 1" acceptance criterion. Single AreaChart + typed union RevenuePoint is the canonical pattern; the helper `pickActiveSeries` does the narrowing at the boundary (CLAUDE.md sanctioned pattern for typed mappers).
- **No fragment helper for chart children.** A `() => <>...</>` helper would hide `<Area>` / `<XAxis>` from Recharts' `React.Children.forEach` discovery at runtime. The single-AreaChart pattern sidesteps the duplication problem without needing a helper.

## Self-Check

- `[ -f src/components/dashboard/components/revenue-area-chart.tsx ]` — FOUND
- `[ -f src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx ]` — FOUND
- `git log --oneline | grep ea80af15b` — FOUND
- `git log --oneline | grep 387392ddf` — FOUND
- `wc -l < src/components/dashboard/components/revenue-area-chart.tsx` → 269 (≤ 300) — PASS
- `grep -c "as unknown as" src/components/dashboard/components/revenue-area-chart.tsx` → 0 — PASS
- `grep -c "var(--color-chart-1)" src/components/dashboard/components/revenue-area-chart.tsx` → 6 (≥ 2) — PASS
- `grep -c "var(--chart-1)" src/components/dashboard/components/revenue-area-chart.tsx` → 0 — PASS
- `grep -c "animationDuration={800}" src/components/dashboard/components/revenue-area-chart.tsx` → 1 — PASS
- `grep -c "isAnimationActive={!reducedMotion}" src/components/dashboard/components/revenue-area-chart.tsx` → 1 — PASS
- `grep -c "BlurFade" src/components/dashboard/components/revenue-area-chart.tsx` → 0 — PASS
- `grep -c "vi.hoisted" src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` → 1 — PASS
- `grep -c "	it(" src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` → 12 (≥ 12) — PASS

## Self-Check: PASSED

## Note for Plan 04-03

Both `RevenueAreaChart` and `RevenueAreaChartSkeleton` are exported from `src/components/dashboard/components/revenue-area-chart.tsx`. Plan 04-03 can:

```typescript
const RevenueAreaChart = dynamic(
	() =>
		import("./components/revenue-area-chart").then((m) => m.RevenueAreaChart),
	{
		ssr: false,
		loading: () => <RevenueAreaChartSkeleton />,
	},
);
```

The prop interface is locked: `{ monthlyRevenue: TimeSeriesDataPoint[]; monthlyRevenue6mo: MonthlyRevenuePoint[] }`. Both fields are now live on `OwnerDashboardData` (Plan 04-01a + 04-01b).

The component preserves the `data-tour="charts-section"` attribute that the dashboard tour wiring expects (verified via `grep` of `data-tour=` references in `src/`).

`revenue-overview-chart.tsx` is unchanged in this plan — Plan 04-03 owns the swap + delete.
