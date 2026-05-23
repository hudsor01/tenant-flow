# Phase 1: Foundation & Dedup - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 13 (3 modified for `*100`/`/100` removal, 4 modified for `formatCurrency` swap, 1 modified for `select:` wiring, 5 deleted, 1 created, plus 1 not-quite-as-stated)
**Analogs found:** 7 / 8 (the `dashboard-data.ts` pure transform has no direct prior art in the codebase — the closest analog is the inline RPC mapper already inside `use-owner-dashboard.ts:227-261`)

---

## Critical Reality-Checks (resolved before planning)

These were surfaced by re-grepping the live codebase against CONTEXT.md claims. Planner MUST incorporate these into the plan.

### RC-1. Cited file paths and line numbers — VERIFIED, with caveats

| CONTEXT.md claim | Verified | Notes |
|------------------|---------|-------|
| `page.tsx` lines 71, 92, 107 carry `*100` | **EXACT MATCH** | Lines 71, 92, 107 all have `* 100` on a currency value. No drift. |
| `dashboard-types.ts:29` has `/ 100` inside `formatDashboardCurrency` | **EXACT MATCH** | Line 29: `}).format(cents / 100);` |
| `revenue-overview-chart.tsx:41` has `/ 100` | **EXACT MATCH** | Line 41: `revenue: point.revenue / 100,` |
| `dashboard-filters-compact.tsx` exists | **VERIFIED** (3.1k file) | Listed in `ls` |
| Top-level `src/components/dashboard/portfolio-toolbar.tsx` exists | **VERIFIED** (2.8k file) | And it is genuinely orphaned (see RC-3) |

### RC-2. `chart-area-interactive.tsx` is NOT unused — CONTEXT.md is WRONG

CONTEXT.md D-13 says "unused interactive chart" and `01-UI-SPEC.md § 0` says "was unused". **Live grep contradicts both.** The file has TWO active consumers outside the dashboard subtree:

```
src/app/(owner)/analytics/overview/page.tsx:8-11      — dynamic import
src/app/(owner)/properties/units/page.tsx:42-45       — dynamic import
```

**Implication for the planner:** Deleting `chart-area-interactive.tsx` in Phase 1 will break `/analytics/overview` and `/properties/units`. Two options:

- **Option A (recommended):** Keep `chart-area-interactive.tsx` in Phase 1. Its `* 100` / `/ 100` patterns at `chart-area-interactive.tsx:73` (`profitMargin = (netProfit / totalRevenue) * 100`) and `:268` (`(value / 1000).toFixed(0)`) are both non-currency arithmetic and already excluded by D-03's allowlist. The file does NOT need to be deleted to satisfy POLISH-03 (it's not a dashboard duplicate; it's an analytics chart that happens to live in `components/dashboard/`).
- **Option B:** Migrate the two callers to a new file first, then delete. This expands Phase 1 scope into analytics surfaces, which CONTEXT.md says is out of scope.

**Planner directive:** Surface this to the user during planning. Default to Option A unless the user explicitly overrides.

### RC-3. `owner-dashboard.tsx` deletion requires also deleting its test file

Live grep:
```
src/components/dashboard/__tests__/owner-dashboard.test.tsx — 631 lines, mocks `#hooks/api/use-owner-dashboard`, renders `<OwnerDashboard />`
```

The "OwnerDashboard" references at `src/app/(owner)/owner-dashboard-layout.tsx:16` and `src/app/(owner)/layout.tsx:6,66,68` are for a DIFFERENT component (`OwnerDashboardLayout`, a layout shell), not the duplicate `OwnerDashboard` we're deleting. Safe to delete `owner-dashboard.tsx` + its `__tests__/owner-dashboard.test.tsx` together.

**Planner directive:** Add `src/components/dashboard/__tests__/owner-dashboard.test.tsx` to the delete list. CONTEXT.md D-13 missed it.

### RC-4. `dashboard-filters.tsx` has ZERO real consumers — safe to delete

Live grep `grep -rln 'dashboard-filters\|DashboardFilters' src/ tests/`:
```
src/app/__tests__/design-token-drift.test.ts            — a scanner that reads the file; not a consumer
src/stores/dashboard-store.ts                            — exports `useDashboardFilters` (a Zustand selector hook, NOT an import from dashboard-filters.tsx)
src/components/dashboard/dashboard-filters.tsx           — self
src/components/dashboard/dashboard-filters-utils.ts      — sibling
```

No JSX/component-level imports. Both `dashboard-filters.tsx` AND `dashboard-filters-utils.ts` can be deleted in Phase 1. **Confirms** D-13's "delete if zero consumers" branch.

### RC-5. Top-level `portfolio-toolbar.tsx` is the orphan; canonical is under `components/`

Live grep `grep -rn 'PortfolioToolbar\|portfolio-toolbar' src/`:
```
src/components/dashboard/dashboard.tsx:41               — imports from "./components/portfolio-toolbar"
src/components/dashboard/portfolio-toolbar.tsx          — orphan (no consumers)
src/components/dashboard/components/portfolio-toolbar.tsx — canonical
```

Top-level `portfolio-toolbar.tsx` is safe to delete. Confirms D-13.

### RC-6. `skeletons.tsx` has zero consumers — safe to delete

Live grep finds `dashboard/skeletons` only in two e2e specs:
```
src/components/dashboard/__tests__/owner-dashboard.test.tsx — being deleted in RC-3
tests/e2e/tests/_archived/production-flows/tenant-complete-journey.e2e.spec.ts — _archived, not run in CI
```

No production import. Safe to delete.

### RC-7. `formatCurrency` swap requires options object to preserve display

The current `formatDashboardCurrency` uses `minimumFractionDigits: 0, maximumFractionDigits: 0` (no cents). The canonical `formatCurrency` defaults to `minimumFractionDigits: 2, maximumFractionDigits: 2`. **A naive swap would visibly change the display from `$1,234` to `$1,234.00`.**

**Correct swap pattern** (matches `analytics-stats-row.tsx:16` and `analytics-revenue-chart.tsx:19`):
```typescript
formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
```

This preserves the current display exactly. Planner directive: every Phase 1 swap callsite uses the options-object form unless the user explicitly approves showing cents.

### RC-8. The `*100` removal is exhaustive at 4 currency sites; the other matches are non-currency

Live grep `grep -rnE '(\* ?100|/ ?100)' 'src/app/(owner)/dashboard/' src/components/dashboard/`:

| Match | Currency? | Phase 1 action |
|-------|----------|----------------|
| `page.tsx:71` `(stats.revenue?.monthly ?? 0) * 100` | YES | DELETE `* 100` |
| `page.tsx:92` `point.value * 100` | YES | DELETE `* 100` |
| `page.tsx:107` `prop.monthlyRevenue * 100` | YES | DELETE `* 100` |
| `dashboard-types.ts:29` `format(cents / 100)` | YES | DELETED via whole-function removal |
| `revenue-overview-chart.tsx:41` `point.revenue / 100` | YES | DELETE `/ 100` (one-line fix on a file deleted in Phase 4) |
| `revenue-overview-chart.tsx:70` `(value / 1000).toFixed(0)` | NO (axis thousands) | KEEP (D-03 allowlist) |
| `chart-area-interactive.tsx:73` `(netProfit / totalRevenue) * 100` | NO (percent) | KEEP (D-03 allowlist; file stays per RC-2) |
| `chart-area-interactive.tsx:268` `(value / 1000).toFixed(0)` | NO (axis thousands) | KEEP (D-03 allowlist) |
| `owner-dashboard.tsx:151,172,187` `* 100` (×3) | YES, but file is DELETED | DELETE via file removal |
| `expiring-leases-widget.tsx:37,80` `60 * 1000`, `5 * 60 * 1000` | NO (ms arithmetic) | KEEP (D-03 allowlist) |

Net post-PR currency `* 100` / `/ 100` count: **zero**. D-03 success criterion is achievable.

---

## File Classification

| New / Modified / Deleted File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------------------|------|-----------|----------------|---------------|
| `src/app/(owner)/dashboard/page.tsx` (MODIFY) | page | request-response | self (only 3 minus-`*100` edits inside existing transform IIFEs) | self |
| `src/components/dashboard/dashboard-types.ts` (MODIFY) | constants/types module | n/a (type defs + constants) | self (delete function, keep rest) | self |
| `src/components/dashboard/dashboard.tsx` (MODIFY) | component | render-time formatting | `src/components/leases/detail/lease-terms-tab.tsx` for `formatCurrency` call form | role-match |
| `src/components/dashboard/components/portfolio-grid.tsx` (MODIFY) | component | render-time formatting | `src/components/properties/property-table-row.tsx` for `formatCurrency` in table-like row card | role-match |
| `src/components/dashboard/components/portfolio-table.tsx` (MODIFY) | component | render-time formatting | `src/app/(owner)/analytics/financial/_components/lease-table.tsx` (table cell `formatCurrency`) | exact |
| `src/components/dashboard/components/revenue-overview-chart.tsx` (MODIFY — 1 line) | component | render-time data prep | self (one-line edit only) | self |
| `src/hooks/api/use-owner-dashboard.ts` (MODIFY) | query factory | data fetch + transform | `src/hooks/api/use-properties.ts:18-19,53-59` (named `select` callback) | exact |
| `src/components/dashboard/dashboard-data.ts` (CREATE) | pure transform module | view-model build | inline transform in `src/hooks/api/use-owner-dashboard.ts:227-261` (the `propertyPerformance.map(row => …)` block) + the page.tsx IIFE transforms at lines 52-110 | role-match (no exact prior art for an extracted pure transform) |
| `src/components/dashboard/owner-dashboard.tsx` (DELETE) | duplicate component | — | n/a | n/a |
| `src/components/dashboard/__tests__/owner-dashboard.test.tsx` (DELETE — added per RC-3) | test | — | n/a | n/a |
| `src/components/dashboard/dashboard-filters-compact.tsx` (DELETE) | duplicate component | — | n/a | n/a |
| `src/components/dashboard/dashboard-filters.tsx` (DELETE — per RC-4) | orphan component | — | n/a | n/a |
| `src/components/dashboard/dashboard-filters-utils.ts` (DELETE — per RC-4) | orphan utility | — | n/a | n/a |
| `src/components/dashboard/portfolio-toolbar.tsx` (DELETE — top-level) | orphan component | — | n/a | n/a |
| `src/components/dashboard/skeletons.tsx` (DELETE — per RC-6) | orphan | — | n/a | n/a |
| `src/components/dashboard/chart-area-interactive.tsx` (KEEP per RC-2) | analytics chart | — | n/a (out of Phase 1 scope) | — |

---

## Pattern Assignments

### `src/app/(owner)/dashboard/page.tsx` (MODIFY — 3 `*100` deletes)

**Analog:** self. The three edits are minimal one-line excisions inside existing transform IIFEs.

**Lines to edit** (current file, verified 2026-05-22):

```typescript
// Line 71 — CURRENT
totalRevenue: (stats.revenue?.monthly ?? 0) * 100, // Convert to cents
// → CHANGE TO
totalRevenue: stats.revenue?.monthly ?? 0,

// Line 92 — CURRENT
revenue: point.value * 100, // Convert to cents
// → CHANGE TO
revenue: point.value,

// Line 107 — CURRENT
monthlyRevenue: prop.monthlyRevenue * 100, // Convert to cents
// → CHANGE TO
monthlyRevenue: prop.monthlyRevenue,
```

**Drop the `// Convert to cents` comments too** — they're lies-now-that-the-bug-is-gone (the values are already dollars per the RPC contract).

**Optional follow-up after wiring `select:` (D-12):** Once `transformDashboardData` lands inside `select:`, the three IIFEs in `DashboardContent()` (lines 52-110) collapse to consuming `data.stats`, `data.timeSeries.monthlyRevenue`, `data.propertyPerformance` directly. Whether to refactor in this PR or defer to Phase 3 (when `dashboard-view.tsx` replaces `dashboard.tsx`) is a planner call. CONTEXT.md D-12 implies "wire it now"; D-13's atomic-commit discipline implies "one concern per commit". **Recommended:** wire `select:` AND drop the `*100`s in the same commit, leave the IIFE→view-model refactor for Phase 3.

---

### `src/components/dashboard/dashboard-types.ts` (MODIFY — delete `formatDashboardCurrency`)

**Analog:** self.

**Lines to delete:** 23-30 (the entire `formatDashboardCurrency` export).

**What to keep:** `PortfolioRow` type (lines 4-14), `chartConfig` constant (lines 16-21), `quickActions` constant (lines 32-63), `QuickActionType` type (line 65). These four exports are the file's reason to exist.

**Excerpt to keep verbatim:**
```typescript
import { Building2, FileText, UserPlus, Wallet, Wrench } from "lucide-react";
import type { ChartConfig } from "#components/ui/chart";

export type PortfolioRow = {
  id: string;
  property: string;
  address: string;
  units: { occupied: number; total: number };
  tenant: string | null;
  leaseStatus: "active" | "expiring" | "vacant";
  leaseEnd: string | null;
  rent: number;
  maintenanceOpen: number;
};

export const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// formatDashboardCurrency removed — use formatCurrency from #lib/utils/currency

export const quickActions = [/* unchanged */] as const;

export type QuickActionType = (typeof quickActions)[number]["action"];
```

---

### `src/components/dashboard/dashboard.tsx` (MODIFY — swap `formatDashboardCurrency` → `formatCurrency`)

**Analog:** `src/components/leases/detail/lease-terms-tab.tsx:9,34` for the import + single-arg-call pattern.

**Imports pattern** (from `lease-terms-tab.tsx`):
```typescript
import { formatCurrency } from "#lib/utils/currency";
```

**Call form** (RC-7 — preserve no-cents display):
```typescript
formatCurrency(metrics.totalRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
```

**Edit** (line 12 import + line 164 call):

```diff
- import {
-   formatDashboardCurrency,
-   type PortfolioRow,
-   type QuickActionType,
-   quickActions,
- } from "./dashboard-types";
+ import {
+   type PortfolioRow,
+   type QuickActionType,
+   quickActions,
+ } from "./dashboard-types";
+ import { formatCurrency } from "#lib/utils/currency";

- {formatDashboardCurrency(metrics.totalRevenue)} this month
+ {formatCurrency(metrics.totalRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} this month
```

---

### `src/components/dashboard/components/portfolio-grid.tsx` (MODIFY — same swap)

**Analog:** `src/components/properties/property-table-row.tsx:14` (import) + `src/app/(owner)/analytics/property-performance/active-units-table.tsx` for table-row-cell formatting in a comparable grid card context.

**Edit** (lines 1-2 imports + line 45 call):

```diff
- import type { PortfolioRow } from "../dashboard-types";
- import { formatDashboardCurrency } from "../dashboard-types";
+ import type { PortfolioRow } from "../dashboard-types";
+ import { formatCurrency } from "#lib/utils/currency";

- {formatDashboardCurrency(row.rent)}
+ {formatCurrency(row.rent, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
```

---

### `src/components/dashboard/components/portfolio-table.tsx` (MODIFY — same swap)

**Analog:** `src/app/(owner)/analytics/financial/_components/lease-table.tsx:7` for a table dollar-cell using `formatCurrency`.

**Edit** (lines 11-12 imports + line 137 call):

```diff
- import type { PortfolioRow } from "../dashboard-types";
- import { formatDashboardCurrency } from "../dashboard-types";
+ import type { PortfolioRow } from "../dashboard-types";
+ import { formatCurrency } from "#lib/utils/currency";

  <TableCell className="text-right tabular-nums">
-   {formatDashboardCurrency(row.rent)}
+   {formatCurrency(row.rent, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
  </TableCell>
```

**Note** (CONTEXT.md hint): this file is fully deleted in Phase 5. Touch lightly in Phase 1 — no other refactors.

---

### `src/components/dashboard/components/revenue-overview-chart.tsx` (MODIFY — 1 line)

**Analog:** self. One-line excision.

**Edit** (line 41):

```diff
  data={revenueTrend.map((point) => ({
    month: point.month,
-   revenue: point.revenue / 100,
+   revenue: point.revenue,
  }))}
```

**Note:** This file is deleted entirely in Phase 4. The one-line fix here is for "cycle-consistency" per D-01 — the file lives ~3 phases between Phase 1 (fix) and Phase 4 (replace). Safe to touch.

---

### `src/hooks/api/use-owner-dashboard.ts` (MODIFY — add `select:` wiring per D-12)

**Analog:** `src/hooks/api/use-properties.ts:18-19,53-59` — the canonical "named pure select function + `useQuery({ ...queryOptions, select })`" pattern.

**Pattern from `use-properties.ts`:**

```typescript
/** Stable select function for TanStack Query optimization */
const selectPaginatedData = <T>(response: PaginatedResponse<T>): T[] =>
  response.data;

export function usePropertyList(params?: { … }) {
  // …
  return useQuery({
    ...listQuery,
    ...QUERY_CACHE_TIMES.LIST,
    select: selectPaginatedData,
    structuralSharing: true,
    notifyOnChangeProps: ["data", "error", "isPending", "isFetching"],
  });
}
```

**Critical wiring nuance** in `use-owner-dashboard.ts` — this file is the **query-factory** module; the actual `useQuery({ ..., select })` calls live in the sibling `src/hooks/api/use-dashboard-hooks.ts` (already-shipped `selectStats`/`selectCharts`/`selectActivity`/`selectPropertyPerformance` selectors at lines 26-41).

**Recommended wiring** (matches the sibling-hooks pattern):

```typescript
// In src/hooks/api/use-owner-dashboard.ts — leave the fetcher unchanged,
// but expose transformDashboardData so use-dashboard-hooks.ts can compose:

import { transformDashboardData } from "#components/dashboard/dashboard-data";
// (re-export or just consume from use-dashboard-hooks.ts directly)

// In src/hooks/api/use-dashboard-hooks.ts — wrap each selector:
import { transformDashboardData } from "#components/dashboard/dashboard-data";

const selectStats = (data: OwnerDashboardData): DashboardStatsData =>
  transformDashboardData(data).stats; // …or whatever the transform returns
```

**Planner directive:** The select-wiring decision is more nuanced than CONTEXT.md D-12 implies because `use-owner-dashboard.ts` doesn't directly call `useQuery` — it exports query-options used by `use-dashboard-hooks.ts`. Possible interpretations:

1. **D-12 strict:** Apply `transformDashboardData` inside `DASHBOARD_BASE_QUERY_OPTIONS` so every downstream consumer (`use-dashboard-hooks.ts` × 4 selectors + others) gets the view-model. This requires `DASHBOARD_BASE_QUERY_OPTIONS` to grow a `select:` — but per React Query semantics, `useQuery` per-call `select` overrides query-options-level `select`, so the existing 4 selectors in `use-dashboard-hooks.ts` would mask it. **NOT recommended.**
2. **D-12 pragmatic (recommended):** `transformDashboardData(rpcPayload)` becomes a free-standing helper imported by the 4 existing select functions in `use-dashboard-hooks.ts`. The fetcher in `use-owner-dashboard.ts` stays untouched. The view-model lives where consumers reach it.
3. **D-12 minimal:** Phase 1 ships `transformDashboardData` as an exported pure function (per D-11). Phase 3 wires it into `select:` when `dashboard-view.tsx` replaces `dashboard.tsx`. Phase 1 establishes the contract; Phase 3 consumes it.

Surface this to the user during planning. **Default to interpretation #2.**

---

### `src/components/dashboard/dashboard-data.ts` (CREATE — pure transform)

**Closest analog:** the inline transforms already in the codebase. There is no extracted-pure-transform-module prior art. The closest comparable pure modules in `src/lib/`:

- `src/lib/utils/currency.ts` — pure export style: typed input → typed output, no React, no hooks, ESM `export const fn = (…)`.
- `src/lib/seo/article-schema.ts` — pure transform that takes a typed config object and emits a typed view-model (Article JSON-LD). The structural template most relevant here.

**Inline transforms to extract (the actual data being moved):**

1. The `propertyPerformance.map(row => …)` block in `src/hooks/api/use-owner-dashboard.ts:227-244` (RPC row → frontend `PropertyPerformance` shape — the property_name/address re-keying).
2. The three IIFEs in `src/app/(owner)/dashboard/page.tsx:52-110` (`metrics`, `revenueTrend`, `propertyPerformance` build).
3. The portfolio-row build in `src/components/dashboard/dashboard.tsx:77-92` (`propertyData.map(prop => PortfolioRow)`).

**Recommended shape** (no Next.js / no React / no hooks — Server-Component-safe per CONTEXT.md "Established Patterns"):

```typescript
// src/components/dashboard/dashboard-data.ts
import type { ActivityItem } from "#types/activity";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";
import type { PropertyPerformance } from "#types/core";
import type { DashboardStats } from "#types/stats";
import type { PortfolioRow } from "./dashboard-types";

// Shape that `get_dashboard_data_v2` returns (mirrors the type in use-owner-dashboard.ts:213-219)
export interface DashboardRpcPayload {
  stats: DashboardStats;
  trends: Record<string, MetricTrend>;
  time_series: Record<string, TimeSeriesDataPoint[]>;
  property_performance: PropertyPerformance[]; // already mapped per RC-2 inline mapping
  activities: ActivityItem[];
}

export interface DashboardViewModel {
  stats: DashboardStats;
  timeSeries: {
    occupancyRate: TimeSeriesDataPoint[];
    monthlyRevenue: TimeSeriesDataPoint[];
  };
  portfolioRows: PortfolioRow[];
  // …plus whatever the planner determines belongs in the view-model
}

export function transformDashboardData(
  payload: DashboardRpcPayload,
): DashboardViewModel {
  const portfolioRows: PortfolioRow[] = payload.property_performance.map(
    (prop) => ({
      id: prop.property_id,
      property: prop.property,
      address: prop.address_line1,
      units: { occupied: prop.occupiedUnits, total: prop.totalUnits },
      tenant: prop.occupiedUnits > 0 ? `${prop.occupiedUnits} tenants` : null,
      leaseStatus:
        prop.occupancyRate === 100
          ? "active"
          : prop.occupancyRate >= 80
            ? "expiring"
            : "vacant",
      leaseEnd: null,
      rent: prop.monthlyRevenue, // dollars, no *100
      maintenanceOpen: 0, // Phase 2 adds the real value via additive RPC migration
    }),
  );

  return {
    stats: payload.stats,
    timeSeries: {
      occupancyRate: payload.time_series?.occupancy_rate ?? [],
      monthlyRevenue: payload.time_series?.monthly_revenue ?? [],
    },
    portfolioRows,
  };
}
```

**Style notes from `currency.ts` analog:**
- `export const fn = (args): ReturnType => { … }` OR `export function fn(args): ReturnType { … }` — both used. Match the project's slight preference for `export function` for top-level standalone transforms (see `article-schema.ts`).
- One leading JSDoc per export.
- No `'use client'` directive (the file is pure ESM and Server-Component-safe).
- TS-strict: full type annotations on inputs and outputs, no `any`, no `as unknown as`.

**Test file location** (deferred to Phase 7 per CONTEXT.md "Claude's Discretion"): when written, place at `src/components/dashboard/__tests__/dashboard-data.test.ts`. Vitest + jsdom — but since the transform is pure, no jsdom imports needed.

---

## Shared Patterns

### Pattern S-1: `formatCurrency` import + call (cross-cutting for all 4 swap sites)

**Source:** `src/app/(owner)/reports/analytics/analytics-stats-row.tsx:12,16` — the canonical "no-cents display" pattern.

**Apply to:** `dashboard.tsx`, `portfolio-grid.tsx`, `portfolio-table.tsx`.

```typescript
import { formatCurrency } from "#lib/utils/currency";

// Call (preserves the current no-cents display from formatDashboardCurrency):
formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
```

**Rule:** ALWAYS pass the options object on dashboard surface callsites until/unless the user approves showing cents. Naive single-arg `formatCurrency(value)` changes the display from `$1,234` to `$1,234.00`.

### Pattern S-2: React Query `select:` with named pure transform function

**Source:** `src/hooks/api/use-properties.ts:18-19,53-59` and `src/hooks/api/use-dashboard-hooks.ts:26-41`.

**Apply to:** `use-owner-dashboard.ts` wiring per CONTEXT.md D-12.

```typescript
/** Stable select function for TanStack Query optimization */
const selectFooBar = (data: InputType): OutputType =>
  transform(data); // pure, declared at module scope so reference is stable across renders

export function useFooBar() {
  return useQuery({
    ...queryOptions,
    select: selectFooBar,        // stable reference avoids unnecessary recomputation
    structuralSharing: true,     // optional, but standard on this codebase
  });
}
```

**Rules from existing usage:**
- The `select` callback MUST be declared at module scope (not inside the hook body) so its reference is stable across renders.
- TS-strict: explicit `(data: InType): OutType` signature.
- The transform itself should be **referentially pure** — same input always produces output that is structurally equal.

### Pattern S-3: Atomic-commit-per-change (Phase 1 specific, per D-15)

**Source:** v1.0 Phase 15 (cited in CONTEXT.md "Established Patterns").

Phase 1 commit boundary discipline:
1. `chore(01): drop *100 in dashboard page.tsx + /100 in revenue-overview-chart.tsx` (the bug fix as ONE atomic semantic change)
2. `refactor(01): swap formatDashboardCurrency → formatCurrency in 4 callers`
3. `chore(01): delete duplicate owner-dashboard.tsx + its test`
4. `chore(01): delete unused dashboard-filters{,-compact,-utils}.{tsx,ts}`
5. `chore(01): delete orphan top-level portfolio-toolbar.tsx`
6. `chore(01): delete unused dashboard skeletons.tsx`
7. `feat(01): extract transformDashboardData pure transform`
8. `feat(01): wire transformDashboardData into use-dashboard-hooks selectors` (if interpretation #2 chosen per `use-owner-dashboard.ts` section)
9. `docs(01): publish milestone-wide UI-SPEC`

Each commit ships independently revertible. Surgical reverts if a consumer surfaces.

### Pattern S-4: Sandbox-disabled `git commit` (D-18, inherited)

**Source:** v1.0 Phase 14 lesson, restated in CONTEXT.md "Established Patterns".

```bash
# WRONG:
git commit -m "…"  # lefthook lockfile-verify fails inside command sandbox

# RIGHT:
dangerouslyDisableSandbox: true on the Bash tool call for `git commit` ONLY.
# NEVER --no-verify. NEVER LEFTHOOK_EXCLUDE. NEVER on other operations.
```

### Pattern S-5: Post-sub-agent verification (D-19, inherited)

After every code-fixer return:
```bash
git status --short
git diff --stat
```
Verify what actually landed against what the agent reported.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/dashboard/dashboard-data.ts` (CREATE) | pure transform | view-model build | No direct prior art for an **extracted pure transform module from a dashboard data path**. The codebase uses inline transforms (in fetcher functions, in component IIFEs) rather than extracted pure modules for dashboard data. The closest structural analog is `src/lib/seo/article-schema.ts` (pure config → typed-output transform) — match its export style (`export function …`, JSDoc, no React, full type annotations) and ESM purity. |

---

## Metadata

**Analog search scope:**
- `src/lib/` (utility modules, formatters, schemas)
- `src/hooks/api/` (React Query factory hooks with `select:` patterns)
- `src/app/(owner)/` (existing `formatCurrency` callsites for swap form)
- `src/components/` (existing `formatCurrency` callsites + table/grid render patterns)

**Files scanned (Read tool):** 11
- `dashboard-types.ts`, `dashboard.tsx`, `owner-dashboard.tsx`, `portfolio-toolbar.tsx` (top-level), `components/portfolio-toolbar.tsx`, `components/portfolio-grid.tsx`, `components/portfolio-table.tsx`, `components/revenue-overview-chart.tsx`, `app/(owner)/dashboard/page.tsx`, `lib/utils/currency.ts`, `hooks/api/use-owner-dashboard.ts`, `hooks/api/use-dashboard-hooks.ts`, `hooks/api/use-properties.ts`, `lib/seo/article-schema.ts`

**Pattern extraction date:** 2026-05-22
