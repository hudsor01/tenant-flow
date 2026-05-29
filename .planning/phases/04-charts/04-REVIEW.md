---
phase: 04-charts
reviewed: 2026-05-27T18:00:00Z
depth: deep
cycle: 2
files_reviewed: 22
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/app/(owner)/reports/generate/components/report-types.ts
  - src/app/(owner)/reports/generate/page.tsx
  - src/components/dashboard/components/__tests__/occupancy-donut-chart.test.tsx
  - src/components/dashboard/components/__tests__/revenue-area-chart.test.tsx
  - src/components/dashboard/components/occupancy-donut-chart.tsx
  - src/components/dashboard/components/revenue-area-chart.tsx
  - src/components/dashboard/dashboard-data.test.ts
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
  - package.json
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 4: Code Review Report (Cycle 2)

**Reviewed:** 2026-05-27T18:00:00Z
**Depth:** deep (cross-file, call-chain, bundle-graph, supply-chain analysis)
**Files Reviewed:** 22 (Phase 4 charts + reports + 3 in-scope migrations + RLS test + package.json)
**Status:** issues_found

## Summary

Cycle-1's 11 findings are all fixed correctly — verified each:

- CR-01 (Maintenance vendor rows zero counts): `v.vendorName / v.jobs / v.totalSpend` reads directly off the typed shape; header `["Vendor", "Jobs", "Total Spend"]` matches.
- CR-02 (Lease turnover zero counts): `t.month / t.moveIns / t.moveOuts` direct reads; `?? []` removed.
- WR-01 (3 `as Record<string, unknown>` casts): all three sites read off typed `properties.vacancyTrend`, `tenants.turnover`, `maintenance.vendorPerformance` directly.
- WR-02 (use-owner-dashboard.ts >300 lines): cleanly split into `use-owner-dashboard.ts` (261L) + `use-owner-dashboard-financial.ts` (76L) + `use-dashboard-hooks.ts` (132L) + `query-keys/owner-dashboard-keys.ts` (61L). All call-sites updated via blanket import-path refactor (11 mutation/page files).
- WR-03 (build* functions >50 lines): each `build*` is now under 50 lines (per-section row literals extracted to `*Sections()` helpers).
- WR-04 (Record Payment dead handler): purged from `quickActions`, `QuickActionType`, `onRecordPayment` prop, and `case "recordPayment"` branch.
- WR-05 (Pie mock `_data` destructure): rewritten to `data: _data` proper rename.
- IN-01 (pickActiveSeries spread): returns input arrays via union covariance, no copy.
- IN-03 (safeFetch over-broad catch): now narrows on `isMissingRelationError(err)` (Postgres `42P01`), re-throws everything else; `console.warn` dev-only.
- IN-04 (UI-SPEC Tabs active styling drift): section § 4.3 + § 14 + § 17 corrected to "vendored `bg-primary` baseline".

Cycle 2 surfaced **one new BLOCKER** and **four new WARNINGs / three INFOs** — predominantly regressions and gaps the cycle-1 fixes introduced, plus a supply-chain finding the cycle-1 review (focused on report-data correctness) missed.

The single P0 is a supply-chain hit: `xlsx@0.18.5` from npm has two unpatched HIGH-severity CVEs (Prototype Pollution + ReDoS), and the SheetJS maintainer publicly directs users away from the npm distribution. The other regressions are dynamic-import code-split defeated by colocated skeleton imports, an `as unknown as` violation in the new PDF writer that cycle-1 missed because no scan was run on the new reports files, three `*Sections()` helpers still over the 50-line cap after the WR-03 fix, and two minor UI-SPEC↔code drifts (Tabs `shadow-md` vs spec `--shadow-sm`; Tabs `font-semibold` vs spec `font-medium`).

## Critical Issues

### CR-01: `xlsx@0.18.5` from npm carries two unpatched HIGH-severity CVEs

**File:** `package.json:150`, `bun.lock:2022`, `src/lib/reports/generate-excel.ts:8`
**Issue:**
The PR adds `xlsx: "0.18.5"` to dependencies. This is the SheetJS Community Edition published on npm, which has been **unmaintained on npm since 2023** (no patch releases). It carries two publicly disclosed HIGH-severity advisories that are not fixed in any npm version:

- **GHSA-4r6h-8v6p-xvw6** — Prototype Pollution (CVSS 7.8 HIGH). Patched version: NONE on npm.
- **GHSA-5pgg-2g8v-p4x9** — Regular Expression Denial of Service / ReDoS (CVSS 7.5 HIGH). Patched version: NONE on npm.

The SheetJS project page explicitly directs users: "Pro tip: Do not install `xlsx` from npm. The current build is hosted on the SheetJS CDN." (https://docs.sheetjs.com/docs/getting-started/installation/frameworks). The supported install path is from the CDN tarball (`https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz`), which fixes both CVEs.

This package is used in `src/lib/reports/generate-excel.ts` to parse / write Excel files. The ReDoS attack surface is "any data flowing through xlsx string parsing". In the current Phase 4 implementation, the only data flowing through xlsx is server-trusted analytics data (cell labels come from the report builder's hardcoded strings + numeric values from authenticated PostgREST RPCs), so the direct exploit path is narrow today. **However:**

1. `package.json#overrides` does not pin xlsx to a safer version (and no safer version exists on npm).
2. The npm distribution will pull a fresh malicious dependency tree on every `bun install` if the upstream maintainer's npm credentials are compromised (no maintenance = no rotation discipline).
3. GitHub's Dependabot and `bun audit` will both flag this on the next scheduled scan, requiring a follow-up PR.
4. Any future code path that lets user-controlled strings reach `XLSX.read()` (e.g. an import flow accepting uploaded xlsx files — which the bulk-import system could plausibly grow into) becomes immediately exploitable.

CLAUDE.md's pattern for supply-chain vulnerabilities is documented in the MEMORY: Dependabot alerts get resolved via `pnpm.overrides` (now `bun overrides`). This PR ships a known-CVE dependency with NO override, NO mitigation note, and NO mention in the phase plans of the supply-chain trade-off.

**Fix:** Three options, ranked by user directive ("perfect by all measures"):

1. **Preferred — install from SheetJS CDN per maintainer guidance.** Replace `package.json` line 150 with:
   ```json
   "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
   ```
   then `bun install` regenerates the lockfile against the maintained build. Both CVEs patched; same `import * as XLSX from "xlsx"` API.

2. **Alternative — swap xlsx for `exceljs`.** Lighter API surface, actively maintained on npm, no known unpatched CVEs. Requires rewriting `generate-excel.ts` (small file — 103 lines).

3. **Defer with explicit override + mitigation comment.** If 1 or 2 are too invasive for this PR, ship with a `package.json#overrides` entry pinning xlsx to a safer pre-CVE version (none exists — this option is closed) OR add a `// SECURITY: known-CVE — TODO #XXX` comment plus a tracking issue. **Discouraged**: the user directive is "perfect by all measures"; deferring a known HIGH CVE to a follow-up issue violates that bar.

The CDN install path (Option 1) is the canonical SheetJS guidance, requires only a `package.json` edit + `bun install`, and is the minimal-risk path that fully closes the finding.

## Warnings

### WR-01: `as unknown as` violation in `generate-pdf.ts:121` (CLAUDE.md Zero Tolerance Rule #8)

**File:** `src/lib/reports/generate-pdf.ts:121`
**Issue:**
The PDF writer reads `lastAutoTable.finalY` off the jsPDF doc via a forbidden double-cast:

```typescript
const lastTable = (
    doc as unknown as { lastAutoTable?: { finalY?: number } }
).lastAutoTable;
y = (lastTable?.finalY ?? y) + 20;
```

CLAUDE.md Zero Tolerance Rule #8: "No `as unknown as` type assertions — use typed mapper functions at RPC/PostgREST boundaries". This is the exact pattern banned. It exists because jspdf's TypeScript definitions don't expose the side-channel field `autoTable` mutates on the doc.

Cycle-1 surfaced three sibling `Record<string, unknown>` casts and demanded they be removed; this fourth one in the new PDF writer was missed (cycle-1's WR-01 only scanned `report-data.ts`).

**Fix:** Use a typed module-level interface to extend the doc shape, OR pull the finalY through `autoTable`'s return contract.

Option A — module-level type extension (cleanest):
```typescript
interface DocWithAutoTable extends jsPDF {
    lastAutoTable?: { finalY?: number };
}

// at use site:
const lastTable = (doc as DocWithAutoTable).lastAutoTable;
```

Single-level `as` against a structurally-compatible interface is allowed under CLAUDE.md; the banned pattern is the `unknown` widening tunnel. Option A is one cast, one widening, and the widening is to a structurally-extended type — passes the rule.

Option B — use autoTable's return value (jspdf-autotable v5 returns the cursor):
```typescript
const result = autoTable(doc, { ...options, startY: y, ... });
y = (result?.finalY ?? y) + 20;
```

Verify the return contract against `node_modules/jspdf-autotable/dist/index.d.ts` first — v5 changed the API surface. Option A is the safer one-line fix.

---

### WR-02: Dynamic-import code-splitting defeated by colocated skeleton static imports

**File:** `src/components/dashboard/dashboard.tsx:23, 28, 35-49`
**Issue:**
Both Phase 4 chart components colocate their loading skeletons in the same file as the chart:

```typescript
// dashboard.tsx
import { OccupancyDonutChartSkeleton } from "./components/occupancy-donut-chart";
// ...
import { RevenueAreaChartSkeleton } from "./components/revenue-area-chart";

const RevenueAreaChart = dynamic(
    () => import("./components/revenue-area-chart").then((mod) => mod.RevenueAreaChart),
    { ssr: false, loading: () => <RevenueAreaChartSkeleton /> },
);

const OccupancyDonutChart = dynamic(
    () => import("./components/occupancy-donut-chart").then((mod) => mod.OccupancyDonutChart),
    { ssr: false, loading: () => <OccupancyDonutChartSkeleton /> },
);
```

The static `import { RevenueAreaChartSkeleton } from "./components/revenue-area-chart"` causes the bundler to evaluate `revenue-area-chart.tsx` as part of the dashboard's main chunk, pulling in `recharts` + every transitive Recharts dependency. The `next/dynamic` wrapper for `RevenueAreaChart` then re-imports the same module — at runtime it resolves immediately because it's already evaluated; at build time the bundler may or may not deduplicate the chunk depending on tree-shaking heuristics.

Verification path:
1. `package.json` has no `"sideEffects": false` declaration → bundler defaults to "all imports may have side effects" → static import pulls the whole module.
2. The Phase 4 UI-SPEC § 7.5 explicitly intends `next/dynamic` `ssr: false` to code-split the chart bundle out of the main dashboard chunk (CONTEXT.md D-06 + UI-SPEC § 7.5).
3. The pre-Phase-4 code (`revenue-overview-chart.tsx`) used `ChartLoadingSkeleton` from `#components/shared/chart-loading-skeleton` (a SEPARATE non-chart file) — the dynamic-import code-split was honored because the skeleton lived outside the chart module.

The Phase 4 colocation pattern (declared "OR colocated inside `revenue-area-chart.tsx` per planner discretion" in UI-SPEC § 10.1) was a planner option that, when chosen, requires extracting the skeleton to a separate file to preserve the code-split intent. The current implementation took the "colocated" half but skipped the "preserve code-split" half.

Bundle-impact estimate: Recharts ≈ 200KB gzipped enters the dashboard's main chunk on the route's initial JS payload instead of being deferred. The visible symptom is slower /dashboard initial JS download time + delayed time-to-interactive on cold loads. The functional symptom is that the `loading: () => <Skeleton />` placeholder will essentially never render (the module is already evaluated by the time the dynamic call resolves) — the skeleton is dead UI code at runtime, exactly the opposite of UI-SPEC § 7.4's "Three states, never two at once" mutual-exclusion promise.

**Fix:** Extract each skeleton to its own file:

```
src/components/dashboard/components/revenue-area-chart.tsx        — chart only
src/components/dashboard/components/revenue-area-chart-skeleton.tsx — skeleton only
src/components/dashboard/components/occupancy-donut-chart.tsx
src/components/dashboard/components/occupancy-donut-chart-skeleton.tsx
```

Then `dashboard.tsx` static-imports the skeleton files (lightweight — they pull only `Skeleton` + `Card`, no Recharts) and `dynamic()`-imports the chart files. The bundle split that UI-SPEC § 7 promises is restored.

Alternative: keep colocated but add a `// @next/dynamic-loading-skeleton: extract` lint rule + script (heavier governance, less direct).

This is in scope for "correctness, security, maintainability" because the dynamic-import is functionally dead — the `loading:` callback never fires after the first page load (and on first load the bundle includes the whole thing anyway). The "skeleton ↔ data branch render" three-state promise is broken.

---

### WR-03: Three `*Sections()` helpers still exceed the 50-line CLAUDE.md function cap (post WR-03 fix incomplete)

**File:** `src/lib/reports/report-data.ts:422-480, 506-562, 596-646`
**Issue:**
Cycle-1 WR-03 demanded all six `build*Report` functions go under the 50-line cap. The fix extracted per-section helpers (`*Sections()`), but three of them still exceed the cap:

| Function | File:Line | Length |
|----------|-----------|--------|
| `financialPerformanceSections` | `report-data.ts:422-480` | 59 lines |
| `propertyPortfolioSections` | `report-data.ts:506-562` | 57 lines |
| `leasePortfolioSections` | `report-data.ts:596-646` | 51 lines |

The `build*` callers themselves are now under 50 (good), but cycle-1's stated intent — "break the long literal into reviewable units (and make CR-01 / CR-02-style field-name drift obvious at a glance)" — only got halfway done.

**Fix:** Extract the per-table row-mapper into its own helper for each, then have `*Sections()` consume those mappers. Example for `financialPerformanceSections`:

```typescript
function financialMonthlyRows(financial: FinancialReport): Array<Array<string | number>> {
    return financial.monthly.map((m) => [m.month, fmtMoney(m.income), fmtMoney(m.expenses), fmtMoney(m.net)]);
}
function financialExpenseRows(financial: FinancialReport): Array<Array<string | number>> {
    const total = financial.summary.totalExpenses;
    return financial.expenseBreakdown.map((e) => [e.category, fmtMoney(e.amount), fmtPct(total > 0 ? (e.amount / total) * 100 : 0)]);
}
function financialRentRollRows(financial: FinancialReport): Array<Array<string | number>> { /* ... */ }
```

Then `financialPerformanceSections` shrinks to ~30 lines: just the section literal stitching, with each `rows:` field bound to its helper. Same pattern for the other two.

---

### WR-04: UI-SPEC § 4.3 active-state styling drift (incomplete IN-04 fix)

**File:** `.planning/phases/04-charts/04-UI-SPEC.md` § 4.3 (lines 432, 435) vs `src/components/ui/tabs.tsx:46`
**Issue:**
Cycle-1 IN-04 demanded the UI-SPEC § 4.3 documentation be reconciled with the vendored Tabs primitive. The fix corrected the BACKGROUND ("`bg-background`" → "`bg-primary`") but left two adjacent claims about active-state styling still wrong:

| UI-SPEC § 4.3 claim | Actual `tabs.tsx:46` value |
|--------------------|---------------------------|
| "Active: ... `--shadow-sm`" | `data-[state=active]:shadow-md` |
| "Active text weight: `--font-weight-medium` (500)" | `data-[state=active]:font-semibold` (= 600) |

§ 17 "Declared Overrides" table also still claims "`font-bold` used on donut center value" + "Tabs active state uses `bg-primary` accent (vendored shadcn baseline)" without reconciling the shadow + weight drift in the same vendored primitive.

The drift is documentation-only (no runtime bug), but the user directive is "perfect by all measures" — UI-SPEC must match the vendored primitive exactly to remain authoritative.

**Fix:** Update § 4.3 line 432 + § 4.3 line 435:

```diff
- - Active: `bg-primary` + `text-primary-foreground` + `--shadow-sm` (raised accent pill within the muted well)
+ - Active: `bg-primary` + `text-primary-foreground` + `shadow-md` (raised accent pill within the muted well)
...
- - Active text weight: `--font-weight-medium` (500)
+ - Active text weight: `font-semibold` (= 600 / `--font-weight-semibold`)
```

§ 13 typography table also needs a row update: "Tab trigger label" weights are 600 active + 400 inactive (not 500 active). The "Weights used: 3" assertion in § 13 stays valid (regular, semibold, bold — count unchanged), but the active weight value claim moves.

## Info

### IN-01: `radix-ui` version constraint silently de-pinned (`^1.4.3` → `1.4.3`) without commit message reference

**File:** `package.json:134`
**Issue:**
The PR removes the caret from `radix-ui` (`^1.4.3` → `1.4.3`). No phase plan documents this change; no commit message line-item mentions it (the change came in via PR #748 → cycle-1 fix commit `27cbd6a9a` "address all 11 cycle-1 code-review findings" which doesn't reference Radix).

Pinning is fine (often desirable for UI primitive consistency), but un-tracked package-manifest changes are how "mystery dependency drift" creeps in across milestones. If intentional, the commit history should call it out; if accidental (e.g. `bun add` auto-stripped the caret), it should be reverted to `^1.4.3` to match the rest of the manifest's conventional-range style.

**Fix:** Either restore the caret OR add a one-line comment in the next milestone's CHANGELOG / SUMMARY documenting "pinned `radix-ui` to exact `1.4.3` to prevent silent minor-version drift across vendored shadcn primitives". Defer-acceptable.

---

### IN-02: Donut "Vacant" legend count includes units in `maintenance` status (pre-existing semantic, but newly user-visible)

**File:** `src/components/dashboard/components/occupancy-donut-chart.tsx:75-85, 162-165`
**Issue:**
The donut sources `units` from `statsData.stats.units`, where the migration emits `'vacant': ua.total_units - ua.occupied_units` (NOT `ua.vacant_units`). The arithmetic includes units with `status = 'maintenance'` in the "vacant" count — `vacant = total - occupied = (available + maintenance)`.

For an owner with 10 total units (8 occupied, 1 available, 1 in maintenance), the donut renders:
- Center: 80% Occupied
- Legend: "Occupied 8 · Vacant 2"

The "Vacant 2" implicitly claims 2 units are rentable-and-empty, but only 1 actually is. The maintenance unit is rolled into the "vacant" count, which is misleading.

This is **pre-existing migration behavior** (the `vacant = total - occupied` line predates Phase 4 — verified in cycle-10 migration `20260524012602`). Phase 4 preserved it verbatim. **However**, Phase 4 introduces the FIRST user-visible surface where this semantic gap matters — the existing 30d revenue chart didn't surface unit-status detail. The donut's two-wedge resolution (Occupied vs Vacant, no Maintenance bucket) is the first place a non-technical owner will spot the count mismatch.

Strictly out of scope for cycle 2 (the migration arithmetic was not introduced by this PR), but flagging for the Phase 6 polish cycle: either (a) add a third wedge for `maintenance` units, or (b) rename the legend label from "Vacant" to "Not Occupied" to be honest about the inclusion, or (c) update the migration to emit a separate `inMaintenance` field and have the donut consume `vacant = ua.vacant_units` (the column that excludes maintenance).

**Fix:** Defer to Phase 6 / a follow-up issue. Not blocking.

---

### IN-03: `dashboardFinancialQueries.chartData` always requests `p_months: 12` regardless of `timeRange` (pre-existing, but now in a Phase 4-extracted file)

**File:** `src/hooks/api/use-owner-dashboard-financial.ts:54`
**Issue:**
The extracted financial chart query factory hardcodes `p_months: 12` in the RPC call, then trims client-side with `.slice(-months)` where `months = timeRangeToMonths[timeRange]`:

```typescript
const { data, error } = await supabase.rpc(
    "get_revenue_trends_optimized",
    { p_user_id: user.id, p_months: 12 },   // ← always 12
);
// ...
const trimmed = (data as FinancialMetrics[])
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-months);                            // ← trims to timeRange
```

For `timeRange = "7d"` or `"30d"`, the server returns 12 months that get trimmed to 1. The cache key includes `months` (1 / 6 / 12), so each timeRange has a separate 12-month payload in cache — same data, three slots, ~3x cache bloat. Bandwidth is over-fetched 12x for the `"7d"` and `"30d"` cases.

This is **pre-existing behavior** (the cycle-1 WR-02 extraction took the code verbatim from `use-owner-dashboard.ts`). Phase 4 didn't introduce it. But the cycle-1 extraction landed in a new file (`use-owner-dashboard-financial.ts`) so it's surfaced as a "Phase 4-touched" line by `git blame`.

**Fix:** Pass `p_months: months` to the RPC; let the server return only what's needed. Eliminate the `.slice(-months)` since the server's return is already bounded.

```typescript
const months = timeRangeToMonths[timeRange] ?? 6;
const { data, error } = await supabase.rpc(
    "get_revenue_trends_optimized",
    { p_user_id: user.id, p_months: months },
);
// ...
return (data as FinancialMetrics[])
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(/* ... */);
```

Verify against the RPC signature first — `get_revenue_trends_optimized(p_user_id, p_months)` is documented to accept any positive integer, but pin via a quick `supabase rpc` smoke against prod before changing the call.

Defer-acceptable for cycle 2 (pre-existing, performance not correctness). Logged because it's now in a Phase-4-owned file and the next phase's `useFinancialChartData` consumer would benefit from a correctness pass.

---

_Reviewed: 2026-05-27T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cycle 2 — full re-read of all in-scope files)_
_Cycle-1 findings verified fixed: 11/11_
_New findings surfaced: 8 (1 P0, 4 P1, 3 INFO)_
