---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 1
files_reviewed: 11
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard.tsx
  - src/hooks/api/query-keys/property-stats-keys.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/types/core.ts
  - src/types/database-rpc.ts
  - src/types/sections/dashboard.ts
  - src/types/supabase.ts
  - supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql
  - tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
findings:
  critical: 1
  warning: 3
  info: 5
  total: 9
status: issues_found
---

# Phase 2: Code Review Report — Cycle 1

**Reviewed:** 2026-05-23
**Depth:** deep
**Files Reviewed:** 11
**Status:** issues_found
**Cycle:** 1 of 2+ required (perfect-PR gate: two consecutive zero-finding cycles)

## Summary

Phase 2 ships an additive migration that surfaces real per-property `open_maintenance` counts via `get_dashboard_data_v2`, drops the fabricated `collectionRate`, and adds a dual-client RLS test. The migration is safe (CREATE OR REPLACE, SECURITY DEFINER + search_path preserved, GRANTs intact, every CTE owner-filtered, new `perf_open_maintenance` CTE joins via PK as advertised). The end-to-end data flow from RPC → `use-owner-dashboard.ts` mapper → `PropertyPerformance` → `PropertyPerformanceItem` (re-mapped at `page.tsx`) → `PortfolioRow.maintenanceOpen` is wired correctly through the live consumer path (`dashboard.tsx:101`). The integration test fixture chain is FK-correct (tenant outlives maintenance_request, property outlives unit) and uses graceful skip + dual-client + non-personal emails.

But the phase imports a fresh honesty violation through the back door. `PropertyPerformance.open_maintenance` was made a REQUIRED field on the shared core type, which forced `mapPerformanceRow` in `property-stats-keys.ts:85` to fabricate `open_maintenance: 0` — exactly the pattern Phase 2 just removed when it dropped `collectionRate`. The fabrication site (`propertyStatsQueries.performance`) is dead code in the current app, but it is referenced in nine query-key chain assertions and a future analytics surface, and the type lie compiles silently. This is the same v1.0 honesty principle violation D-01 was explicitly written to prevent — it just relocated.

Other findings: a stale docstring on `PropertyPerformanceRpcResponse` claims the type is for `get_property_performance` (it now ships only via `get_dashboard_data_v2.property_performance`); an outdated type guard (`isPropertyPerformanceRpcResponse`) does not check the new field; three live property-row transforms in play (one canonical pure transform in `dashboard-data.ts`, one inline in `dashboard.tsx`, one re-mapper in `page.tsx`) — the canonical one is unreferenced by the live page; one residual `as PropertyPerformance["status"]` boundary assertion that should use a typed enum check.

No findings:
- No `any` types in hand-written files (autogen `supabase.ts` not in scope).
- No barrel files / `index.ts` re-exports introduced.
- No commented-out code.
- No inline styles.
- No new PostgreSQL ENUMs (status filter uses string literals; CHECK constraints unchanged).
- No emojis / decorative Unicode.
- No new `as unknown as` (pre-existing single `as PropertyPerformance["status"]` flagged separately, see IN-03).
- No string-literal queryKeys (all use `queryOptions()` factories).
- No `@radix-ui/react-icons` introductions.
- Migration is idempotent (CREATE OR REPLACE), preserves signature, search_path, SECURITY DEFINER, all 9 CTE outputs, both trend CTEs, both time-series CTEs, recent_activities, final cross joins, and both GRANTs. COMMENT updated. No DROP statements.

## Critical Issues

### CR-01: `mapPerformanceRow` fabricates `open_maintenance: 0` — the same honesty violation D-01 dropped `collectionRate` to prevent

**File:** `src/hooks/api/query-keys/property-stats-keys.ts:85`
**Issue:**

Phase 2 made `PropertyPerformance.open_maintenance: number` a required field on the shared core type (`src/types/core.ts:341`). That forced this hardcoded write at the only OTHER constructor of the same type:

```ts
// src/hooks/api/query-keys/property-stats-keys.ts:70-87
return {
  property: row.property_name,
  property_id: row.property_id,
  totalUnits,
  occupiedUnits,
  vacantUnits,
  occupancyRate: Number(row.occupancy_rate) || 0,
  revenue: row.total_revenue,
  monthlyRevenue: Math.round(monthlyRevenue),
  potentialRevenue: 0,
  address_line1: details?.address ?? "",
  property_type: details?.propertyType ?? "SINGLE_FAMILY",
  status,
  trend,
  trendPercentage: Number(row.trend_percentage) || 0,
  open_maintenance: 0,        // ← fabrication
};
```

The source RPC here is `get_property_performance_with_trends` (a DIFFERENT RPC from `get_dashboard_data_v2`). It does NOT carry maintenance counts in its return shape (verify against `Database["public"]["Functions"]["get_property_performance_with_trends"]["Returns"][number]` — the `PerformanceWithTrendsRow` type pulled at line 22 has no `open_maintenance` field). The mapper has no real data to populate the field with, so it writes a placeholder `0`.

That placeholder `0` is indistinguishable to consumers from a property that truly has zero open maintenance requests. Phase 2's D-01 dropped `collectionRate: 0` for exactly this reason: "the current `collectionRate: 0` hardcoded value violates the v1.0 honesty principle (never fabricate)." This commit removes one fabrication and silently introduces another at a different seam.

Mitigating factor: `propertyStatsQueries.performance` is currently unconsumed (grep confirms only `propertyStatsQueries.stats` is referenced from `use-properties.ts:67` and `use-property-mutations.ts:58`). But the fabrication is now baked into a typed contract — the moment a Phase 3+ analytics surface starts consuming `propertyStatsQueries.performance` for property counts, those property cards will silently render "0 open maintenance" for properties that actually have open work.

This is the structural ground-truth issue: making `open_maintenance` REQUIRED on `PropertyPerformance` was the wrong type-level decision when only one of the two RPCs feeding the type knows the value.

**Fix (pick one):**

Option A — preferred: make `open_maintenance` OPTIONAL on `PropertyPerformance`, and drop the `: 0` fabrication. Downstream consumers already use `?? 0` defensively at the consumer surface (e.g., `dashboard.tsx:101` reads `prop.openMaintenance` which is a different camelCase field on `PropertyPerformanceItem`).

```ts
// src/types/core.ts:326-342
export interface PropertyPerformance {
  property: string;
  property_id: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  revenue: number;
  monthlyRevenue: number;
  potentialRevenue: number;
  address_line1: string;
  property_type: string;
  status: "NO_UNITS" | "vacant" | "FULL" | "PARTIAL";
  trend: "up" | "down" | "stable";
  trendPercentage: number;
  open_maintenance?: number;   // ← was: number
}
```

Then in `property-stats-keys.ts:85`, delete the `open_maintenance: 0` line entirely. The fetcher at `use-owner-dashboard.ts:249` already emits it under the v2 path. Update the page-level re-mapper at `page.tsx:106` and the canonical transform at `dashboard-data.ts:64` to apply the `?? 0` fallback at the read seam:

```ts
// src/app/(owner)/dashboard/page.tsx:106
openMaintenance: prop.open_maintenance ?? 0,
// src/components/dashboard/dashboard-data.ts:64
maintenanceOpen: prop.open_maintenance ?? 0,
```

Option B — narrower scope, but defers the architectural fix: delete `propertyStatsQueries.performance` (the only call site of `mapPerformanceRow`) since it is unreferenced from the live app, then delete `mapPerformanceRow` and `getTimeframeDays` along with it. Keep `propertyStatsQueries.stats` and `propertyStatsQueries.analytics.{occupancy,financial,maintenance}`. This sidesteps the fabrication by removing the fabricating function.

Either option restores the D-01 invariant. Option A is the structurally correct one because it lets `propertyStatsQueries.performance` survive for the analytics surface that genuinely doesn't need maintenance counts.

**Severity rationale:** BLOCKER. This is the same class of defect (zero placeholder masquerading as real data) that D-01 was explicitly written to forbid. Quoting Phase 2 CONTEXT directly: "NOT computing a synthetic substitute … computing it from leases would ship a metric whose name no longer matches its definition." This fix has to land before merge to honor D-01.

---

## Warnings

### WR-01: Stale docstring on `PropertyPerformanceRpcResponse` — claims it's the response for `get_property_performance`, but `open_maintenance` is ONLY emitted by `get_dashboard_data_v2.property_performance`

**File:** `src/types/database-rpc.ts:8-11`
**Issue:**

```ts
/**
 * Response from get_property_performance RPC function
 */
export interface PropertyPerformanceRpcResponse {
```

The new `open_maintenance` field landed inside this interface. But `get_property_performance` is a different RPC than `get_dashboard_data_v2`, and the migration that ships `open_maintenance` only touches the latter. A future reader sees this docstring and reasonably concludes `get_property_performance` carries `open_maintenance` — it does not. This will cause exactly the kind of integration confusion that Phase 2's "honest data" principle is supposed to eliminate.

`PropertyPerformanceRpcResponse` is now actually the shape of one entry in `get_dashboard_data_v2`'s `property_performance` array — verify against `use-owner-dashboard.ts:222` (`property_performance: PropertyPerformanceRpcResponse[]`).

**Fix:** Rewrite the docstring to reflect reality, and use a name that pins which RPC it documents.

```ts
/**
 * Per-row shape of `get_dashboard_data_v2`'s `property_performance` JSONB
 * array. Phase 2 (POLISH-10) extended this with `open_maintenance` —
 * sourced from the new `perf_open_maintenance` CTE.
 */
export interface PropertyPerformanceRpcResponse { ... }
```

**Severity rationale:** WARNING. Not a correctness bug, but the v1.0 honesty principle applies to documentation too — a docstring that points to the wrong RPC is a fabrication of provenance. Maintainers will follow this trail to the wrong function.

---

### WR-02: `isPropertyPerformanceRpcResponse` type guard does not check the new `open_maintenance` field — silently accepts payloads missing it

**File:** `src/types/database-rpc.ts:50-64`
**Issue:**

```ts
export function isPropertyPerformanceRpcResponse(
  data: unknown,
): data is PropertyPerformanceRpcResponse {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;
  return (
    "property_name" in obj &&
    typeof obj.property_name === "string" &&
    "property_id" in obj &&
    typeof obj.property_id === "string" &&
    "total_units" in obj &&
    typeof obj.total_units === "number"
  );
}
```

The guard validates three fields (`property_name`, `property_id`, `total_units`) out of the 12-field interface. The new `open_maintenance: number` field is not checked. The guard is currently unused (grep confirms no consumers), but it ships as a public type-guard export in `database-rpc.ts` — a future caller using it will narrow to the type without verifying the new field, then dereference `payload.open_maintenance` on a payload that doesn't have it.

Bigger picture: this guard was already a partial-validation lie before Phase 2 (it validates 3 of 11 fields). Phase 2 didn't introduce that, but it added the 12th field and missed the guard.

**Fix (pick one):**

Option A: extend the guard to validate `open_maintenance: number`. Mechanical change.

```ts
return (
  "property_name" in obj && typeof obj.property_name === "string" &&
  "property_id" in obj && typeof obj.property_id === "string" &&
  "total_units" in obj && typeof obj.total_units === "number" &&
  "open_maintenance" in obj && typeof obj.open_maintenance === "number"
);
```

Option B (recommended): delete the type guard entirely. It is unused, only partially validates, and the actual boundary narrowing happens in `use-owner-dashboard.ts:218-224` via a structural `as` cast. Deleting it removes dead-but-public API surface.

**Severity rationale:** WARNING. Latent bug — surfaces only when a consumer adopts the guard. Code-quality tier per CLAUDE.md (dead-code-with-misleading-contract).

---

### WR-03: Three property-row transforms in play; the canonical one in `dashboard-data.ts` is not wired into the live page

**Files:**
- `src/components/dashboard/dashboard-data.ts:46-76` (canonical `transformDashboardData`)
- `src/components/dashboard/dashboard.tsx:87-102` (live inline transform)
- `src/app/(owner)/dashboard/page.tsx:97-108` (live snake→camel re-mapper)

**Issue:**

The Phase 2 change wires `prop.open_maintenance` into the canonical transform at `dashboard-data.ts:64`. It also wires `prop.openMaintenance` into the inline transform at `dashboard.tsx:101`. And page.tsx re-maps `prop.open_maintenance` to `prop.openMaintenance` at line 106 to feed the inline transform.

Net result: three places must agree on the maintenanceOpen value. Today they do. But the canonical `transformDashboardData` is not actually consumed by `page.tsx` or `dashboard.tsx` — `selectStats` and `selectCharts` in `use-dashboard-hooks.ts:38,43` read raw fields directly, and `usePropertyPerformance` returns `PropertyPerformance[]` (raw, not viewmodel). The only place that would consume `transformDashboardData` is the future `dashboard-view.tsx` (Phase 3 scope, per the LOCKED(D-10) comment at `dashboard.tsx:76-86`).

So Phase 2 is correctly maintaining the parallel transform per Phase 1's D-10 contract, but the dashboard rendered to users in production today depends on the inline transform at `dashboard.tsx:101`, not on the canonical one. A regression in `transformDashboardData` would not surface in cycle-1 review nor in E2E smoke tests. Conversely, a regression in the page.tsx re-mapper or inline transform would not be caught by `transformDashboardData`'s unit tests if any exist.

This is structural per `<structural_findings>` substrate: same-shape transform exists in three sites. Phase 2 did not create this divergence — Phase 1 D-10 anchored it intentionally — but Phase 2's adding `open_maintenance` to all three at once is a maintenance load that compounds with the structural finding.

**Fix:** Defer to Phase 3 (the D-10 consumer migration). Document the parallel-transform invariant by adding a test that asserts `transformDashboardData(payload).portfolioRows[i].maintenanceOpen === payload.propertyPerformance[i].open_maintenance` for at least one row — this pins the canonical transform's correctness now that the live path is also consuming the same field, without prematurely forcing the Phase 3 consumer migration into Phase 2 scope.

**Severity rationale:** WARNING. The three-site transform is intentional architectural debt (Phase 1 D-10 / Phase 3 will collapse it). But Phase 2 ships the field without test coverage on the canonical transform, making future divergence easier to miss.

---

## Info

### IN-01: Naming inconsistency — `PropertyPerformance.open_maintenance` uses snake_case while `PropertyPerformance.totalUnits` / `monthlyRevenue` / `occupancyRate` use camelCase

**File:** `src/types/core.ts:329-341`
**Issue:**

```ts
export interface PropertyPerformance {
  property: string;
  property_id: string;        // snake
  totalUnits: number;          // camel
  occupiedUnits: number;       // camel
  vacantUnits: number;         // camel
  occupancyRate: number;       // camel
  revenue: number;
  monthlyRevenue: number;      // camel
  potentialRevenue: number;    // camel
  address_line1: string;       // snake
  property_type: string;       // snake
  status: "NO_UNITS" | "vacant" | "FULL" | "PARTIAL";
  trend: "up" | "down" | "stable";
  trendPercentage: number;     // camel
  open_maintenance: number;    // snake (new in Phase 2)
}
```

The new field follows the snake_case convention used by `property_id`, `address_line1`, `property_type` (the fields that pass through unmapped from PostgREST). This is consistent — `open_maintenance` is unmapped pass-through too. But the interface is itself half-snake/half-camel, which is the underlying inconsistency.

CLAUDE.md "Naming" section says interfaces are PascalCase and properties are camelCase. The pre-existing snake_case fields predate Phase 2. The Phase 2 addition continues the existing inconsistency rather than introducing a new one.

**Fix (deferred):** Out of Phase 2 scope. The right path is to normalize the entire `PropertyPerformance` interface to camelCase at the fetcher boundary (which already runs at `use-owner-dashboard.ts:232`), then drop the snake fields. That is a separate, breaking refactor that touches every consumer.

**Severity rationale:** INFO. Phase 2 maintains the existing convention. No action requested.

---

### IN-02: `open_maintenance` already-required → required-with-`?? 0` makes the `?? 0` at `use-owner-dashboard.ts:249` defensive (acceptable, but redundant under strict types)

**File:** `src/hooks/api/use-owner-dashboard.ts:249`
**Issue:**

The fetcher maps `open_maintenance: row.open_maintenance ?? 0`. `row` is typed as `PropertyPerformanceRpcResponse`, which declares `open_maintenance: number` (required). Under `exactOptionalPropertyTypes` + the structural cast at line 218, `row.open_maintenance` is statically `number`, never undefined. The `?? 0` is dead defensive code.

But it is correctly defensive — the RPC could in principle return `null` if the migration is not yet applied to the live DB, and the structural cast does not guarantee runtime presence (the cast happens at line 218 without any per-field check, and `isPropertyPerformanceRpcResponse` is not invoked). So `?? 0` is a hedge against a real failure mode: a frontend deploy that ships before the migration is applied.

**Fix:** Keep the `?? 0`. Document the rationale.

```ts
// Defensive: until the perf_open_maintenance CTE migration is applied in
// prod (see 20260523223626_phase2_open_maintenance_per_property.sql), the
// RPC may return undefined for this field. Frontend-DB-deploy order safety.
open_maintenance: row.open_maintenance ?? 0,
```

**Severity rationale:** INFO. The fallback is correct; the comment is missing.

---

### IN-03: `row.status as PropertyPerformance["status"]` boundary assertion at `use-owner-dashboard.ts:246` is a typed assertion, not a typed mapper — same pattern CLAUDE.md flags

**File:** `src/hooks/api/use-owner-dashboard.ts:246`
**Issue:**

```ts
status: row.status as PropertyPerformance["status"],
```

CLAUDE.md, Zero Tolerance Rule #8, forbids `as unknown as` and recommends "typed mapper functions at RPC/PostgREST boundaries." This is a typed single-cast (not `as unknown as`), so it does not literally violate Rule #8. But it relies on the cast being correct: `row.status` is typed `string` (from `PropertyPerformanceRpcResponse.status: string`), and the cast assumes it is one of `"NO_UNITS" | "vacant" | "FULL" | "PARTIAL"`. If the RPC ever emits a different status value, the type lies silently. Pre-existing — not a Phase 2 regression.

**Fix (deferred):** Replace with a typed status mapper that validates the union and throws/falls back on unknown values.

```ts
function mapStatus(s: string): PropertyPerformance["status"] {
  if (s === "NO_UNITS" || s === "vacant" || s === "FULL" || s === "PARTIAL") {
    return s;
  }
  throw new Error(`Unexpected property_performance.status: ${s}`);
}
// ...
status: mapStatus(row.status),
```

**Severity rationale:** INFO. Pre-existing. Phase 2 did not introduce this; flagging for completeness because reviewing the file at this depth surfaces it.

---

### IN-04: Test `result` cast at `dashboard-rpc-open-maintenance.test.ts:187-192,218-220` duplicates the runtime contract from `database-rpc.ts`

**File:** `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:187-192,218-220`
**Issue:**

```ts
const result = data as {
  property_performance: Array<{
    property_id: string;
    open_maintenance: number;
  }>;
};
```

The test defines an ad-hoc shape rather than importing `PropertyPerformanceRpcResponse`. If the contract evolves (e.g., a field is renamed), the test passes but the type defined in `database-rpc.ts` lags behind. Importing the source-of-truth type would catch divergence.

**Fix:**

```ts
import type { PropertyPerformanceRpcResponse } from "#types/database-rpc";

// ...
const result = data as {
  property_performance: PropertyPerformanceRpcResponse[];
};
```

This anchors the integration test to the same contract the frontend consumer trusts, so a future drift in the RPC's emitted shape can only break ONE place (the type) instead of letting test and frontend drift independently.

**Severity rationale:** INFO. Coupling improvement; not a correctness bug.

---

### IN-05: Migration comment promises "PK lookup is sub-millisecond and does NOT scan the table" — accurate but unprovable from the SQL alone

**File:** `supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql:8-15,311-315`
**Issue:**

The migration header and the inline CTE comment both claim the new `perf_open_maintenance` CTE joins to `maintenance_requests` via primary key. That is structurally correct (`join maintenance_requests mr on mr.id = am.id` where `am.id` is from `all_maintenance` and `mr.id` is the PK). Postgres will indeed use an index scan here.

But "sub-millisecond" is a runtime claim. There is no `EXPLAIN ANALYZE` in the migration or in any test artifact validating that claim. The Phase 2 plan does not include a performance regression test. If a future migration adds a trigger or a row-level security policy that turns this PK lookup into a seq scan, the dashboard will degrade silently.

Performance is explicitly OUT of scope for v1 per the review-scope instructions. Flagging for completeness — no action requested in this cycle.

**Severity rationale:** INFO. Performance is out of v1 scope. The SQL structure is correct.

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 1 of 2+ required_
