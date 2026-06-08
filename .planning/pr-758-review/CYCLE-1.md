---
pr: 758
branch: security/anon-exec-security-definer-audit
reviewed: 2026-05-29T23:30:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - supabase/migrations/20260529224926_revoke_anon_security_definer_rpcs.sql
  - supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql
  - tests/integration/rls/anon-rpc-grants.rls.test.ts
  - .planning/anon-exec-audit/CYCLE-1.md
findings:
  blocker: 0
  warning: 4
  info: 5
  total: 9
status: needs_fixes
verdict: NEEDS-FIXES
---

# PR #758 — Cycle 1 Review

## Summary

Verdict: **NEEDS-FIXES**

The lockdown migrations are mechanically correct and the test pins the contract,
but the audit doc + migration comments + test file comment all carry a
**count drift** (21 functions actually locked, but doc claims 20/22 in three
separate places), and there is a **completeness risk** the audit doc does not
acknowledge: 5 new SECURITY DEFINER functions landed in
`20260528231201_repair_analytics_rpcs.sql` the day before the audit ran and may
also be anon-EXEC'd in prod, but were not included in the lockdown set. Verdict
is NEEDS-FIXES rather than CLEAN — must be corrected before second clean cycle
can close the merge gate.

Signature accuracy was verified by reading every `CREATE OR REPLACE FUNCTION`
in repo migrations against the v2 migration's `REVOKE EXECUTE ON FUNCTION`
arg-type lists. No signature drift found in the locked list (`timestamp without
time zone` reduces to `timestamp`, which is the spelling v2 uses for
`get_billing_insights`).

`is_admin()` is correctly left untouched: it is referenced from RLS policies in
`20251230200000_harden_rls_policies.sql`, `20260415193245_email_deliverability_schema.sql`,
`20260415193247_onboarding_funnel_events_schema.sql`, and `20260419120000_create_gate_events.sql`.
Revoking from anon would break every policy that consults it. Its body
(`20260418235000_drop_user_type_to_is_admin.sql`) reads only `auth.uid()` and
returns `false` when `auth.uid()` is null, so the public grant is safe.

## Warnings

### WR-01: Count drift across migration comments, audit doc, and test file (3 separate places say 20 or 22 — actual is 21 locked / 19 in v2)

**Files:**
- `supabase/migrations/20260529224926_revoke_anon_security_definer_rpcs.sql:7` — "The 20 defense-in-depth revokes land in the v2 migration"
- `supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql:5-6` — "revokes EXECUTE from the remaining 20 SECURITY DEFINER functions"
- `tests/integration/rls/anon-rpc-grants.rls.test.ts:16` — "The 22 anon-revoke tests use `00000000-...` UUIDs"
- `tests/integration/rls/anon-rpc-grants.rls.test.ts:48` — "Functions revoked from anon (22 total: 2 IDOR + 20 defense-in-depth)"
- `.planning/anon-exec-audit/CYCLE-1.md:20` — "### GATES_INTERNALLY — 15 functions" (the prose then lists 16 functions on line 24)

**Issue:** Actual count: v2 has 19 `REVOKE EXECUTE` statements (3 self-target + 13 owner-id-gated + 3 admin-gated), v1 has 2 IDOR REVOKEs, for a total of **21 functions locked from anon**. The audit doc's GATES_INTERNALLY classification lists 16 functions but its header says 15. The `REVOKED_FROM_ANON` array in the test file has **21 unique entries**, not 22. None of the public-facing counts (20 / 22 / 15) match the actual numbers (19 / 21 / 16).

**Fix:**
```diff
- -- v1 line 7: -- This pass fixes the two REAL IDOR vectors. The 20 defense-in-depth revokes
+ -- v1 line 7: -- This pass fixes the two REAL IDOR vectors. The 19 defense-in-depth revokes

- -- v2 line 5-6: revokes EXECUTE from the remaining 20 SECURITY DEFINER functions
+ -- v2 line 5-6: revokes EXECUTE from the remaining 19 SECURITY DEFINER functions

- // test line 16: 1. ANON cannot reach any of the 22 revoked functions
+ // test line 16: 1. ANON cannot reach any of the 21 revoked functions

- // test line 48: Functions revoked from anon (22 total: 2 IDOR + 20 defense-in-depth)
+ // test line 48: Functions revoked from anon (21 total: 2 IDOR + 19 defense-in-depth)

- # CYCLE-1.md line 20: ### GATES_INTERNALLY — 15 functions
+ # CYCLE-1.md line 20: ### GATES_INTERNALLY — 16 functions
```

These are documentation/comment drift, but the drift is across THREE separate
artifacts which signals weak QA. The lockdown's actual mechanical state is
correct.

### WR-02: 5 new SECURITY DEFINER functions in `20260528231201_repair_analytics_rpcs.sql` not in lockdown set — completeness risk

**File:** `supabase/migrations/20260528231201_repair_analytics_rpcs.sql:105, 125, 307, 405, 447`

**Issue:** The migration applied 2026-05-28 (one day before the audit) creates
**8 SECURITY DEFINER functions in `public`**:
- `get_billing_insights(uuid, timestamp, timestamp)` ✅ included in v2 lockdown
- `get_invoice_statistics(p_user_id uuid)` ❌ **not in lockdown**
- `calculate_monthly_metrics(p_user_id uuid)` ❌ **not in lockdown**
- `get_financial_overview(p_user_id uuid)` ✅ included in v2 lockdown
- `get_revenue_trends_optimized(p_user_id uuid, p_months integer)` ✅ included in v2 lockdown
- `get_property_performance_analytics(p_user_id uuid, p_property_id uuid, p_timeframe text, p_limit integer)` ❌ **not in lockdown**
- `get_property_performance_trends(p_user_id uuid)` ❌ **not in lockdown**
- `get_property_performance_with_trends(p_user_id uuid, p_timeframe text, p_limit integer)` ❌ **not in lockdown**

The 5 missing functions all have internal `IF p_user_id != (SELECT auth.uid()) THEN RAISE EXCEPTION` guards (verified by grep), so they have the same risk profile as the 13 owner-id-gated functions that ARE in the lockdown set. The Security Advisor's report was likely generated from a snapshot taken **before** `20260528231201_repair_analytics_rpcs.sql` applied to prod, so these 5 may still be anon-EXEC-able by default-PUBLIC-grant from `CREATE FUNCTION`.

**Risk:** Same information-leak surface as the other GATES_INTERNALLY functions
in the lockdown set. Plus, `get_invoice_statistics` and `calculate_monthly_metrics`
expose maintenance-cost data that has the same caller-vs-`auth.uid()` null-check
issue described in WR-03 below.

**Fix:** Either (a) verify against prod via `mcp__supabase__execute_sql` that
these 5 do NOT have anon EXECUTE (in which case the audit doc should note them
as already-locked), or (b) add a v3 migration that revokes them with the same
`REVOKE FROM PUBLIC; GRANT TO authenticated, service_role` pattern. **This must
be resolved before cycle 2 can be CLEAN** — otherwise the audit's "23 functions"
scope claim is false (it should be 28 if these 5 are still anon-EXEC).

### WR-03: Internal `p_user_id != auth.uid()` guard is null-unsafe — audit doc misrepresents GATES_INTERNALLY safety

**Files:** `supabase/migrations/20260304120000_rpc_auth_guards.sql:882, 1265, 1399, 957, 802, 2029` (etc — appears in every GATES_INTERNALLY function)

**Issue:** The pattern `IF p_user_id != (SELECT auth.uid()) THEN RAISE EXCEPTION 'Access denied'` is **null-unsafe**. When anon calls the function, `auth.uid()` returns NULL. `'00000000-...'::uuid != NULL` evaluates to `NULL`, not `TRUE`. `IF NULL THEN ...` does NOT fire in plpgsql. So the guard is bypassed and the function body executes for anon.

For example, `get_metric_trend(p_user_id => '00000000-...', p_metric_name => 'occupancy_rate', p_period => 'month')` from anon, pre-revoke, would NOT raise — it would compute `count(*) FILTER (WHERE u.status='occupied')` from `units` joined to `properties WHERE owner_user_id = '00000000-...'`, get zero rows, and return `{"current_value": 0, ...}`. No exception. Empty data, but the function executed.

This means the **audit doc's "GATES_INTERNALLY" framing is too generous**. The
real classification is closer to "GATES_INTERNALLY_FOR_AUTHN_BUT_SILENTLY_PASSES_FOR_ANON".
The `REVOKE FROM PUBLIC` is therefore **not just defense-in-depth** — it is
closing a real information-disclosure gap (a function-existence + behavior
oracle that anon can probe).

**Fix:** Either:
1. Update CYCLE-1.md to reflect that the GATES_INTERNALLY pattern is null-vulnerable for anon, so the REVOKE is a real fix (not just dd), OR
2. (Out of scope for this PR) follow up with a separate PR that hardens every gate from `IF p != auth.uid()` to `IF p IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL`. The current PR is sufficient as long as the role-level REVOKE holds.

This is **not a regression introduced by PR #758** — it is pre-existing code that the audit doc misclassifies. But the audit's narrative undersells the lockdown's value.

### WR-04: `enforce_property_plan_limit` / `enforce_unit_plan_limit` trigger chain depends on function ownership — verify against prod

**File:** `supabase/migrations/20260505213825_enforce_plan_limits.sql:87, 137`

**Issue:** Both `enforce_property_plan_limit()` and `enforce_unit_plan_limit()` are
`SECURITY DEFINER` triggers that call `public.get_user_plan_limits(NEW.owner_user_id)`.
After v1 migration, `get_user_plan_limits(uuid)` has no GRANT to `authenticated` or
`PUBLIC` — only to `service_role`. The trigger's SECURITY DEFINER context runs as
the trigger function's owner (usually `postgres`). PostgreSQL owners bypass
GRANT/REVOKE on their own objects, so this works **iff both functions are owned
by the same role** (postgres).

If `enforce_property_plan_limit` and `get_user_plan_limits` were created in
prod with different owners (unlikely but possible if a migration ran under a
different role), the trigger would fail with `permission denied for function
get_user_plan_limits` on every property/unit insert by an authenticated user.

**Fix:** Verify against prod via:
```sql
SELECT proname, proowner::regrole
FROM pg_proc
WHERE proname IN ('get_user_plan_limits', 'enforce_property_plan_limit', 'enforce_unit_plan_limit')
  AND pronamespace = 'public'::regnamespace;
```

All three should return `postgres`. If they do, this finding is documentation-only.
If any returns a different owner, the trigger chain is broken and an `ALTER
FUNCTION ... OWNER TO postgres` is required. Worth running this check post-merge
to be 100% sure no live insert path is broken.

## Info

### IN-01: `REVOKED_CODES` does not include `P0001` — correctly distinguishes role-level revoke from internal raise

**File:** `tests/integration/rls/anon-rpc-grants.rls.test.ts:46`

**Issue:** The accepted-codes set `['42501', '42883', 'PGRST202']` correctly
excludes `P0001` (`raise_exception` default ERRCODE). This means the test
specifically validates that revoke happened at the role/grant layer, not at
the internal guard layer. This is the right choice — if the migration were
rolled back, anon calls would fall through to internal guards and surface as
`P0001`, which would fail the test. Good distinguishing-behavior assertion.

No fix needed; flagging for cycle 2 reviewer to confirm this was intentional.

### IN-02: Test asserts `is_admin()` returns `false` for anon — empirically correct

**File:** `tests/integration/rls/anon-rpc-grants.rls.test.ts:196-200`

**Issue:** The positive test calls `is_admin()` as anon and expects `false`. The
function body (`20260418235000_drop_user_type_to_is_admin.sql:17-28`) does
`SELECT is_admin FROM public.users WHERE id = auth.uid()` with `auth.uid() = NULL`
for anon. Selects no rows, `coalesce(NULL, false)` = `false`. ✓

No fix needed.

### IN-03: `confirm_lease_subscription` UPDATE is idempotent — IDOR is still real

**File:** `supabase/migrations/20260117024203_add_webhook_transaction_rpcs.sql:114-134`

**Issue:** The function uses `WHERE id = p_lease_id AND stripe_subscription_status = 'pending'`. The `'pending'` predicate provides idempotency for webhook retries but does NOT prevent IDOR — an attacker who knows ANY pending lease's UUID can attach an attacker-controlled `stripe_subscription_id`. The lockdown is necessary.

No fix needed; audit doc's IDOR classification is correct.

### IN-04: `SCHEMA.md` does not reflect new grant state

**File:** `supabase/SCHEMA.md:478-484` etc.

**Issue:** The RPC tables in `SCHEMA.md` don't include grant info. Not strictly
required, but if there is intent to keep schema docs in sync with grant state,
a follow-up PR could update SCHEMA.md to mark which RPCs are
`service_role`-only vs `authenticated + service_role`.

Out of scope for this PR.

### IN-05: `get_user_invoices(integer)` confirmed single-overload — no missed overload

**Files:** `supabase/migrations/20260305120000_get_user_invoices_rpc.sql:6`,
`supabase/migrations/20260528204818_drop_dead_rent_payment_functions.sql`

**Issue:** Verified by grep that `get_user_invoices` has exactly one signature
(`integer`) in repo migrations. The `text` overload of `get_user_plan_limits`
was already dropped (`20260505230821_drop_legacy_get_user_plan_limits_text_overload.sql`,
re-dropped by `20260510094452_phase_5_drop_resurrected_text_overload.sql`).

No fix needed; lockdown signatures are complete.

## Verification recommendations for cycle 2

Before cycle 2 can be CLEAN, recommend running these against prod via MCP:

1. **WR-02 must be resolved:**
   ```sql
   SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') AS anon_exec
   FROM pg_proc
   WHERE prosecdef
     AND pronamespace = 'public'::regnamespace
     AND proname IN ('get_invoice_statistics', 'calculate_monthly_metrics',
                     'get_property_performance_analytics',
                     'get_property_performance_trends',
                     'get_property_performance_with_trends');
   ```
   If any returns `anon_exec = true`, a v3 migration is required.

2. **WR-04 verification:**
   ```sql
   SELECT proname, proowner::regrole
   FROM pg_proc
   WHERE proname IN ('get_user_plan_limits', 'enforce_property_plan_limit',
                     'enforce_unit_plan_limit')
     AND pronamespace = 'public'::regnamespace;
   ```
   All three should return `postgres`.

3. **Out-of-band drift check:**
   ```sql
   SELECT proname, proargtypes::regtype[] AS args
   FROM pg_proc
   WHERE prosecdef
     AND pronamespace = 'public'::regnamespace
     AND has_function_privilege('anon', oid, 'EXECUTE')
     AND proname NOT IN ('is_admin');
   ```
   Expected: empty (or only the 5 from WR-02 if those are still public).

---

_Reviewed: 2026-05-29T23:30:00Z_
_Reviewer: Claude (gsd-code-reviewer, deep)_
_Verdict: NEEDS-FIXES — top 3: WR-02 (completeness), WR-01 (count drift x3), WR-04 (verify-prod owner)_
