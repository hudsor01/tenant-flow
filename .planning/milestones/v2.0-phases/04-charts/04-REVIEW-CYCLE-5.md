---
phase: 04-charts
reviewed: 2026-05-27T19:33:00Z
depth: deep
cycle: 5
files_reviewed: 29
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/app/(owner)/reports/generate/components/report-types.ts
  - src/app/(owner)/reports/generate/page.tsx
  - src/components/dashboard/chart-area-interactive.tsx
  - src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx
  - src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
  - src/components/dashboard/components/occupancy-donut-chart-skeleton.tsx
  - src/components/dashboard/components/occupancy-donut-chart.tsx
  - src/components/dashboard/components/revenue-area-chart-skeleton.tsx
  - src/components/dashboard/components/revenue-area-chart.tsx
  - src/components/dashboard/dashboard-data.test.ts
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-types.ts
  - src/components/dashboard/dashboard.tsx
  - src/hooks/api/query-keys/owner-dashboard-keys.ts
  - src/hooks/api/use-dashboard-hooks.ts
  - src/hooks/api/use-owner-dashboard-financial.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/lib/reports/download-blob.ts
  - src/lib/reports/generate-excel.ts
  - src/lib/reports/generate-pdf.ts
  - src/lib/reports/report-data.ts
  - src/test/mocks/recharts.tsx
  - src/types/analytics.ts
  - src/types/api-contracts.ts
  - src/types/sections/dashboard.ts
  - supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql
  - supabase/migrations/20260527150424_phase4_audit_for_all_policies_canonical_grants.sql
  - supabase/migrations/20260527151342_phase4_drop_redundant_deny_all_authenticated_policies.sql
  - tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 4: Code Review Report (Cycle 5)

**Reviewed:** 2026-05-27T19:33:00Z
**Depth:** deep (full re-read + cycle-4 fix-site verification + dead-code sweep on the cycle-1 query-key factory)
**Files Reviewed:** 26 source + 3 migrations + 1 RLS test
**Status:** issues_found

## Summary

All 5 cycle-4 fixes verified correct and complete. WR-01 (ReportType duplicate) cleaned: `report-data.ts:16` now imports `ReportType` from `report-types.ts:16`, single declaration. WR-02 (re-export barrel) cleaned: `useFinancialChartData` moved to `use-owner-dashboard-financial.ts:83-85`, consumer `chart-area-interactive.tsx:28-31` imports both `type FinancialTimeRange` and `useFinancialChartData` from the defining file; no re-export block remains in `use-dashboard-hooks.ts`. IN-01 (function-length): all 5 PDF sub-helpers (12-32 lines each) and 2 Excel sub-helpers (18, 31 lines) under the 50-line cap; parent `renderSection` is 32 lines, `generateExcelBlob` is 26 lines. IN-02 (`FinancialChartDatum` collision): `api-contracts.ts:561-566` declaration deleted (verified by exhaustive grep — single declaration remains at `use-owner-dashboard-financial.ts:21`). IN-03 (`DashboardViewModel.monthlyRevenue6mo`): added at `dashboard-data.ts:27`, forwarded in transform at line 98, new test assertion at `dashboard-data.test.ts:79-94` exercises non-empty array (not a tautology).

`bun run typecheck` clean. `bun run lint` clean (Biome). 61/61 unit tests pass across dashboard chart components + report library + dashboard-data transform + hook surfaces.

Cycle 5 surfaced **1 new finding** all prior cycles missed:

1. **WR-01 (NEW)** — Cycle-1's newly-extracted query-key factory `owner-dashboard-keys.ts` carries **6 dead leaf entries + 2 dead section roots** that have zero consumers anywhere in `src/` or `tests/`. Same class of finding as cycle-3's `ownerDashboardQueries` deletion. Trivial to remove; net 30+ lines deleted. Per CLAUDE.md zero-tolerance Rule #4 ("No commented-out code / dead code"). The factory was introduced wholesale by cycle-1 fix commit `27cbd6a9a` to satisfy a hook-file-length cap, importing structural keys speculatively from the old monolithic file rather than only the keys the new files actually consume.

### Cycle-4 fix verification matrix (5/5 verified correct)

| Cycle-4 finding | Verification | Status |
|-----------------|--------------|--------|
| WR-01 — Duplicate `ReportType` (report-data.ts + report-types.ts) | `grep -rn "^export.*type ReportType\|^export interface ReportType\|^type ReportType\|^interface ReportType" src/` returns exactly 2 hits: `report-types.ts:16` (the canonical declaration) and the pre-existing different-domain `components/reports/types.ts:1` (out of scope per cycle-4 context). `report-data.ts:16` now imports `ReportType` from `#app/(owner)/reports/generate/components/report-types`. Compiler clean: `BUILDERS: Record<ReportType, ...>` and `buildReportData(reportType: ReportType, ...)` both type-check against the imported union. No test mocks referenced the deleted local declaration (grep'd `vi.mock("../lib/reports/report-data")` — zero hits). | ✓ |
| WR-02 — Re-export barrel in use-dashboard-hooks.ts:120-123 | Re-export block deleted entirely; `use-dashboard-hooks.ts` is now 113 lines (down from 130+); no `export type` or `export { ... } from "./..."` re-export pattern survives. `useFinancialChartData` moved to `use-owner-dashboard-financial.ts:83-85`, placed AFTER the `dashboardFinancialQueries` const declaration (line 37) so no temporal-dead-zone issue at runtime even though hoisting rules wouldn't apply to a `function` declaration anyway. `chart-area-interactive.tsx:28-31` imports both `FinancialTimeRange` and `useFinancialChartData` from the defining file — single import statement, single source of truth. Verified by `grep -rn "useFinancialChartData" src/ tests/` — only the new defining file and the consumer match; no other consumer was inadvertently left importing from the old path. | ✓ |
| IN-01 — renderSection (82 lines) + generateExcelBlob (73 lines) over the 50-line cap | `generate-pdf.ts` per-function line counts (re-measured this cycle): `generatePdfBlob` 48 (header+footer rendering — under), `renderSectionHeading` 12, `renderSummaryRows` 24, `renderSectionTable` 31 (includes empty-state branch carry-over verified — lines 111-117), `renderSectionNote` 19, `renderSection` 32 (orchestrator dispatches to 4 sub-helpers + pagination guard). All sub-helpers carry the typed signature `NonNullable<ReportSection["rows"]>` / `NonNullable<ReportSection["table"]>` so the orchestrator's existence-checks (lines 175, 179, 183) narrow the union correctly before dispatch — no runtime null-deref. `generate-excel.ts`: `buildCoverSheetData` 18, `buildSectionSheetData` 31 (empty-table branch preserved at lines 45-50 — "No data for the selected period." string-only row), `generateExcelBlob` 26, `sanitizeSheetName` 4, `computeColumnWidths` 14. All under 50. Empty-table semantic carry-over verified for both writers — neither lost the empty-state placeholder. | ✓ |
| IN-02 — Same-named `FinancialChartDatum` collision (api-contracts.ts vs use-owner-dashboard-financial.ts) | `grep -rn "FinancialChartDatum" src/ tests/` returns exactly 3 hits, ALL in `src/hooks/api/use-owner-dashboard-financial.ts` (line 6 jsdoc reference, line 21 declaration, line 47 return-type annotation). The `api-contracts.ts:561-566` declaration is deleted — full file re-read confirms `EmergencyContact` now starts at line 561 (the slot the deleted interface vacated). No consumer in `src/` or `tests/` imports `FinancialChartDatum` from `#types/api-contracts` (grep'd both paths — zero hits). Compiler clean. | ✓ |
| IN-03 — DashboardViewModel.timeSeries missing monthlyRevenue6mo | `dashboard-data.ts:22-30` now declares `timeSeries: { occupancyRate, monthlyRevenue, monthlyRevenue6mo }`. `transformDashboardData` at line 67-102 returns `monthlyRevenue6mo: payload.timeSeries.monthlyRevenue6mo` (line 98) — pure pass-through honoring the upstream `OwnerDashboardData.timeSeries` shape. New unit test at `dashboard-data.test.ts:79-94` builds `monthlyRevenue6mo` with two real entries (`{month, value}` shape) and asserts `result.timeSeries.monthlyRevenue6mo` equals that input via `.toEqual()`. This is NOT a pass-through tautology because the contract being pinned is "the slice flows through the transform AT ALL" — if a future refactor accidentally drops the field from the return literal, the test fails immediately (the test would not detect a structural mismatch but it DOES detect omission, which was the cycle-4 IN-03 concern). | ✓ |

### Cycle-5 sweep coverage

Scanned PR-touched files (`git diff --name-only main..HEAD` filtered to source/test/migration):

- `any` types in PR-diff: 0 hits in Phase-4-owned code
- `as unknown as` in Phase-4-owned files: 0 hits (pre-existing `expiring-leases-widget.tsx:71` unchanged; out of scope per cycle 4)
- `as any`: 0 hits in scope
- Hardcoded secrets / `eval` / `innerHTML` / `dangerouslySetInnerHTML`: 0 hits
- `@radix-ui/react-icons`: 0 hits
- `bg-white` / bare `text-muted` (not `text-muted-foreground`): 0 hits in PDF/Excel/dashboard/charts/reports paths
- Inline `style=` attributes: 0 hits in scope (Tailwind `bg-[var(--color-chart-X)]` arbitrary values are utility classes, not inline style — allowed)
- PostgreSQL ENUM declarations in new migrations: 0 hits
- Hex/RGB color literals in chart components: 0 hits (all via `var(--color-chart-*)` tokens)
- Emojis in code: 0 hits
- Console statements in production paths: 1 hit (`report-data.ts:101` — dev-gated, accepted per cycles 1-4)
- `(select auth.uid())` wrapper preserved: present at `phase4_revenue_trend_6mo.sql:28`
- `SECURITY DEFINER` + `search_path` pinning: correct on all 3 Phase-4 migrations
- `GRANT EXECUTE` to authenticated: present and idempotent on all 3 migrations
- RLS test owner-isolation coverage: present (A→B + symmetric B→A both pin the cycle-10 message at `dashboard-rpc-revenue-6mo.test.ts:175,180,197,198`)
- Bundle code-split: `dashboard.tsx` does NOT statically import `recharts`. Both `RevenueAreaChart` and `OccupancyDonutChart` are `next/dynamic` with shape-matching skeletons (no Recharts leak in skeleton imports — verified by reading both `*-skeleton.tsx` files: they import only `Card` + `Skeleton`).
- Hook file length cap (300 lines): `use-owner-dashboard.ts` 180, `use-dashboard-hooks.ts` 113, `use-owner-dashboard-financial.ts` 85. All comfortably under cap.
- Chart component length cap (300 lines): `revenue-area-chart.tsx` 250, `occupancy-donut-chart.tsx` 171, `revenue-area-chart-skeleton.tsx` 35, `occupancy-donut-chart-skeleton.tsx` 36. All under cap.
- Per-function 50-line cap on new functions: every PR-introduced function under cap. The `Dashboard()` component function at `dashboard.tsx:51-268` is 217 lines but pre-existing (the diff vs `main` is property-rename plumbing + dynamic-import additions, not new body).
- Test coverage: chart components 23/23 tests pass, dashboard-data transform 4/4 pass (including the new cycle-4 IN-03 pinning test), reports library tests pass (6 test files, 61 total tests).
- `removed RevenueOverviewChart`: cleanly deleted from disk and zero leftover references in `src/` or `tests/`.
- `removed ownerDashboardQueries`: zero references in `src/` or `tests/` (cycle-3 fix still good).
- `revenue-overview-chart-skeleton.tsx`: not removed — but verified ChartLoadingSkeleton import dropped from `dashboard.tsx` line-by-line.

### Deferred from prior cycles (still deferred — confirmed unchanged)

- IN-02 cycle 2 (donut "Vacant" includes maintenance units) — confirmed unchanged at `phase4_revenue_trend_6mo.sql:439-443`. Deferred per cycle-2/3/4 rationale (semantic; Phase 6).
- IN-03 cycle 2 (`p_months: 12` over-fetch in `dashboardFinancialQueries.chartData`) — confirmed unchanged at `use-owner-dashboard-financial.ts:54`. Deferred per cycle-2/3/4 rationale.
- Pre-existing `ReportType` interface at `src/components/reports/types.ts:1` — confirmed unchanged. Out of scope per cycle 4.

## Warnings

### WR-01: Dead query-key leaves in Phase-4-owned `owner-dashboard-keys.ts`

**File:** `src/hooks/api/query-keys/owner-dashboard-keys.ts`
**Issue:**
The query-key factory `ownerDashboardKeys` was introduced wholesale in this PR by the cycle-1 fix commit `27cbd6a9a` to bring `use-owner-dashboard.ts` under the 300-line cap. The extraction lifted the entire old factory shape, including keys for surfaces that the new hook split does NOT consume. Result: **6 dead leaf entries + 2 dead section roots** with zero consumers anywhere in `src/` or `tests/`.

Verified via exhaustive grep across both `src/` and `tests/`:

```bash
grep -rn "ownerDashboardKeys\." src/ tests/ | grep -v "query-keys/owner-dashboard-keys.ts"
```

Used leaves (live):
- `ownerDashboardKeys.all` — 18 consumers (the canonical `invalidateQueries({ queryKey: ownerDashboardKeys.all })` pattern)
- `ownerDashboardKeys.analytics.stats()` — 2 consumers (`use-property-mutations.ts:120`, `properties/units/page.tsx:200`)
- `ownerDashboardKeys.analytics.pageData()` — 1 consumer (`use-owner-dashboard.ts:174`)
- `ownerDashboardKeys.financial.chartData(...)` — 1 consumer (`use-owner-dashboard-financial.ts:42`)
- `ownerDashboardKeys.financial.all()` — only as the hierarchical prefix of `chartData()` (live by virtue of `chartData()`)

Dead leaves (zero consumers, declared but never referenced):
- `ownerDashboardKeys.analytics.activity()` — line 17-18
- `ownerDashboardKeys.properties.performance()` — lines 25-27 (entire `properties` section root is dead because this is the only leaf)
- `ownerDashboardKeys.financial.billingInsights()` — line 33-34
- `ownerDashboardKeys.financial.revenueTrends(year)` — line 35-36
- `ownerDashboardKeys.maintenance.all()` + `ownerDashboardKeys.maintenance.analytics()` — lines 48-52 (entire section root dead)
- `ownerDashboardKeys.tenants.all()` + `ownerDashboardKeys.tenants.occupancyTrends()` — lines 54-59 (entire section root dead)

This is the same class of dead-code finding as cycle-3's `ownerDashboardQueries` deletion (also a wholesale extract that carried structural baggage). The precedent set by cycle-3 was to delete dead factory members rather than leave them as "future use" — both per CLAUDE.md Rule #4 ("No commented-out code / dead code") and because every dead member is one more thing that can drift out-of-sync with the real cache shape (e.g. a future migration that renames `monthly_revenue_6mo` will silently update the live chartData key but leave the dead `revenueTrends(year)` key referring to the obsolete shape — and the next developer who tries to wire up a revenue-trends UI will reach for the dead key first because it's "already there").

Both prior reviews missed this: cycle 1 introduced the factory and reviewers focused on the hook-split correctness. Cycle 2/3/4 measured the hook files for length compliance and re-checked the chart-area-interactive consumer for the FinancialTimeRange import path but never grep-traced every leaf back to a live consumer.

**Fix:**
Delete the 6 dead leaf declarations and the 2 dead section roots. Keep `analytics.all()` (used internally as prefix to `stats()` and `pageData()`) and `financial.all()` (used internally as prefix to `chartData()`).

```ts
// src/hooks/api/query-keys/owner-dashboard-keys.ts (after fix)
export const ownerDashboardKeys = {
	all: ["owner-dashboard"] as const,

	// Analytics section (stats() + pageData() are live)
	analytics: {
		all: () => [...ownerDashboardKeys.all, "analytics"] as const,
		stats: () => [...ownerDashboardKeys.analytics.all(), "stats"] as const,
		pageData: () =>
			[...ownerDashboardKeys.analytics.all(), "page-data"] as const,
	},

	// Financial section (chartData is live; financial.all() is its prefix)
	financial: {
		all: () => [...ownerDashboardKeys.all, "financial"] as const,
		chartData: (year: number, timeRange: string, months: number) =>
			[
				...ownerDashboardKeys.financial.all(),
				"revenue-trends",
				year,
				timeRange,
				months,
			] as const,
	},
};
```

Net change: 60 lines → ~22 lines (38-line deletion). Re-run typecheck after the deletion to confirm no consumer surfaces.

If any of the dead keys is intentionally retained for a planned consumer in a follow-on phase, add a `// TODO(phase-X):` comment on the specific line AND surface the planned consumer in `.planning/phases/04-charts/.continue-here.md` or `ROADMAP.md` so the next phase planner picks it up — but per CLAUDE.md "No commented-out code / dead code", the strict reading is delete now, re-add when the consumer lands.

---

_Reviewed: 2026-05-27T19:33:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cycle 5 — full re-read + cycle-4 fix-site verification + dead-code sweep on the cycle-1 query-key factory)_
_Cycle-4 findings verified fixed: 5/5_
_New findings surfaced: 1 (0 P0, 0 P1, 1 WARNING, 0 INFO)_
_Out-of-scope items deferred per cycle-2/3/4 rationale: 3 (IN-02 donut semantic, IN-03 p_months over-fetch, pre-existing `components/reports/types.ts:1` different-domain ReportType)_
