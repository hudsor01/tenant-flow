---
phase: 1 — v2.0 Dashboard Command Center Foundation & Dedup
reviewed: 2026-05-23T00:00:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-types.ts
  - src/components/dashboard/dashboard.tsx
  - src/components/dashboard/components/portfolio-grid.tsx
  - src/components/dashboard/components/portfolio-table.tsx
  - src/components/dashboard/components/revenue-overview-chart.tsx
  - src/hooks/api/use-dashboard-hooks.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-23T00:00:00Z
**Depth:** deep
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 1 lands the foundation+dedup work cleanly on the **bug-fix and deletion axes**:

- Currency round-trip bug killed at the source — every `* 100` / `/ 100` on a currency variable in the dashboard subtree is gone (D-03 grep gate passes; the only surviving `* 100` is `chart-area-interactive.tsx:73`'s percent-margin calculation, which is non-currency math and is preserved per D-13a).
- `formatDashboardCurrency` is fully evicted — zero remaining references anywhere in `src/` or `tests/`. All three callers (`dashboard.tsx`, `portfolio-grid.tsx`, `portfolio-table.tsx`) use `formatCurrency` with the `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }` shape required by D-09a, so KPI tile dollar displays remain `$1,234` (not `$1,234.00`).
- Dedup target list landed: `owner-dashboard.tsx` + its 631-line test, `dashboard-filters{,-compact,-utils}.tsx`, the orphan top-level `portfolio-toolbar.tsx`, `skeletons.tsx` are all removed. `chart-area-interactive.tsx` correctly preserved per D-13a (active in `/analytics/overview` + `/properties/units`).
- `transformDashboardData` is composed in `use-dashboard-hooks.ts` selectors per D-12a interpretation #2 — NOT baked into `DASHBOARD_BASE_QUERY_OPTIONS`. The base options stay reusable.
- `transformDashboardData` is a pure function: no `'use client'`, no React imports, no hooks, no Supabase coupling. Server-Component-safe. Style matches `article-schema.ts` (the cited analog).
- `dashboard-types.ts` is correctly slimmed: `PortfolioRow`, `chartConfig`, `quickActions`, `QuickActionType` retained; the deleted `formatDashboardCurrency` leaves no orphan `Intl` import (it was never there — that helper used the deleted function form).

But the work introduces **one Zero-Tolerance Rule-3 violation** (duplicate type declaration) plus several quality issues that should be cleaned before the second perfect-PR review cycle. Detail below.

## Critical Issues

### CR-01: `DashboardRpcPayload` duplicates `OwnerDashboardData` — Zero Tolerance Rule 3 violation

**File:** `src/components/dashboard/dashboard-data.ts:15-29`
**Issue:**
`DashboardRpcPayload` (lines 15-29 of the new `dashboard-data.ts`) is **structurally identical** to `OwnerDashboardData` (lines 173-187 of `src/hooks/api/use-owner-dashboard.ts`). Verified byte-for-byte: only difference is `interface { ... }` vs `type = { ... };`. Both declare the same 5 fields with the same nested shapes for `stats`, `activity`, `metricTrends`, `timeSeries`, `propertyPerformance`.

This violates **CLAUDE.md Zero Tolerance Rule 3** ("No duplicate types — search `src/types/` before creating any type"). The phase **intent was to dedup**; introducing a fresh duplicate type alongside the dedup work is a direct contradiction of the phase goal.

The duplication is also semantically dangerous: `use-dashboard-hooks.ts` already imports BOTH types — `OwnerDashboardData` from `./use-owner-dashboard` (line 24) AND consumes `transformDashboardData(data: OwnerDashboardData)` indirectly through TypeScript structural compatibility. Today the structural-compat works because the two types match. The moment `OwnerDashboardData` evolves (Phase 2's planned RPC additive migration for `open_maintenance` is the very next phase), the two will silently drift. The transform will still typecheck because TypeScript will allow an `OwnerDashboardData` to satisfy `DashboardRpcPayload` only by structural width — but missing fields on the consumer side become silent runtime issues.

The doc comment on `DashboardRpcPayload` even acknowledges the duplication ("mirrors OwnerDashboardData") — that's the smell. "Mirrors" means "duplicates."

**Fix:** Delete `DashboardRpcPayload` and import the canonical type:

```typescript
// src/components/dashboard/dashboard-data.ts
import type { OwnerDashboardData } from "#hooks/api/use-owner-dashboard";
import type { PortfolioRow } from "./dashboard-types";

export interface DashboardViewModel {
	stats: OwnerDashboardData["stats"];
	timeSeries: OwnerDashboardData["timeSeries"];
	portfolioRows: PortfolioRow[];
}

export function transformDashboardData(
	payload: OwnerDashboardData,
): DashboardViewModel {
	// ...unchanged body
}
```

This collapses the two type sources into one and removes the drift surface before Phase 2 migrations land.

Note: if the concern is "I don't want a circular `components/dashboard/ → hooks/api/ → components/dashboard/` cycle," the cycle DOESN'T exist today — `use-dashboard-hooks.ts` is the only file in `hooks/api/` that touches `dashboard-data.ts`, and the import direction is one-way (`use-dashboard-hooks → dashboard-data`). Importing `OwnerDashboardData` (a pure type) back from `use-owner-dashboard.ts` is type-only and erased at compile time; no runtime cycle is created.

## Warnings

### WR-01: Transform runs twice per cache hit (selectStats AND selectCharts both invoke `transformDashboardData(data)`)

**File:** `src/hooks/api/use-dashboard-hooks.ts:35-42`
**Issue:**
`selectStats` (line 36) and `selectCharts` (line 41) each call `transformDashboardData(data)` — but each then **discards the `portfolioRows` array** that the transform built. Both selectors only read `.stats` or `.timeSeries`, which are already passthrough fields in the transform (lines 73-78 of `dashboard-data.ts`).

Net effect on every cache hit, for both selectors:
1. Build `portfolioRows: PortfolioRow[]` by iterating `payload.propertyPerformance.map(...)` — wasted work.
2. Allocate a new view-model object containing the wasted array.
3. Read one field (`.stats` for selectStats, `.timeSeries` for selectCharts).
4. Throw away the rest, including the wasted array.

React Query's selector memoization saves you the per-render cost (because `select` results are memoized when input data identity is unchanged), but the **first transform invocation after every cache update** pays the cost twice, once per selector. With `n` properties, that's `2n` allocations of object literals you immediately discard.

Worse: the comment block at `use-dashboard-hooks.ts:27-34` explicitly says `portfolioRows` (the only field the transform actually computes) is **NOT consumed** by the current dashboard/page.tsx → dashboard.tsx pipeline (which still does its own `portfolioData` transform inline at `dashboard.tsx:77-92`). So the entire `portfolioRows.map(...)` work in `transformDashboardData` is **dead work** until Phase 3 migrates the consumer.

**Fix:** Have the selectors read the slice they actually need from `data` directly, and reserve `transformDashboardData(data)` for callers that need `portfolioRows`. Cleanest form:

```typescript
const selectStats = (data: OwnerDashboardData): DashboardStatsData => ({
	stats: data.stats,
	metricTrends: data.metricTrends,
});

const selectCharts = (data: OwnerDashboardData): DashboardChartsData => ({
	timeSeries: data.timeSeries,
});
```

`transformDashboardData` then becomes Phase 3's seam — invoked once, in the consumer that renders `portfolioRows`. Today it lives unused-on-the-result-side; the import wire is the only thing that exists in Phase 1, and that's defensible. But invoking it twice per cache hit just to throw the result away is not.

Alternative if you want to keep the call to satisfy the "transform is wired" success criterion: extract a single `useDashboardViewModel()` hook that calls the transform ONCE per cache hit and exposes the view-model, then have `selectStats`/`selectCharts` read from `data` directly (or be replaced by `useDashboardViewModel().stats` style accessors in Phase 3).

### WR-02: `DashboardRpcPayload.timeSeries` is typed required, but transform body uses `?.` on it

**File:** `src/components/dashboard/dashboard-data.ts:76-77`
**Issue:**
```typescript
return {
    stats: payload.stats,
    timeSeries: {
        occupancyRate: payload.timeSeries?.occupancyRate ?? [],
        monthlyRevenue: payload.timeSeries?.monthlyRevenue ?? [],
    },
    portfolioRows,
};
```

The interface at lines 24-27 declares `timeSeries: { occupancyRate: TimeSeriesDataPoint[]; monthlyRevenue: TimeSeriesDataPoint[] }` — **non-optional, non-nullable**. The optional-chain `payload.timeSeries?.occupancyRate` is dead defensiveness: if `timeSeries` were ever `undefined`, the type contract is already lying to every caller.

Pick a side:
- **Option A (recommended):** Trust the type. Drop the `?.`:
  ```typescript
  timeSeries: {
      occupancyRate: payload.timeSeries.occupancyRate,
      monthlyRevenue: payload.timeSeries.monthlyRevenue,
  },
  ```
- **Option B:** Reflect the runtime reality. Mark `timeSeries` as optional in the interface:
  ```typescript
  timeSeries?: { occupancyRate: TimeSeriesDataPoint[]; monthlyRevenue: TimeSeriesDataPoint[] };
  ```
  Then the `?.` + `?? []` is justified.

The fetcher at `use-owner-dashboard.ts:255-258` always emits the shape with both keys present (`?? []` fallbacks at construction), so **Option A is the honest one** — the runtime guarantee matches the type.

Same dead-defensiveness pattern at the call site in page.tsx:88 (`chartsData?.timeSeries?.monthlyRevenue` — `timeSeries` is non-nullable on `DashboardChartsData`), but page.tsx isn't really in this phase's scope to rewrite.

### WR-03: `propertyPerformance.map` accepts no fallback when `propertyPerformance` is absent

**File:** `src/components/dashboard/dashboard-data.ts:54`
**Issue:**
```typescript
const portfolioRows: PortfolioRow[] = payload.propertyPerformance.map(
    (prop) => ({ ... }),
);
```

If `payload.propertyPerformance` is ever `undefined` at runtime, this throws `TypeError: Cannot read properties of undefined (reading 'map')`. The interface declares it non-optional, but the fetcher's defensive `?? []` at `use-owner-dashboard.ts:227-229` shows the team knows the RPC has historically returned missing keys.

This is inconsistent with WR-02 (you're defensive on `timeSeries` but trusting on `propertyPerformance`). Combined with WR-02, pick one stance for the whole transform.

**Fix:** match the `?? []` defensive style for both:
```typescript
const portfolioRows: PortfolioRow[] = (payload.propertyPerformance ?? []).map(
    (prop) => ({ ... }),
);
```
…or trust the type contract for both and drop `?.` from line 76-77.

### WR-04: `dashboard.tsx` still carries the same `portfolioData` transform inline (duplicate of the new transform)

**File:** `src/components/dashboard/dashboard.tsx:77-92`
**Issue:**
```typescript
const portfolioData: PortfolioRow[] = propertyPerformance.map((prop) => ({
    id: prop.id,
    property: prop.name,
    address: prop.address,
    units: { occupied: prop.occupiedUnits, total: prop.totalUnits },
    tenant: prop.occupiedUnits > 0 ? `${prop.occupiedUnits} tenants` : null,
    leaseStatus:
        prop.occupancyRate === 100
            ? "active"
            : prop.occupancyRate >= 80
                ? "expiring"
                : "vacant",
    leaseEnd: null,
    rent: prop.monthlyRevenue,
    maintenanceOpen: 0,
}));
```

This is the **same** logic that now lives in `transformDashboardData` (`dashboard-data.ts:54-71`), with one schema difference: `dashboard.tsx` reads `prop.id` / `prop.name` / `prop.address` (the view-model field names that `page.tsx:100-109` re-mapped from `PropertyPerformance`), while `transformDashboardData` reads `prop.property_id` / `prop.property` / `prop.address_line1` (the raw `PropertyPerformance` shape).

So Phase 1 has TWO transforms now: the unused-on-the-result-side `transformDashboardData` and the inline duplicate in `dashboard.tsx`. The `use-dashboard-hooks.ts:30-34` comment block calls this out and parks the resolution for Phase 3 ("Phase 3 migrates the consumer when dashboard-view.tsx replaces dashboard.tsx").

Parking it for Phase 3 is defensible — but it should be **explicit in the source**, not buried in a comment block in a hook file. Add a TODO comment in `dashboard.tsx` near line 77 pointing at the duplicate, so the next reviewer doesn't have to grep across files to discover this is acknowledged tech debt:

```typescript
// TODO(phase-3): replace this inline portfolioData transform with
// transformDashboardData from #components/dashboard/dashboard-data once
// dashboard-view.tsx replaces dashboard.tsx (see use-dashboard-hooks.ts:27-34).
const portfolioData: PortfolioRow[] = propertyPerformance.map((prop) => ({
    // ...
}));
```

CLAUDE.md Rule 4 forbids commented-out *code* — not informational TODO comments — so this is policy-compliant.

## Info

### IN-01: `chartsData` is read off `useDashboardCharts()` but `selectCharts` drops `metricTrends` — verify consumers don't rely on it

**File:** `src/hooks/api/use-dashboard-hooks.ts:40-42`, `src/app/(owner)/dashboard/page.tsx:43-47, 87-94`
**Issue:**
`useDashboardCharts()` returns `{ timeSeries: { occupancyRate, monthlyRevenue } }`. The page consumes only `chartsData?.timeSeries?.monthlyRevenue` (page.tsx:88-93), so the slice is correct.

But `metricTrends` is **only available through `useDashboardStats()`** (`selectStats` returns it), not through `useDashboardCharts()`. The `OwnerDashboardData` ships `metricTrends` co-located with `timeSeries` (both are conceptually trend/series data), so a future consumer asking for "charts data" might reasonably expect trends too and be surprised. Worth a 1-line code comment near the `DashboardChartsData` interface declaration in `use-owner-dashboard.ts:162-167` clarifying that `metricTrends` lives on `DashboardStatsData` by convention.

### IN-02: `selectActivity` and `selectPropertyPerformance` bypass the transform entirely — make the asymmetry explicit

**File:** `src/hooks/api/use-dashboard-hooks.ts:44-50`
**Issue:**
Per the inline comment, `selectActivity` and `selectPropertyPerformance` don't compose `transformDashboardData(data)` because they need shapes the view-model doesn't carry. That's fine, but as a future-reader signal, consider folding the rationale into the JSDoc on `transformDashboardData` itself (in `dashboard-data.ts`) rather than only in the hook file. The transform's docblock says "view-model exposed to dashboard surfaces — Phases 3/4/5 read from this" — append "Note: `activity` and `propertyPerformance` remain on the raw `OwnerDashboardData` shape because existing consumers depend on those shapes; Phase 3's `dashboard-view.tsx` migration is when those slices fold into the view-model."

### IN-03: `revenue-overview-chart.tsx` axis tick formatter still uses `/ 1000` (non-currency thousand-unit display — confirmed safe)

**File:** `src/components/dashboard/components/revenue-overview-chart.tsx:70`
**Issue:**
`tickFormatter={(value) => \`$${(value / 1000).toFixed(0)}k\`}` — this is the thousand-unit axis display, explicitly allowed per UI-SPEC § 8.1 and CONTEXT.md D-03. Listed only for verification: the line is correct, not a hidden violation of the "no `/ 100`" rule. The bug fix correctly targeted `point.revenue / 100` at the data-mapping level (line 41), not the axis formatter.

---

## Compliance Audit — CLAUDE.md Zero Tolerance Rules (all 10)

| Rule | Status | Evidence |
|------|--------|----------|
| 1. No `any` types | PASS | No `any` introduced in the 8 reviewed files. The fetcher (out-of-scope) still uses `data as { ... }` shape assertion at `use-owner-dashboard.ts:213-219` but that's not Phase 1 work. |
| 2. No barrel files / re-exports | PASS | `use-dashboard-hooks.ts:115-118` re-exports `FinancialChartDatum` and `FinancialTimeRange` — these are **type re-exports from a non-barrel module** (the file has its own hooks too), permitted under the rule's spirit (rule targets `index.ts` re-exports). Not a violation. |
| 3. No duplicate types | **FAIL (CR-01)** | `DashboardRpcPayload` duplicates `OwnerDashboardData`. |
| 4. No commented-out code | PASS | All comments in the diff are informational JSDoc / explanatory blocks, no dead code blocks. |
| 5. No inline styles | PASS | No `style={{}}` in any of the 8 files. |
| 6. No PostgreSQL ENUMs | N/A | No schema work in Phase 1. |
| 7. No emojis in code | PASS | Verified across all 8 files. |
| 8. No `as unknown as` | PASS | None in the 8 reviewed files. (`use-owner-dashboard.ts:213` uses `data as { ... }` single-cast, not `as unknown as`.) |
| 9. No string-literal query keys | PASS | `DASHBOARD_BASE_QUERY_OPTIONS.queryKey: ownerDashboardKeys.analytics.pageData()` — factory-based, correct. Selectors don't define their own query keys. |
| 10. No `@radix-ui/react-icons` | PASS | `dashboard-types.ts` imports `Building2, FileText, UserPlus, Wallet, Wrench` from `lucide-react`. |

---

## Compliance Audit — Phase 1 specific gates

| Gate | Status | Evidence |
|------|--------|----------|
| D-03 grep gate (no `* 100` / `/ 100` on currency variables in dashboard subtree) | PASS | Only surviving hit: `chart-area-interactive.tsx:73 (netProfit / totalRevenue) * 100` — percent-margin calculation on a ratio, NOT currency. File preserved per D-13a. |
| D-09a swap call form (`{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`) | PASS | Verified at `dashboard.tsx:164-167`, `portfolio-grid.tsx:45-48`, `portfolio-table.tsx:137-140`. |
| D-09 swap import path uses subpath alias | PASS | All 3 callers: `import { formatCurrency } from "#lib/utils/currency"`. |
| D-10 transform file location | PASS | `src/components/dashboard/dashboard-data.ts` created with pure function. |
| D-11 transform purity (no React, no hooks, no Query) | PASS | No `'use client'`, no React/hooks imports, no Supabase client, no React Query. Server-Component-safe. |
| D-11 `export function` declaration form | PASS | `export function transformDashboardData(...)` — literal `function` keyword at line 51 (NOT arrow). |
| D-12a interpretation #2 (selectors compose, NOT in `DASHBOARD_BASE_QUERY_OPTIONS`) | PASS | `DASHBOARD_BASE_QUERY_OPTIONS` (`use-owner-dashboard.ts:263-270`) has zero `select:` key. Selectors live in `use-dashboard-hooks.ts:35-50`. |
| D-13/D-13a/D-13b/D-14a deletions landed | PASS | Verified `owner-dashboard.tsx`, `owner-dashboard.test.tsx`, `dashboard-filters.tsx`, `dashboard-filters-compact.tsx`, `dashboard-filters-utils.ts`, root-level `portfolio-toolbar.tsx`, `skeletons.tsx` all removed. `chart-area-interactive.tsx` correctly preserved. |
| Selector identity stability (no inline closures) | PASS | `selectStats`, `selectCharts`, `selectActivity`, `selectPropertyPerformance` are module-scope `const` declarations. |
| No hook bypass (`LEFTHOOK_EXCLUDE`, `--no-verify`) | PASS | `git log` shows clean commit signatures; no `--no-verify` or env-bypass evidence. |

---

## Verdict for cycle 1 of the perfect-PR gate

**Not yet zero-finding** — one critical (CR-01) and four warnings (WR-01..WR-04) require resolution before cycle 2 can pass.

CR-01 is the only **blocker for shipping** (Zero Tolerance Rule 3 violation introduced by the new code).
WR-01..WR-04 are correctness-adjacent quality issues that will resurface in cycle 2 if left in place.
IN-01..IN-03 are advisory only.

Recommended fix order:
1. Fix CR-01 by importing `OwnerDashboardData` into `dashboard-data.ts` and deleting `DashboardRpcPayload`.
2. Decide the defensive-vs-trust posture for the transform and apply uniformly (resolves WR-02 + WR-03 in one pass).
3. Pull `transformDashboardData(data)` out of `selectStats`/`selectCharts` since they don't consume `portfolioRows` (resolves WR-01).
4. Add the TODO comment in `dashboard.tsx:77` pointing at the parked Phase-3 migration (resolves WR-04).
5. Apply IN-01..IN-03 comment improvements if shipping the fix commit anyway.

---

_Reviewed: 2026-05-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
