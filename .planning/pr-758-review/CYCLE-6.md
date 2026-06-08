---
phase: pr-758-review
cycle: 6
reviewed: 2026-05-29T00:00:00Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - .planning/anon-exec-audit/CYCLE-1.md
  - supabase/migrations/20260529224926_revoke_anon_security_definer_rpcs.sql
  - supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql
  - tests/integration/rls/anon-rpc-grants.rls.test.ts
  - tests/integration/rls/funnel-admin-rpc.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
verdict: CLEAN
head_sha: f75dff3c238c98ad25a53454ae4ea393b622bb2b
---

# PR #758 — Cycle 6 (gate-closing) Review

**Branch:** `security/anon-exec-security-definer-audit`
**HEAD:** `f75dff3c238c98ad25a53454ae4ea393b622bb2b` (unchanged since cycle 5)
**Cycle:** 6 of N — gate-closing cycle (second consecutive clean cycle required)

## Verdict

**CLEAN — 0 P0 / 0 P1 / 0 P2 / 0 INFO.**

Second consecutive clean cycle — perfect-PR merge gate CLOSED. PR #758 is ready for merge.

## Verification matrix

| Check | Result |
|---|---|
| 1. CI at HEAD `f75dff3c2`: `checks` / `e2e-smoke` / `rls-security` all green | PASS (all three SUCCESS per `gh pr view 758 --json statusCheckRollup`) |
| 2. PR diff against `main`: 5 expected files, no extras | PASS (`git diff main..HEAD --stat` returns exactly the 5 expected files, +442/-10 LOC) |
| 3a. Prod SECURITY DEFINER state — only `is_admin` + `log_lease_signature_activity` should have anon=true | PASS (verified by CI: `anon-rpc-grants.rls.test.ts` ran all 24 contracts against prod and passed at 2026-05-30T00:55:44Z — 21 anon-revokes confirmed, 2 authenticated-revokes confirmed, `is_admin()` confirmed still anon-callable) |
| 3b. Authenticated revoke on IDOR pair (`confirm_lease_subscription`, `get_user_plan_limits`) | PASS (`authenticated cannot reach the two IDOR functions` describe block — 2 tests passed in same CI run) |
| 4a. No `any` types in test files | PASS (`grep -nE ": any\b"` on both test files returns 0 lines) |
| 4b. No `as unknown as` in test files | PASS (`grep -nE "as unknown as"` returns 0 lines) |
| 4c. No commented-out code in test files | PASS (only block doc-comments + explanatory inline comments — no orphan code) |
| 5. Test file paranoia pass | PASS — see below |
| 6. Audit doc `.planning/anon-exec-audit/CYCLE-1.md` factual accuracy | PASS — see below |
| 7. `gh pr checks 758` final snapshot | PASS (`checks` pass, `e2e-smoke` pass, `rls-security` pass 1m35s) |
| 8. Lint + typecheck at HEAD | PASS (`bun run typecheck` clean — `tsc --noEmit`; `bun run lint` clean — biome check 1217 files, no fixes) |

## Migration-content sanity

- `20260529224926_revoke_anon_security_definer_rpcs.sql`: 6 `REVOKE EXECUTE` statements (3 per IDOR function × 2 = 6) + 2 `GRANT EXECUTE TO service_role` lines. Belt-and-suspenders pattern (REVOKE FROM PUBLIC + REVOKE FROM anon + REVOKE FROM authenticated) is intentional — closes the auto-grant-to-PUBLIC + inheritance vector.
- `20260529225039_revoke_anon_security_definer_rpcs_v2.sql`: 19 `REVOKE EXECUTE ... FROM PUBLIC` statements each followed by `GRANT EXECUTE ... TO authenticated, service_role`. Function list matches the GATES_INTERNALLY (16) ∪ NO_PARAM-minus-trigger (3) buckets in the audit doc. Signature arities match the prod overloads in pg_proc.

## Test-file paranoia pass (`anon-rpc-grants.rls.test.ts`)

1. Every UUID arg is a valid v4 zeros-UUID — PostgREST's UUID validator accepts it, so the request reaches the EXECUTE permission check (not a 400-on-input that would mask a wrong grant).
2. `get_billing_insights` is passed date-only strings (`"2026-01-01"`) but the migration signature is `timestamp, timestamp` — PostgREST/Postgres coerces, but even if it did not, a cast failure returns a different error code than `42501/42883/PGRST202`, so the test would correctly fail rather than accidentally pass.
3. Arg-less branches (`cancel_account_deletion`, `request_account_deletion`) use `fn.args ? rpc(name, args) : rpc(name)` — no undefined-args bug.
4. `is_admin()` positive test asserts `error === null && data === false` — concrete contract, no flaky type coercion.
5. `error?.code` is the only optional chain in assertions; the preceding `expect(error).not.toBeNull()` guarantees it is non-null at the next line. No phantom-undefined assertion path.

## Audit-doc cross-check (`.planning/anon-exec-audit/CYCLE-1.md`)

- IDOR claims (lines 16-18) match `confirm_lease_subscription` and `get_user_plan_limits` body semantics referenced in migration headers.
- GATES_INTERNALLY count of 16 (line 24) matches the 16 owner-id + admin-gated `REVOKE EXECUTE` blocks in v2 migration (`get_billing_insights`, `get_dashboard_data_v2`, `get_dashboard_stats`, `get_dashboard_time_series`, `get_financial_overview`, `get_lease_stats`, `get_maintenance_stats`, `get_metric_trend`, `get_occupancy_trends_optimized`, `get_property_performance_cached`, `get_revenue_trends_optimized`, `get_subscription_status`, `get_user_profile`, `get_deliverability_stats`, `get_funnel_stats`, `get_gate_conversion_stats`).
- NO_PARAM count of 4 (line 32) minus the trigger function = 3 self-targeting `REVOKE EXECUTE` blocks in v2 migration (`cancel_account_deletion`, `get_user_invoices`, `request_account_deletion`). Matches.
- Total 21 = 2 IDOR + 19 defense-in-depth (line 49). Matches.
- Line 60-63 verification table matches the actual prod state pinned by the test file.
- Pre-existing-observation note (line 83) about the `NULL != NULL` guard pattern is correctly classified as pre-existing and deferred — does not contradict the lockdown scope.

## CI snapshot at HEAD `f75dff3c2`

```
checks         pass    2s
e2e-smoke      pass    2s
rls-security   pass    1m35s
auto-merge     skipping (Dependabot-only)
Aikido Security: check code  pass  22s
```

All 3 required gates green. `rls-security` CI log confirms `anon-rpc-grants.rls.test.ts` ran 24 tests in 2446ms and `funnel-admin-rpc.test.ts` ran 4 tests (2 skipped without admin creds — by design).

## Conclusion

Second consecutive clean cycle — perfect-PR merge gate CLOSED. PR #758 is ready for merge.

---
_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
