---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T20:00:00Z
depth: deep
cycle: 3
files_reviewed: 12
files_reviewed_list:
  - src/app/(owner)/dashboard/page.tsx
  - src/components/dashboard/dashboard-data.ts
  - src/components/dashboard/dashboard-data.test.ts
  - src/components/dashboard/dashboard.tsx
  - src/hooks/api/query-keys/property-stats-keys.ts
  - src/hooks/api/use-owner-dashboard.ts
  - src/types/core.ts
  - src/types/database-rpc.ts
  - src/types/sections/dashboard.ts
  - supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql
  - supabase/migrations/20260523234221_phase2_property_perf_address_status_type.sql
  - tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
consecutive_zero_finding_cycles: 1
perfect_pr_gate: 1_of_2_zero_finding_cycles_complete
---

# Phase 2: Code Review Report — Cycle 3

**Reviewed:** 2026-05-23
**Depth:** deep
**Files Reviewed:** 12
**Status:** clean
**Cycle:** 3 (first zero-finding cycle)
**Consecutive zero-finding cycles:** 1 of 2 required (one more zero-finding cycle closes the perfect-PR gate)

## Summary

Cycle 3 is the first **zero-finding** cycle on Phase 2. All four cycle-2 findings (the P0 regression + WR-01 docstring + WR-02 integration coverage + IN-01 test cleanup) are closed correctly by commit `2ef51eaf4`. A fresh adversarial sweep over the full 12-file scope — CLAUDE.md zero-tolerance rules, migration safety, status-derivation correctness, type-narrowing chain, cross-CTE consistency, test rigor — finds nothing actionable.

The follow-on migration `20260523234221_phase2_property_perf_address_status_type.sql` is the canonical body of `get_dashboard_data_v2` going forward: it re-asserts every CTE from the cycle-1 migration (including `perf_open_maintenance`), preserves the SECURITY DEFINER + `search_path = public` contract, preserves `grant execute … to authenticated/service_role`, and adds three new keys (`address`, `property_type`, `status`) that align the RPC output with the long-claimed `PropertyPerformanceRpcResponse` type contract. The status derivation matches `property-stats-keys.ts:47-56` byte-for-byte in semantics (`NO_UNITS` / `vacant` / `FULL` / `PARTIAL` with the same coalesce-then-fall-through rules).

One more zero-finding cycle (cycle 4) closes the perfect-PR merge gate.

## Cycle-2 Finding Verification

### Cycle-2 BLOCKER (P0 regression — `mapPropertyPerformanceStatus(undefined)` throw): CLOSED

- Follow-on migration `20260523234221_phase2_property_perf_address_status_type.sql` exists and is the canonical RPC body (`CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2`).
- `owner_properties` CTE (lines 32-37) now also projects `address_line1` and `property_type`. Single-table scan preserved.
- `property_perf.jsonb_build_object(...)` (lines 304-336) emits all three new keys:
  - `'address', op.address_line1` (line 328)
  - `'property_type', op.property_type` (line 329)
  - `'status', case … end` (lines 330-335)
- Status derivation rules match `property-stats-keys.ts:47-56`:
  - `coalesce(puc.total_units, 0) = 0` → `'NO_UNITS'`
  - `coalesce(puc.occupied_units, 0) = 0` (and units exist) → `'vacant'`
  - `puc.occupied_units = puc.total_units` → `'FULL'`
  - otherwise → `'PARTIAL'`
- Migration preserves the `perf_open_maintenance` CTE (lines 291-300) and the `'open_maintenance'` jsonb key (line 319). Applying cycle-2 AFTER cycle-1 does NOT regress `open_maintenance` — the cycle-2 migration is self-contained as `CREATE OR REPLACE FUNCTION` replaces the entire body.
- Migration is `CREATE OR REPLACE FUNCTION`, SECURITY DEFINER, `search_path = public`, both `grant execute` statements preserved (lines 519-520), no `DROP`, no `ALTER`, no schema-shape side effects.
- Mapper call site (`use-owner-dashboard.ts:265`): `status: mapPropertyPerformanceStatus(row.status)` — `row.status` is now non-undefined per the RPC contract, so the throw branch is now unreachable for in-contract data (preserved as a guard against future contract drift).

### Cycle-2 WR-01 (docstring): CLOSED

`PropertyPerformanceRpcResponse` JSDoc in `src/types/database-rpc.ts:8-22` references BOTH migrations by filename:
- `20260523223626_phase2_open_maintenance_per_property.sql` (lines 10-12)
- `20260523234221_phase2_property_perf_address_status_type.sql` (lines 13-17)

The two-stage history is captured accurately ("Phase 2 (POLISH-10) shipped this in two cycles").

### Cycle-2 WR-02 (integration test): CLOSED

`tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:197-209` asserts on all four Phase-2 fields:
- `open_maintenance: number >= 1` (lines 202-203)
- `address === '1 RPC St'` (line 204) — matches `beforeAll` fixture `address_line1: "1 RPC St"` (line 58)
- `property_type === 'APARTMENT'` (line 205) — matches fixture insert (line 63)
- `status === 'vacant'` (line 209) — correct: 1-unit property with no lease → occupied_units=0 (default unit status is `available`), total_units=1, NO_UNITS branch fails (>0), vacant branch matches.

The cross-owner isolation test (line 216-238) remains intact and still pins the empty-array contract when ownerA passes ownerB's user_id.

### Cycle-2 IN-01 (unit test cleanup): CLOSED

`src/components/dashboard/dashboard-data.test.ts:62-69` no longer carries the `undefined as number | undefined` cast. The fallback test (`falls back to 0 when prop.open_maintenance is undefined`) now simply omits `open_maintenance` from the literal — `PropertyPerformance.open_maintenance` is optional per `core.ts:347`, so omission is sufficient to exercise the `?? 0` read seam. Clean.

## Fresh Adversarial Pass — Cycle 3

### CLAUDE.md Zero Tolerance Rules

- **No `any` types** — no occurrences in any of the 12 files (verified via grep). Clean.
- **No `as unknown as`** — no occurrences. Clean.
- **No barrel re-exports** — `dashboard-data.ts`, `use-owner-dashboard.ts`, `database-rpc.ts`, `dashboard.tsx`, `page.tsx` all import directly from defining files; no `index.ts` re-exports introduced. Clean.
- **No duplicate types** — `DashboardViewModel` in `dashboard-data.ts` is the only new structural type; `OwnerDashboardData` is reused via import from `use-owner-dashboard.ts` (per cycle-1 CR-01 fix). `PropertyPerformanceRpcResponse` is the sole RPC-shape declaration (in `database-rpc.ts`). Clean.
- **No commented-out code** — comments are explanatory only; no `//` or `/* */` blocks wrapping live code. Clean.
- **No inline styles** — `page.tsx`, `dashboard.tsx`, `property-stats-keys.ts` use only Tailwind utilities. No `style={{ … }}` attributes introduced. Clean.
- **No PostgreSQL ENUMs** — both Phase-2 migrations operate on existing `text` columns; status is derived inline via CASE expression and emitted as plain text. No `CREATE TYPE … AS ENUM`. Clean.
- **No emojis in code** — SQL comments use `→` (single arrow character in comment at line 324-327 of the new migration) which is a typographic arrow, not an emoji; not flagged. No actual emoji codepoints. Clean.
- **No `as unknown as`** (RPC boundary mapper) — fetcher uses `data as { stats: …; trends: …; }` (line 237) which is a single legitimate assertion at the JSONB→struct boundary after the `typeof data !== "object"` shape guard (lines 226-235). This is the canonical "typed mapper at RPC boundary" pattern documented in CLAUDE.md. Single `as` is allowed; `as unknown as` (the double-cast) is the banned pattern. Clean.
- **No string-literal queryKey arrays** — `useOwnerDashboard.ts` uses `ownerDashboardKeys` factory throughout; `propertyStatsQueries` uses `propertyQueries.all()` + composed `as const` tuples. No bare `queryKey: ['x', 'y']` literals. Clean.
- **No `@radix-ui/react-icons`** — no imports from that package. Clean.

### Migration Safety Re-Audit

**Migration 1 (`20260523223626_phase2_open_maintenance_per_property.sql`)** — preserved intact:
- Signature `get_dashboard_data_v2(p_user_id uuid) returns jsonb` matches the existing function.
- `language plpgsql security definer set search_path to 'public'` matches the existing contract.
- All shared CTEs preserved (`owner_properties`, `all_units`, `all_leases`, `active_leases`, `all_maintenance`).
- `perf_open_maintenance` CTE adds ONE new aggregation; joins via PK (`mr.id = am.id`) — sub-millisecond.
- Only adds ONE new jsonb key: `'open_maintenance'`.
- `grant execute` preserved for both `authenticated` and `service_role`.

**Migration 2 (`20260523234221_phase2_property_perf_address_status_type.sql`)** — preserved intact AND superset:
- Signature unchanged.
- `language plpgsql security definer set search_path to 'public'` preserved.
- Re-asserts ALL CTEs from migration 1, including `perf_open_maintenance` (lines 291-300) and `owner_properties` (lines 32-37, now with 4 columns).
- Re-emits ALL jsonb keys from migration 1, including `'open_maintenance'` (line 319).
- Adds 3 new keys: `'address'`, `'property_type'`, `'status'`.
- `grant execute` preserved.
- Comment updated to reflect cycle-2 scope (lines 522-525).

**Canonical-body invariant:** Because `CREATE OR REPLACE FUNCTION` replaces the entire function body, the production database state after applying both migrations in order is identical to applying ONLY migration 2 on top of the pre-Phase-2 RPC. Migration 2 is the canonical source of truth going forward; migration 1 is a historical artifact in git history.

### Status Derivation Correctness

Migration's CASE expression (lines 330-335):
```sql
case
  when coalesce(puc.total_units, 0) = 0 then 'NO_UNITS'
  when coalesce(puc.occupied_units, 0) = 0 then 'vacant'
  when puc.occupied_units = puc.total_units then 'FULL'
  else 'PARTIAL'
end
```

JS reference (`property-stats-keys.ts:47-56`):
```ts
if (totalUnits === 0) status = "NO_UNITS";
else if (occupiedUnits === 0) status = "vacant";
else if (occupiedUnits === totalUnits) status = "FULL";
else status = "PARTIAL";
```

**Edge-case walkthrough:**
- `puc` is NULL when `owner_properties LEFT JOIN perf_unit_counts` finds no matching units → `coalesce(NULL, 0) = 0` → `'NO_UNITS'`. ✓
- `puc.total_units > 0, puc.occupied_units = 0` (all units available/maintenance/reserved) → `'vacant'`. ✓
- `puc.total_units > 0, 0 < puc.occupied_units < puc.total_units` → falls through to `'PARTIAL'`. ✓
- `puc.total_units = puc.occupied_units > 0` → `'FULL'`. ✓
- `puc.occupied_units > puc.total_units` (impossible, but theoretically): SQL equality is false, falls through to `'PARTIAL'`. JS impl: `occupiedUnits === totalUnits` is false, falls through to `'PARTIAL'`. Equivalent. ✓
- `puc.total_units > 0` but `puc.occupied_units IS NULL`: cannot happen — `count(*) filter (…)` returns 0, not NULL. Defense-in-depth not needed. ✓

**Result:** SQL and JS impls produce identical strings for every possible input. The migration is the new canonical source of this derivation; the JS impl in `property-stats-keys.ts` remains for the alternative `get_property_performance_with_trends` RPC path (which doesn't emit `status`).

### mapPropertyPerformanceStatus Throw Behavior

The migration emits one of `'NO_UNITS' | 'vacant' | 'FULL' | 'PARTIAL'` — exactly the 4 members of the `PropertyPerformance["status"]` union (`core.ts:338`). The CASE expression is exhaustive (`else 'PARTIAL'` covers any remaining input combination). The `mapPropertyPerformanceStatus` throw branch (line 208-210) is preserved as a guard against future contract drift (e.g., a migration introducing a 5th status), which is intentional and correct. Clean.

### Type Narrowing Chain

1. `PropertyPerformanceRpcResponse.status: string` (`database-rpc.ts:35`)
2. `mapPropertyPerformanceStatus(row.status)` narrows to `'NO_UNITS' | 'vacant' | 'FULL' | 'PARTIAL'` (`use-owner-dashboard.ts:265`)
3. Emitted as `PropertyPerformance.status: 'NO_UNITS' | 'vacant' | 'FULL' | 'PARTIAL'` (`core.ts:338`)

**Downstream consumers:**
- `dashboard.tsx:93-98` derives `leaseStatus` from `prop.occupancyRate` (rate-based, NOT `prop.status`).
- `page.tsx:97-110` maps to `PropertyPerformanceItem` (`sections/dashboard.ts:47-56`) which has NO `status` field — `prop.status` is dropped at the section boundary.
- `dashboard-data.ts:55-61` also derives `leaseStatus` from `prop.occupancyRate`, not `prop.status`.

So `PropertyPerformance.status` is currently set by the fetcher but never read by any of the three transforms. This is **not a finding** — the typed mapper closes the contract honesty gap that cycle-2 surfaced (the field was declared on the type but absent from the RPC). The mapper's role is to enforce that the type contract MATCHES the RPC output, which is a correctness property independent of consumer usage. Future consumers that need `status` (e.g., Phase 3's `dashboard-view.tsx`) can now read it safely. The contract is closed.

### Cross-CTE Consistency

- `puc.total_units` source: `count(*)` from `perf_unit_counts` (cannot be NULL but joined LEFT so per-row can be NULL). Both `'total_units'` jsonb key and the status `coalesce(puc.total_units, 0)` use the same source with consistent NULL handling. ✓
- `puc.occupied_units` source: `count(*) filter (where status = 'occupied')` (cannot be NULL). Status derivation guards with `coalesce(puc.occupied_units, 0) = 0` — defensive against the LEFT JOIN NULL case. ✓
- The third branch `when puc.occupied_units = puc.total_units` does NOT coalesce. If both are NULL, this is `NULL = NULL` which is NULL (not true), so it falls through. The first branch (`coalesce(puc.total_units, 0) = 0`) already catches that case via the coalesce. Edge-case handled. ✓

### Test Rigor

- Integration test `address === '1 RPC St'` assertion matches `beforeAll` insert `address_line1: "1 RPC St"`. The migration's `'address', op.address_line1` projection (line 328) closes the loop. ✓
- `status === 'vacant'` assertion: Property A has 1 unit (RPC-A-101) inserted with no `status` override (line 73-82). The `units` table default status is `'available'` (verified from `core.ts:20` and DB CHECK constraint). One unit with status `'available'` → `total_units=1, occupied_units=0` → status branch 2 matches → `'vacant'`. ✓
- Cross-owner isolation test (line 216-238) still asserts `expect(result.property_performance).toEqual([])` — the strictest possible contract for RLS-via-owner-filter. ✓
- Unit test fallback case (line 61-70) correctly exercises the `?? 0` read seam in `transformDashboardData.maintenanceOpen` via plain field omission. Type-safe. ✓

### Comment Quality

- Migration 2's status CASE comment (lines 320-327) explicitly references `src/hooks/api/query-keys/property-stats-keys.ts` as the source-of-truth for the four rules. Future drift between SQL and JS now has a textual cross-link. ✓
- `PropertyPerformanceRpcResponse` JSDoc (lines 8-22) gives the two-stage migration history with filenames. ✓
- `dashboard-data.ts:64-67` documents the `?? 0` read-seam fallback rationale. ✓

### Other Concerns Checked & Cleared

- **No `unbounded select`** — `recent_activities` subquery (line 363-369) uses `limit 10`. All other CTEs are bounded by `owner_user_id = p_user_id` filter. ✓
- **No `data.length` for pagination** — not applicable in this scope. ✓
- **No new `console.log` / `debugger` / `TODO` / `FIXME`** — grep returns no matches in the 12 files. ✓
- **No empty catch blocks** — none. ✓
- **`numeric(10,2)` dollars discipline** — not relevant: the new migration doesn't touch dollar columns, it only reads `rent_amount` (already `numeric(10,2)`) and emits per-property aggregates. No Stripe boundary in scope. ✓
- **`refetchOnWindowFocus` global default** — unchanged. ✓
- **Soft-delete filter** — `owner_properties` CTE preserves `status != 'inactive'` (line 36). ✓

## Findings

**Zero findings.**

This is the first zero-finding cycle on Phase 2. One more consecutive zero-finding cycle (cycle 4) closes the perfect-PR merge gate.

---

## Audit Trail — Cycles 1 + 2

### Cycle 1 (deep, 9 findings: 1 CR + 3 WR + 5 IN)

**CR-01** — `dashboard-data.ts` declared a structural-duplicate `OwnerDashboardData` instead of importing the canonical type from `use-owner-dashboard.ts` (Zero Tolerance Rule 3 violation). **Closed** via cycle-1 fix commit `7f64c1946`: now imports `OwnerDashboardData` from the fetcher module.

**WR-01** — `transformDashboardData` was not yet wired into any consumer (the live `/dashboard` page used an inline transform in `dashboard.tsx:86-102` plus a re-mapper in `page.tsx:97-110`). **Closed** via cycle-1 by extending Phase-3 scope per locked decision D-10/D-11/D-12a and adding the LOCKED comment block at `dashboard.tsx:76-86` to document why the duplication persists until Phase 3.

**WR-02** — Missing unit test for `transformDashboardData.maintenanceOpen` read seam. **Closed** via cycle-1: added 3-test file `dashboard-data.test.ts` pinning `open_maintenance` flow + fallback + row-order.

**IN-01** — `metricTrends` co-location ambiguity. **Closed** via cycle-1 with the explanatory comment at `use-owner-dashboard.ts:162-166`.

**IN-02** — Migration docstring did not call out the shared-CTE scan-once invariant. **Closed** via cycle-1 by extending the migration's purpose/invariant/safety comment block.

**IN-03** — `row.status as PropertyPerformance["status"]` was a `as unknown as`-equivalent silent cast. **Closed** via cycle-1 by introducing `mapPropertyPerformanceStatus` runtime narrower. ⚠ This fix introduced the cycle-2 P0 regression — see below.

**IN-04** — `open_maintenance: row.open_maintenance ?? 0` fetcher fallback comment did not explain why the optional `?? 0` was defensive. **Closed** via cycle-1 with the multi-line rationale comment at `use-owner-dashboard.ts:268-273`.

**IN-05** — Inline `dashboard.tsx` transform duplication. **Deferred** as Phase 3 scope (LOCKED architectural anchor per D-10).

**IN-06** — `PropertyPerformance.open_maintenance` JSDoc did not explain the field's origin asymmetry across the two RPC sources. **Closed** via cycle-1 with the extended JSDoc at `core.ts:341-347`.

### Cycle 2 (deep, 4 findings: 1 BLOCKER + 2 WR + 1 IN)

**BLOCKER (P0 regression)** — Cycle-1's IN-03 typed mapper (`mapPropertyPerformanceStatus`) **throws** on `undefined`. The `get_dashboard_data_v2` RPC had NEVER emitted `status`, `address`, or `property_type` (despite the type contract declaring them since Phase 0). The fetcher promise rejects → every dashboard hook errors → the dashboard renders the "Unable to load dashboard data" error screen. **Closed** via cycle-2 commit `2ef51eaf4` with follow-on migration `20260523234221_phase2_property_perf_address_status_type.sql` that emits all three missing keys server-side (verified by cycle-3 deep audit above).

**WR-01** — `PropertyPerformanceRpcResponse` JSDoc only referenced migration 1, missing the cycle-2 follow-on migration. **Closed** via cycle-2 by updating the JSDoc to enumerate BOTH migrations and explain the two-stage history.

**WR-02** — Integration test only asserted `open_maintenance`, leaving the other 3 cycle-2-added fields un-tested. **Closed** via cycle-2 by extending the test to assert all 4 Phase-2 fields (`open_maintenance`, `address`, `property_type`, `status`).

**IN-01** — Cycle-2 unit test still used `undefined as number | undefined` cast for the fallback case. **Closed** via cycle-2 by simplifying the test to omit `open_maintenance` from the literal (matches the optional-field semantics).

### Cycle 3 (deep, 0 findings)

This file. First zero-finding cycle. 1 of 2 consecutive zero-finding cycles required for perfect-PR merge gate.

---

_Reviewed: 2026-05-23T20:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 3_
_Gate status: 1_of_2_zero_finding_cycles_complete_
