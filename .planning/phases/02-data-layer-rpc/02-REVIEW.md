---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 6
files_reviewed: 13
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
  - supabase/migrations/20260524001408_phase2_dashboard_rpc_auth_guard.sql
  - tests/integration/rls/dashboard-rpc-open-maintenance.test.ts
findings:
  critical: 0
  blocker: 0
  warning: 0
  info: 0
  total: 0
status: clean
consecutive_zero_finding_cycles: 1
perfect_pr_gate: 1_of_2
---

# Phase 2: Code Review Report — Cycle 6

**Reviewed:** 2026-05-23
**Depth:** deep
**Cycle:** 6
**Files Reviewed:** 13
**Status:** clean

## Cycle 5 Fixes — Verification

| Finding | Status | Evidence |
|---|---|---|
| **WR-01** Migration #3 restored explanatory comments | CLOSED | `supabase/migrations/20260524001408_phase2_dashboard_rpc_auth_guard.sql` now contains: (a) `-- PROPERTY PERFORMANCE` section header at lines 258-260; (b) 5-line POLISH-10 anchor comment above `perf_open_maintenance` CTE at lines 289-294 explaining the PK-lookup invariant; (c) 8-line status-derivation rules block at lines 323-331 citing `src/hooks/api/query-keys/property-stats-keys.ts:47-56`; (d) multi-line `comment on function` at lines 526-532 summarizing all three Phase 2 migrations (open_maintenance, address/property_type/status, auth guard). Verbatim match against Migration #2's anchor content where appropriate. |
| **IN-01** `mapPropertyPerformanceStatus` JSDoc references closed-set source | CLOSED | `src/hooks/api/use-owner-dashboard.ts:194-200` now anchors the closed-set guarantee to `Migration 20260523234221_phase2_property_perf_address_status_type.sql` by name. Reads: "the RPC derives `status` server-side via a closed CASE expression returning exactly one of `'NO_UNITS' \| 'vacant' \| 'FULL' \| 'PARTIAL'`. The throw is defense-in-depth..." Comment now correctly names the upstream source. |
| **IN-02** Test isolation assertion tightened to strict equality | CLOSED | `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:239` reads `expect(error?.message).toBe("Unauthorized")` — strict equality replaces the previous case-insensitive unanchored regex `/Unauthorized/i`. A 3-line comment block at lines 235-238 explains why the strict match catches drift in either casing or SQLSTATE prefix in future Supabase updates. |

## Fresh Adversarial Sweep — Cycle 6

### Zero Tolerance Rules sweep (all 13 files)

- **No `any` types:** Verified via `grep`. The narrowing at `use-owner-dashboard.ts:241` uses `data as { stats: ...; trends: ...; ... }` — a simple `as` against a structurally validated `data` (the preceding `if (!data || ...)` check ensures shape), not `as unknown as` and not `any`. Acceptable.
- **No barrel files:** All imports target defining files directly. No `index.ts` re-exports introduced.
- **No duplicate types:** `PropertyPerformance` (core.ts), `PropertyPerformanceRpcResponse` (database-rpc.ts), `PropertyPerformanceItem` (sections/dashboard.ts), `PortfolioRow` (dashboard-types.ts), `DashboardViewModel` (dashboard-data.ts) — five distinct types serving five distinct seams (DB row shape ↔ post-mapper shape ↔ section consumer ↔ portfolio table ↔ view-model). All have JSDoc explaining role. No duplication.
- **No commented-out code:** Verified via `grep -E "^\s*//.*[{};]"` across all 13 files. The 3 `--` comments restored in Migration #3 are documentation, not commented-out SQL.
- **No inline styles:** All UI files use Tailwind utilities exclusively.
- **No PostgreSQL ENUMs in new migrations:** All three Phase 2 migrations use string literals against existing text-with-CHECK columns. No `create type ... as enum`.
- **No emojis:** Verified across all 13 files.
- **No `as unknown as`:** Verified via `grep`. Zero occurrences.
- **No string-literal query keys:** All dashboard query keys derive from `ownerDashboardKeys.*()` factories.
- **No `@radix-ui/react-icons`:** No icon imports in any of the 13 files.

### All three Phase 2 migrations

- **Migration #1 (`20260523223626`):** preserved as the audit trail. `CREATE OR REPLACE FUNCTION` + `SECURITY DEFINER` + `set search_path to 'public'` + signature `(p_user_id uuid) returns jsonb` + GRANTs to authenticated + service_role. Adds `perf_open_maintenance` CTE.
- **Migration #2 (`20260523234221`):** preserved as the audit trail. Same contract. Adds `address`, `property_type`, derived `status` to `property_perf` jsonb_build_object.
- **Migration #3 (`20260524001408`):** canonical end-state. Same contract. Adds the `auth.uid() = p_user_id` guard at lines 22-27. Body re-includes everything from Migrations #1 + #2.
- **Structural diff M#2 vs M#3 (`diff` line-count: 39):** the only behavioural delta is the 6-line auth-guard block insertion at function-body top (lines 22-27 of M#3); all CTEs, jsonb keys, status CASE expression, and ASSEMBLE FINAL JSONB output are identical (only whitespace + comment-text reformatting). Replay safety: replay of #1 → #2 → #3 reaches the same final state as replay of #3 alone.
- **GRANT preservation:** all three migrations end with `grant execute on function public.get_dashboard_data_v2(uuid) to authenticated` + `grant execute ... to service_role`. No DROPs.
- **`comment on function`:** Migration #3 emits a multi-line PostgreSQL string-concatenation (`'...' 'next line' '...'`) which is valid SQL — adjacent string literals separated by whitespace including newlines concatenate at parse time. Verified syntactic position is after the final `$function$;` and before EOF.

### Auth guard

- **Insertion point:** lines 22-27 of Migration #3, immediately after `begin` (line 21) and before `with` (line 29). Correct (runs before any data access).
- **Pattern match:** identical SQL shape to `supabase/migrations/20260306190000_consolidate_stats_rpcs.sql:17-18` and `:54-55` (`if p_user_id != (select auth.uid()) then raise exception 'Unauthorized'; end if;`). Project-established convention.
- **Edge case — honest caller** (`p_user_id == auth.uid()`): `!=` is FALSE → bypass → continue. Correct.
- **Edge case — cross-owner attempt** (`p_user_id != auth.uid()`): `!=` is TRUE → raise. Correct.
- **Edge case — missing JWT / unauthenticated caller:** `auth.uid()` returns NULL. `p_user_id != NULL` evaluates to NULL, and `IF NULL` in plpgsql is treated as FALSE → bypass. This matches the existing project pattern (same shape at `20260306190000_consolidate_stats_rpcs.sql:17-18`). PostgREST never invokes RPCs without a JWT for the `authenticated` role, so `auth.uid()` is non-null in practice. The `service_role` GRANT remains intentional. Not a Phase 2 defect.
- **Edge case — self-call:** `auth.uid() == p_user_id` exact match → bypass → correct dashboard payload.

### Integration test

- **2 `it` blocks** (happy + isolation): verified.
- **Happy path** asserts: `open_maintenance` is number AND `>= 1`, `address === '1 RPC St'`, `property_type === 'APARTMENT'`, `status === 'vacant'`. Pins all four Phase 2 fields per cycle-2's reasoning about blindspot prevention.
- **Isolation** asserts: `data === null`, `error.message === 'Unauthorized'` (strict).
- **`beforeAll` fixture ordering:** property → unit → tenant → maintenance. FK-correct (unit references property; tenant is independent; maintenance references both unit and tenant).
- **`afterAll` cleanup ordering (lines 162-170):** maintenance → tenant → unit → property. Reverse-dependency-order correct. `tenantA` deletion (line 167) precedes `unitA` deletion (line 168), but the two are independent — only `maintenanceA` (line 163) actually depends on `tenantA`'s existence, and `maintenanceA` is deleted first. Order is safe.
- **No service-role key:** `createTestClient` signs in via password against the `authenticated` role.
- **No personal emails:** fixture tenant email is namespaced (`dashboard-rpc-test-tenant-a-${Date.now()}@example.com`); E2E credentials reference synthetic accounts `E2E_OWNER_*`.
- **No `any`, no `as unknown as`:** narrowing at lines 192-194 uses a structured `as` against the validated `data` value. Acceptable.
- **Test framework hook imports:** `vitest.config.ts:138` sets `globals: true` for the `integration` project → `describe / beforeAll / afterAll / it / expect` resolve via globals. Pattern matches the rest of `tests/integration/rls/`.

### End-to-end data flow trace (ownerA's prod data)

Traced any property in `propertyPerformance[]` through every transform seam:

1. **RPC** emits `{ property_name, property_id, total_units, occupied_units, vacant_units, occupancy_rate, annual_revenue, monthly_revenue, potential_revenue, open_maintenance, address, property_type, status }` (Migration #3 lines 308-340).
2. **`fetchOwnerDashboardData`** (`use-owner-dashboard.ts:257-278`) maps to `PropertyPerformance`: snake_case ↔ camelCase boundary, `address → address_line1`, `status` narrowed via `mapPropertyPerformanceStatus`, `open_maintenance` retained with `?? 0` fallback.
3. **`usePropertyPerformance`** (selector at `use-dashboard-hooks.ts:51-53`): raw passthrough of `propertyPerformance` slice.
4. **`page.tsx:97-108`** re-maps to `PropertyPerformanceItem`: `property_id → id`, `property → name`, `address_line1 → address`, `open_maintenance → openMaintenance` (with `?? 0` fallback).
5. **`dashboard.tsx:87-102`** inline-transforms to `PortfolioRow`: `name → property`, computes `leaseStatus` from `occupancyRate` (server-derived `status` is NOT consumed yet; that's a Phase 3 D-10 concern, not Phase 2 scope).
6. **`PortfolioTable`** consumes `PortfolioRow[]`.

No seam loses or mistypes a value. `open_maintenance` flows through all five seams. `status` is computed by RPC and survives through `PropertyPerformance` but is unused at the UI today (Phase 3 wires it).

### Test rigor

- **Unit test (`dashboard-data.test.ts`):** Pins three cases — real `open_maintenance` value forwards (`=3`), `undefined` falls back to `0`, row-order preserved across 3 properties. The canonical transform `transformDashboardData` deals only with `portfolioRows`, not the `status` field directly (the inline transform in `dashboard.tsx` handles `leaseStatus` from `occupancyRate`). So no additional `'FULL'` happy-path branch is in scope for this unit test.
- **Integration test (`dashboard-rpc-open-maintenance.test.ts`):** Pins four Phase 2 fields (open_maintenance, address, property_type, status) for the happy path AND the cross-owner isolation raise. The `'vacant'` derived status branch is exercised. Other status branches (`'NO_UNITS'`, `'FULL'`, `'PARTIAL'`) are not exercised but the CASE expression's exhaustiveness is preserved across all three migrations and the frontend's `mapPropertyPerformanceStatus` throws on drift.
- **NULL address handling:** RPC emits `op.address_line1` directly (`owner_properties` CTE projects it). The `address_line1` column on `properties` is NOT NULL (per `20251101000000_base_schema.sql`). The mapper at `use-owner-dashboard.ts:267` does not need a fallback — drift would surface at the `mapPropertyPerformanceStatus`-style boundary if introduced.

### Fresh-eyes scan

- **Comment-block syntactic position in Migration #3:** the restored `-- PROPERTY PERFORMANCE` header (lines 258-260) sits BEFORE the `perf_unit_counts as (` CTE — correct. The POLISH-10 anchor (lines 289-294) sits BEFORE the `perf_open_maintenance as (` CTE — correct. The status-derivation rules block (lines 323-331) sits INSIDE `jsonb_build_object` between the `coalesce(pom.open_maintenance, 0),` line and the `'address', op.address_line1,` line — correct.
- **`comment on function` multi-line string concatenation:** Migration #3 lines 526-532 use adjacent SQL string literals separated by newlines. PostgreSQL parser concatenates these into a single string at parse time per the SQL standard. Verified at the syntactic level (single statement terminated by `;` at line 532).
- **Dead code / unused imports across cycles 1-5 mutations:** no dead imports. The `mapPropertyPerformanceStatus` runtime narrowing throw is defense-in-depth, NOT dead (the JSDoc anchor at line 196-200 documents this explicitly per IN-01 fix).
- **`tenantA` cleanup ordering:** verified — `maintenance_requests` (FK to `tenants` + FK to `units`) is deleted FIRST (line 163), then `tenants` (line 167), then `units` (line 168), then `properties` (line 170). Correct FK reverse-dependency order.

### Phase-1 lessons applied

Looked at the WHOLE function contract end-to-end from the threat actor's perspective:

- **Threat model:** authenticated user with valid JWT calls `supabase.rpc("get_dashboard_data_v2", { p_user_id: <other-owner-uuid> })`.
  - Pre-cycle-4: SECURITY DEFINER bypasses RLS → CTEs scope to `p_user_id`, not `auth.uid()` → response leaks the other owner's full dashboard payload. **P0 data exfil.**
  - Post-cycle-4: explicit `auth.uid() = p_user_id` guard rejects with `Unauthorized` at function-body top, before any data access. **Closed.**
- **Threat model #2:** unauthenticated caller (no JWT). PostgREST denies before reaching the RPC for the `authenticated` role. `auth.uid()` returns NULL inside the RPC; guard's `!=` against NULL is NULL (treated as FALSE) → bypass. Defense-in-depth here is the PostgREST role-binding, not the in-function guard. Project-wide convention; matches reference migration `20260306190000_consolidate_stats_rpcs.sql`.
- **Threat model #3:** `service_role` caller. GRANT to `service_role` is intentional; service_role legitimately needs to query all owners' data for admin / cron use cases. Guard does not apply because `auth.uid()` returns NULL for service_role contexts. Acceptable project convention.
- **Threat model #4:** privilege escalation via `pg_proc.proobjcomment` SQL injection. The `comment on function` strings in all three migrations are static literals — no user input interpolation. Not exploitable.
- **Threat model #5:** SQLi via the `auth.uid()` reassignment. The function body is `language plpgsql` with parameterized CTE expressions; no string concatenation; no `EXECUTE` of dynamic SQL. Not exploitable.

End-to-end contract verified clean from the threat actor's perspective.

---

## Out-of-Scope but Verified Clean

- **Migration ordering:** filenames strictly ascending (`20260523223626` < `20260523234221` < `20260524001408`). Replay safety confirmed.
- **`src/types/supabase.ts`:** generated artifact regenerated to reflect the RPC. `get_dashboard_data_v2` still returns generic `Json`; the narrowing happens at the fetcher boundary, as expected.
- **Defensive `?? 0` at `use-owner-dashboard.ts:277`:** redundant given Migration #3's `coalesce(pom.open_maintenance, 0)`, but the JSDoc at lines 272-276 acknowledges this as intentional deploy-safety in case of a future revert.
- **Test fixture `Date.now()` email suffix:** low collision risk under sequential integration test execution per project convention.

---

## Gate Status

- Cycle 6: **0 findings** — `consecutive_zero_finding_cycles` advances to **1**
- Perfect-PR gate: **1 of 2**
- One more zero-finding cycle required before merge

---

## Audit Trail (cycles 1-6)

| Cycle | Findings | Notable |
|---|---|---|
| 1 | issues_found | Address/property_type/status declared in `PropertyPerformanceRpcResponse` but never emitted by RPC; cycle-1 typed status mapper upgraded silent coercion to runtime throw → P0 dashboard regression. |
| 2 | issues_found | Migration #2 fixed the type-contract lie — RPC now emits address, property_type, and a server-derived `status` from a closed CASE expression. |
| 3 | issues_found | Selector composition removed `transformDashboardData(data)` to fix double-map; transform survives as Phase-3 seam, pinned by unit test. |
| 4 | issues_found (P0) | Cross-owner data exfil — SECURITY DEFINER trusted `p_user_id` without `auth.uid()` check. Migration #3 added the guard. |
| 5 | issues_found (W1 + I2) | Migration #3 stripped explanatory comments from Migration #2; mapper JSDoc didn't anchor closed-set source; test regex was too loose. All three fixed. |
| 6 | **clean** | Cycle-5 fixes verified. Fresh adversarial sweep over Zero Tolerance Rules, all three migrations, auth guard threat-model, end-to-end data flow trace, integration + unit test rigor, and fresh-eyes pass surface zero defects. |

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
