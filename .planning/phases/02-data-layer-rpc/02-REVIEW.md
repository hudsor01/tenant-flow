---
phase: 02-data-layer-rpc
reviewed: 2026-05-23T00:00:00Z
depth: deep
cycle: 5
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
  warning: 1
  info: 2
  total: 3
status: issues_found
consecutive_zero_finding_cycles: 0
perfect_pr_gate: 0_of_2
---

# Phase 2: Code Review Report — Cycle 5

**Reviewed:** 2026-05-23
**Depth:** deep
**Cycle:** 5
**Files Reviewed:** 13 (12 + new auth-guard migration)
**Status:** issues_found

## Cycle 4 Fixes — Verification

| Finding | Status | Evidence |
|---|---|---|
| **CR-01** Auth guard | CLOSED | Migration `20260524001408` lines 25-27 insert `if p_user_id != (select auth.uid()) then raise exception 'Unauthorized'; end if;` immediately after `begin` (line 22), before `with` (line 29). `CREATE OR REPLACE`, `SECURITY DEFINER`, `set search_path to 'public'`, signature `(p_user_id uuid) returns jsonb`, and GRANTs to authenticated + service_role all preserved (lines 13-17, 504-505). Pattern mirrors reference migration `20260306190000_consolidate_stats_rpcs.sql` (verified identical SQL shape at lines 17 + 54 of that reference). |
| **CR-01** Test isolation assertion | CLOSED | `dashboard-rpc-open-maintenance.test.ts` lines 220-236 expect `error.message` matches `/Unauthorized/i` AND `data === null` instead of `toEqual([])`. The "rejects cross-owner calls with Unauthorized" test name + 12-line comment block (lines 224-233) explains why the empty-array assertion was a false security claim. |
| **IN-01** dashboard-data.ts JSDoc | CLOSED | Lines 38-48 state "ZERO production consumers today", identify `use-dashboard-hooks.ts` selector composition as removed, reference D-10 + Phase 3 `dashboard-view.tsx` as the future consumer. No longer claims selectors compose this transform. |
| **IN-02** Test docstring | CLOSED | Lines 19-22 acknowledge `getTestCredentials()` throws when env vars unset; CI provides via repo secrets; local runs need `.env.local`. No longer claims graceful skip. |

**Structural diff Migration #2 vs Migration #3:** functionally equivalent except for (a) the new `if p_user_id != ...` guard, (b) updated header comments, (c) updated function-comment. CTEs all preserved: `perf_open_maintenance` (lines 285-293), address/property_type/status keys in `property_perf.jsonb_build_object` (lines 313-320). Migration #3 is the canonical replay-safe end-state.

**Auth-guard edge cases:**
- Honest caller (`p_user_id == auth.uid()`): `!=` is FALSE → continue. Correct.
- Cross-owner attempt (`p_user_id != auth.uid()`): `!=` is TRUE → raise. Correct.
- Unauthenticated caller (auth.uid() returns NULL): `p_user_id != NULL` is NULL → IF NULL treats as FALSE → continue. This is consistent with the established project pattern at `20260306190000_consolidate_stats_rpcs.sql` (same `!=` shape). PostgREST `authenticated` role is bound to a JWT, so `auth.uid()` is non-null in practice for any caller reaching this RPC; the `service_role` GRANT is intentional. Project-wide convention, not a phase-2 defect.

**D-04 contract evolution:** CONTEXT D-04 (line 61) reads: "returns zero rows OR errors with permission denial (whichever the RPC's SECURITY DEFINER definition enforces — likely 'empty result because no rows match the owner filter')." The original phrasing anticipated BOTH outcomes; cycle-4 picked the security-correct branch ("errors with permission denial"). The decision is semantically consistent with D-04 — no CONTEXT.md follow-up note required.

---

## Fresh Cycle 5 Findings

### WR-01 — Migration #3 strips in-source explanation comments

**File:** `supabase/migrations/20260524001408_phase2_dashboard_rpc_auth_guard.sql:255-320`
**Severity:** Warning

**Issue:** Migration #3 is the canonical end-state via `CREATE OR REPLACE` — anyone running `\sf get_dashboard_data_v2` in prod, or diffing the source SQL against the prod definition, sees Migration #3's stripped body. Migration #2 contained three in-source documentation blocks that Migration #3 silently dropped:

1. **Migration #2 line 259-262 (dropped):** the `-- PROPERTY PERFORMANCE` section header that delimited the `perf_unit_counts` / `perf_lease_revenues` / `perf_potential_revenues` / `perf_open_maintenance` cluster.
2. **Migration #2 line 291 (dropped):** `-- Phase 2 (POLISH-10) per-property open + in_progress maintenance counts.` — the only in-body anchor explaining why `perf_open_maintenance` exists.
3. **Migration #2 lines 320-327 (dropped):** the 8-line "Phase 2 cycle-2: align RPC return shape" block that documented the status-derivation rules (`NO_UNITS / vacant / FULL / PARTIAL`) inside the case statement. This is the highest-value comment of the three because the derivation logic must stay in lockstep with the frontend `mapPerformanceRow` in `property-stats-keys.ts:46-56` — and the only thing that documents that lockstep is now gone from prod.

The function-comment at the bottom of Migration #3 (lines 507-511) was also updated to reference only cycle-4 — it no longer mentions cycle-2's address/property_type/status alignment or the POLISH-10 open_maintenance contract. A future engineer reading `pg_proc.proobjcomment` learns about the auth guard but not the rest of Phase 2.

**Why this matters:** Migration #3 supersedes Migration #2 (and Migration #1) on every replay. A fresh-schema replay produces Migration #3's body in prod regardless of whether #1 / #2 succeed. The lost comments are not recoverable from the live DB.

**Fix:** Restore the three dropped comment blocks in Migration #3 verbatim from Migration #2. Extend the function-comment to a multi-line `comment on function` that summarizes all three Phase 2 deltas:

```sql
comment on function public.get_dashboard_data_v2 is
  'Unified dashboard data fetch. Phase 2 (POLISH-10): '
  'cycle-1 added per-property open_maintenance via perf_open_maintenance CTE. '
  'cycle-2 aligned property_performance rows with PropertyPerformanceRpcResponse '
  '(address, property_type, derived status). '
  'cycle-4 added auth.uid() = p_user_id guard — SECURITY DEFINER bypasses RLS, '
  'so the function must reassert scope against the caller''s actual identity. '
  'Mirrors the established pattern from 20260306190000_consolidate_stats_rpcs.sql.';
```

And inside the body, restore the three comment blocks (section header at ~line 255, POLISH-10 anchor at ~line 284, status-derivation rules at ~line 313).

---

### IN-01 — `mapPropertyPerformanceStatus` runtime narrowing rationale outdated

**File:** `src/hooks/api/use-owner-dashboard.ts:194-211`
**Severity:** Info

**Issue:** The runtime narrowing throw (lines 208-210) was introduced before Migration #2 made the RPC emit a server-derived status from a closed-set CASE expression (`'NO_UNITS' / 'vacant' / 'FULL' / 'PARTIAL'`). Since cycle-2 of Phase 2, the RPC cannot emit an unknown status string — the CASE expression covers all branches with no default. The throw is now defense-in-depth against a future migration that adds a fifth status, not an active runtime check.

The function comment at lines 194-196 reads: "Narrow the raw `string` status field to the typed union without `as`. Throwing on unexpected values surfaces silent contract drift early (e.g., a future migration that introduces a new status value)." — accurate but does not name the upstream guarantee. A future engineer reading this comment doesn't know that Migration `20260523234221` is the source of the closed set, so they may mistakenly assume the throw is reachable in normal operation.

**Fix:** Extend the function comment to anchor the closed-set guarantee:

```typescript
// Narrow the raw `string` status field to the typed union without `as`.
// As of `supabase/migrations/20260523234221_phase2_property_perf_address_status_type.sql`,
// the RPC derives `status` server-side via a closed-set CASE expression
// (NO_UNITS / vacant / FULL / PARTIAL), so this throw is defense-in-depth
// against a future migration adding a fifth status — NOT a runtime check
// that the current RPC can trigger. If a migration adds a new status value
// without updating PropertyPerformance["status"], this throw surfaces the
// drift on the first request rather than silently coercing.
function mapPropertyPerformanceStatus(
```

---

### IN-02 — Test isolation regex is looser than the migration emits

**File:** `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts:235`
**Severity:** Info

**Issue:** The cross-owner isolation assertion uses `expect(error?.message).toMatch(/Unauthorized/i)`. The case-insensitive flag accepts `unauthorized` / `UNAUTHORIZED` / `Unauthorized` / any case variation, AND the unanchored regex accepts any message containing the substring (e.g., `"User Unauthorized to access /admin"`). The migration emits exactly `'Unauthorized'` (verified at `20260524001408_phase2_dashboard_rpc_auth_guard.sql:26`). PostgREST surfaces `raise exception` messages verbatim in `PostgrestError.message`.

A future refactor that accidentally changes the raise message to a different `*Unauthorized*` substring (e.g., `raise exception 'Auth check Unauthorized: cross-owner blocked'`) would silently still pass this assertion even though the surface error contract changed. The looser regex also makes the test less informative — a failure mode where PostgREST prepends a SQLSTATE prefix would be invisible.

**Fix:** Tighten to an exact match:

```typescript
expect(error?.message).toBe("Unauthorized");
```

This pins the exact wire-format surfaced to the frontend. If the test starts failing because PostgREST adds a SQLSTATE / hint prefix in a future Supabase update, the assertion needs updating — but at that point the change is intentional and visible.

---

## Out-of-Scope but Verified Clean

- **Zero Tolerance Rules sweep (all 13 files):** no `any` types, no barrel re-exports, no duplicate types (PropertyPerformance / PropertyPerformanceRpcResponse / DashboardViewModel all distinct), no commented-out code, no inline styles, no `as unknown as` (only RPC narrowing via mapper functions), no string-literal query keys, no `@radix-ui/react-icons`.
- **Migration idempotency:** all three Phase 2 migrations are `CREATE OR REPLACE FUNCTION`, all are SECURITY DEFINER, all set `search_path to 'public'`. Migration #3 is the canonical replay end-state — replay of #1 → #2 → #3 reaches the same final state as replay of #3 alone (the only difference being failures along the way; Migration #3 supersedes both).
- **Migration ordering:** filenames strictly ascending (`20260523223626` < `20260523234221` < `20260524001408`). Replay safety confirmed.
- **Data flow trace** (ownerA prod call → RPC → mapper → page.tsx → dashboard.tsx → portfolio table): every transform preserves type and value identity for the per-property `open_maintenance`, `address`, `property_type`, derived `status`. No seam loses or mistypes a value.
- **Cleanup ordering** in test `afterAll` (lines 158-174): reverse-dependency order respected (maintenance_requests → tenants → units → properties for ownerA; units → properties for ownerB).
- **Email collision risk** in test fixture (line 97 — `Date.now()` suffix): low risk because integration tests run sequentially in CI per project convention; not a finding.
- **`fetchOwnerDashboardData` defensive `?? 0`** at line 273: redundant given the RPC's `coalesce(pom.open_maintenance, 0)` already guarantees a number, BUT the JSDoc anchor at lines 268-272 acknowledges this is intentional deploy-safety until prod has the migration applied. Acceptable.

---

## Gate Status

- Cycle 5: 3 findings (1 Warning + 2 Info) — `consecutive_zero_finding_cycles` resets to **0**
- Perfect-PR gate: **0 of 2**
- Two consecutive zero-finding cycles required before merge

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
