---
pr: 758
branch: security/anon-exec-security-definer-audit
head_sha: e24eb9ab3
reviewed: 2026-05-29T23:55:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - supabase/migrations/20260529224926_revoke_anon_security_definer_rpcs.sql
  - supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql
  - tests/integration/rls/anon-rpc-grants.rls.test.ts
  - .planning/anon-exec-audit/CYCLE-1.md
findings:
  blocker: 1
  warning: 2
  info: 2
  total: 5
status: needs_fixes
verdict: NEEDS-FIXES
---

# PR #758 — Cycle 2 Review

## Summary

Verdict: **NEEDS-FIXES**

Cycle 1 correctly identified the count-drift bug class. Cycle 1's fix commit
`e24eb9ab3` resolved the headline drifts (test:48, test:16, audit doc :20,
:47, :49, v1:7, v2:5-6), but **two residual count drifts and one
PR-introduced CI regression** survive the fix:

1. **BL-01 (P0):** `tests/integration/rls/funnel-admin-rpc.test.ts:69` —
   pre-existing test asserts the anon path raises a message matching
   `/unauthorized/i`. Pre-PR, anon called `get_funnel_stats`, fell through to
   the internal `is_admin()` check, and `RAISE EXCEPTION 'Unauthorized'`. After
   v2 migration revoked anon EXECUTE on `get_funnel_stats`, anon now gets
   PostgreSQL `permission denied for function get_funnel_stats` (code 42501)
   before the body ever runs. CI confirms: `rls-security` job is RED on HEAD
   `e24eb9ab3`. Pre-existing test, broken by PR scope, not updated.

2. **WR-01 (residual):** `tests/integration/rls/anon-rpc-grants.rls.test.ts:11`
   still says "revoke FROM PUBLIC on 20 functions". v2 migration revokes on
   19. Cycle-1's fix touched lines 16 and 48 but missed line 11 of the same
   docstring.

3. **WR-02 (residual):** `.planning/anon-exec-audit/CYCLE-1.md:70` still says
   "22 anon-RPC tests assert `error.code ∈ {42501, 42883, PGRST202}`". Actual
   count of REVOKED_FROM_ANON entries in the test = 21 (2 IDOR + 19 dd).
   Cycle-1's fix updated audit doc lines 20, 47, 49, 61 but missed line 70.

Cycle 1's WR-02 (unaudited 5 analytics functions) and WR-04 (trigger chain
ownership) verifications are independently confirmed by this cycle: the
plan-limits RLS test (`plan-limits.rls.test.ts (2 tests) PASSED`) is empirical
proof of WR-04 trigger chain working; the audit doc's prose explanation of
WR-02 stands.

Cycle 1's WR-03 framing (null-vulnerable internal guard) is honest — verified
by grep of `IF p_user_id != (SELECT auth.uid())` in
`20260304120000_rpc_auth_guards.sql` (16+ matches). Role-level revoke fully
closes the gap because anon never reaches the body.

## Independent count re-derivation

| Source | Count | Verified by |
|---|---|---|
| v1 migration REVOKE statements | 6 (= 3 forms × 2 fns) → 2 unique fns | `grep -c "^REVOKE EXECUTE ON FUNCTION" 20260529224926_*.sql` |
| v2 migration REVOKE statements | 19 | `grep -c "^REVOKE EXECUTE ON FUNCTION" 20260529225039_*.sql` |
| REVOKED_FROM_ANON entries | 21 | name-field count between array open at line 49 and close at line 143, minus 2 false-positives from `p_metric_name:` keys in args |
| REVOKED_FROM_AUTHENTICATED entries | 2 | same method between lines 146-161 |
| GATES_INTERNALLY function names in audit doc:24 | 16 | hand-count of comma-separated list |
| NO_PARAM functions (incl. trigger) | 4 | hand-count of audit doc:32 |
| Non-trigger NO_PARAM | 3 | 4 − 1 (`log_lease_signature_activity`) |
| Defense-in-depth total | 19 (= 16 + 3) | matches v2 REVOKE count |
| Locked-from-anon total | 21 (= 2 IDOR + 19 dd) | matches REVOKED_FROM_ANON count |

All public-facing counts that cycle-1 explicitly edited are now correct. The
two missed lines (test:11 = "20", audit:70 = "22") are residual drifts.

## CI status at HEAD `e24eb9ab3`

| Check | Status | Notes |
|---|---|---|
| `checks` | pass | typecheck + lint clean (independently re-run: `bun run typecheck` + `bun run lint` both green) |
| `e2e-smoke` | pass | |
| `rls-security` | **fail** | `funnel-admin-rpc.test.ts > rejects anonymous (no auth) caller with Unauthorized` fails — BL-01 below |
| Aikido Security | pass | |

`anon-rpc-grants.rls.test.ts` itself reports `(24 tests)` (21 anon + 2 authn
+ 1 is_admin = 24) and PASSED — the new pinning test works correctly. The
failure is in a separate, pre-existing test that the PR's v2 migration broke.

## Blockers

### BL-01: v2 migration broke a pre-existing test that asserted anon hits internal `Unauthorized` raise — `rls-security` CI is RED

**File:** `tests/integration/rls/funnel-admin-rpc.test.ts:69`

**Issue:** The anon test calls `get_funnel_stats` with the anon Supabase
client and asserts `error!.message.toMatch(/unauthorized/i)`. Before the v2
migration, anon could reach the function body, fell through to the internal
`IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'` check, and the
test passed. After v2 migration `REVOKE EXECUTE ... FROM PUBLIC` on
`get_funnel_stats`, the call now fails at the role-level grant check and
PostgreSQL returns `permission denied for function get_funnel_stats`
(SQLSTATE `42501`). `/unauthorized/i` does not match `permission denied`.

CI evidence from run 26666870915:
```
AssertionError: expected 'permission denied for function get_fu…' to match /unauthorized/i
- Expected: /unauthorized/i
+ Received: "permission denied for function get_funnel_stats"
 ❯ tests/integration/rls/funnel-admin-rpc.test.ts:69:26
```

This is a PR-introduced regression on the required `rls-security` CI gate.
Until this is green, the merge gate cannot close.

**Fix:** Two options, in order of preference:

1. Update `funnel-admin-rpc.test.ts:69` to accept either error code or
   message, matching the same `REVOKED_CODES` contract the new
   `anon-rpc-grants.rls.test.ts` pins. Symmetric with the
   `anon-rpc-grants.rls.test.ts` pattern:
   ```typescript
   const REVOKED_CODES = ["42501", "42883", "PGRST202"];
   expect(
     REVOKED_CODES.includes(error!.code as string) ||
       /unauthorized/i.test(error!.message),
   ).toBe(true);
   ```

2. Or, more honestly: rename the test to "anon is REVOKE'd at role level"
   and assert `error?.code === '42501'`, since after PR #758 the role-level
   revoke is the actual contract. The internal `is_admin()` check is no
   longer the gate that fires for anon — it's pure defense-in-depth.

Same regression risk almost certainly exists for any other test that
asserts anon hits `/unauthorized/i` against a now-revoked function. Grep
confirms no other anon-vs-revoked-function tests use the same pattern (the
authenticated-non-admin tests for `get_deliverability_stats` and
`get_funnel_stats` still hit the internal `is_admin()` check correctly,
because authenticated still has EXECUTE).

## Warnings

### WR-01: Test file docstring still claims "revoke FROM PUBLIC on 20 functions" — residual count drift

**File:** `tests/integration/rls/anon-rpc-grants.rls.test.ts:11`

**Issue:** Lines 10–12 of the test file say:
```
 *   - 20260529225039_revoke_anon_security_definer_rpcs_v2.sql
 *     (defense-in-depth: revoke FROM PUBLIC on 20 functions that gate on
 *      auth.uid() internally; re-grant to authenticated + service_role)
```

v2 migration revokes on **19** functions, not 20. Cycle-1 fix updated lines
16 and 48 of this same file but missed line 11. Same drift class cycle-1
was supposed to close.

**Fix:**
```diff
-     (defense-in-depth: revoke FROM PUBLIC on 20 functions that gate on
+     (defense-in-depth: revoke FROM PUBLIC on 19 functions that gate on
```

### WR-02: Audit doc "Regression-pinning test" section still says "22 anon-RPC tests" — residual count drift

**File:** `.planning/anon-exec-audit/CYCLE-1.md:70`

**Issue:** Line 70 still reads:
```
- 22 anon-RPC tests assert `error.code ∈ {42501, 42883, PGRST202}` (PostgREST's three flavors of "revoked")
```

Actual: REVOKED_FROM_ANON has 21 entries → 21 anon-RPC tests run. Cycle-1
fix updated lines 20, 47, 49, 61 (and added the `log_lease_signature_activity`
row to the verification table) but missed line 70 of the same file. Same
drift class.

**Fix:**
```diff
-- 22 anon-RPC tests assert `error.code ∈ {42501, 42883, PGRST202}` (PostgREST's three flavors of "revoked")
+- 21 anon-RPC tests assert `error.code ∈ {42501, 42883, PGRST202}` (PostgREST's three flavors of "revoked")
```

## Info

### IN-01: WR-04 trigger chain ownership verified empirically — `plan-limits.rls.test.ts` passes on CI

**File:** `tests/integration/rls/plan-limits.rls.test.ts`

**Issue (informational):** Cycle-1 claimed `enforce_property_plan_limit`,
`enforce_unit_plan_limit`, and `get_user_plan_limits` are all owned by
`postgres`, so the SECURITY DEFINER trigger chain still works after
authenticated loses EXECUTE on `get_user_plan_limits`. This cycle confirms
empirically: the CI run includes `tests/integration/rls/plan-limits.rls.test.ts
(2 tests) PASSED ✓ Max-tier owner inserts properties beyond the
Starter/Growth caps`. That test exercises the entire trigger chain under an
authenticated owner. If ownership were misaligned, the test would have
failed with `permission denied for function get_user_plan_limits`. The
audit doc's WR-04 claim is verified.

No fix needed.

### IN-02: WR-03 null-guard observation verified honest — role-level REVOKE fully closes the gap

**File:** `supabase/migrations/20260304120000_rpc_auth_guards.sql:126, 323, 814, 882, 957, …` (16+ matches)

**Issue (informational):** Cycle-1's audit-doc addendum claims the
GATES_INTERNALLY functions use the null-vulnerable pattern
`IF p_user_id != (SELECT auth.uid()) THEN RAISE`. Verified by grep:

```
20260304120000_rpc_auth_guards.sql:126:  IF p_user_id != (SELECT auth.uid()) THEN
20260304120000_rpc_auth_guards.sql:323:  IF p_user_id != (SELECT auth.uid()) THEN
20260304120000_rpc_auth_guards.sql:814:  IF p_user_id != (SELECT auth.uid()) THEN
20260304120000_rpc_auth_guards.sql:882:  IF p_user_id != (SELECT auth.uid()) THEN
…
```

For an anon caller, `auth.uid()` is NULL, `p_user_id != NULL` evaluates to
NULL, and `IF NULL THEN` does not fire. Pre-PR, anon could bypass the
internal guard entirely. The PR's role-level REVOKE FROM PUBLIC closes
this gap completely because anon never reaches the function body. The
audit doc's framing ("Pre-existing bug; revoking from anon at the role
level is the correct fix because the guard inside the body can't be
trusted for anon callers") is accurate and honest.

No fix needed. The "follow-up hardening PR for `IS DISTINCT FROM`" is the
right defense-in-depth recommendation but not required to merge this PR.

## Verification recommendations for cycle 3

Before cycle 3 can be CLEAN, the cycle-3 fix commit must:

1. Fix BL-01 — update `funnel-admin-rpc.test.ts:69` so the anon assertion
   accepts the role-level error code (or message) PostgreSQL returns after
   the v2 REVOKE. Re-run `rls-security` and confirm green.
2. Fix WR-01 — patch `anon-rpc-grants.rls.test.ts:11` to say "19" not "20".
3. Fix WR-02 — patch `.planning/anon-exec-audit/CYCLE-1.md:70` to say "21"
   not "22".

After fix commit, run independently:
```bash
grep -nE "^\s*\*\s+\(defense-in-depth: revoke FROM PUBLIC on (19|20|21) functions" tests/integration/rls/anon-rpc-grants.rls.test.ts
grep -nE "^- (19|20|21|22) anon-RPC tests" .planning/anon-exec-audit/CYCLE-1.md
gh pr checks 758
```

Expected: the first grep matches "19", the second matches "21", `gh pr
checks` shows all 3 required checks GREEN.

---

_Reviewed: 2026-05-29T23:55:00Z_
_Reviewer: Claude (gsd-code-reviewer, deep)_
_Verdict: NEEDS-FIXES — top 3: BL-01 (rls-security CI is RED), WR-01 (test:11 still says 20), WR-02 (audit:70 still says 22)_
