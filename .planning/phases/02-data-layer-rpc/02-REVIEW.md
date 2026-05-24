---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T22:30:00Z
depth: deep
cycle: 4
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
  critical: 1
  warning: 0
  info: 2
  total: 3
status: issues_found
consecutive_zero_finding_cycles: 0
perfect_pr_gate: counter_reset
---

# Phase 2: Code Review Report — Cycle 4

**Reviewed:** 2026-05-23T22:30:00Z
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found
**Cycle:** 4 (fresh-eyes pass after one consecutive zero-finding cycle)
**Consecutive zero-finding cycles:** 0 (reset by this cycle's findings)

## Summary

Cycle 4 was supposed to be the second consecutive zero-finding cycle that closes the perfect-PR gate. It is not. A fresh adversarial pass — explicitly NOT a re-verification of cycle 3 — surfaced three issues that all prior cycles missed:

- **CR-01 (BLOCKER):** The integration test added by Phase 2 (`dashboard-rpc-open-maintenance.test.ts`) makes a security claim that is **factually false**. It asserts that when ownerA calls `rpc('get_dashboard_data_v2', { p_user_id: ownerBId })` from clientA's authenticated session, the returned `property_performance` array is empty — claiming SECURITY DEFINER + per-CTE `where owner_user_id = p_user_id` filtering provides isolation. This is wrong on first principles: SECURITY DEFINER bypasses RLS (function owner has BYPASSRLS, confirmed by `20260504164842_drop_app_config_for_all_service_role_policy.sql:18`), and the CTE filter uses the function argument `p_user_id` (set by the caller), not `auth.uid()`. The test's beforeAll creates `propertyB` under ownerB; the RPC call WILL return propertyB's row. Either the test is failing in CI (which prior cycles didn't surface), or it's accidentally passing only when ownerB's data happens to be empty. Underlying issue: the RPC has no `auth.uid() != p_user_id → raise exception 'Unauthorized'` guard despite this being a documented codebase convention (see `20260306190000_consolidate_stats_rpcs.sql` SEC-01 pattern), making cross-owner dashboard data leakable to any authenticated user.
- **IN-01 (stale JSDoc):** `dashboard-data.ts:37-38` claims "the selectors compose this transform" but cycle 2's `use-dashboard-hooks.ts:28-37` fix removed the `transformDashboardData(data)` invocation from `selectStats` / `selectCharts`. `transformDashboardData` has zero production consumers — only the unit test imports it. The JSDoc claim is contradicted by the very file (`use-dashboard-hooks.ts`) it references.
- **IN-02 (misleading test docstring):** `dashboard-rpc-open-maintenance.test.ts:18` claims the test pattern matches `bulk-import-create-lease.test.ts` "(dual client, fixture-create + cleanup, **graceful skip if env missing**)". The test does NOT gracefully skip on missing env — `getTestCredentials()` throws unconditionally when any of the 4 E2E_OWNER_* env vars is missing (`supabase-client.ts:80-84`). The only graceful skip in the file is the fixture-creation skip inside the happy-path `it` block.

The CR-01 finding is what Phase 1's perfect-PR pattern warned about: cycles 6+7 of Phase 1 caught what 2+3 missed because 3 had been dismissive. Cycle 3 of Phase 2 read the integration test's comment ("CTE chain returns no rows for ownerA's owned data AND no rows for ownerB's owned data because clientA's session can't satisfy the CTE filter for ownerB's user_id") and accepted it as truth instead of testing the claim against the actual SECURITY DEFINER semantics.

The perfect-PR counter resets to 0. Cycles 5+6 must both be zero-finding to satisfy the gate.

## Findings

### CR-01 (BLOCKER): Integration test isolation assertion is provably false — cross-owner data leak shipped untested

**Files:**
- `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:216-238` (test bug)
- `supabase/migrations/20260523234221_phase2_property_perf_address_status_type.sql:15-23` (underlying RPC missing SEC-01 guard)

**Issue:**

The integration test's "ISOLATION" block asserts:

```ts
// dashboard-rpc-open-maintenance.test.ts:217-237
const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
    p_user_id: ownerBId,
});
// …
expect(result.property_performance).toEqual([]);
```

with the explanatory comment:

> "The function is SECURITY DEFINER but every shared CTE … filters on `owner_user_id = p_user_id`. When ownerA passes ownerB's id, the CTE chain returns no rows for ownerA's owned data AND no rows for ownerB's owned data (because clientA's session can't satisfy the CTE filter for ownerB's user_id). The result is empty."

This comment is **factually wrong** on three counts:

1. **SECURITY DEFINER + function-owner BYPASSRLS means RLS is bypassed inside the function body.** Verified by the project's own migration `20260504164842_drop_app_config_for_all_service_role_policy.sql:18`: "the BYPASSRLS-bearing function-owner role bypasses RLS". So row-level policies on `properties`, `units`, `leases`, `maintenance_requests` do NOT apply inside this function.

2. **The CTE filter uses `p_user_id` (the function argument), not `auth.uid()`.** Inspect the canonical body in `20260523234221_phase2_property_perf_address_status_type.sql`:
   - `owner_properties` (line 35): `where owner_user_id = p_user_id`
   - `all_leases` (line 50): `where l.owner_user_id = p_user_id`
   - `all_maintenance` (line 60): `where owner_user_id = p_user_id`
   - `recent_activities` (line 366): `where user_id = p_user_id`

   Every filter uses the argument. None reference `auth.uid()`. The fetcher at `use-owner-dashboard.ts:219-221` passes `user.id` from the legitimate flow, but an adversarial PostgREST call can substitute any UUID.

3. **The test fixture has live data for ownerB.** `beforeAll` (lines 121-151) creates propertyB and unitB under ownerB. When ownerA's session calls `rpc('get_dashboard_data_v2', { p_user_id: ownerBId })`, `owner_properties` returns `{id: propertyB.id, name: 'Dashboard RPC Test Property B', address_line1: '2 RPC St', property_type: 'APARTMENT'}`. The `property_perf` CTE emits one jsonb row for propertyB. `result.property_performance` is `[{property_name: 'Dashboard RPC Test Property B', total_units: 1, occupied_units: 0, vacant_units: 1, occupancy_rate: 0, annual_revenue: 0, monthly_revenue: 0, potential_revenue: 1500, address: '2 RPC St', property_type: 'APARTMENT', status: 'vacant', open_maintenance: 0}]` — NOT `[]`.

So `expect(result.property_performance).toEqual([])` must be failing when the test actually runs against the deployed RPC. Either:

- **The test is failing in CI but cycle 3 didn't run / didn't surface it** (paper review only), OR
- **The test is passing because the canonical migration hasn't yet been applied to prod** — the `?? 0` defensive fallback at `use-owner-dashboard.ts:268-273` is dated "until the migration is applied", which suggests the schema half of POLISH-10 may not yet be deployed. If the OLD RPC body runs (the one without `address`/`property_type`/`status` keys), the `property_perf` CTE still returns the same propertyB row — the assertion still fails. So this path also doesn't explain a "passing" status.

Either way, the test does NOT verify the property it claims to verify. The actual security property — that an authenticated user cannot query another owner's dashboard — is **NOT enforced by the RPC** and is **NOT exercised by the test**.

The codebase has a documented pattern for fixing this. From `20260306190000_consolidate_stats_rpcs.sql`:

```sql
-- SEC-01: Validate caller identity
if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
end if;
```

CLAUDE.md explicitly mandates this: "All SECURITY DEFINER RPCs validate `auth.uid()` and lock `search_path = public`." `get_dashboard_data_v2` locks `search_path` but does not validate `auth.uid()`. Phase 2 owned a `CREATE OR REPLACE FUNCTION` rewrite of the entire body and did not add the guard; Phase 2's integration test claimed to verify the missing guard but uses an incorrect assertion.

**Pre-existing vs. new defect:** The auth-validation gap in the RPC predates Phase 2 (it shipped in `20260301070000_unified_dashboard_rpc.sql`). The integration test, however, is Phase 2's own contribution — and it makes a false security claim. That alone is a BLOCKER: the test gives a false signal that this surface is RLS-isolated, which masks the underlying RPC gap from future audits.

**Fix:**

Two-part fix required.

**Part A: Add SEC-01 guard to the RPC** (replaces both Phase 2 migrations' final canonical body or adds a third follow-up migration on top of `20260523234221`):

```sql
create or replace function public.get_dashboard_data_v2(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
begin
  -- SEC-01: Validate caller identity (matches the codebase pattern in
  -- 20260306190000_consolidate_stats_rpcs.sql). Without this guard the
  -- SECURITY DEFINER function trusts p_user_id blindly, allowing any
  -- authenticated user to read any other owner's dashboard.
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  with
  -- … rest of the body unchanged
```

**Part B: Rewrite the integration test to assert the new contract.** Replace the false "isolation via CTE filter" claim with a real auth-validation test:

```ts
it("rejects cross-owner queries with auth error (SEC-01 caller validation)", async () => {
    const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
        p_user_id: ownerBId,
    });
    // SEC-01 guard raises 'Unauthorized'; PostgREST surfaces it as a 4xx with
    // error.message containing 'Unauthorized'.
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/Unauthorized/i);
    // No data leak: even error responses should not include any owner data.
    expect(data).toBeNull();
});
```

The new test pins the actual security contract. The current test pins a contract that does not exist.

---

### IN-01: `dashboard-data.ts` JSDoc claim "the selectors compose this transform" is stale and contradicts `use-dashboard-hooks.ts`

**File:** `src/components/dashboard/dashboard-data.ts:37-38`

**Issue:**

The JSDoc reads:

```ts
/**
 * …
 * Per D-12a interpretation #2 the selectors compose this transform; it is
 * not wired into `DASHBOARD_BASE_QUERY_OPTIONS`.
 * …
 */
```

But `use-dashboard-hooks.ts:28-37` explicitly explains that cycle 2 **removed** the `transformDashboardData(data)` invocation from the selectors:

```ts
// use-dashboard-hooks.ts:28-37
// D-12a interpretation #2: keep `select` OUT of DASHBOARD_BASE_QUERY_OPTIONS
// so per-call selectors compose the slice they need from the raw cache.
// WR-01 fix (cycle 1 → cycle 2): selectStats + selectCharts read `data.stats`
// / `data.timeSeries` directly. Earlier they invoked `transformDashboardData(data)`
// and immediately discarded its `portfolioRows` work — every cache hit paid
// the `propertyPerformance.map(...)` cost twice (once per selector) to read
// passthrough fields. The transform stays imported by callers that consume
// `portfolioRows` (Phase 3's `dashboard-view.tsx` is the next consumer);
// here we just trim the dead invocation.
```

`grep -rn "transformDashboardData" src` confirms only `dashboard-data.test.ts` imports it. No production consumer composes the transform. The JSDoc claim is the opposite of reality.

**Fix:**

Rewrite the JSDoc to match the actual state:

```ts
/**
 * Pure RPC-payload → view-model transform for the owner dashboard.
 * Server-Component-safe: no React, no hooks, no React Query coupling.
 * Per D-10 (Phase 01 CONTEXT.md) — the shared transform contract that
 * Phase 3's `dashboard-view.tsx` migration consumes.
 *
 * Input type is the canonical `OwnerDashboardData` from
 * `use-owner-dashboard.ts` (the post-mapped payload — RPC row-level snake↔
 * camel mapping has already happened at the fetcher boundary).
 *
 * Current consumer footprint: only `dashboard-data.test.ts` imports this
 * function today. Cycle 2 of Phase 2 removed the `transformDashboardData(data)`
 * call from `selectStats` / `selectCharts` because those selectors read
 * passthrough fields directly. The transform survives as the Phase-3
 * `dashboard-view.tsx` seam — see `use-dashboard-hooks.ts:28-37` for the
 * "trimmed dead invocation" rationale.
 *
 * Trust-the-type posture: input fields are typed required, so the body
 * does not optional-chain on `timeSeries` or `propertyPerformance`.
 */
```

---

### IN-02: Test docstring claims "graceful skip if env missing" but the test throws on missing env

**File:** `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:14-18`

**Issue:**

The JSDoc reads:

> "Pattern matches `tests/integration/rls/bulk-import-create-lease.test.ts` (dual client, fixture-create + cleanup, **graceful skip if env missing**)."

The test does NOT gracefully skip on missing env. `getTestCredentials()` (`supabase-client.ts:80-84`) throws unconditionally:

```ts
if (!ownerAEmail || !ownerAPassword || !ownerBEmail || !ownerBPassword) {
    throw new Error(
        "Missing required env vars: E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_OWNER_B_EMAIL, E2E_OWNER_B_PASSWORD",
    );
}
```

The only graceful skip in the test file is the **fixture-creation** skip inside the happy-path `it` block (lines 177-180):

```ts
if (!propertyA || !maintenanceA) {
    console.warn("Skipping: fixtures not created");
    return;
}
```

That skip handles the case where `beforeAll` fixture inserts silently failed (e.g., RLS rejected the write), NOT the case where env vars are missing. With missing env, `beforeAll` throws and every `it` in the suite fails with "Missing required env vars".

The docstring conflates the two. `bulk-import-create-lease.test.ts` has the same behavior, so the "matches that pattern" claim is technically accurate — but neither test is "graceful on missing env". The user-facing claim in this test's docstring should not be repeated, or both tests' docstrings should drop the claim.

**Fix:**

Tighten the docstring:

```ts
/**
 * …
 * Pattern matches `tests/integration/rls/bulk-import-create-lease.test.ts`
 * (dual client, fixture-create + cleanup, fixture-creation skip on insert
 * failure). Missing env vars surface as a hard `beforeAll` throw — the
 * test suite is required by the rls-security GitHub workflow's "Check
 * required secrets" step, which fails the job before the test runs if any
 * of E2E_OWNER_{,B_}EMAIL / E2E_OWNER_{,B_}PASSWORD is unset.
 */
```

---

## Cycle 3 Verification — Where the Prior Pass Drifted

The cycle 3 report stated:

> "**Cross-owner isolation test (line 216-238) still asserts `expect(result.property_performance).toEqual([])` — the strictest possible contract for RLS-via-owner-filter. ✓**"

That checkmark accepts the test's own self-description without testing it against the actual SECURITY DEFINER semantics. The "strictest possible contract" framing is the trap: the test asserts a contract that the RPC does NOT actually enforce. A "strict" assertion against a false claim is worse than no assertion — it gives the next reviewer false confidence that the property is verified.

Phase 1's lesson applied here: cycle 3's job was to be ruthless on the substrate, not to ratify cycle 2's narrative. CR-01 above is the exact class of issue that requires reading the SQL semantics independently of the test's comment.

## CLAUDE.md Zero Tolerance Rules (verified by fresh grep)

- **No `any`** — `grep -nE ":\s*any|<any>|any\[\]"` across all 12 files: 0 hits (excluding the autogen disclaimer in `property-stats-keys.ts:35` which is a comment). ✓
- **No `as unknown as`** — `grep -n "as unknown as"`: 0 hits in any of the 12 files. The single mention at `property-stats-keys.ts:35` is documentation about what NOT to do. ✓
- **No barrel re-exports** — no `index.ts` added; all imports go to defining files. ✓
- **No duplicate types** — `DashboardViewModel` is the only new type; `OwnerDashboardData` is reused via import. ✓
- **No commented-out code** — verified by inspection; all comments are explanatory prose or JSDoc. ✓
- **No inline styles** — no `style={{ … }}` attributes in the new code. ✓
- **No PostgreSQL ENUMs** — status emitted as `text` via CASE expression. ✓
- **No emojis** — no emoji codepoints; the `→` arrow in migration comments is a typographic character, not an emoji. ✓
- **No string-literal queryKey arrays** — all keys via factories. ✓
- **No `@radix-ui/react-icons`** — no imports of that package. ✓

## Status Derivation Re-Walk (independent check)

SQL CASE (migration 2, lines 330-335) and the JS reference at `property-stats-keys.ts:47-56` agree on every input. Edge cases:

| Input | SQL branch | JS branch | Equivalent? |
|-------|-----------|-----------|-------------|
| `total_units = 0` | 1st: NO_UNITS | 1st: NO_UNITS | ✓ |
| `total_units > 0, occupied_units = 0` | 2nd: vacant | 2nd: vacant | ✓ |
| `total_units = occupied_units > 0` | 3rd: FULL | 3rd: FULL | ✓ |
| `0 < occupied_units < total_units` | else: PARTIAL | else: PARTIAL | ✓ |
| `puc IS NULL` (LEFT JOIN miss) | 1st via coalesce: NO_UNITS | N/A (no LEFT JOIN in JS) | ✓ |

No correctness drift. The migration's derivation is a faithful port.

## Data Flow Trace (independent check)

For a property with `open_maintenance: 1, status: 'vacant', address: '1 RPC St', property_type: 'APARTMENT'`:

1. RPC emits the row as `PropertyPerformanceRpcResponse` (`database-rpc.ts:23-37`) — all 13 fields populated.
2. `use-owner-dashboard.ts:253-274` mapper produces `PropertyPerformance` with `open_maintenance: 1, status: mapPropertyPerformanceStatus('vacant') = 'vacant', address_line1: '1 RPC St', property_type: 'APARTMENT'`.
3. `page.tsx:97-110` re-mapper produces `PropertyPerformanceItem` with `openMaintenance: 1, address: '1 RPC St'` (drops `status`, `property_type`).
4. `dashboard.tsx:87-102` inline transform produces `PortfolioRow` with `maintenanceOpen: 1` (drops `address` from `PortfolioRow` — wait, `dashboard.tsx:90` does set `address: prop.address`). ✓
5. Portfolio table renders the row with maintenance = 1.

No data loss at any seam. ✓

## Migration Safety Re-Audit (independent)

Both migrations preserve:
- Signature `(p_user_id uuid) returns jsonb` ✓
- `security definer` ✓
- `set search_path to 'public'` ✓
- `grant execute … to authenticated/service_role` ✓
- No DROP / ALTER / new tables / new columns ✓
- Migration 2 fully supersedes migration 1 (includes `perf_open_maintenance` CTE and `open_maintenance` jsonb key) ✓

The migrations are surgically additive. The defect in CR-01 is what they did NOT add (SEC-01 guard) and what the test PRETENDS they enforce.

## Audit Trail

### Cycle 1 (deep, 9 findings: 1 CR + 3 WR + 5 IN)
**CR-01** — Duplicate `OwnerDashboardData` declaration. Closed by `7f64c1946`.
**WR-01/02 + IN-01..06** — Various comment / test / structural improvements. Closed.
**IN-03** — `row.status as PropertyPerformance["status"]` cast. Closed by typed mapper. This fix introduced the cycle-2 BLOCKER.

### Cycle 2 (deep, 4 findings: 1 BLOCKER + 2 WR + 1 IN)
**BLOCKER** — `mapPropertyPerformanceStatus(undefined)` throw (RPC never emitted `status`). Closed by follow-on migration `20260523234221`.
**WR-01/02 + IN-01** — Closed.

### Cycle 3 (deep, 0 findings)
First zero-finding cycle. Counter advanced to 1/2.

**Drift point:** Cycle 3 ratified the integration test's self-description ("strictest possible contract for RLS-via-owner-filter") without testing the claim against PostgreSQL SECURITY DEFINER semantics or against the existence of the SEC-01 pattern in the codebase. CR-01 of cycle 4 catches this exact blindspot.

### Cycle 4 (deep, 3 findings: 1 CR + 2 IN)
**CR-01** — Integration test isolation assertion is false; RPC missing SEC-01 guard; cross-owner data leak shipped untested.
**IN-01** — `dashboard-data.ts` JSDoc claims selectors compose the transform; cycle 2 removed that wiring.
**IN-02** — Test docstring claims "graceful skip if env missing"; the test actually throws on missing env.

**Counter reset to 0.** Two consecutive zero-finding cycles required to close the perfect-PR gate.

---

_Reviewed: 2026-05-23T22:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Cycle: 4_
_Gate status: counter_reset (CR-01 + IN-01 + IN-02 surfaced)_
