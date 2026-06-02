---
phase: 04-charts
reviewed: 2026-05-27T20:30:00Z
depth: deep
cycle: 4
files_reviewed: 27
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/app/(owner)/reports/generate/components/report-types.ts
  - src/app/(owner)/reports/generate/page.tsx
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
  - src/types/sections/dashboard.ts
  - supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql
  - supabase/migrations/20260527150424_phase4_audit_for_all_policies_canonical_grants.sql
  - supabase/migrations/20260527151342_phase4_drop_redundant_deny_all_authenticated_policies.sql
  - tests/integration/rls/dashboard-rpc-revenue-6mo.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 4: Code Review Report (Cycle 4)

**Reviewed:** 2026-05-27T20:30:00Z
**Depth:** deep (full re-read + cycle-3 fix-site verification + cross-file duplicate-type trace + function-length re-measurement on all new files)
**Files Reviewed:** 24 source + 3 migrations + 1 RLS test
**Status:** issues_found

## Summary

Cycle-3 fix verified correct: `ownerDashboardQueries` deletion is clean (no consumers anywhere in `src/` or `tests/`), the three dropped imports (`queryOptions`, `occupancyTrendsQuery`, `revenueTrendsQuery`) were truly orphaned only in the deleted factory (their canonical exports in `analytics-keys.ts` still have legitimate consumers in `property-stats-keys.ts` and `lease-keys.ts`). `DASHBOARD_BASE_QUERY_OPTIONS` remains wired through `use-dashboard-hooks.ts`. File trimmed cleanly to 180 lines as projected. All 28 dashboard chart unit tests pass. `bun run typecheck` and `bun run lint` both clean.

Cycle 4 surfaced **5 new findings** that all three prior cycles missed:

1. **WR-01 (NEW)** — Duplicate `ReportType` definition in two Phase-4-owned files (zero-tolerance Rule #3 violation). Both `src/lib/reports/report-data.ts:837` and `src/app/(owner)/reports/generate/components/report-types.ts:16` declare `export type ReportType` with identical 6-variant unions. Both are PR-introduced files (cycle-1 + cycle-2 PDF/Excel implementation), so this duplicate is Phase-4-owned.

2. **WR-02 (NEW)** — Cross-module re-export pattern in `use-dashboard-hooks.ts:120-123` (Rule #2 grey-area violation). The "Re-export types for existing consumers" block forwards `FinancialChartDatum` + `FinancialTimeRange` from `use-owner-dashboard-financial.ts`. While not a barrel `index.ts`, it makes a hook file act as a typescript barrel. Single external consumer (`chart-area-interactive.tsx:29`) imports `FinancialTimeRange` from the re-export rather than the defining file. Introduced by the cycle-1 hook split.

3. **IN-01 (NEW)** — Two new functions over the 50-line cap in PR-introduced files: `renderSection` in `generate-pdf.ts:67-148` (82 lines) and `generateExcelBlob` in `generate-excel.ts:11-83` (73 lines). Cycle 3 explicitly re-measured `report-data.ts` (correct — 0 hits) but did not re-measure the two sibling PDF/Excel writers in the same `src/lib/reports/` folder.

4. **IN-02 (NEW)** — Duplicate-shaped-but-different-bodied `FinancialChartDatum` type. `src/types/api-contracts.ts:561` declares it as `{ date, income, expenses, net }`; `src/hooks/api/use-owner-dashboard-financial.ts:21` declares it (also exported, also named `FinancialChartDatum`) as `{ date, revenue, expenses, profit }`. Different shapes, same name. The hook-local version is only consumed by `dashboardFinancialQueries.chartData`'s return type and re-exported through the WR-02 barrel — no production consumer actually reads it by name. Compiler currently allows the collision because the consumer (`chart-area-interactive.tsx`) imports only `FinancialTimeRange`, not `FinancialChartDatum`, from the re-export.

5. **IN-03 (NEW)** — `DashboardViewModel` (canonical view-model contract per Phase 1 D-10) is now incomplete vs the CHART-01 shape. `dashboard-data.ts:21-24` declares `timeSeries: { occupancyRate, monthlyRevenue }` but the post-Phase-4 raw shape (per `use-owner-dashboard.ts:38-44` `DashboardChartsData`) is `{ occupancyRate, monthlyRevenue, monthlyRevenue6mo }`. Live `dashboard.tsx` passes `monthlyRevenue6mo` directly through the inline transform, bypassing the canonical contract. The eventual `dashboard-view.tsx` consumer migration (deferred per ROADMAP) will surface this gap.

### Cycle-3 fix verification matrix (1/1 verified correct)

| Cycle-3 finding | Verification | Status |
|-----------------|--------------|--------|
| IN-01 — `ownerDashboardQueries` dead factory (74 lines) | `grep -rn "ownerDashboardQueries" src/ tests/` returns ZERO hits (confirmed empty). `wc -l src/hooks/api/use-owner-dashboard.ts` = 180 (cycle-3 projected ~190; net 5 lines tighter than projected). Dropped imports (`queryOptions`, `occupancyTrendsQuery`, `revenueTrendsQuery`) verified: `analytics-keys.ts` still exports `occupancyTrendsQuery` and `revenueTrendsQuery` for their legitimate consumers (`property-stats-keys.ts:208` uses occupancy, `lease-keys.ts:258-260` uses revenue 3×); only the now-deleted factory consumed them locally. `DASHBOARD_BASE_QUERY_OPTIONS` still exported at `use-owner-dashboard.ts:173` and consumed by `use-dashboard-hooks.ts:17`. `bun run typecheck` clean. `bun run lint` clean. All 28 dashboard chart unit tests pass (`revenue-area-chart.test.tsx`, `occupancy-donut-chart.test.tsx`, `dashboard-data.test.ts`). | ✓ |

### Cycle-4 sweep coverage

Scanned PR-touched files (`git diff --name-only main..HEAD` filtered to source/test/migration):
- `any` types in PR-diff: 0 hits in Phase-4-owned code
- `as unknown as` in Phase-4-owned files: 0 hits (the lone existing instance in `expiring-leases-widget.tsx:71` is pre-existing, not touched by this PR)
- Hardcoded secrets / `eval` / `innerHTML` / `dangerouslySetInnerHTML`: 0 hits
- `@radix-ui/react-icons`: 0 hits
- `bg-white` / bare `text-muted`: 0 hits in scope
- Inline `style=` attributes: 0 hits in scope
- PostgreSQL ENUM declarations in new migrations: 0 hits
- Hex/RGB color literals in chart components: 0 hits (all colors via `var(--color-chart-*)` tokens)
- Emojis in code: 0 hits
- Console statements in production paths: 1 hit (`report-data.ts:101` — gated on `process.env.NODE_ENV !== "production"`, acceptable diagnostic pattern)
- `(select auth.uid())` wrapper: present and correct (`phase4_revenue_trend_6mo.sql:28`)
- `SECURITY DEFINER` + `search_path` pinning: correct on all 3 Phase-4 migrations
- `GRANT EXECUTE` to authenticated: present where required
- RLS test owner-isolation coverage: present (A→B + symmetric B→A both pin the cycle-10 auth guard message)
- Bundle code-split: `dashboard.tsx` does NOT statically import `recharts` directly OR transitively via any sibling component (verified via `grep -ln "recharts" src/components/dashboard/components/*.tsx` excluding the dynamic-imported chart files). Skeletons import only `Card` + `Skeleton`. KPI sparkline chunk pre-existing on `main` — out of scope for Phase 4.

### Deferred from prior cycles (still deferred — confirmed unchanged)

- IN-02 cycle 2 (donut "Vacant" includes maintenance units) — confirmed unchanged at `phase4_revenue_trend_6mo.sql:437`. Deferred per cycle-2/3 rationale.
- IN-03 cycle 2 (`p_months: 12` over-fetch in `dashboardFinancialQueries.chartData`) — confirmed unchanged at `use-owner-dashboard-financial.ts:54`. Deferred per cycle-2/3 rationale.

## Warnings

### WR-01: Duplicate `ReportType` definition across two Phase-4-owned files

**File:** `src/lib/reports/report-data.ts:837-843` AND `src/app/(owner)/reports/generate/components/report-types.ts:16-22`
**Issue:**
Both files export `type ReportType = "executive-monthly" | "financial-performance" | "property-portfolio" | "lease-portfolio" | "maintenance-operations" | "tax-preparation"` — same name, same 6-variant union, identical shape. This is a textbook zero-tolerance Rule #3 violation ("No duplicate types — search `src/types/` before creating any type").

Verified via:
```bash
grep -rn "^export type ReportType " /Users/richard/Developer/tenant-flow/src
# src/app/(owner)/reports/generate/components/report-types.ts:16
# src/lib/reports/report-data.ts:837
```

Both files are new in this PR:
- `report-types.ts` introduced by cycle-1 fix commit `27cbd6a9a` (Phase 4 dashboard reports)
- `report-data.ts` introduced by cycle-2 fix commit `0df88d0cd` (PDF + Excel implementation)

Compiler currently allows the duplicate because each file imports `ReportType` from its own local declaration — but the next consumer that imports from the wrong file will see the same name with the same shape and silently bind to the wrong source-of-truth.

A third `ReportType` exists at `src/components/reports/types.ts` (pre-existing on `main`, different domain — list-page report records, not generate-flow report kinds). That one is out of scope; the WR-01 duplicate is strictly the new PR pair.

**Fix:**
Drop the `ReportType` definition from `report-data.ts:837-843` and import it from `report-types.ts`:

```ts
// src/lib/reports/report-data.ts
import type { ReportType } from "#app/(owner)/reports/generate/components/report-types";

// Delete the local `export type ReportType = ...` block at lines 837-843.

const BUILDERS: Record<
  ReportType,
  (qc: QueryClient, start: string, end: string) => Promise<ReportData>
> = { ... };

export async function buildReportData(
  reportType: ReportType,
  ...
): Promise<ReportData> { ... }
```

Alternative: extract `ReportType` to `src/types/reports.ts` (the canonical types directory per CLAUDE.md "Type Lookup Order") and import from both files. This is the cleaner long-term answer since neither current location is a `src/types/` file.

### WR-02: Re-export barrel pattern in `use-dashboard-hooks.ts:120-123`

**File:** `src/hooks/api/use-dashboard-hooks.ts:120-123`
**Issue:**
The block

```ts
// Re-export types for existing consumers
export type {
	FinancialChartDatum,
	FinancialTimeRange,
} from "./use-owner-dashboard-financial";
```

is the exact "re-export" pattern Zero Tolerance Rule #2 prohibits ("No barrel files / re-exports — never create `index.ts` that re-exports; import directly from the defining file"). The rule's letter targets `index.ts`, but the spirit ("import directly from the defining file") applies wherever a re-export creates a second binding for the same identifier.

The single external consumer is `chart-area-interactive.tsx:28-31`:

```ts
import {
	type FinancialTimeRange,
	useFinancialChartData,
} from "#hooks/api/use-dashboard-hooks";
```

`FinancialTimeRange` is declared at `use-owner-dashboard-financial.ts:28`. The consumer should import the type directly from the defining file and import `useFinancialChartData` from the hooks file as a separate statement (or `useFinancialChartData` itself could be moved to `use-owner-dashboard-financial.ts` and the consumer imports both from one place).

This re-export was introduced by the cycle-1 hook split commit `27cbd6a9a` when `use-owner-dashboard.ts` was carved into three files. The comment "Re-export types for existing consumers" telegraphs the migration shortcut — it's the same anti-pattern barrel files exist to enable.

**Fix:**
Delete the re-export block at `use-dashboard-hooks.ts:120-123` and update the consumer:

```ts
// src/components/dashboard/chart-area-interactive.tsx (around line 28)
import { type FinancialTimeRange } from "#hooks/api/use-owner-dashboard-financial";
import { useFinancialChartData } from "#hooks/api/use-dashboard-hooks";
```

OR move `useFinancialChartData` (currently at `use-dashboard-hooks.ts:130-132`) to `use-owner-dashboard-financial.ts` so the consumer imports both the type and the hook from one defining file:

```ts
// src/hooks/api/use-owner-dashboard-financial.ts (append)
export function useFinancialChartData(timeRange: FinancialTimeRange = "6m") {
	return useQuery(dashboardFinancialQueries.chartData(timeRange));
}
```

The second form is cleaner because it also collapses the dependency edge — `use-dashboard-hooks.ts` currently imports both `dashboardFinancialQueries` and the type from `use-owner-dashboard-financial.ts` just to glue them back together as a hook.

## Info

### IN-01: Two new functions over the 50-line cap in `src/lib/reports/`

**File:** `src/lib/reports/generate-pdf.ts:67-148` (`renderSection`, 82 lines) AND `src/lib/reports/generate-excel.ts:11-83` (`generateExcelBlob`, 73 lines)
**Issue:**
CLAUDE.md "Architecture Rules" → "Max 300 lines per component, 50 lines per function, 300 lines per hook file". Cycle-2's WR-03 fix split the `*Sections` functions in `report-data.ts` to comply, and cycle-3 re-measured `report-data.ts` correctly (`buildExecutiveMonthly` at 38 lines being the max there). Neither cycle re-measured the sibling files in the same `src/lib/reports/` folder.

`renderSection` (82 lines) currently composes 4 distinct concerns:
1. Pagination guard (page-break logic) — lines 75-82
2. Section heading render — lines 83-87
3. Summary rows render (if `section.rows`) — lines 89-106
4. Table render via `autoTable` (if `section.table`) — lines 108-133
5. Note render (if `section.note`) — lines 135-145

`generateExcelBlob` (73 lines) composes 3 concerns:
1. Cover sheet construction — lines 14-33
2. Per-section sheet construction (the for-loop body, 35 lines on its own) — lines 36-74
3. Workbook serialization — lines 76-82

Both files are Phase-4-owned (new in this PR), so the cap applies cleanly. The per-section sheet construction loop body in `generateExcelBlob` is already a self-contained transformation (`section` → `sheetData[][]`) that could become a private `buildSectionSheetData` helper, mirroring how `report-data.ts` solved the same problem via `*Rows()` helpers in cycle 2.

**Defer-acceptable** if the operator considers `src/lib/` data-writing modules subject to a more permissive cap, but the project standard from CLAUDE.md does not carve that exception out. Cycle-3 raised the same "src/lib/ exemption" interpretation for `report-data.ts` file-length (868 lines), which is defensible for a module containing 30+ small functions — but per-function the 50-line cap is more universal.

**Fix:**
Extract the section-specific bodies into named helpers under 50 lines each:

```ts
// src/lib/reports/generate-pdf.ts
function renderSectionHeading(doc, heading, x, y) { ... }
function renderSummaryRows(doc, rows, x, y, valueX, bottom, margin) { ... }
function renderSectionTable(doc, table, y, margin, FONT) { ... }
function renderSectionNote(doc, note, x, y, bottom, margin) { ... }

function renderSection(doc, section, startY, margin, pageWidth): number {
	let y = startY;
	const pageHeight = doc.internal.pageSize.getHeight();
	const bottom = pageHeight - margin - 24;
	if (y > bottom - 60) { doc.addPage(); y = margin + 10; }
	y = renderSectionHeading(doc, section.heading, margin, y);
	if (section.rows?.length) y = renderSummaryRows(doc, section.rows, margin, y, pageWidth / 2, bottom, margin);
	if (section.table?.rows.length) y = renderSectionTable(doc, section.table, y, margin, FONT);
	else if (section.table) { /* placeholder */ }
	if (section.note) y = renderSectionNote(doc, section.note, margin, y, bottom, margin);
	return y + 8;
}
```

```ts
// src/lib/reports/generate-excel.ts
function buildCoverSheet(report: ReportData) { ... } // 14-33
function buildSectionSheetData(section: ReportSection): Array<Array<string | number>> { ... } // 36-69

export function generateExcelBlob(report: ReportData): Blob {
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, buildCoverSheet(report), "Cover");
	for (const section of report.sections) {
		const sheetData = buildSectionSheetData(section);
		const sheet = XLSX.utils.aoa_to_sheet(sheetData);
		sheet["!cols"] = computeColumnWidths(sheetData);
		XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(section.heading));
	}
	const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
	return new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
```

### IN-02: Same-named, different-shaped `FinancialChartDatum` types

**File:** `src/types/api-contracts.ts:561-566` AND `src/hooks/api/use-owner-dashboard-financial.ts:21-26`
**Issue:**
Two `export interface FinancialChartDatum` declarations exist:

```ts
// src/types/api-contracts.ts:561
export interface FinancialChartDatum {
	date: string;
	income: number;
	expenses: number;
	net: number;
}

// src/hooks/api/use-owner-dashboard-financial.ts:21
export interface FinancialChartDatum {
	date: string;
	revenue: number;
	expenses: number;
	profit: number;
}
```

Same name; different shapes (`income/net` vs `revenue/profit`). Zero-tolerance Rule #3 says "No duplicate types — search `src/types/` before creating any type". The hook-local version was introduced by the cycle-1 split commit `27cbd6a9a` — at that moment the canonical version at `api-contracts.ts:561` was already in the tree. The cycle-1 reviewer + cycle-2 reviewer + cycle-3 reviewer all missed this collision because no consumer actually imports the hook-local `FinancialChartDatum` by name (it leaks only through the WR-02 re-export, and the single re-export consumer takes `FinancialTimeRange`, not `FinancialChartDatum`).

Verified via:
```bash
grep -rn "FinancialChartDatum" /Users/richard/Developer/tenant-flow/src
# src/types/api-contracts.ts:561        # declaration #1
# src/hooks/api/use-owner-dashboard-financial.ts:21  # declaration #2
# src/hooks/api/use-owner-dashboard-financial.ts:47  # used as return type
# src/hooks/api/use-dashboard-hooks.ts:121          # re-exported (WR-02 site)
```

The hook-local shape is the one the live financial chart consumes (via `dashboardFinancialQueries.chartData` return type). The `api-contracts.ts` shape is consumed elsewhere — TBD whether by any production caller (worth verifying during the fix). If `api-contracts.ts:561` is also dead, this is two stones with one fix.

**Defer-acceptable** because there is no runtime hazard today (no consumer crosses the boundary by name). But it's a latent footgun: a future refactor that imports `FinancialChartDatum` from `api-contracts.ts` (the more "official"-looking location) into a path that previously consumed the hook-local shape will silently mis-type fields, and the typo `income`/`net` vs `revenue`/`profit` will not surface until runtime.

**Fix:**
1. Verify `api-contracts.ts:561` is dead via `grep -rn "FinancialChartDatum" /Users/richard/Developer/tenant-flow/src | grep -v "use-owner-dashboard-financial\|use-dashboard-hooks"`. If zero hits, delete the `api-contracts.ts` declaration.
2. If the `api-contracts.ts` version IS consumed, rename the hook-local one to something domain-specific: `OwnerDashboardFinancialChartPoint` (verbose but unambiguous), or move both declarations into `src/types/sections/dashboard.ts` with distinct names if their fields really are two different shapes.

### IN-03: `DashboardViewModel.timeSeries` missing `monthlyRevenue6mo`

**File:** `src/components/dashboard/dashboard-data.ts:19-26`
**Issue:**
Per Phase 1 D-10, `transformDashboardData` is the locked architectural seam: the canonical pure transform that the eventual `dashboard-view.tsx` consumer migration will read. Phase 4 added `monthlyRevenue6mo` to the raw `OwnerDashboardData.timeSeries` shape (see `use-owner-dashboard.ts:38-44`) and to the inline `<RevenueAreaChart>` consumer in `dashboard.tsx:184-187`, but `DashboardViewModel.timeSeries` (the canonical view-model contract) was NOT updated to include the new field:

```ts
// dashboard-data.ts:19-26 — CURRENT
export interface DashboardViewModel {
	stats: DashboardStats;
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[];
		monthlyRevenue: TimeSeriesDataPoint[];
		// NOTE: monthlyRevenue6mo missing
	};
	portfolioRows: PortfolioRow[];
}
```

The unit test at `dashboard-data.test.ts:50-54` already builds the input with `monthlyRevenue6mo: []` (because `OwnerDashboardData` requires it), but the output assertions never read the field — proving the view-model lost the slice. When the consumer migration lands, `dashboard-view.tsx` will need `monthlyRevenue6mo` and will either:
(a) silently fall back to `[]` (no chart), or
(b) require a parallel inline transform here in `dashboard.tsx`, defeating D-10.

Trivial fix; INFO because no production consumer exists today (per `dashboard-data.ts:40-56` extensive comment block — "ZERO production consumers").

**Fix:**
```ts
// src/components/dashboard/dashboard-data.ts
import type { MonthlyRevenuePoint, TimeSeriesDataPoint } from "#types/analytics";

export interface DashboardViewModel {
	stats: DashboardStats;
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[];
		monthlyRevenue: TimeSeriesDataPoint[];
		monthlyRevenue6mo: MonthlyRevenuePoint[];  // ADD
	};
	portfolioRows: PortfolioRow[];
}

// In transformDashboardData (lines 63-97), update the return:
return {
	stats: payload.stats,
	timeSeries: {
		occupancyRate: payload.timeSeries.occupancyRate,
		monthlyRevenue: payload.timeSeries.monthlyRevenue,
		monthlyRevenue6mo: payload.timeSeries.monthlyRevenue6mo,  // ADD
	},
	portfolioRows,
};
```

Optional: extend `dashboard-data.test.ts` with a single assertion `expect(result.timeSeries.monthlyRevenue6mo).toEqual(payload.timeSeries.monthlyRevenue6mo)` so the contract is pinned.

---

_Reviewed: 2026-05-27T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cycle 4 — full re-read + cycle-3 fix-site verification + cross-file duplicate-type trace + function-length re-measurement)_
_Cycle-3 findings verified fixed: 1/1 (`ownerDashboardQueries` deletion is correct and complete)_
_New findings surfaced: 5 (0 P0, 0 P1, 2 WARNING, 3 INFO)_
_Out-of-scope items deferred per cycle-2/3 rationale: 2 (IN-02 donut semantic, IN-03 p_months over-fetch)_
