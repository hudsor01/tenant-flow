---
pr: 758
cycle: 5
head: f75dff3c2
branch: security/anon-exec-security-definer-audit
reviewed: 2026-05-29
depth: deep
findings:
  P0: 0
  P1: 0
  P2: 0
  INFO: 0
  total: 0
status: clean
---

# PR #758 — Cycle 5 Review

**Verdict: CLEAN.** First clean cycle of the closing pair — cycle 6 must also be CLEAN to close the merge gate.

Cycle 4 caught 1 P1 with 3 lines of drift in `funnel-admin-rpc.test.ts` (docstring + two `it()` block names). Cycle-4 fix commit `f75dff3c2` is a 3-line +/- diff on docstring/test-name strings only. This cycle independently re-verifies every claim cycle-4 asserted, plus paranoia-level audit of all count strings across the PR.

## Verification matrix

### 1. funnel-admin-rpc.test.ts docstring vs assertions

| Docstring claim | File:line | Actual code | Match |
|---|---|---|---|
| Claim 1: non-admin OWNER hits in-body `is_admin()` gate, /unauthorized/i | L10-11 | L60 `expect(error!.message).toMatch(/unauthorized/i)` | ✓ |
| Claim 2: anon blocked at role-level, error.code in {42501, 42883, PGRST202} | L12-16 | L81 `expect(["42501", "42883", "PGRST202"]).toContain(error?.code)` | ✓ |
| Claim 3: seeded cohort returns 3 step rows `(signup, first_property, first_tenant)` | L17-19 | L215 `expect(result.steps).toHaveLength(3)`; L217 signup, L219 first_property, L223 first_tenant | ✓ |
| Claim 4: empty-cohort window returns 3 zero-count rows | L20-22 | L263 `expect(result.steps).toHaveLength(3)`; L265 zero count loop | ✓ |

### 2. it() block names vs assertions

| it() block | Line | Assertion | Match |
|---|---|---|---|
| "returns 3-row steps array with valid aggregates on seeded cohort" | L186 | L215 `toHaveLength(3)` | ✓ |
| "returns 3 zero-count rows with null rates for empty cohort window" | L245 | L263 `toHaveLength(3)` | ✓ |

### 3. Grep for stale strings (PR-touched files)

```
grep -rn "4-row\|4 zero\|first_unit\|4 step" tests/ supabase/migrations/20260529224926...sql supabase/migrations/20260529225039...sql .planning/anon-exec-audit/
```
Result: **zero hits**. No drift remains.

### 4. Step name inventory in funnel-admin-rpc.test.ts

Every reference is `signup` / `first_property` / `first_tenant`. No `first_unit` anywhere. No other step name leaks.

| Step | First seen | Locations |
|---|---|---|
| `signup` | L145 (seed), L217 (assert), L18 (docstring) | consistent |
| `first_property` | L150 (seed), L219 (assert), L18 (docstring), L234/L241 (rate/median checks) | consistent |
| `first_tenant` | L155 (seed), L223 (assert), L18 (docstring) | consistent |

### 5. CI status at HEAD f75dff3c2

```
checks       pass   2s
e2e-smoke    pass   2s
rls-security pass   1m35s
auto-merge   skipping (expected — perfect-PR cycles open)
Aikido       pass
```

All three required gates GREEN. Only `auto-merge` is skipped, which is expected behavior since branch protection requires the perfect-PR cycle to complete first.

### 6. Count audit (paranoia pass)

| Surface | Count claim | Verified by |
|---|---|---|
| Audit doc CYCLE-1.md L3 | "23 SECURITY DEFINER functions flagged" | n/a (advisor input) |
| Audit doc L11 IDOR_RISK | 2 functions | v1 migration has 2 distinct `REVOKE EXECUTE ON FUNCTION` targets (confirm_lease_subscription, get_user_plan_limits) ✓ |
| Audit doc L20 GATES_INTERNALLY | 16 functions | listed verbatim L24 ✓ |
| Audit doc L28 NO_PARAM | 4 functions (1 trigger-moot) → 3 in v2 | cancel_account_deletion, get_user_invoices, request_account_deletion in v2 ✓ |
| Audit doc L36 INTENTIONALLY_PUBLIC | 1 (`is_admin`) | not touched by any migration ✓ |
| Audit doc L49 totals | "21 locked down (2 IDOR + 19 d-i-d). 1 intentional. 1 trigger-moot. = 23" | math checks ✓ |
| v1 migration L37-45 | 2 functions × 3 REVOKEs = 6 REVOKE statements | grep `^REVOKE EXECUTE` returns 6 ✓ |
| v2 migration L26-84 | 19 functions × 1 REVOKE = 19 REVOKE statements | grep `^REVOKE EXECUTE` returns 19 ✓; sort -u of function names returns 19 unique ✓ |
| v2 migration L4-6 docstring | "remaining 19 ... (16 gates-internally + 3 no-param)" | 16 + 3 = 19 ✓ |
| anon-rpc-grants.rls.test.ts L16, L48 | "21 revoked from anon" | REVOKED_FROM_ANON array has 21 entries (lines 53-142, counted) ✓ |
| anon-rpc-grants.rls.test.ts L21-22 | "2 IDOR funcs also revoked from authenticated" | REVOKED_FROM_AUTHENTICATED has 2 entries (L151, L158) ✓ |

**21 anon-revoked + 2 authn-revoked (subset of anon-revoked) + 1 kept-public + 1 trigger-moot = 23 advisor-flagged ✓**

### 7. PR file scope

`git diff main..HEAD --stat` returns 5 files:
- `.planning/anon-exec-audit/CYCLE-1.md` (audit doc, +89)
- `supabase/migrations/20260529224926_revoke_anon_security_definer_rpcs.sql` (v1, +45)
- `supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql` (v2, +84)
- `tests/integration/rls/anon-rpc-grants.rls.test.ts` (new pinning test, +202)
- `tests/integration/rls/funnel-admin-rpc.test.ts` (docstring + anon-path migration to role-level, +32/-10)

Matches the expected scope from the cycle-4 narrative (2 migrations + 1 audit doc + 1 new test + 1 modified test).

### 8. Error code set drift check (cycle-2 fix preservation)

Cycle 2 introduced `error.code in {42501, 42883, PGRST202}` on both the funnel admin test (L81) and anon-rpc-grants test (L46). Both files still pin the same three-code set; cycle-3 cleanup and cycle-4 fix did not drift either of them. The audit-doc test summary (L70) also pins the same set.

### 9. Subtle-issue pass

- Trailing whitespace: grep `Pn " +$"` returns no hits across all 4 PR-touched source files. ✓
- TODO/FIXME/XXX/HACK: 2 hits, both intentional — referencing the *historical* unfinished-TODO comment in `rpc-auth.test.ts:202` that the v1 migration narrative explains. Not drift. ✓
- `error?.code` vs `error!.code`: both tests use `error?.code` consistently with `expect(error).not.toBeNull()` on the prior line. ✓
- Funnel-admin L60 uses `error!.message` (non-null assertion) which is justified by the preceding `expect(error).not.toBeNull()`. Consistent with anon-rpc-grants style. ✓
- No commented-out code. No `console.log`. No `debugger`. No `as any`. No `as unknown as`. ✓

## Findings

**None.**

## Status

**CLEAN — first clean cycle of the closing pair. Cycle 6 must also be CLEAN to close the merge gate.**

The cycle-4 fix is exactly 3 strings flipped (`4-row` → `3-row`, `4 zero` → `3 zero`, `first_unit` → `first_tenant`) and the verbatim diff confirms no other lines changed. Counts are internally consistent across the audit doc, both migrations, both tests, and the docstring. CI is GREEN on all required checks.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cross-file count audit + docstring↔assertion match + CI verification)_
