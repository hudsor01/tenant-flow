---
phase: 04-charts
plan: 03
status: complete
completed_at: 2026-05-27
tasks_complete: 5/5
self_check: PASSED
---

# 04-03 SUMMARY — OccupancyDonut + atomic dashboard reshape

## Self-Check: PASSED

All 5 tasks landed. Task 5 (manual visual verification) was performed via Chrome MCP against the live dev server running `gsd/phase-4-dashboard-charts` — found and fixed one real-Recharts bug the unit-test mock had masked.

## Tasks

| # | Task | Commit | Notes |
|---|------|--------|-------|
| 1 | OccupancyDonutChart + colocated skeleton | `ae7fcb2f1` | 201 lines; all 18 grep acceptance gates pass |
| 2 | 13 Vitest specs (11 chart + 2 skeleton) | `a9448c881` | extended recharts mock with `data-is-animation-active` on Pie |
| 3 | Atomic DashboardProps reshape (3 files / 1 commit) | `5c9176732` | drops `revenueTrend`, adds `monthlyRevenue` + `monthlyRevenue6mo` + `units`; dashboard.tsx swaps to two dynamics in 3-up grid |
| 4 | Delete revenue-overview-chart.tsx + chartConfig cleanup | `8d1c9e273` + `e02488385` | follow-up commit closed a staging-step gap that missed `dashboard-types.ts` modifications |
| 5 | [BLOCKING] Manual visual verification | (via Chrome MCP) | dashboard rendered against e2e-owner-a@ prod data; 30d↔6mo toggle + dark mode + donut markup all pass; donut Label center text bug caught + fixed |

## Live visual verification (Task 5)

Performed by Claude driving Chrome MCP at `http://localhost:3050/dashboard` signed in as `e2e-owner-a@tenantflow.app` (`subscription_status='active'`). Real prod data: 5 properties, 1 total unit, 0 occupied → 0% occupancy.

**Pass:**
- 3-up layout at `lg:grid-cols-4`: Revenue `lg:col-span-2` / Donut `lg:col-span-1` / Quick Actions (default `col-span-1` from no override)
- Revenue: title "Revenue" + description "Last 30 days" on initial mount
- 30d → 6mo toggle: description swaps to "Last 6 months"; X-axis ticks switch from daily format (`Apr 27, Apr 29, …, May 26`) to monthly format (`Dec, Jan, Feb, Mar, Apr, May`); series re-renders
- Donut: title "Occupancy" + description "Across all units"
- Donut legend rendered as real `<ul><li>` (D-03 colorblind-friendly), with `● Occupied 0` + `● Vacant 1` raw integer counts
- Donut wrapper has `role="img"` + computed `aria-label="Occupancy donut: 0 percent occupied (0 of 1 units)"`
- No tooltip on donut hover (UI-SPEC § 3.6 compliant)
- Math: 0/1 = 0% (Math.round(0) = 0, correct)
- Dark mode (via `document.documentElement.classList.add('dark')`): all elements legible — KPI bento + chart row, donut wedge colors distinct against dark Card, legend swatches + count text readable, grid + axis ticks readable, 30d active pill keeps `bg-primary` blue per UI-SPEC § 17

**Bug caught + fixed (commit `2aa7268d3`):**

Donut center label "{N}% / Occupied" wasn't rendering in real Recharts v3.8.1. Zero `<text>` / `<tspan>` elements in the DOM, wedges fine, no console errors. The Recharts mock at `src/test/mocks/recharts.tsx` always calls the Label `content` callback with `viewBox={cx:0, cy:0}`, masking the runtime behavior — both unit-test passes (12/12 and 13/13) missed it.

Fix: drop `position="center"` prop (default for Pie child Label) and invert the guard to the positive-check pattern matching shadcn's canonical v3 example:

```diff
- <Label position="center" content={({viewBox}) => {
-   if (!viewBox || !("cx" in viewBox)) return null;
-   return <text ...>...</text>;
- }} />
+ <Label content={({viewBox}) => {
+   if (viewBox && "cx" in viewBox && "cy" in viewBox) {
+     return <text ...>...</text>;
+   }
+   return null;
+ }} />
```

Functionally identical in the mock (still 13/13 green), behavior change in real Recharts v3.8.1's child-iteration path. Verified live: `<text>` element rendered at viewBox center (`x=182, y=90`); "0%" + "Occupied" tspans visible in both light and dark mode.

## Verification

- `bun run typecheck` exit 0
- `bun run lint` exit 0 (1210 files checked, no fixes)
- `bunx vitest --run --project unit src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx` → 13/13 in 787ms
- `bunx vitest --run --project unit src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx` → 12/12 in 851ms
- `bunx vitest --run --project unit src/app/__tests__/design-token-drift.test.ts` → 2708/2708 in 450ms
- Full `bun run test:unit` (via lefthook gate on docs commit) → 174 test files / 105,016 tests passing
- `wc -l dashboard.tsx` = 277 (≤ 300 cap)
- `grep -c "RevenueOverviewChart\|revenueTrend\|ChartLoadingSkeleton" src/components/dashboard/dashboard.tsx` → 0
- `grep -rn "RevenueTrendPoint" src/` → 0 (interface deleted along with consumer)

## Notable deviations

- **Task 4 split into 2 commits**: the initial `chore(04-03): delete revenue-overview-chart.tsx + chartConfig cleanup` commit captured the file deletion but the staging step missed `dashboard-types.ts` modifications. Follow-up commit `e02488385` closed the gap (cleanly: it deletes the same export, no behavior change).
- **Worktree first attempt aborted**: the first worktree-based executor halted on 630 spurious unit-test failures inside its worktree. Verified those were worktree-environment contamination (likely a stale bun cache or vitest workers state divergence between primary and worktree) — the same suite passes 105,140/105,140 on primary. Switched to inline execution from primary; all 5 commits landed through the full lefthook gate.

## Test-coverage gap surfaced

The Recharts mock at `src/test/mocks/recharts.tsx` is too permissive for `<Label>` content rendering — it always invokes the content callback regardless of Recharts' actual child-resolution rules. This let the donut Label bug ship through 13 green specs. Follow-up: either tighten the mock to skip invocation when the parent Pie isn't fully mounted, or add a real-DOM integration test (e.g., Playwright snapshot of `/dashboard`).

## Bonus work bundled into this PR (per user request)

Two non-Phase-4 items shipped on this branch because they were caught during the visual verification flow:

1. **`fix(04-03): donut Label center text now renders in real Recharts v3.8.1`** — already documented above
2. **`feat(reports): real client-side PDF + Excel generation for /reports/generate`** — replaced a shipped stub that threw on every click with a working production implementation. 4 new files in `src/lib/reports/` (data shaping + PDF writer + Excel writer + blob downloader), wired into the existing reports page. Uses jspdf + jspdf-autotable + xlsx (all client-side). Verified live: PDF + Excel downloads triggered against real owner data; 13 broken `rent_payments`-dependent prod RPCs gracefully degrade with "data unavailable" note.

## Output handed off to Phase 4 close-out

- `<Dashboard>` mounts the new chart pair in production at `/dashboard`
- All 6 v2.0 CHART requirements (CHART-01..06) satisfied in code
- Phase 4 ready for `/gsd-verify-work 4` + perfect-PR review cycles
